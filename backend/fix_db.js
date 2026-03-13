require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const GramPanchayat = mongoose.connection.collection('grampanchayats');
  const gp = await GramPanchayat.findOne({});
  let gpId = null;
  
  if (!gp) {
    const res = await GramPanchayat.insertOne({
      name: 'Default GP',
      village: 'Shivane',
      taluka: 'Haveli',
      district: 'Pune',
      state: 'Maharashtra',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    gpId = res.insertedId;
    console.log("Created Default GP:", gpId);
  } else {
    gpId = gp._id;
    console.log("Found existing GP:", gpId);
  }

  const collectionsToUpdate = ['properties', 'demands', 'payments', 'taxrates'];
  for (const coll of collectionsToUpdate) {
    const res1 = await mongoose.connection.collection(coll).updateMany(
      { gram_panchayat: { $exists: false } },
      { $set: { gram_panchayat: gpId } }
    );
    const res2 = await mongoose.connection.collection(coll).updateMany(
      { gram_panchayat: null },
      { $set: { gram_panchayat: gpId } }
    );
    console.log(`Updated ${coll}: missing=${res1.modifiedCount}, null=${res2.modifiedCount}`);
  }

  const res3 = await mongoose.connection.collection('users').updateMany(
    { gram_panchayat: { $exists: false }, role: { $ne: 'super_admin' } },
    { $set: { gram_panchayat: gpId } }
  );
  console.log(`Updated users missing GP: ${res3.modifiedCount}`);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
