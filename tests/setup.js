// Test setup and global configurations
require('dotenv').config({ path: '.env.test' });

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';
process.env.PERMIT_TOKEN = 'test-permit-token';
process.env.PERMIT_PDP_URL = 'https://test-pdp.permit.io';
process.env.ALGOLIA_APP_ID = 'test-app-id';
process.env.ALGOLIA_API_KEY = 'test-api-key';
process.env.ALGOLIA_ADMIN_KEY = 'test-admin-key';
process.env.ALGOLIA_INDEX_NAME = 'test_hospital_records';

// Global test utilities
global.testHelpers = {
  createTestUser: (overrides = {}) => ({
    id: 'test_user_001',
    email: 'test@hospital.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'attending_physician',
    department: 'cardiology',
    employeeId: 'TEST001',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    isActive: true,
    permissions: [],
    emergencyAccess: false,
    ...overrides
  }),
  
  createTestRecord: (overrides = {}) => ({
    id: 'test_record_001',
    patientId: 'TEST_PAT_001',
    patientName: 'Test Patient',
    medicalRecordNumber: 'TEST_MRN_001',
    recordType: 'patient_record',
    department: 'cardiology',
    doctorName: 'Dr. Test Doctor',
    dateCreated: new Date().toISOString(),
    status: 'active',
    priorityLevel: 'normal',
    sensitivityLevel: 'normal',
    ...overrides
  })
};

// Console log suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});