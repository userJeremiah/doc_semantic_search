const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Login as admin to get token
async function loginAsAdmin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@hospital.com',
      password: 'password123'
    });
    
    console.log('✅ Logged in as admin');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Initialize Algolia index with sample data
async function initializeData(token) {
  try {
    console.log('\n📦 Loading sample data into Algolia...');
    
    const response = await axios.post(
      `${BASE_URL}/admin/initialize`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Sample data loaded successfully!');
    console.log(`   Records indexed: ${response.data.recordsIndexed}`);
    console.log(`   Index: ${response.data.indexName}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to load data:', error.response?.data || error.message);
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🚀 Loading sample hospital data into Algolia\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Login
    const token = await loginAsAdmin();
    
    // Step 2: Load data
    await initializeData(token);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All done! Your Algolia index is ready for search.');
    console.log('\n💡 Next steps:');
    console.log('   1. Try searching: node scripts/test-search.js');
    console.log('   2. Or run E2E tests: node scripts/test-end-to-end.js');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();
