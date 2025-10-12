const SecureSearchService = require('../services/secureSearch');
const { createTestUser, createTestRecord } = global.testHelpers;

// Mock the dependencies
jest.mock('../services/permit');
jest.mock('../services/algolia');

const MockPermitService = require('../services/permit');
const MockAlgoliaService = require('../services/algolia');

describe('SecureSearchService', () => {
  let secureSearchService;
  let mockPermitService;
  let mockAlgoliaService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPermitService = {
      checkPermission: jest.fn(),
      initializeHospitalPolicies: jest.fn().mockResolvedValue(true)
    };

    mockAlgoliaService = {
      searchRecords: jest.fn(),
      getSuggestions: jest.fn(),
      initializeIndex: jest.fn().mockResolvedValue(true)
    };

    // Mock constructors
    MockPermitService.mockImplementation(() => mockPermitService);
    MockAlgoliaService.mockImplementation(() => mockAlgoliaService);

    secureSearchService = new SecureSearchService();
  });

  describe('secureSearch', () => {
    it('should perform secure search and filter results', async () => {
      const user = createTestUser({
        role: 'attending_physician',
        department: 'cardiology'
      });

      const mockSearchResults = {
        hits: [
          {
            objectID: 'rec_001',
            patient_name: 'John Doe',
            record_type: 'patient_record',
            _department: 'cardiology',
            _patient_id: 'PAT_001',
            _sensitivity_level: 'normal'
          },
          {
            objectID: 'rec_002',
            patient_name: 'Jane Smith',
            record_type: 'patient_record',
            _department: 'neurology',
            _patient_id: 'PAT_002',
            _sensitivity_level: 'normal'
          }
        ],
        totalHits: 2,
        processingTimeMS: 10,
        facets: {}
      };

      mockAlgoliaService.searchRecords.mockResolvedValue(mockSearchResults);
      
      // Mock permission checks - allow access to cardiology record only
      mockPermitService.checkPermission
        .mockResolvedValueOnce(true)  // rec_001 - cardiology
        .mockResolvedValueOnce(false); // rec_002 - neurology

      const result = await secureSearchService.secureSearch(user, 'John Doe');

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].objectID).toBe('rec_001');
      expect(result.securityInfo.filteredCount).toBe(1);
      expect(mockPermitService.checkPermission).toHaveBeenCalledTimes(2);
    });

    it('should apply department filtering for non-admin users', async () => {
      const user = createTestUser({
        role: 'attending_physician',
        department: 'cardiology'
      });

      mockAlgoliaService.searchRecords.mockResolvedValue({
        hits: [],
        totalHits: 0,
        processingTimeMS: 10,
        facets: {}
      });

      await secureSearchService.secureSearch(user, 'test query');

      expect(mockAlgoliaService.searchRecords).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          filters: expect.objectContaining({
            department: 'cardiology'
          })
        })
      );
    });

    it('should not filter by department for admin users', async () => {
      const adminUser = createTestUser({
        role: 'hospital_admin',
        department: 'administration'
      });

      mockAlgoliaService.searchRecords.mockResolvedValue({
        hits: [],
        totalHits: 0,
        processingTimeMS: 10,
        facets: {}
      });

      await secureSearchService.secureSearch(adminUser, 'test query');

      expect(mockAlgoliaService.searchRecords).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          filters: expect.not.objectContaining({
            department: expect.anything()
          })
        })
      );
    });

    it('should handle search errors gracefully', async () => {
      const user = createTestUser();
      
      mockAlgoliaService.searchRecords.mockRejectedValue(new Error('Search failed'));

      await expect(secureSearchService.secureSearch(user, 'test')).rejects.toThrow('Search failed');
    });
  });

  describe('applySecurityFilters', () => {
    it('should filter out records based on shift hours', () => {
      const user = createTestUser({
        role: 'registered_nurse',
        shiftStart: '08:00',
        shiftEnd: '16:00'
      });

      // Mock current time to be outside shift hours
      jest.spyOn(Date.prototype, 'toTimeString').mockReturnValue('20:00:00 GMT+0000 (UTC)');

      const results = [createTestRecord()];
      const filtered = secureSearchService.applySecurityFilters(user, results);

      expect(filtered).toHaveLength(0);

      Date.prototype.toTimeString.mockRestore();
    });

    it('should allow access during emergency situations', () => {
      const user = createTestUser({
        role: 'registered_nurse',
        shiftStart: '08:00',
        shiftEnd: '16:00',
        emergencyAccess: true
      });

      // Mock current time to be outside shift hours
      jest.spyOn(Date.prototype, 'toTimeString').mockReturnValue('20:00:00 GMT+0000 (UTC)');

      const results = [createTestRecord()];
      const filtered = secureSearchService.applySecurityFilters(user, results);

      expect(filtered).toHaveLength(1);

      Date.prototype.toTimeString.mockRestore();
    });

    it('should filter by patient assignments for nurses', () => {
      const user = createTestUser({
        role: 'registered_nurse',
        assignedPatients: ['PAT_001', 'PAT_002']
      });

      const results = [
        createTestRecord({ patient_id: 'PAT_001' }), // Assigned
        createTestRecord({ patient_id: 'PAT_003' })  // Not assigned
      ];

      // Access the method through the prototype since it's a private method
      const filtered = secureSearchService.constructor.prototype.applySecurityFilters.call(
        secureSearchService, user, results
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].patient_id).toBe('PAT_001');
    });

    it('should filter high sensitivity records', () => {
      const user = createTestUser({
        role: 'registered_nurse' // Not authorized for high sensitivity
      });

      const results = [
        createTestRecord({ sensitivity_level: 'normal' }),
        createTestRecord({ sensitivity_level: 'high' })
      ];

      // Access the method through the prototype since it's a private method
      const filtered = secureSearchService.constructor.prototype.applySecurityFilters.call(
        secureSearchService, user, results
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].sensitivity_level).toBe('normal');
    });
  });

  describe('canAccessHighSensitivity', () => {
    it('should allow access for authorized roles', () => {
      const authorizedRoles = ['hospital_admin', 'department_head', 'attending_physician'];
      
      authorizedRoles.forEach(role => {
        const user = createTestUser({ role });
        const canAccess = secureSearchService.constructor.prototype.canAccessHighSensitivity.call(
          secureSearchService, user
        );
        expect(canAccess).toBe(true);
      });
    });

    it('should deny access for unauthorized roles', () => {
      const unauthorizedRoles = ['registered_nurse', 'lab_technician', 'temp_staff'];
      
      unauthorizedRoles.forEach(role => {
        const user = createTestUser({ role });
        const canAccess = secureSearchService.constructor.prototype.canAccessHighSensitivity.call(
          secureSearchService, user
        );
        expect(canAccess).toBe(false);
      });
    });
  });

  describe('getAuthorizedRecord', () => {
    it('should return record for authorized user', async () => {
      const user = createTestUser();
      const recordId = 'rec_001';

      const mockRecord = {
        objectID: recordId,
        patient_name: 'John Doe',
        _department: 'cardiology',
        _patient_id: 'PAT_001',
        _sensitivity_level: 'normal'
      };

      mockAlgoliaService.searchRecords.mockResolvedValue({
        hits: [mockRecord]
      });

      mockPermitService.checkPermission.mockResolvedValue(true);

      const result = await secureSearchService.getAuthorizedRecord(user, recordId);

      expect(result).toBeDefined();
      expect(result.objectID).toBe(recordId);
      expect(result._department).toBeUndefined(); // Should be sanitized
    });

    it('should throw error for unauthorized access', async () => {
      const user = createTestUser();
      const recordId = 'rec_001';

      mockAlgoliaService.searchRecords.mockResolvedValue({
        hits: [{ objectID: recordId }]
      });

      mockPermitService.checkPermission.mockResolvedValue(false);

      await expect(
        secureSearchService.getAuthorizedRecord(user, recordId)
      ).rejects.toThrow('Access denied');
    });

    it('should throw error for non-existent record', async () => {
      const user = createTestUser();
      const recordId = 'non_existent';

      mockAlgoliaService.searchRecords.mockResolvedValue({
        hits: []
      });

      await expect(
        secureSearchService.getAuthorizedRecord(user, recordId)
      ).rejects.toThrow('Record not found');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(secureSearchService.initialize()).resolves.toBe(true);
      
      expect(mockPermitService.initializeHospitalPolicies).toHaveBeenCalled();
      expect(mockAlgoliaService.initializeIndex).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockPermitService.initializeHospitalPolicies.mockRejectedValue(
        new Error('Permit initialization failed')
      );

      await expect(secureSearchService.initialize()).rejects.toThrow(
        'Permit initialization failed'
      );
    });
  });
});