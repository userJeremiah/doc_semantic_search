const axios = require('axios');

async function testServer() {
  try {
    console.log('🏥 Testing if server is running...\n');
    
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running!');
    console.log('Response:', response.data);
    
    return true;
  } catch (error) {
    console.error('❌ Server is not responding:', error.message);
    console.error('\n💡 Please start the server first with: node server.js');
    return false;
  }
}

testServer();
