require('dotenv').config();
const mongoose = require('mongoose');

async function testLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Property = mongoose.model('Property', new mongoose.Schema({
      property_id: String,
      built_up_area_sqm: Number,
      usage_type: String,
      water_connection: Boolean
    }));

    const Demand = mongoose.model('Demand', new mongoose.Schema({
      property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
      financial_year: String,
      house_tax: Number,
      water_tax: Number,
      total_tax: Number,
      arrears: Number,
      net_demand: Number,
      paid_amount: { type: Number, default: 0 },
      balance: Number,
      status: String,
      created_at: { type: Date, default: Date.now }
    }));

    const fy = '2024-2025';
    const props = await Property.find({});
    console.log(`Found ${props.length} properties.`);

    let generated = 0;
    for (const prop of props) {
      const exists = await Demand.findOne({ property: prop._id, financial_year: fy });
      if (exists) continue;

      const area = prop.built_up_area_sqm || 0;
      let rate_val = 2;
      if (prop.usage_type === 'commercial') rate_val = 5;
      else if (prop.usage_type === 'mixed') rate_val = 3;

      const house_tax = area * rate_val;
      const water_tax = prop.water_connection ? 500 : 0;
      const total_tax = house_tax + water_tax;

      const previousDemands = await Demand.find({ property: prop._id }).sort({ created_at: -1 });
      const arrears = previousDemands.length > 0 ? previousDemands[0].balance : 0;
      const net_demand = total_tax + arrears;

      const newDemand = new Demand({
        property: prop._id,
        financial_year: fy,
        house_tax: Math.round(house_tax * 100) / 100,
        water_tax: Math.round(water_tax * 100) / 100,
        total_tax: Math.round(total_tax * 100) / 100,
        arrears: Math.round(arrears * 100) / 100,
        net_demand: Math.round(net_demand * 100) / 100,
        paid_amount: 0,
        balance: Math.round(net_demand * 100) / 100,
        status: 'unpaid'
      });

      await newDemand.save();
      generated++;
    }

    console.log(`Generated ${generated} demands for ${fy}.`);

    // Check one demand
    const sample = await Demand.findOne({ financial_year: fy }).populate('property');
    if (sample) {
      console.log('Sample Demand:');
      console.log('- Property:', sample.property.property_id);
      console.log('- House No:', sample.property.house_no);
      console.log('- Net Demand:', sample.net_demand);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testLogic();
