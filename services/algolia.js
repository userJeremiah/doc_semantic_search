const { algoliasearch } = require('algoliasearch');

class AlgoliaService {
  constructor() {
    // Handle test environment with mocks
    if (process.env.NODE_ENV === 'test' || 
        process.env.ALGOLIA_APP_ID === 'test-app-id') {
      
      // Create mock clients for testing
      const mockIndex = {
        search: async () => ({ hits: [], nbHits: 0 }),
        setSettings: async () => ({}),
        saveObjects: async () => ({}),
        clearObjects: async () => ({}),
        waitForCompletion: async () => ({})
      };
      
      this.client = { initIndex: () => mockIndex };
      this.adminClient = { initIndex: () => mockIndex };
      this.index = mockIndex;
      this.adminIndex = mockIndex;
      
      console.log('🧪 Using mock Algolia client for testing');
    } else {
      // Production Algolia client
      this.client = algoliasearch(
        process.env.ALGOLIA_APP_ID,
        process.env.ALGOLIA_API_KEY
      );
      
      this.adminClient = algoliasearch(
        process.env.ALGOLIA_APP_ID,
        process.env.ALGOLIA_ADMIN_KEY
      );
      
      this.index = this.client.initIndex(this.indexName);
      this.adminIndex = this.adminClient.initIndex(this.indexName);
    }
    
    this.indexName = process.env.ALGOLIA_INDEX_NAME || 'hospital_patient_records';
  }

  /**
   * Initialize the Algolia index with proper settings for healthcare search
   */
  async initializeIndex() {
    try {
      console.log('🔍 Configuring Algolia index for healthcare search...');

      // Configure index settings optimized for healthcare data
      await this.adminIndex.setSettings({
        // Searchable attributes with priority order
        searchableAttributes: [
          'patient_name',
          'patient_id', 
          'medical_record_number',
          'diagnosis',
          'doctor_name',
          'department',
          'procedure_name',
          'medication_name',
          'lab_test_name',
          'notes',
          'symptoms'
        ],
        
        // Attributes for faceted search and filtering
        attributesForFaceting: [
          'department',
          'record_type',
          'doctor_name',
          'date_range',
          'status',
          'priority_level',
          'patient_age_group',
          'gender',
          'insurance_type'
        ],
        
        // Custom ranking to prioritize recent and relevant records
        customRanking: [
          'desc(priority_score)',
          'desc(timestamp)',
          'desc(relevance_score)'
        ],
        
        // Highlighting for search results
        attributesToHighlight: [
          'patient_name',
          'diagnosis',
          'doctor_name',
          'notes',
          'symptoms'
        ],
        
        // Attributes to retrieve in search results
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
          'summary'
        ],
        
        // Typo tolerance for medical terms
        typoTolerance: {
          minWordSizeForTypos: {
            oneTypo: 4,
            twoTypos: 8
          }
        },
        
        // Advanced settings
        hitsPerPage: 20,
        maxValuesPerFacet: 100,
        
        // Synonyms for medical terms
        synonyms: [
          {
            type: 'synonym',
            synonyms: ['heart attack', 'myocardial infarction', 'MI', 'cardiac arrest']
          },
          {
            type: 'synonym', 
            synonyms: ['diabetes', 'diabetes mellitus', 'DM', 'diabetic']
          },
          {
            type: 'synonym',
            synonyms: ['pneumonia', 'lung infection', 'respiratory infection']
          },
          {
            type: 'synonym',
            synonyms: ['CT scan', 'computed tomography', 'CAT scan']
          },
          {
            type: 'synonym',
            synonyms: ['MRI', 'magnetic resonance imaging', 'MR scan']
          }
        ]
      });

      console.log('✅ Algolia index configured successfully');
      return true;
    } catch (error) {
      console.error('❌ Error configuring Algolia index:', error);
      throw error;
    }
  }

  /**
   * Index patient records for search
   */
  async indexPatientRecord(record) {
    try {
      // Enhance record with search-optimized fields
      const searchableRecord = {
        objectID: record.id,
        patient_id: record.patientId,
        patient_name: record.patientName,
        medical_record_number: record.medicalRecordNumber,
        record_type: record.recordType,
        department: record.department,
        doctor_name: record.doctorName,
        date_created: record.dateCreated,
        last_updated: record.lastUpdated,
        diagnosis: record.diagnosis,
        status: record.status,
        priority_level: record.priorityLevel || 'normal',
        summary: record.summary,
        
        // Searchable content fields
        notes: record.notes || '',
        symptoms: record.symptoms || '',
        procedure_name: record.procedureName || '',
        medication_name: record.medications?.join(', ') || '',
        lab_test_name: record.labTests?.join(', ') || '',
        
        // Faceting fields
        patient_age_group: this.getAgeGroup(record.patientAge),
        gender: record.gender,
        insurance_type: record.insuranceType,
        date_range: this.getDateRange(record.dateCreated),
        
        // Scoring fields
        priority_score: this.getPriorityScore(record.priorityLevel),
        relevance_score: this.calculateRelevanceScore(record),
        timestamp: new Date(record.dateCreated).getTime(),
        
        // Security metadata (for internal use)
        _department: record.department,
        _patient_id: record.patientId,
        _sensitivity_level: record.sensitivityLevel || 'normal'
      };

      await this.adminIndex.saveObject(searchableRecord);
      console.log(`✅ Indexed record: ${record.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Error indexing record ${record.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch index multiple records
   */
  async batchIndexRecords(records) {
    try {
      const searchableRecords = records.map(record => ({
        objectID: record.id,
        patient_id: record.patientId,
        patient_name: record.patientName,
        medical_record_number: record.medicalRecordNumber,
        record_type: record.recordType,
        department: record.department,
        doctor_name: record.doctorName,
        date_created: record.dateCreated,
        last_updated: record.lastUpdated,
        diagnosis: record.diagnosis,
        status: record.status,
        priority_level: record.priorityLevel || 'normal',
        summary: record.summary,
        notes: record.notes || '',
        symptoms: record.symptoms || '',
        procedure_name: record.procedureName || '',
        medication_name: record.medications?.join(', ') || '',
        lab_test_name: record.labTests?.join(', ') || '',
        patient_age_group: this.getAgeGroup(record.patientAge),
        gender: record.gender,
        insurance_type: record.insuranceType,
        date_range: this.getDateRange(record.dateCreated),
        priority_score: this.getPriorityScore(record.priorityLevel),
        relevance_score: this.calculateRelevanceScore(record),
        timestamp: new Date(record.dateCreated).getTime(),
        _department: record.department,
        _patient_id: record.patientId,
        _sensitivity_level: record.sensitivityLevel || 'normal'
      }));

      await this.adminIndex.saveObjects(searchableRecords);
      console.log(`✅ Batch indexed ${records.length} records`);
      return true;
    } catch (error) {
      console.error('❌ Error batch indexing records:', error);
      throw error;
    }
  }

  /**
   * Search patient records with semantic search
   */
  async searchRecords(query, options = {}) {
    try {
      const searchParams = {
        query,
        hitsPerPage: options.limit || 20,
        page: options.page || 0,
        
        // Apply filters if provided
        filters: this.buildFilters(options.filters),
        
        // Facets for filtering UI
        facets: options.facets || [
          'department',
          'record_type',
          'doctor_name',
          'status',
          'priority_level'
        ],
        
        // Highlighting
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        
        // Additional search parameters
        typoTolerance: options.typoTolerance !== false,
        ignorePlurals: true,
        removeStopWords: true
      };

      const results = await this.index.search(searchParams);
      
      return {
        hits: results.hits,
        totalHits: results.nbHits,
        totalPages: results.nbPages,
        currentPage: results.page,
        facets: results.facets,
        processingTimeMS: results.processingTimeMS
      };
    } catch (error) {
      console.error('❌ Error searching records:', error);
      throw error;
    }
  }

  /**
   * Get suggestions for autocomplete
   */
  async getSuggestions(query, type = 'all') {
    try {
      const suggestions = await this.index.search({
        query,
        hitsPerPage: 10,
        attributesToRetrieve: this.getSuggestionAttributes(type),
        typoTolerance: false
      });

      return suggestions.hits.map(hit => ({
        text: this.extractSuggestionText(hit, type),
        type: type,
        department: hit.department
      }));
    } catch (error) {
      console.error('❌ Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  getAgeGroup(age) {
    if (age < 18) return 'pediatric';
    if (age < 65) return 'adult';
    return 'geriatric';
  }

  getDateRange(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return 'last_week';
    if (diffDays <= 30) return 'last_month';
    if (diffDays <= 90) return 'last_quarter';
    return 'older';
  }

  getPriorityScore(priorityLevel) {
    const scores = {
      'critical': 100,
      'high': 75,
      'normal': 50,
      'low': 25
    };
    return scores[priorityLevel] || 50;
  }

  calculateRelevanceScore(record) {
    let score = 50; // Base score
    
    // Boost recent records
    const daysSinceCreated = Math.floor((Date.now() - new Date(record.dateCreated)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += 20;
    else if (daysSinceCreated <= 30) score += 10;
    
    // Boost by priority
    if (record.priorityLevel === 'critical') score += 30;
    else if (record.priorityLevel === 'high') score += 15;
    
    return score;
  }

  buildFilters(filters = {}) {
    const filterParts = [];
    
    if (filters.department) {
      filterParts.push(`department:"${filters.department}"`);
    }
    
    if (filters.recordType) {
      filterParts.push(`record_type:"${filters.recordType}"`);
    }
    
    if (filters.dateRange) {
      filterParts.push(`date_range:"${filters.dateRange}"`);
    }
    
    if (filters.priorityLevel) {
      filterParts.push(`priority_level:"${filters.priorityLevel}"`);
    }
    
    return filterParts.join(' AND ');
  }

  getSuggestionAttributes(type) {
    const attributeMap = {
      'patient': ['patient_name', 'medical_record_number'],
      'doctor': ['doctor_name'],
      'diagnosis': ['diagnosis'],
      'all': ['patient_name', 'doctor_name', 'diagnosis', 'medical_record_number']
    };
    
    return attributeMap[type] || attributeMap['all'];
  }

  extractSuggestionText(hit, type) {
    switch (type) {
      case 'patient':
        return hit.patient_name || hit.medical_record_number;
      case 'doctor':
        return hit.doctor_name;
      case 'diagnosis':
        return hit.diagnosis;
      default:
        return hit.patient_name || hit.doctor_name || hit.diagnosis;
    }
  }
}

module.exports = AlgoliaService;