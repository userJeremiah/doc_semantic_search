const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let serverHealthy = false;

// Wait for server to be ready
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get('http://localhost:3000/health');
      console.log('✅ Server is ready!\n');
      return true;
    } catch (error) {
      if (i === 0) {
        console.log('⏳ Waiting for server to start...');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Login as admin
async function loginAsAdmin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@hospital.com',
      password: 'password123'
    });
    
    console.log('✅ Logged in as admin');
    console.log(`   User: ${response.data.user.email}`);
    console.log(`   Role: ${response.data.user.role}`);
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.error?.message || error.message);
    throw error;
  }
}

// Initialize Algolia index with sample data
async function initializeData(token) {
  try {
    console.log('\n📦 Loading sample data into Algolia...');
    console.log('   This may take a moment...\n');
    
    const response = await axios.post(
      `${BASE_URL}/admin/initialize`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('✅ Sample data loaded successfully!');
    console.log(`\n📊 Statistics:`);
    console.log(`   Patient records: ${response.data.stats.patientRecords}`);
    console.log(`   Medical records: ${response.data.stats.medicalRecords}`);
    console.log(`   Total records: ${response.data.stats.totalRecords}`);
    console.log(`   Departments: ${response.data.stats.departments.join(', ')}`);
    console.log(`   Record types: ${response.data.stats.recordTypes.join(', ')}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to load data:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.details) {
      console.error('   Details:', error.response.data.error.details);
    }
    throw error;
  }
}

// Test a search query
async function testSearch(token) {
  try {
    console.log('\n🔍 Testing search functionality...');
    
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: 'diabetes' },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Search successful!');
    console.log(`   Found ${response.data.totalHits} results for "diabetes"`);
    if (response.data.hits.length > 0) {
      console.log(`   First result: ${response.data.hits[0].patient_name}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Search failed:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Algolia Setup & Data Loading Script');
  console.log('=' .repeat(60));
  console.log('\nThis script will:');
  console.log('  1. Wait for the server to be ready');
  console.log('  2. Login as admin');
  console.log('  3. Load sample hospital data into Algolia');
  console.log('  4. Test search functionality');
  console.log('\n' + '='.repeat(60) + '\n');
  
  try {
    // Step 1: Wait for server
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('\n❌ Server is not responding!');
      console.error('\n💡 Please start the server in another terminal:');
      console.error('   node server.js');
      process.exit(1);
    }
    
    // Step 2: Login
    const token = await loginAsAdmin();
    
    // Step 3: Load data
    await initializeData(token);
    
    // Step 4: Test search
    await testSearch(token);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All done! Your Algolia index is ready.');
    console.log('\n💡 Next steps:');
    console.log('   • Try different searches in your browser or API client');
    console.log('   • Check the Algolia dashboard to see your indexed data');
    console.log('   • Run the E2E tests: node scripts/test-end-to-end.js');
    console.log('=' .repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Script failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   • The server is running (node server.js)');
    console.error('   • Your Algolia credentials in .env are correct');
    console.error('   • You have network access to Algolia');
    process.exit(1);
  }
}

main();
