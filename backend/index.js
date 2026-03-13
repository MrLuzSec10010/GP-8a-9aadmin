require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// --- Schemas (Multi-Tenant / SaaS) ---
// ==========================================

// Gram Panchayat Master Table
const GramPanchayatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  village: { type: String, required: true },
  taluka: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, default: 'Maharashtra' },
  contact_person: { type: String, default: '' },
  mobile: { type: String, default: '' },
  email: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  enabled_modules: {
    type: [String],
    default: ['dashboard', 'namuna_9', 'namuna_8', 'tax_collection', 'receipts', 'reports']
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const PropertySchema = new mongoose.Schema({
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', required: true, index: true },
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
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', required: true, index: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  financial_year: { type: String, required: true },
  house_tax: { type: Number, default: 0 },
  water_tax: { type: Number, default: 0 },
  light_tax: { type: Number, default: 0 },
  health_tax: { type: Number, default: 0 },
  total_tax: { type: Number, default: 0 },
  arrears: { type: Number, default: 0 },
  net_demand: { type: Number, default: 0 },
  paid_amount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'unpaid' },
  created_at: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', required: true, index: true },
  demand: { type: mongoose.Schema.Types.ObjectId, ref: 'Demand', required: true },
  amount: Number,
  payment_mode: String,
  receipt_no: String,
  payment_date: { type: Date, default: Date.now }
});

const TaxRateSchema = new mongoose.Schema({
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', required: true, index: true },
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
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', index: true, default: null },
  phone: { type: String, unique: true, sparse: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, default: null },
  name: String,
  role: { type: String, default: 'citizen' }, // super_admin, admin, gramsevak, accountant, auditor, talathi, data_entry, citizen
  village: String,
  created_at: { type: Date, default: Date.now }
});

const AuditLogSchema = new mongoose.Schema({
  gram_panchayat: { type: mongoose.Schema.Types.ObjectId, ref: 'GramPanchayat', index: true, default: null },
  timestamp: { type: Date, default: Date.now },
  entity_type: String,
  entity_id: String,
  action: String,
  user_id: String,
  user_name: String,
  reason: String,
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed
});

const GramPanchayat = mongoose.model('GramPanchayat', GramPanchayatSchema);
const Property = mongoose.model('Property', PropertySchema);
const Demand = mongoose.model('Demand', DemandSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const TaxRate = mongoose.model('TaxRate', TaxRateSchema);
const User = mongoose.model('User', UserSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// ==========================================
// --- Middleware ---
// ==========================================

// Auth Middleware
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

// Tenant Isolation Middleware - extracts gram_panchayat_id from JWT
// Super Admin can optionally pass ?gp_id= to act on behalf of a GP
const tenantMiddleware = (req, res, next) => {
  if (req.user.role === 'super_admin') {
    // Super Admin: can access any GP. If gp_id is passed, scope to that GP.
    req.gram_panchayat_id = req.query.gp_id || req.body?.gp_id || req.user.gram_panchayat_id || null;
  } else {
    // Regular user: strictly scoped to their GP
    req.gram_panchayat_id = req.user.gram_panchayat_id;
    if (!req.gram_panchayat_id) {
      return res.status(403).json({ detail: 'User is not assigned to any Gram Panchayat' });
    }
  }
  next();
};

// Super Admin Only Middleware
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ detail: 'Super Admin access required' });
  }
  next();
};

// ==========================================
// --- Helper: Generate Password ---
// ==========================================
const generatePassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateUsername = (gpName, village) => {
  // Create a clean username from GP name: remove special chars, lowercase, add random suffix
  const base = (gpName || village || 'gp')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
};

// ==========================================
// --- Auth Endpoints ---
// ==========================================

app.post('/api/auth/send-otp', (req, res) => {
  res.json({ message: 'OTP sent successfully', phone: req.body.phone, demo_mode: true });
});

// OTP-based login (existing)
app.post('/api/auth/verify-otp', async (req, res) => {
  const { otp, phone } = req.body;
  if (otp === '123456') {
    let user = await User.findOne({ phone }).populate('gram_panchayat');
    if (!user) {
      // First-time login: check if this is the super admin phone
      const isSuperAdmin = phone === '7498086090';
      user = new User({
        phone,
        name: isSuperAdmin ? 'Super Admin' : 'New User',
        role: isSuperAdmin ? 'super_admin' : 'citizen',
        village: isSuperAdmin ? null : process.env.DEFAULT_VILLAGE,
        gram_panchayat: null
      });
      await user.save();
    }

    const tokenPayload = {
      id: user._id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      gram_panchayat_id: user.gram_panchayat ? user.gram_panchayat._id : null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);

    const userResponse = {
      id: user._id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      gram_panchayat_id: user.gram_panchayat ? user.gram_panchayat._id : null,
      gram_panchayat_name: user.gram_panchayat ? user.gram_panchayat.name : null
    };

    res.json({ access_token: token, user: userResponse });
  } else {
    res.status(401).json({ detail: 'Invalid OTP' });
  }
});

// Username/Password login (for GP admins created by Super Admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password are required' });
    }

    // Find user by username or phone
    const user = await User.findOne({
      $or: [{ username: username }, { phone: username }]
    }).populate('gram_panchayat');

    if (!user) {
      return res.status(401).json({ detail: 'Invalid username or password' });
    }

    if (!user.password) {
      return res.status(401).json({ detail: 'This account uses OTP login. Please use OTP to login.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid username or password' });
    }

    const tokenPayload = {
      id: user._id,
      phone: user.phone,
      username: user.username,
      role: user.role,
      name: user.name,
      gram_panchayat_id: user.gram_panchayat ? user.gram_panchayat._id : null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);

    const userResponse = {
      id: user._id,
      phone: user.phone,
      username: user.username,
      role: user.role,
      name: user.name,
      gram_panchayat_id: user.gram_panchayat ? user.gram_panchayat._id : null,
      gram_panchayat_name: user.gram_panchayat ? user.gram_panchayat.name : null
    };

    res.json({ access_token: token, user: userResponse });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// Change password (for GP admin users)
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ detail: 'User not found' });

    if (user.password) {
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) return res.status(401).json({ detail: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(new_password, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Reset password (Super Admin only)
app.post('/api/auth/reset-password/:userId', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: 'User not found' });

    const newPassword = generatePassword();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      message: 'Password reset successfully',
      credentials: {
        username: user.username || user.phone,
        password: newPassword
      }
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('gram_panchayat');
    if (!user) return res.status(404).json({ detail: 'User not found' });

    res.json({
      id: user._id,
      phone: user.phone,
      username: user.username,
      role: user.role,
      name: user.name,
      gram_panchayat_id: user.gram_panchayat ? user.gram_panchayat._id : null,
      gram_panchayat_name: user.gram_panchayat ? user.gram_panchayat.name : null
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Super Admin: Dashboard Stats ---
// ==========================================

app.get('/api/super-admin/dashboard', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const totalGPs = await GramPanchayat.countDocuments();
    const activeGPs = await GramPanchayat.countDocuments({ is_active: true });
    const totalUsers = await User.countDocuments({ role: { $ne: 'super_admin' } });
    const totalProperties = await Property.countDocuments();

    const demandStats = await Demand.aggregate([
      { $group: { _id: null, total_demand: { $sum: '$net_demand' }, total_collection: { $sum: '$paid_amount' } } }
    ]);
    const { total_demand = 0, total_collection = 0 } = demandStats[0] || {};

    // Per-GP summary
    const gpSummary = await GramPanchayat.find().sort({ created_at: -1 }).lean();
    const gpStats = await Promise.all(gpSummary.map(async (gp) => {
      const userCount = await User.countDocuments({ gram_panchayat: gp._id });
      const propertyCount = await Property.countDocuments({ gram_panchayat: gp._id });
      const gpDemand = await Demand.aggregate([
        { $match: { gram_panchayat: gp._id } },
        { $group: { _id: null, demand: { $sum: '$net_demand' }, collected: { $sum: '$paid_amount' } } }
      ]);
      const { demand = 0, collected = 0 } = gpDemand[0] || {};
      return {
        ...gp,
        user_count: userCount,
        property_count: propertyCount,
        total_demand: demand,
        total_collection: collected,
        pending_tax: demand - collected
      };
    }));

    res.json({
      total_gram_panchayats: totalGPs,
      active_gram_panchayats: activeGPs,
      total_users: totalUsers,
      total_properties: totalProperties,
      total_demand,
      total_collection,
      pending_tax: total_demand - total_collection,
      gram_panchayats: gpStats
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Super Admin: Gram Panchayat CRUD ---
// ==========================================

// List all Gram Panchayats
app.get('/api/gram-panchayats', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const gps = await GramPanchayat.find().sort({ created_at: -1 });
    const enriched = await Promise.all(gps.map(async (gp) => {
      const userCount = await User.countDocuments({ gram_panchayat: gp._id });
      const propertyCount = await Property.countDocuments({ gram_panchayat: gp._id });
      const gpDemand = await Demand.aggregate([
        { $match: { gram_panchayat: gp._id } },
        { $group: { _id: null, demand: { $sum: '$net_demand' }, collected: { $sum: '$paid_amount' } } }
      ]);
      const { demand = 0, collected = 0 } = gpDemand[0] || {};
      return {
        ...gp._doc,
        user_count: userCount,
        property_count: propertyCount,
        total_demand: demand,
        total_collection: collected,
        pending_tax: demand - collected
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Create Gram Panchayat + Auto-create Admin with credentials
app.post('/api/gram-panchayats', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { name, village, taluka, district, state, contact_person, mobile, email, admin_name, admin_phone } = req.body;
    if (!name || !village || !taluka || !district) {
      return res.status(400).json({ detail: 'name, village, taluka, district are required' });
    }

    // 1. Create the Gram Panchayat
    const gp = new GramPanchayat({
      name, village, taluka, district,
      state: state || 'Maharashtra',
      contact_person: contact_person || '',
      mobile: mobile || '',
      email: email || '',
      enabled_modules: ['dashboard', 'namuna_9', 'namuna_8', 'tax_collection', 'receipts', 'reports']
    });
    await gp.save();

    // 2. Auto-generate admin credentials
    const adminUsername = generateUsername(name, village);
    const adminPassword = generatePassword(10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 3. Create the Admin user for this GP
    const adminUser = new User({
      gram_panchayat: gp._id,
      username: adminUsername,
      phone: admin_phone || null,
      password: hashedPassword,
      name: admin_name || contact_person || `${name} Admin`,
      role: 'admin',
      village: village
    });
    await adminUser.save();

    // 4. Audit log
    await new AuditLog({
      gram_panchayat: gp._id,
      entity_type: 'gram_panchayat',
      entity_id: gp._id,
      action: 'create',
      user_id: req.user.id,
      user_name: req.user.name,
      new_value: { gp: gp.name, admin_username: adminUsername }
    }).save();

    // 5. Return GP details + generated credentials
    res.json({
      gram_panchayat: gp,
      admin_user: {
        id: adminUser._id,
        name: adminUser.name,
        role: adminUser.role,
        phone: adminUser.phone
      },
      credentials: {
        username: adminUsername,
        password: adminPassword
      }
    });
  } catch (err) {
    console.error('GP Creation Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// Activate / Deactivate Gram Panchayat
app.patch('/api/gram-panchayats/:id/status', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { is_active } = req.body;
    const updated = await GramPanchayat.findByIdAndUpdate(
      req.params.id,
      { is_active, updated_at: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ detail: 'Gram Panchayat not found' });

    await new AuditLog({
      gram_panchayat: updated._id,
      entity_type: 'gram_panchayat',
      entity_id: updated._id,
      action: is_active ? 'activate' : 'deactivate',
      user_id: req.user.id,
      user_name: req.user.name
    }).save();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Update Module Permissions for a GP
app.patch('/api/gram-panchayats/:id/modules', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { enabled_modules } = req.body;
    if (!Array.isArray(enabled_modules)) {
      return res.status(400).json({ detail: 'enabled_modules must be an array' });
    }
    const updated = await GramPanchayat.findByIdAndUpdate(
      req.params.id,
      { enabled_modules, updated_at: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ detail: 'Gram Panchayat not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Get single GP details with stats
app.get('/api/gram-panchayats/:id/details', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const gp = await GramPanchayat.findById(req.params.id);
    if (!gp) return res.status(404).json({ detail: 'Gram Panchayat not found' });

    const userCount = await User.countDocuments({ gram_panchayat: gp._id });
    const propertyCount = await Property.countDocuments({ gram_panchayat: gp._id });
    const demandStats = await Demand.aggregate([
      { $match: { gram_panchayat: gp._id } },
      { $group: { _id: null, demand: { $sum: '$net_demand' }, collected: { $sum: '$paid_amount' } } }
    ]);
    const { demand = 0, collected = 0 } = demandStats[0] || {};
    const users = await User.find({ gram_panchayat: gp._id }).select('name role username phone created_at');

    res.json({
      ...gp._doc,
      user_count: userCount,
      property_count: propertyCount,
      total_demand: demand,
      total_collection: collected,
      pending_tax: demand - collected,
      users
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Update Gram Panchayat
app.put('/api/gram-panchayats/:id', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const updated = await GramPanchayat.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ detail: 'Gram Panchayat not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Delete Gram Panchayat
app.delete('/api/gram-panchayats/:id', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const gpId = req.params.id;
    // Check if GP has any data
    const propCount = await Property.countDocuments({ gram_panchayat: gpId });
    if (propCount > 0) {
      return res.status(400).json({ detail: `Cannot delete: ${propCount} properties exist under this Gram Panchayat. Remove data first.` });
    }
    await GramPanchayat.findByIdAndDelete(gpId);
    // Unassign users from this GP
    await User.updateMany({ gram_panchayat: gpId }, { gram_panchayat: null });
    res.json({ message: 'Gram Panchayat deleted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Super Admin: Assign User to GP ---
// ==========================================

// Create a user and assign to a GP (Super Admin creates admin users for GPs)
app.post('/api/gram-panchayats/:gpId/users', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { phone, name, role } = req.body;
    const gpId = req.params.gpId;

    // Validate GP exists
    const gp = await GramPanchayat.findById(gpId);
    if (!gp) return res.status(404).json({ detail: 'Gram Panchayat not found' });

    // Check if user already exists
    let user = await User.findOne({ phone });
    if (user) {
      // Update existing user's GP assignment and role
      user.gram_panchayat = gpId;
      user.role = role || user.role;
      user.name = name || user.name;
      await user.save();
    } else {
      user = new User({
        phone,
        name: name || 'New User',
        role: role || 'gramsevak',
        gram_panchayat: gpId,
        village: gp.village
      });
      await user.save();
    }

    await new AuditLog({
      entity_type: 'user',
      entity_id: user._id,
      action: 'assign_gp',
      user_id: req.user.id,
      user_name: req.user.name,
      new_value: { gram_panchayat: gpId, role: user.role }
    }).save();

    res.json(user);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// List users for a specific GP
app.get('/api/gram-panchayats/:gpId/users', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find({ gram_panchayat: req.params.gpId }).populate('gram_panchayat');
    res.json(users);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Property Endpoints (Tenant-Scoped) ---
// ==========================================

app.get(['/api/property/list', '/api/properties'], authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { search, ward } = req.query;
    let query = {};

    // Tenant isolation
    if (req.gram_panchayat_id) {
      query.gram_panchayat = req.gram_panchayat_id;
    }

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

app.post(['/api/property/add', '/api/properties'], authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!req.gram_panchayat_id) {
      return res.status(400).json({ detail: 'Gram Panchayat assignment is required to add properties' });
    }

    const data = req.body;
    const property_id = `GP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Get GP details for village/taluka/district
    const gp = await GramPanchayat.findById(req.gram_panchayat_id);

    const newProperty = new Property({
      ...data,
      property_id,
      gram_panchayat: req.gram_panchayat_id,
      village: gp ? gp.village : (process.env.DEFAULT_VILLAGE || ''),
      taluka: gp ? gp.taluka : (process.env.DEFAULT_TALUKA || ''),
      district: gp ? gp.district : (process.env.DEFAULT_DISTRICT || '')
    });
    const saved = await newProperty.save();

    await new AuditLog({
      gram_panchayat: req.gram_panchayat_id,
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

app.put(['/api/property/update/:id', '/api/properties/:id'], authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    // Ensure the property belongs to the user's GP
    const query = { _id: req.params.id };
    if (req.gram_panchayat_id) {
      query.gram_panchayat = req.gram_panchayat_id;
    }
    const updated = await Property.findOneAndUpdate(query, req.body, { new: true });
    if (!updated) return res.status(404).json({ detail: 'Property not found or access denied' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.delete(['/api/property/delete/:id', '/api/properties/:id'], authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.gram_panchayat_id) {
      query.gram_panchayat = req.gram_panchayat_id;
    }
    const deleted = await Property.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ detail: 'Property not found or access denied' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Demand Endpoints (Tenant-Scoped) ---
// ==========================================

const calculateTax = (prop, rate) => {
  const area = parseFloat(prop.built_up_area_sqm || 0);

  let rate_val = 2;
  if (prop.usage_type === 'commercial') rate_val = 5;
  else if (prop.usage_type === 'mixed') rate_val = 3;

  if (rate && rate.rate_per_sqm) rate_val = rate.rate_per_sqm;

  const house_tax = area * rate_val;
  const water_tax = prop.water_connection ? (rate?.water_tax_rate || 500) : 0;
  const light_tax = rate?.light_tax_rate || 0;
  const health_tax = rate?.cleaning_tax_rate || 0;

  return {
    house_tax: Math.round(house_tax * 100) / 100,
    water_tax: Math.round(water_tax * 100) / 100,
    light_tax: Math.round(light_tax * 100) / 100,
    health_tax: Math.round(health_tax * 100) / 100,
    total_tax: Math.round((house_tax + water_tax + light_tax + health_tax) * 100) / 100
  };
};

app.post('/api/demand/generate', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { financial_year } = req.body;
    if (!financial_year) return res.status(400).json({ detail: "Financial year is required" });
    if (!req.gram_panchayat_id) return res.status(400).json({ detail: "Gram Panchayat assignment required" });

    console.log(`[DEMAND GEN] Starting for FY: ${financial_year}, GP: ${req.gram_panchayat_id}`);
    // Only get properties for this GP
    const properties = await Property.find({ gram_panchayat: req.gram_panchayat_id });

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const prop of properties) {
      try {
        if (!prop || !prop._id) {
          errors++;
          continue;
        }

        const exists = await Demand.findOne({ property: prop._id, financial_year, gram_panchayat: req.gram_panchayat_id });
        if (exists) {
          skipped++;
          continue;
        }

        const rate = await TaxRate.findOne({ financial_year, usage_type: prop.usage_type, gram_panchayat: req.gram_panchayat_id });
        const { house_tax, water_tax, light_tax, health_tax, total_tax } = calculateTax(prop, rate);

        const previousDemands = await Demand.find({ property: prop._id, gram_panchayat: req.gram_panchayat_id }).sort({ created_at: -1 });
        const arrears = previousDemands.length > 0 ? previousDemands[0].balance : 0;

        const newDemand = new Demand({
          gram_panchayat: req.gram_panchayat_id,
          property: prop._id,
          financial_year,
          house_tax,
          water_tax,
          light_tax,
          health_tax,
          total_tax,
          arrears: Math.round(arrears * 100) / 100,
          net_demand: Math.round((total_tax + arrears) * 100) / 100,
          paid_amount: 0,
          balance: Math.round((total_tax + arrears) * 100) / 100,
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

app.get('/api/demand/list', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { financial_year, status } = req.query;
    let query = {};

    // Tenant isolation
    if (req.gram_panchayat_id) {
      query.gram_panchayat = req.gram_panchayat_id;
    }

    if (financial_year && financial_year !== 'all') query.financial_year = financial_year;
    if (status && status !== 'all') query.status = status;

    const demands = await Demand.find(query).populate('property');
    const flatDemands = demands.map(d => ({
      ...d._doc,
      id: d._id.toString(),
      property_id: d.property?.property_id,
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

// --- System Utility: Reset Data (Tenant-Scoped) ---
app.post('/api/system/reset', authenticateToken, tenantMiddleware, async (req, res) => {
  if (req.user.role !== 'super_admin') return res.sendStatus(403);
  try {
    const filter = req.gram_panchayat_id ? { gram_panchayat: req.gram_panchayat_id } : {};
    await Demand.deleteMany(filter);
    await Property.deleteMany(filter);
    await Payment.deleteMany(filter);
    res.json({ message: 'All property and demand records cleared successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Payment & Receipt (Tenant-Scoped) ---
// ==========================================

app.post('/api/payment/pay', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { demand_id, amount_paid, payment_mode } = req.body;

    // Find demand scoped to this GP
    const demandQuery = { _id: demand_id };
    if (req.gram_panchayat_id) demandQuery.gram_panchayat = req.gram_panchayat_id;

    const demand = await Demand.findOne(demandQuery).populate('property');
    if (!demand) return res.status(404).json({ detail: 'Demand not found' });

    const amount = parseFloat(amount_paid);
    const new_paid_amount = (demand.paid_amount || 0) + amount;
    const new_balance = Math.max(0, (demand.net_demand || 0) - new_paid_amount);

    demand.paid_amount = new_paid_amount;
    demand.balance = new_balance;
    demand.status = new_balance <= 0 ? 'paid' : 'partial';
    await demand.save();

    const receipt_no = `RCPT-${Date.now()}`;
    const payment = new Payment({
      gram_panchayat: req.gram_panchayat_id,
      demand: demand._id,
      amount: amount,
      payment_mode,
      receipt_no
    });
    await payment.save();

    // Get GP details for receipt
    let gpDetails = {};
    if (req.gram_panchayat_id) {
      const gp = await GramPanchayat.findById(req.gram_panchayat_id);
      if (gp) gpDetails = { village: gp.village, taluka: gp.taluka, district: gp.district };
    }

    res.json({
      message: 'Payment recorded',
      receipt_no,
      receipt_details: {
        owner_name: demand.property?.owner_name || 'N/A',
        owner_name_mr: demand.property?.owner_name_mr || 'N/A',
        house_no: demand.property?.house_no || 'N/A',
        property_id: demand.property?.property_id || 'N/A',
        amount_paid: amount,
        total_demand: demand.net_demand,
        balance: new_balance,
        date: new Date().toLocaleDateString('en-IN'),
        payment_mode: payment_mode,
        financial_year: demand.financial_year,
        village: gpDetails.village || process.env.DEFAULT_VILLAGE || 'शिवणे',
        taluka: gpDetails.taluka || process.env.DEFAULT_TALUKA || 'हवेली',
        district: gpDetails.district || process.env.DEFAULT_DISTRICT || 'पुणे'
      }
    });
  } catch (err) {
    console.error('Payment Error:', err);
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Tax Rate Endpoints (Tenant-Scoped) ---
// ==========================================

app.get('/api/tax-rates', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const query = {};
    if (req.gram_panchayat_id) query.gram_panchayat = req.gram_panchayat_id;
    const rates = await TaxRate.find(query).sort({ financial_year: -1 });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/api/tax-rates', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!req.gram_panchayat_id) {
      return res.status(400).json({ detail: 'Gram Panchayat assignment required' });
    }
    const newRate = new TaxRate({ ...req.body, gram_panchayat: req.gram_panchayat_id });
    const saved = await newRate.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/tax-rates/:id/lock', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.gram_panchayat_id) query.gram_panchayat = req.gram_panchayat_id;
    const locked = await TaxRate.findOneAndUpdate(query, { is_locked: true }, { new: true });
    if (!locked) return res.status(404).json({ detail: 'Tax rate not found or access denied' });
    res.json(locked);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- User Management (Tenant-Scoped) ---
// ==========================================

app.get('/api/users', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'super_admin') {
      // Super admin sees all users, or filtered by gp_id if provided
      if (req.gram_panchayat_id) query.gram_panchayat = req.gram_panchayat_id;
    } else {
      // Regular users only see users in their GP
      query.gram_panchayat = req.gram_panchayat_id;
    }
    const users = await User.find(query).populate('gram_panchayat').sort({ created_at: -1 });
    const mappedUsers = users.map(u => ({
      id: u._id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      village: u.village,
      created_at: u.created_at,
      gram_panchayat_id: u.gram_panchayat?._id || null,
      gram_panchayat_name: u.gram_panchayat?.name || null
    }));
    res.json(mappedUsers);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.put('/api/users/:id/role', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    // Verify the user belongs to the same GP (unless super_admin)
    const query = { _id: req.params.id };
    if (req.user.role !== 'super_admin' && req.gram_panchayat_id) {
      query.gram_panchayat = req.gram_panchayat_id;
    }
    const updated = await User.findOneAndUpdate(query, { role }, { new: true });
    if (!updated) return res.status(404).json({ detail: 'User not found or access denied' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Audit Log Endpoints (Tenant-Scoped) ---
// ==========================================

app.get('/api/audit-logs', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const { entity_type } = req.query;
    let query = {};
    if (req.gram_panchayat_id) query.gram_panchayat = req.gram_panchayat_id;
    if (entity_type && entity_type !== 'all') query.entity_type = entity_type;
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Dashboard (Tenant-Scoped) ---
// ==========================================

app.get('/api/dashboard/stats', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const gpFilter = req.gram_panchayat_id ? { gram_panchayat: mongoose.Types.ObjectId.createFromHexString(req.gram_panchayat_id.toString()) } : {};

    const totalProps = await Property.countDocuments(gpFilter);
    const demandStats = await Demand.aggregate([
      { $match: gpFilter },
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

app.get('/api/dashboard/ward-summary', authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    const matchStage = req.gram_panchayat_id 
      ? { $match: { gram_panchayat: mongoose.Types.ObjectId.createFromHexString(req.gram_panchayat_id.toString()) } }
      : { $match: {} };

    const summary = await Demand.aggregate([
      matchStage,
      { $lookup: { from: 'properties', localField: 'property', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      {
        $group: {
          _id: '$p.ward_no',
          demand: { $sum: '$total_tax' },
          collection: { $sum: '$paid_amount' },
          arrears: { $sum: '$balance' }
        }
      },
      { $project: { ward: '$_id', demand: 1, collection: 1, arrears: 1, _id: 0 } },
      { $sort: { ward: 1 } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Seeding (Tenant-Scoped) ---
// ==========================================

app.post(['/api/seed-data', '/api/seed-demo-data'], authenticateToken, tenantMiddleware, async (req, res) => {
  try {
    if (!req.gram_panchayat_id) {
      return res.status(400).json({ detail: 'Gram Panchayat assignment required to seed data' });
    }

    const gp = await GramPanchayat.findById(req.gram_panchayat_id);

    const demo = [
      { house_no: '101', ward_no: '1', owner_name: 'Rahul Patil', owner_name_mr: 'राहुल पाटील', built_up_area_sqm: 120, usage_type: 'residential' },
      { house_no: '102', ward_no: '1', owner_name: 'Suresh Jadav', owner_name_mr: 'सुरेश जाधव', built_up_area_sqm: 200, usage_type: 'commercial' },
      { house_no: '201', ward_no: '2', owner_name: 'Priya Shinde', owner_name_mr: 'प्रिया शिंदे', built_up_area_sqm: 150, usage_type: 'mixed' }
    ];
    for (const d of demo) {
      const pid = `GP-2024-${Math.floor(100000 + Math.random() * 900000)}`;
      await new Property({
        ...d,
        property_id: pid,
        gram_panchayat: req.gram_panchayat_id,
        village: gp ? gp.village : 'कळंबा बु.'
      }).save();
    }
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ==========================================
// --- Migration Utility (One-Time) ---
// ==========================================

// This endpoint migrates existing data to a default GP.
// Run once after deployment to assign existing data to a GP.
app.post('/api/migrate/assign-default-gp', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { gp_id } = req.body;
    if (!gp_id) return res.status(400).json({ detail: 'gp_id is required' });

    const gp = await GramPanchayat.findById(gp_id);
    if (!gp) return res.status(404).json({ detail: 'Gram Panchayat not found' });

    // Assign unassigned documents to this GP
    const propResult = await Property.updateMany({ gram_panchayat: { $exists: false } }, { gram_panchayat: gp_id });
    const propResult2 = await Property.updateMany({ gram_panchayat: null }, { gram_panchayat: gp_id });
    const demandResult = await Demand.updateMany({ gram_panchayat: { $exists: false } }, { gram_panchayat: gp_id });
    const demandResult2 = await Demand.updateMany({ gram_panchayat: null }, { gram_panchayat: gp_id });
    const paymentResult = await Payment.updateMany({ gram_panchayat: { $exists: false } }, { gram_panchayat: gp_id });
    const paymentResult2 = await Payment.updateMany({ gram_panchayat: null }, { gram_panchayat: gp_id });
    const taxResult = await TaxRate.updateMany({ gram_panchayat: { $exists: false } }, { gram_panchayat: gp_id });
    const taxResult2 = await TaxRate.updateMany({ gram_panchayat: null }, { gram_panchayat: gp_id });
    const userResult = await User.updateMany(
      { gram_panchayat: null, role: { $ne: 'super_admin' } },
      { gram_panchayat: gp_id }
    );

    res.json({
      message: 'Migration complete',
      results: {
        properties: propResult.modifiedCount + propResult2.modifiedCount,
        demands: demandResult.modifiedCount + demandResult2.modifiedCount,
        payments: paymentResult.modifiedCount + paymentResult2.modifiedCount,
        tax_rates: taxResult.modifiedCount + taxResult2.modifiedCount,
        users: userResult.modifiedCount
      }
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
