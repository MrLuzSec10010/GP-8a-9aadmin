require('dotenv').config();
const mongoose = require('mongoose');

async function checkProperty() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Property = mongoose.connection.db.collection('properties');
    const props = await Property.find({ property_id: 'PROP-20260311-A219E7DE' }).toArray();
    console.log(JSON.stringify(props, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkProperty();
