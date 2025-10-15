const PermitService = require('../services/permit');
const AlgoliaService = require('../services/algolia');

class SecureSearchService {
  constructor() {
    this.permitService = new PermitService();
    this.algoliaService = new AlgoliaService();
  }

  /**
   * Perform a secure search that respects access control policies
   */
  async secureSearch(user, query, options = {}) {
    try {
      console.log(`🔍 Secure search request from user ${user.id}: "${query}"`);
      
      // Step 1: Perform initial search in Algolia
      const searchResults = await this.algoliaService.searchRecords(query, {
        ...options,
        // Apply department filter based on user's department unless they're admin
        // Map internal roles to Permit roles for comparison
        filters: {
          ...options.filters,
          ...(!['hospital_admin', 'admin'].includes(user.role) && { department: user.department })
        }
      });

      console.log(`📊 Found ${searchResults.totalHits} potential matches`);

      // Step 2: Filter results based on Permit.io authorization
      const authorizedResults = await this.filterAuthorizedResults(
        user, 
        searchResults.hits,
        'search'
      );

      console.log(`✅ Authorized access to ${authorizedResults.length} records`);

      // Step 3: Apply additional security filters
      const secureResults = this.applySecurityFilters(user, authorizedResults);

      // Step 4: Log the search for audit purposes
      await this.logSearchActivity(user, query, secureResults.length);

      return {
        hits: secureResults,
        totalHits: secureResults.length,
        totalPages: Math.ceil(secureResults.length / (options.limit || 20)),
        currentPage: options.page || 0,
        facets: searchResults.facets,
        processingTimeMS: searchResults.processingTimeMS,
        securityInfo: {
          userRole: user.role,
          userDepartment: user.department,
          filteredCount: searchResults.totalHits - secureResults.length
        }
      };
    } catch (error) {
      console.error('❌ Error in secure search:', error);
      throw error;
    }
  }

  /**
   * Filter search results based on Permit.io authorization
   */
  async filterAuthorizedResults(user, results, action) {
    const authorizedResults = [];
    
    // Process results in batches to avoid overwhelming the authorization service
    const batchSize = 10;
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (result) => {
        try {
          const resource = {
            type: result.record_type || 'patient_record',
            id: result.objectID,
            department: result._department,
            patientId: result._patient_id,
            sensitivityLevel: result._sensitivity_level,
            createdAt: result.date_created,
            lastUpdatedBy: result.last_updated_by,
            isAnonymized: result.is_anonymized || false
          };

          const hasPermission = await this.permitService.checkPermission(
            user,
            action,
            resource
          );

          if (hasPermission) {
            // Remove internal security fields before returning
            const sanitizedResult = { ...result };
            delete sanitizedResult._department;
            delete sanitizedResult._patient_id;
            delete sanitizedResult._sensitivity_level;
            
            return sanitizedResult;
          }
          
          return null;
        } catch (error) {
          console.error(`❌ Error checking permission for result ${result.objectID}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      authorizedResults.push(...batchResults.filter(result => result !== null));
    }

    return authorizedResults;
  }

  /**
   * Apply additional security filters based on user context
   */
  applySecurityFilters(user, results) {
    return results.filter(result => {
      // Emergency override: In emergency situations, expand access
      if (user.emergencyAccess) {
        return true;
      }

      // Time-based filtering for temporary staff
      if (user.role === 'temp_staff') {
        if (user.accessExpiry && new Date(user.accessExpiry) < new Date()) {
          return false;
        }
      }

      // Shift-based filtering for nurses and residents
      if (['registered_nurse', 'resident_doctor'].includes(user.role)) {
        if (!this.isWithinShiftHours(user)) {
          return false;
        }
      }

      // Patient assignment filtering for nurses
      if (user.role === 'registered_nurse') {
        if (user.assignedPatients && !user.assignedPatients.includes(result.patient_id)) {
          return false;
        }
      }

      // Sensitivity level filtering
      if (result.sensitivity_level === 'high' && !this.canAccessHighSensitivity(user)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if user is within their shift hours
   */
  isWithinShiftHours(user) {
    if (!user.shiftStart || !user.shiftEnd) {
      return true; // No shift restrictions
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return currentTime >= user.shiftStart && currentTime <= user.shiftEnd;
  }

  /**
   * Check if user can access high sensitivity records
   */
  canAccessHighSensitivity(user) {
    const highSensitivityRoles = [
      'hospital_admin',
      'department_head',
      'attending_physician'
    ];
    
    return highSensitivityRoles.includes(user.role);
  }

  /**
   * Get authorized record details
   */
  async getAuthorizedRecord(user, recordId) {
    try {
      // First, try to get the record from Algolia (faster)
      const searchResults = await this.algoliaService.searchRecords('', {
        filters: { objectID: recordId },
        limit: 1
      });

      if (searchResults.hits.length === 0) {
        throw new Error('Record not found');
      }

      const record = searchResults.hits[0];

      // Check authorization
      const resource = {
        type: record.record_type || 'patient_record',
        id: record.objectID,
        department: record._department,
        patientId: record._patient_id,
        sensitivityLevel: record._sensitivity_level
      };

      const hasPermission = await this.permitService.checkPermission(
        user,
        'read',
        resource
      );

      if (!hasPermission) {
        throw new Error('Access denied');
      }

      // Apply security filters
      const filteredResults = this.applySecurityFilters(user, [record]);
      
      if (filteredResults.length === 0) {
        throw new Error('Access denied due to security constraints');
      }

      // Log access for audit
      await this.logRecordAccess(user, recordId, 'read');

      // Remove security fields
      const sanitizedRecord = { ...filteredResults[0] };
      delete sanitizedRecord._department;
      delete sanitizedRecord._patient_id;
      delete sanitizedRecord._sensitivity_level;

      return sanitizedRecord;
    } catch (error) {
      console.error(`❌ Error getting authorized record ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Get search suggestions with authorization
   */
  async getAuthorizedSuggestions(user, query, type = 'all') {
    try {
      const suggestions = await this.algoliaService.getSuggestions(query, type);
      
      // Filter suggestions based on user's department unless they're admin
      if (user.role !== 'hospital_admin') {
        return suggestions.filter(suggestion => 
          !suggestion.department || suggestion.department === user.department
        );
      }

      return suggestions;
    } catch (error) {
      console.error('❌ Error getting authorized suggestions:', error);
      return [];
    }
  }

  /**
   * Log search activity for audit purposes
   */
  async logSearchActivity(user, query, resultCount) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        userDepartment: user.department,
        searchQuery: query,
        resultCount: resultCount,
        action: 'search'
      };

      // In a real implementation, you would send this to an audit logging service
      console.log('📝 Search audit log:', JSON.stringify(logEntry, null, 2));
      
      // You could also store this in a database or send to a logging service like:
      // - AWS CloudTrail
      // - Elasticsearch
      // - Splunk
      // - Custom audit database
      
    } catch (error) {
      console.error('❌ Error logging search activity:', error);
      // Don't throw here as logging shouldn't break the search functionality
    }
  }

  /**
   * Log record access for audit purposes
   */
  async logRecordAccess(user, recordId, action) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        userDepartment: user.department,
        recordId: recordId,
        action: action
      };

      console.log('📝 Record access audit log:', JSON.stringify(logEntry, null, 2));
      
    } catch (error) {
      console.error('❌ Error logging record access:', error);
    }
  }

  /**
   * Initialize the secure search service
   */
  async initialize() {
    try {
      console.log('🔐 Initializing Secure Search Service...');
      
      // Initialize Permit.io policies
      await this.permitService.initializeHospitalPolicies();
      
      // Initialize Algolia index
      await this.algoliaService.initializeIndex();
      
      console.log('✅ Secure Search Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing Secure Search Service:', error);
      throw error;
    }
  }
}

module.exports = SecureSearchService;