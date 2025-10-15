require('dotenv').config();
const { algoliasearch } = require('algoliasearch');
const { samplePatients, sampleMedicalRecords } = require('../models/sampleData');

async function pushDataToAlgolia() {
  console.log('🚀 Direct Algolia Data Push Script');
  console.log('=' .repeat(60));
  
  try {
    // Initialize Algolia client with ADMIN key
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID,
      process.env.ALGOLIA_ADMIN_KEY
    );
    
    const indexName = process.env.ALGOLIA_INDEX_NAME || 'test_hospital_records';
    
    console.log(`\n📊 Connected to Algolia`);
    console.log(`   App ID: ${process.env.ALGOLIA_APP_ID}`);
    console.log(`   Index: ${indexName}`);
    
    // Prepare patient records
    console.log('\n📦 Preparing patient records...');
    const patientRecords = samplePatients.map(patient => ({
      objectID: patient.id,
      patient_id: patient.patientId,
      patient_name: patient.patientName,
      medical_record_number: patient.medicalRecordNumber,
      record_type: 'patient_record',
      department: patient.department,
      doctor_name: patient.attendingPhysician,
      date_created: patient.admissionDate || patient.createdAt,
      last_updated: patient.updatedAt,
      diagnosis: patient.medicalHistory.join(', '),
      status: patient.status,
      priority_level: patient.priorityLevel,
      summary: `Patient: ${patient.patientName}, Department: ${patient.department}`,
      notes: `Allergies: ${patient.allergies.join(', ')}`,
      symptoms: [],
      procedure_name: '',
      medications: patient.currentMedications,
      lab_tests: [],
      patient_age_group: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() < 18 ? 'pediatric' : 'adult',
      gender: patient.gender,
      insurance_type: patient.insuranceInfo?.provider || 'Unknown',
      priority_score: 50,
      relevance_score: 50,
      timestamp: new Date(patient.createdAt).getTime(),
      _department: patient.department,
      _patient_id: patient.patientId,
      _sensitivity_level: patient.sensitivityLevel
    }));
    
    console.log(`   ✓ Prepared ${patientRecords.length} patient records`);
    
    // Prepare medical records
    console.log('\n📦 Preparing medical records...');
    const medicalRecords = sampleMedicalRecords.map(record => ({
      objectID: record.id,
      patient_id: record.patientId,
      patient_name: samplePatients.find(p => p.patientId === record.patientId)?.patientName || 'Unknown',
      medical_record_number: samplePatients.find(p => p.patientId === record.patientId)?.medicalRecordNumber || 'Unknown',
      record_type: record.recordType,
      department: record.department,
      doctor_name: record.doctorName,
      date_created: record.dateCreated,
      last_updated: record.dateCreated,
      diagnosis: record.diagnosis,
      status: record.status,
      priority_level: record.priorityLevel,
      summary: record.summary,
      notes: record.notes || '',
      symptoms: record.symptoms || [],
      procedure_name: record.procedures?.join(', ') || '',
      medications: record.medications || [],
      lab_tests: record.labResults ? Object.keys(record.labResults) : [],
      patient_age_group: 'adult',
      gender: 'Unknown',
      insurance_type: 'Unknown',
      priority_score: record.priorityLevel === 'critical' ? 100 : 50,
      relevance_score: 50,
      timestamp: new Date(record.dateCreated).getTime(),
      _department: record.department,
      _patient_id: record.patientId,
      _sensitivity_level: record.sensitivityLevel || 'normal'
    }));
    
    console.log(`   ✓ Prepared ${medicalRecords.length} medical records`);
    
    // Combine all records
    const allRecords = [...patientRecords, ...medicalRecords];
    console.log(`\n📤 Total records to push: ${allRecords.length}`);
    
    // Push to Algolia
    console.log('\n⏳ Pushing data to Algolia...');
    console.log('   This may take a moment...\n');
    
    const response = await client.saveObjects({
      indexName: indexName,
      objects: allRecords
    });
    
    console.log('✅ Data pushed successfully!');
    console.log(`   Response:`, JSON.stringify(response, null, 2));
    
    // Give Algolia a moment to index
    console.log('\n⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Indexing should be completed!');
    
    // Verify the data
    console.log('\n🔍 Verifying indexed data...');
    const searchResult = await client.searchSingleIndex({
      indexName: indexName,
      searchParams: {
        query: '',
        hitsPerPage: 0
      }
    });
    
    console.log(`✅ Verification complete!`);
    console.log(`   Total records in index: ${searchResult.nbHits}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Your Algolia index is now populated.');
    console.log('\n📊 Summary:');
    console.log(`   • Patient records: ${patientRecords.length}`);
    console.log(`   • Medical records: ${medicalRecords.length}`);
    console.log(`   • Total indexed: ${searchResult.nbHits}`);
    console.log(`   • Index name: ${indexName}`);
    console.log('\n💡 Next steps:');
    console.log('   • Check your Algolia dashboard to see the data');
    console.log('   • Test search: node scripts/test-end-to-end.js');
    console.log('   • Or start the server and try API calls');
    console.log('=' .repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error pushing data to Algolia:');
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.message) {
      console.error('Details:', error.message);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('   • Check your ALGOLIA_ADMIN_KEY in .env');
    console.error('   • Verify your ALGOLIA_APP_ID is correct');
    console.error('   • Make sure you have internet connection');
    console.error('   • Check if your Algolia plan allows this many records');
    process.exit(1);
  }
}

pushDataToAlgolia();
