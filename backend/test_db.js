require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const demands = await mongoose.connection.collection('demands').find().toArray();
  console.log('Total demands:', demands.length);
  const missingGp = demands.filter(d => !d.gram_panchayat);
  console.log('Demands missing gram_panchayat:', missingGp.length);
  if (missingGp.length > 0) {
    console.log('Example missing GP:', missingGp[0]);
  }
  process.exit(0);
});
