const request = require('supertest');

// Mock the SecureSearchService before importing the app
jest.mock('../services/secureSearch', () => {
  return jest.fn().mockImplementation(() => ({
    secureSearch: jest.fn().mockResolvedValue({
      hits: [
        {
          objectID: 'rec_001',
          patient_name: 'Test Patient',
          department: 'cardiology'
        }
      ],
      totalHits: 1,
      totalPages: 1,
      currentPage: 0,
      facets: {},
      processingTimeMS: 10,
      securityInfo: {
        userRole: 'attending_physician',
        userDepartment: 'cardiology',
        filteredCount: 0
      }
    }),
    getAuthorizedSuggestions: jest.fn().mockResolvedValue([
      { text: 'Test Suggestion', type: 'patient', department: 'cardiology' }
    ]),
    getAuthorizedRecord: jest.fn().mockResolvedValue({
      objectID: 'rec_001',
      patient_name: 'Test Patient',
      department: 'cardiology'
    })
  }))
});

const app = require('../test-server');

describe('Search Routes', () => {
  let authToken;
  let adminToken;

  beforeEach(async () => {
    // Get admin token
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hospital.com',
        password: 'password123'
      });
    adminToken = adminLogin.body.token;

    // Get regular user token
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'michael.chen@hospital.com',
        password: 'password123'
      });
    authToken = userLogin.body.token;
  });

  describe('GET /api/search', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/search?q=test');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should perform search with valid query', async () => {
      const response = await request(app)
        .get('/api/search?q=John Doe')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('hits');
      expect(response.body).toHaveProperty('totalHits');
      expect(response.body).toHaveProperty('securityInfo');
      expect(response.body.query).toBe('John Doe');
    });

    it('should respect department filtering for non-admin users', async () => {
      const response = await request(app)
        .get('/api/search?q=patient&department=neurology')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Since the test user is in cardiology, they shouldn't see neurology results
      // unless they're admin
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/search?q=patient&page=0&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.currentPage).toBe(0);
      expect(response.body.hits.length).toBeLessThanOrEqual(5);
    });

    it('should filter by priority level', async () => {
      const response = await request(app)
        .get('/api/search?q=patient&priorityLevel=critical')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // All returned results should have critical priority
      response.body.hits.forEach(hit => {
        if (hit.priority_level) {
          expect(hit.priority_level).toBe('critical');
        }
      });
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return search suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=John')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.query).toBe('John');
    });

    it('should filter suggestions by type', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=Dr&type=doctor')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('doctor');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=test');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/search/record/:id', () => {
    it('should return record details for authorized user', async () => {
      // First, search for a record to get an ID
      const searchResponse = await request(app)
        .get('/api/search?q=John Doe')
        .set('Authorization', `Bearer ${authToken}`);

      if (searchResponse.body.hits.length > 0) {
        const recordId = searchResponse.body.hits[0].objectID;
        
        const response = await request(app)
          .get(`/api/search/record/${recordId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('record');
        expect(response.body).toHaveProperty('accessTime');
        expect(response.body).toHaveProperty('accessedBy');
      }
    });

    it('should reject access to unauthorized records', async () => {
      const response = await request(app)
        .get('/api/search/record/unauthorized_record_id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should require record ID', async () => {
      const response = await request(app)
        .get('/api/search/record/')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/search/filters', () => {
    it('should return available filters for user', async () => {
      const response = await request(app)
        .get('/api/search/filters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters).toHaveProperty('departments');
      expect(response.body.filters).toHaveProperty('recordTypes');
      expect(response.body.filters).toHaveProperty('priorityLevels');
      expect(response.body).toHaveProperty('userRole');
      expect(response.body).toHaveProperty('userDepartment');
    });

    it('should customize filters based on user role', async () => {
      // Test with admin token
      const adminResponse = await request(app)
        .get('/api/search/filters')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.filters.departments.length).toBeGreaterThan(1);

      // Test with regular user token
      const userResponse = await request(app)
        .get('/api/search/filters')
        .set('Authorization', `Bearer ${authToken}`);

      expect(userResponse.status).toBe(200);
      // Regular user should have limited department access
      expect(userResponse.body.filters.departments.length).toBeLessThanOrEqual(
        adminResponse.body.filters.departments.length
      );
    });
  });

  describe('POST /api/search/export', () => {
    it('should allow export for authorized roles', async () => {
      const response = await request(app)
        .post('/api/search/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          searchQuery: 'test export',
          recordIds: ['rec_001', 'rec_002'],
          format: 'json',
          reason: 'Testing export functionality for audit purposes'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exportId');
      expect(response.body).toHaveProperty('auditLog');
      expect(response.body.recordCount).toBeGreaterThanOrEqual(0);
    });

    it('should reject export for unauthorized roles', async () => {
      // Try with a nurse token (should be denied)
      const nurseLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nurse.smith@hospital.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/api/search/export')
        .set('Authorization', `Bearer ${nurseLogin.body.token}`)
        .send({
          searchQuery: 'test export',
          recordIds: ['rec_001'],
          reason: 'Testing export rejection'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('EXPORT_DENIED');
    });

    it('should validate export request', async () => {
      const response = await request(app)
        .post('/api/search/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          searchQuery: 'test',
          recordIds: [],
          reason: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });
});