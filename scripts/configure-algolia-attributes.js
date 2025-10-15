require('dotenv').config();
const { algoliasearch } = require('algoliasearch');

async function configureAlgoliaAttributes() {
  console.log('⚙️  Configuring Algolia Search Attributes');
  console.log('=' .repeat(60));
  
  try {
    // Initialize Algolia client with ADMIN key
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID,
      process.env.ALGOLIA_ADMIN_KEY
    );
    
    const indexName = process.env.ALGOLIA_INDEX_NAME || 'test_hospital_records';
    
    console.log(`\n📊 Configuring index: ${indexName}`);
    
    // Configure searchable attributes with priority (primary, secondary, tertiary)
    const settings = {
      searchableAttributes: [
        // PRIMARY attributes - Most important for search
        'unordered(patient_name)',           // Patient names (exact matches prioritized)
        'unordered(medical_record_number)',  // Medical record numbers (exact)
        'unordered(patient_id)',             // Patient IDs (exact)
        
        // SECONDARY attributes - Important but less than primary
        'diagnosis',                         // Medical diagnoses
        'doctor_name',                       // Doctor names
        'department',                        // Department names
        
        // TERTIARY attributes - Additional searchable content
        'notes',                            // Clinical notes
        'symptoms',                         // Symptoms list
        'summary',                          // Record summaries
        'procedure_name',                   // Procedure names
        'medication_name',                  // Medication names
        'lab_test_name'                     // Lab test names
      ],
      
      // Attributes for faceting and filtering
      attributesForFaceting: [
        'searchable(department)',
        'searchable(record_type)',
        'searchable(doctor_name)',
        'filterOnly(date_range)',
        'filterOnly(status)',
        'filterOnly(priority_level)',
        'filterOnly(patient_age_group)',
        'filterOnly(gender)',
        'filterOnly(insurance_type)',
        'filterOnly(_department)',
        'filterOnly(_sensitivity_level)'
      ],
      
      // Custom ranking for relevance
      customRanking: [
        'desc(priority_score)',
        'desc(timestamp)',
        'desc(relevance_score)'
      ],
      
      // Attributes to retrieve in results
      attributesToRetrieve: [
        'objectID',
        'patient_id',
        'patient_name',
        'medical_record_number',
        'record_type',
        'department',
        'doctor_name',
        'date_created',
        'last_updated',
        'diagnosis',
        'status',
        'priority_level',
        'summary',
        'notes',
        'symptoms',
        'procedure_name',
        'medications'
      ],
      
      // Highlighting configuration
      attributesToHighlight: [
        'patient_name',
        'diagnosis',
        'doctor_name',
        'notes',
        'summary'
      ],
      
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      
      // Typo tolerance
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      typoTolerance: true,
      
      // Advanced settings
      hitsPerPage: 20,
      maxValuesPerFacet: 100,
      
      // Relevance and ranking
      attributeCriteriaComputedByMinProximity: true,
      ignorePlurals: true,
      removeStopWords: ['en'],
      
      // Pagination
      paginationLimitedTo: 1000,
      
      // Query rules settings
      enableRules: true,
      
      // Replica settings
      replicas: []
    };
    
    console.log('\n📝 Settings to apply:');
    console.log('\n🔍 Searchable Attributes (by priority):');
    console.log('   PRIMARY (unordered - exact matches):');
    console.log('     • patient_name');
    console.log('     • medical_record_number');
    console.log('     • patient_id');
    console.log('   SECONDARY (ordered by relevance):');
    console.log('     • diagnosis');
    console.log('     • doctor_name');
    console.log('     • department');
    console.log('   TERTIARY (additional context):');
    console.log('     • notes, symptoms, summary');
    console.log('     • procedure_name, medication_name');
    console.log('     • lab_test_name');
    
    console.log('\n🏷️  Facets (for filtering):');
    console.log('     • department, record_type, doctor_name (searchable)');
    console.log('     • status, priority_level, date_range (filter only)');
    
    console.log('\n⏳ Applying settings to Algolia...');
    
    const response = await client.setSettings({
      indexName: indexName,
      indexSettings: settings
    });
    
    console.log('✅ Settings applied successfully!');
    console.log(`   Task ID: ${response.taskID}`);
    
    // Wait for the task to complete
    console.log('\n⏳ Waiting for configuration to complete...');
    if (response.taskID) {
      await client.waitForTask({
        indexName: indexName,
        taskID: response.taskID
      });
      console.log('✅ Configuration completed!');
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ Configuration should be completed!');
    }
    
    // Verify settings
    console.log('\n🔍 Verifying settings...');
    const currentSettings = await client.getSettings({
      indexName: indexName
    });
    
    console.log('✅ Current searchable attributes:');
    currentSettings.searchableAttributes?.slice(0, 6).forEach((attr, i) => {
      console.log(`   ${i + 1}. ${attr}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Algolia index configured with:');
    console.log('\n✓ Primary attributes: Patient name, MRN, Patient ID');
    console.log('✓ Secondary attributes: Diagnosis, Doctor, Department');
    console.log('✓ Tertiary attributes: Notes, Symptoms, Procedures');
    console.log('✓ Facets: Department, Record type, Status, Priority');
    console.log('✓ Custom ranking: Priority > Recency > Relevance');
    console.log('\n💡 Your Algolia index is now optimized for healthcare search!');
    console.log('   Check your Algolia dashboard to see the updated configuration.');
    console.log('=' .repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error configuring Algolia:');
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('   • Check your ALGOLIA_ADMIN_KEY in .env');
    console.error('   • Verify your ALGOLIA_APP_ID is correct');
    console.error('   • Make sure you have admin permissions');
    process.exit(1);
  }
}

configureAlgoliaAttributes();
