const PermitService = require('../services/permit');
const { createTestUser, createTestRecord } = global.testHelpers;

// Mock the permitio library
jest.mock('permitio', () => ({
  Permit: jest.fn().mockImplementation(() => ({
    api: {
      roles: {
        create: jest.fn().mockResolvedValue({ key: 'test_role' })
      },
      resources: {
        create: jest.fn().mockResolvedValue({ key: 'test_resource' })
      },
      policies: {
        create: jest.fn().mockResolvedValue({ key: 'test_policy' })
      },
      users: {
        create: jest.fn().mockResolvedValue({ key: 'test_user' })
      },
      roleAssignments: {
        assign: jest.fn().mockResolvedValue({ success: true })
      }
    },
    check: jest.fn()
  }))
}));

describe('PermitService', () => {
  let permitService;

  beforeEach(() => {
    permitService = new PermitService();
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should return true for authorized access', async () => {
      // Mock successful permission check
      permitService.permit.check.mockResolvedValue(true);

      const user = createTestUser({
        role: 'attending_physician',
        department: 'cardiology'
      });

      const resource = createTestRecord({
        type: 'patient_record',
        department: 'cardiology'
      });

      const result = await permitService.checkPermission(user, 'read', resource);

      expect(result).toBe(true);
      expect(permitService.permit.check).toHaveBeenCalledWith(
        expect.objectContaining({
          key: user.id,
          attributes: expect.objectContaining({
            role: user.role,
            department: user.department
          })
        }),
        'read',
        expect.objectContaining({
          type: resource.type,
          attributes: expect.objectContaining({
            department: resource.department
          })
        })
      );
    });

    it('should return false for unauthorized access', async () => {
      // Mock failed permission check
      permitService.permit.check.mockResolvedValue(false);

      const user = createTestUser({
        role: 'registered_nurse',
        department: 'pediatrics'
      });

      const resource = createTestRecord({
        type: 'patient_record',
        department: 'cardiology' // Different department
      });

      const result = await permitService.checkPermission(user, 'read', resource);

      expect(result).toBe(false);
    });

    it('should handle permission check errors gracefully', async () => {
      // Mock error in permission check
      permitService.permit.check.mockRejectedValue(new Error('Permission check failed'));

      const user = createTestUser();
      const resource = createTestRecord();

      const result = await permitService.checkPermission(user, 'read', resource);

      expect(result).toBe(false);
    });
  });

  describe('isShiftActive', () => {
    it('should return true when no shift restrictions', () => {
      const user = createTestUser({
        shiftStart: null,
        shiftEnd: null
      });

      const result = permitService.isShiftActive(user);

      expect(result).toBe(true);
    });

    it('should return true when within shift hours', () => {
      // Mock current time to be 10:00
      jest.spyOn(Date.prototype, 'toTimeString').mockReturnValue('10:00:00 GMT+0000 (UTC)');

      const user = createTestUser({
        shiftStart: '08:00',
        shiftEnd: '17:00'
      });

      const result = permitService.isShiftActive(user);

      expect(result).toBe(true);

      Date.prototype.toTimeString.mockRestore();
    });

    it('should return false when outside shift hours', () => {
      // Mock current time to be 20:00
      jest.spyOn(Date.prototype, 'toTimeString').mockReturnValue('20:00:00 GMT+0000 (UTC)');

      const user = createTestUser({
        shiftStart: '08:00',
        shiftEnd: '17:00'
      });

      const result = permitService.isShiftActive(user);

      expect(result).toBe(false);

      Date.prototype.toTimeString.mockRestore();
    });
  });

  describe('createUser', () => {
    it('should create user in Permit.io', async () => {
      const userData = {
        id: 'test_user_001',
        email: 'test@hospital.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'attending_physician',
        department: 'cardiology'
      };

      await permitService.createUser(userData);

      expect(permitService.permit.api.users.create).toHaveBeenCalledWith({
        key: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        attributes: expect.objectContaining({
          role: userData.role,
          department: userData.department
        })
      });

      expect(permitService.permit.api.roleAssignments.assign).toHaveBeenCalledWith({
        user: userData.id,
        role: userData.role,
        tenant: 'default'
      });
    });

    it('should handle user creation errors', async () => {
      permitService.permit.api.users.create.mockRejectedValue(new Error('User creation failed'));

      const userData = {
        id: 'test_user_001',
        email: 'test@hospital.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'attending_physician',
        department: 'cardiology'
      };

      await expect(permitService.createUser(userData)).rejects.toThrow('User creation failed');
    });
  });

  describe('initializeHospitalPolicies', () => {
    it('should initialize policies successfully', async () => {
      // Mock successful policy creation
      permitService.permit.api.roles.create.mockResolvedValue({ key: 'test_role' });
      permitService.permit.api.resources.create.mockResolvedValue({ key: 'test_resource' });
      permitService.permit.api.policies.create.mockResolvedValue({ key: 'test_policy' });

      await expect(permitService.initializeHospitalPolicies()).resolves.not.toThrow();

      expect(permitService.permit.api.roles.create).toHaveBeenCalled();
      expect(permitService.permit.api.resources.create).toHaveBeenCalled();
      expect(permitService.permit.api.policies.create).toHaveBeenCalled();
    });

    it('should handle existing policies gracefully', async () => {
      // Mock 409 conflict error (resource already exists)
      const conflictError = new Error('Conflict');
      conflictError.response = { status: 409 };
      
      permitService.permit.api.roles.create.mockRejectedValue(conflictError);
      permitService.permit.api.resources.create.mockResolvedValue({ key: 'test_resource' });
      permitService.permit.api.policies.create.mockResolvedValue({ key: 'test_policy' });

      await expect(permitService.initializeHospitalPolicies()).resolves.not.toThrow();
    });
  });
});