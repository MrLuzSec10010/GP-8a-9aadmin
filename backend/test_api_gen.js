const axios = require('axios');

async function testGenerate() {
  try {
    const loginRes = await axios.post('http://localhost:5001/api/auth/verify-otp', {
      phone: '7498086090',
      otp: '123456'
    });
    const token = loginRes.data.access_token;

    console.log('Logged in, generating demand for 2024-2025...');
    const genRes = await axios.post('http://localhost:5001/api/demand/generate',
      { financial_year: '2024-2025' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Generation Result:', genRes.data);

    console.log('Fetching demand list...');
    const listRes = await axios.get('http://localhost:5001/api/demand/list?financial_year=2024-2025',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Total Demands Found:', listRes.data.length);
    if (listRes.data.length > 0) {
      console.log('First Record Property Detail:', listRes.data[0].property_details);
      console.log('First Record Balance:', listRes.data[0].balance);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

testGenerate();
