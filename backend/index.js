require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const JWT_SECRET = process.env.JWT_SECRET;

// --- Schemas ---
const PropertySchema = new mongoose.Schema({
  property_id: { type: String, unique: true },
  house_no: String,
  ward_no: String,
  owner_name: String,
  owner_name_mr: String,
  father_name: String,
  father_name_mr: String,
  survey_no: String,
  gat_no: String,
  plot_area_sqm: { type: Number, default: 0 },
  built_up_area_sqm: { type: Number, default: 0 },
  floor_count: { type: Number, default: 1 },
  construction_type: String,
  usage_type: { type: String, default: 'residential' },
  water_connection: { type: Boolean, default: false },
  electricity_connection: { type: Boolean, default: false },
  assessment_year: String,
  village: String,
  taluka: String,
  district: String,
  created_at: { type: Date, default: Date.now }
});

const DemandSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  financial_year: { type: String, required: true },
  house_tax: { type: Number, default: 0 },
  water_tax: { type: Number, default: 0 },
  light_tax: { type: Number, default: 0 },
  cleaning_tax: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  arrears: { type: Number, default: 0 },
  net_demand: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'unpaid' }, // paid, unpaid, partial
  created_at: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
  demand: { type: mongoose.Schema.Types.ObjectId, ref: 'Demand', required: true },
  amount: Number,
  payment_mode: String,
  receipt_no: String,
  payment_date: { type: Date, default: Date.now }
});

const TaxRateSchema = new mongoose.Schema({
  financial_year: String,
  usage_type: String,
  rate_per_sqm: { type: Number, default: 0 },
  water_tax_rate: { type: Number, default: 0 },
  light_tax_rate: { type: Number, default: 0 },
  cleaning_tax_rate: { type: Number, default: 0 },
  rebate_percent: { type: Number, default: 5 },
  penalty_percent: { type: Number, default: 12 },
  is_locked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  phone: { type: String, unique: true },
  name: String,
  role: { type: String, default: 'citizen' }, // super_admin, gramsevak, auditor, talathi, data_entry, citizen
  village: String,
  created_at: { type: Date, default: Date.now }
});

const AuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  entity_type: String, // property, demand, tax_rate, user
  entity_id: String,
  action: String, // create, update, delete, payment, lock, role_change
  user_id: String,
  user_name: String,
  reason: String,
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed
});

const Property = mongoose.model('Property', PropertySchema);
const Demand = mongoose.model('Demand', DemandSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const TaxRate = mongoose.model('TaxRate', TaxRateSchema);
const User = mongoose.model('User', UserSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Middleware for Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Endpoints ---
app.post('/api/auth/send-otp', (req, res) => {
  res.json({ message: 'OTP sent successfully', phone: req.body.phone, demo_mode: true });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { otp, phone } = req.body;
  if (otp === '123456') {
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ 
        phone, 
        name: phone === '7498086090' ? 'Admin' : 'New User',
        role: phone === '7498086090' ? 'super_admin' : 'gramsevak',
        village: process.env.DEFAULT_VILLAGE
      });
      await user.save();
    }
    const token = jwt.sign({ id: user._id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ access_token: token, user: { id: user._id, phone: user.phone, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ detail: 'Invalid OTP' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// --- Property Endpoints ---
app.get(['/api/property/list', '/api/properties'], authenticateToken, async (req, res) => {
  try {
    const { search, ward } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { owner_name: { $regex: search, $options: 'i' } },
        { house_no: { $regex: search, $options: 'i' } }
      ];
    }
    if (ward && ward !== 'all') {
      query.ward_no = ward;
    }
    const properties = await Property.find(query).sort({ created_at: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post(['/api/property/add', '/api/properties'], authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const property_id = `GP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newProperty = new Property({
      ...data,
      property_id,
      village: process.env.DEFAULT_VILLAGE,
      taluka: process.env.DEFAULT_TALUKA,
      district: process.env.DEFAULT_DISTRICT
    });
    const saved = await newProperty.save();
    
    // Audit Log
    await new AuditLog({
      entity_type: 'property',
      entity_id: saved._id,
      action: 'create',
      user_id: req.user.id,
      user_name: req.user.name,
      new_value: saved
    }).save();

    console.log('Property Saved:', saved.property_id);
    res.json(saved);
  } catch (err) {
    console.error('Save Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

app.put(['/api/property/update/:id', '/api/properties/:id'], authenticateToken, async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.delete(['/api/property/delete/:id', '/api/properties/:id'], authenticateToken, async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Demand Endpoints ---
const calculateTax = (prop, rate) => {
  const area = parseFloat(prop.built_up_area_sqm || 0);
  
  // Custom Logic with factors if we want, but let's keep it simple as per page
  const rate_val = rate ? rate.rate_per_sqm : (prop.usage_type === 'commercial' ? 5 : (prop.usage_type === 'mixed' ? 3 : 2));
  const house_tax = area * rate_val;
  
  const water_tax = prop.water_connection ? (rate ? rate.water_tax_rate : 500) : 0;
  const light_tax = prop.electricity_connection ? (rate ? rate.light_tax_rate : 300) : 0;
  const cleaning_tax = rate ? rate.cleaning_tax_rate : 200;
  
  return { 
    house_tax, 
    water_tax, 
    light_tax, 
    cleaning_tax, 
    total_tax: house_tax + water_tax + light_tax + cleaning_tax 
  };
};

app.post('/api/demand/generate', authenticateToken, async (req, res) => {
  try {
    const { financial_year } = req.body;
    if (!financial_year) return res.status(400).json({ detail: "Financial year is required" });

    console.log(`[DEMAND GEN] Starting for FY: ${financial_year}`);
    const properties = await Property.find();
    
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const prop of properties) {
      try {
        // Strict ID check
        if (!prop || !prop._id) {
          console.error(`[DEMAND GEN] Skipping property - No ID found`, prop);
          errors++;
          continue;
        }

        const exists = await Demand.findOne({ property: prop._id, financial_year });
        if (exists) {
          skipped++;
          continue;
        }
        
        const rate = await TaxRate.findOne({ financial_year, usage_type: prop.usage_type });
        const { house_tax, water_tax, light_tax, cleaning_tax, total_tax } = calculateTax(prop, rate);
        
        // Use constructor with explicit fields to avoid any mapping issues
        const newDemand = new Demand({
          property: prop._id,
          financial_year: financial_year,
          house_tax: house_tax || 0,
          water_tax: water_tax || 0,
          light_tax: light_tax || 0,
          cleaning_tax: cleaning_tax || 0,
          total_tax: total_tax || 0,
          net_demand: total_tax || 0,
          balance: total_tax || 0,
          status: 'unpaid'
        });

        await newDemand.save();
        generated++;
      } catch (err) {
        console.error(`[DEMAND GEN] FAILED for ${prop?.property_id || 'Unknown'}:`, err.message);
        errors++;
      }
    }
    
    res.json({ generated_count: generated, skipped_count: skipped, error_count: errors });
  } catch (err) {
    console.error('[DEMAND GEN] Fatal:', err);
    res.status(500).json({ detail: err.message });
  }
});

// --- System Utility: Reset Data ---
app.post('/api/system/reset', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  try {
    await Demand.deleteMany({});
    await Property.deleteMany({});
    await Payment.deleteMany({});
    res.json({ message: 'All property and demand records cleared successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/demand/list', authenticateToken, async (req, res) => {
  try {
    const { financial_year, status } = req.query;
    let query = {};
    if (financial_year && financial_year !== 'all') query.financial_year = financial_year;
    if (status && status !== 'all') query.status = status;
    
    const demands = await Demand.find(query).populate('property');
    const flatDemands = demands.map(d => ({
      ...d._doc,
      id: d._id.toString(),
      property_id: d.property?.property_id, // Top-level for easy access
      property_details: {
        house_no: d.property?.house_no,
        property_id: d.property?.property_id,
        owner_name: d.property?.owner_name,
        owner_name_mr: d.property?.owner_name_mr,
        usage_type: d.property?.usage_type,
        area: d.property?.built_up_area_sqm
      },
      amount_paid: d.paid_amount || 0
    }));
    res.json(flatDemands);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Payment & Receipt Endpoint ---
app.post('/api/payment/pay', authenticateToken, async (req, res) => {
  try {
    const { demand_id, amount, payment_mode } = req.body;
    const demand = await Demand.findById(demand_id).populate('property');
    if (!demand) return res.status(404).json({ detail: 'Demand not found' });

    const new_paid_amount = demand.paid_amount + amount;
    const new_balance = demand.net_demand - new_paid_amount;
    
    demand.paid_amount = new_paid_amount;
    demand.balance = new_balance;
    demand.status = new_balance <= 0 ? 'paid' : (new_paid_amount > 0 ? 'partial' : 'unpaid');
    await demand.save();

    const receipt_no = `RCPT-${Date.now()}`;
    const payment = new Payment({
      demand: demand._id,
      amount,
      payment_mode,
      receipt_no
    });
    await payment.save();

    // Audit Log for Payment
    await new AuditLog({
      entity_type: 'demand',
      entity_id: demand._id,
      action: 'payment',
      user_id: req.user.id,
      user_name: req.user.name,
      new_value: { amount, receipt_no, payment_mode }
    }).save();

    res.json({
      message: 'Payment recorded',
      receipt_no,
      receipt_details: {
        owner_name: demand.property.owner_name,
        owner_name_mr: demand.property.owner_name_mr,
        house_no: demand.property.house_no,
        property_id: demand.property.property_id,
        amount_paid: amount,
        total_demand: demand.net_demand,
        date: new Date().toLocaleDateString('en-IN'),
        payment_mode: payment_mode,
        financial_year: demand.financial_year,
        village: process.env.DEFAULT_VILLAGE || 'शिवणे',
        taluka: process.env.DEFAULT_TALUKA || 'हवेली',
        district: process.env.DEFAULT_DISTRICT || 'पुणे'
      }
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Tax Rate Endpoints ---
app.get('/api/tax-rates', authenticateToken, async (req, res) => {
  try {
    const rates = await TaxRate.find().sort({ financial_year: -1 });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/tax-rates', authenticateToken, async (req, res) => {
  try {
    const newRate = new TaxRate(req.body);
    const saved = await newRate.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/tax-rates/:id/lock', authenticateToken, async (req, res) => {
  try {
    const locked = await TaxRate.findByIdAndUpdate(req.params.id, { is_locked: true }, { new: true });
    res.json(locked);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- User Management Endpoints ---
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Audit Log Endpoints ---
app.get('/api/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { entity_type } = req.query;
    let query = {};
    if (entity_type && entity_type !== 'all') query.entity_type = entity_type;
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Dashboard ---
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalProps = await Property.countDocuments();
    const demandStats = await Demand.aggregate([
      { $group: { _id: null, total: { $sum: "$net_demand" }, collected: { $sum: "$paid_amount" } } }
    ]);
    const { total = 0, collected = 0 } = demandStats[0] || {};
    
    const now = new Date();
    const sy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    
    res.json({
      total_properties: totalProps,
      measured_properties: totalProps,
      pending_measurement: 0,
      total_demand: total,
      total_collection: collected,
      total_arrears: total - collected,
      current_fy: `${sy}-${sy + 1}`
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/dashboard/ward-summary', authenticateToken, async (req, res) => {
  try {
    const summary = await Demand.aggregate([
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $group: { 
        _id: '$p.ward_no', 
        demand: { $sum: '$total_tax' }, 
        collection: { $sum: '$paid_amount' }, 
        arrears: { $sum: '$balance' } 
      }},
      { $project: { ward: '$_id', demand: 1, collection: 1, arrears: 1, _id: 0 } },
      { $sort: { ward: 1 } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// --- Seeding ---
app.post(['/api/seed-data', '/api/seed-demo-data'], authenticateToken, async (req, res) => {
  try {
    const demo = [
      { house_no: '101', ward_no: '1', owner_name: 'Rahul Patil', owner_name_mr: 'राहुल पाटील', built_up_area_sqm: 120, usage_type: 'residential' },
      { house_no: '102', ward_no: '1', owner_name: 'Suresh Jadav', owner_name_mr: 'सुरेश जाधव', built_up_area_sqm: 200, usage_type: 'commercial' },
      { house_no: '201', ward_no: '2', owner_name: 'Priya Shinde', owner_name_mr: 'प्रिया शिंदे', built_up_area_sqm: 150, usage_type: 'mixed' }
    ];
    for (const d of demo) {
      const pid = `GP-2024-${Math.floor(100000 + Math.random() * 900000)}`;
      await new Property({ ...d, property_id: pid, village: 'कळंबा बु.' }).save();
    }
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
