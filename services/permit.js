const { Permit } = require('permitio');

class PermitService {
  constructor() {
    // Handle test environment
    if (process.env.NODE_ENV === 'test' || 
        process.env.PERMIT_TOKEN === 'test-permit-token') {
      
      // Create mock permit client for testing
      this.permit = {
        check: async () => ({ allow: true }),
        sync: {
          createRole: async () => ({}),
          createResource: async () => ({}),
          assignRole: async () => ({})
        }
      };
      
      console.log('🧪 Using mock Permit client for testing');
    } else {
      // Production Permit client
      this.permit = new Permit({
        token: process.env.PERMIT_TOKEN,
        pdp: process.env.PERMIT_PDP_URL,
      });
    }
  }

  /**
   * Initialize healthcare-specific roles and policies
   */
  async initializeHospitalPolicies() {
    try {
      // Define hospital departments
      const departments = [
        'emergency',
        'cardiology',
        'neurology',
        'pediatrics',
        'radiology',
        'surgery',
        'icu',
        'oncology',
        'administration'
      ];

      // Define roles with their base permissions
      const roles = [
        {
          key: 'hospital_admin',
          name: 'Hospital Administrator',
          description: 'Full access to all hospital systems and records'
        },
        {
          key: 'department_head',
          name: 'Department Head',
          description: 'Access to all records within their department and management functions'
        },
        {
          key: 'attending_physician',
          name: 'Attending Physician',
          description: 'Access to patient records within their department and assigned patients'
        },
        {
          key: 'resident_doctor',
          name: 'Resident Doctor',
          description: 'Limited access to patient records under supervision'
        },
        {
          key: 'registered_nurse',
          name: 'Registered Nurse',
          description: 'Access to patient records for assigned patients and shift-based restrictions'
        },
        {
          key: 'nurse_practitioner',
          name: 'Nurse Practitioner',
          description: 'Extended access to patient records within their specialty'
        },
        {
          key: 'lab_technician',
          name: 'Lab Technician',
          description: 'Access to lab results and test orders only'
        },
        {
          key: 'radiologist',
          name: 'Radiologist',
          description: 'Access to imaging studies and radiology reports'
        },
        {
          key: 'pharmacist',
          name: 'Pharmacist',
          description: 'Access to medication records and prescriptions'
        },
        {
          key: 'temp_staff',
          name: 'Temporary Staff',
          description: 'Limited access with expiration date'
        }
      ];

      // Define actions that can be performed on resources
      const actions = [
        'read',
        'write',
        'delete',
        'search',
        'export',
        'audit'
      ];

      // Define resource types
      const resources = [
        {
          key: 'patient_record',
          name: 'Patient Record',
          description: 'Complete patient medical record'
        },
        {
          key: 'lab_result',
          name: 'Lab Result',
          description: 'Laboratory test results'
        },
        {
          key: 'imaging_study',
          name: 'Imaging Study',
          description: 'Radiology images and reports'
        },
        {
          key: 'medication_record',
          name: 'Medication Record',
          description: 'Prescription and medication history'
        },
        {
          key: 'vital_signs',
          name: 'Vital Signs',
          description: 'Patient vital signs and monitoring data'
        },
        {
          key: 'discharge_summary',
          name: 'Discharge Summary',
          description: 'Patient discharge documentation'
        }
      ];

      console.log('🏥 Initializing hospital policies in Permit.io...');

      // Create roles
      for (const role of roles) {
        try {
          await this.permit.api.roles.create(role);
          console.log(`✅ Created role: ${role.name}`);
        } catch (error) {
          if (error.response?.status === 409) {
            console.log(`ℹ️  Role already exists: ${role.name}`);
          } else {
            console.error(`❌ Error creating role ${role.name}:`, error.message);
          }
        }
      }

      // Create resource types
      for (const resource of resources) {
        try {
          await this.permit.api.resources.create({
            key: resource.key,
            name: resource.name,
            description: resource.description,
            actions: actions.map(action => ({
              key: action,
              name: action.charAt(0).toUpperCase() + action.slice(1)
            }))
          });
          console.log(`✅ Created resource: ${resource.name}`);
        } catch (error) {
          if (error.response?.status === 409) {
            console.log(`ℹ️  Resource already exists: ${resource.name}`);
          } else {
            console.error(`❌ Error creating resource ${resource.name}:`, error.message);
          }
        }
      }

      // Create department-based policies
      await this.createDepartmentPolicies(roles, resources, actions, departments);
      
      console.log('🎉 Hospital policies initialized successfully!');
      
    } catch (error) {
      console.error('❌ Error initializing hospital policies:', error);
      throw error;
    }
  }

  /**
   * Create department-specific access policies
   */
  async createDepartmentPolicies(roles, resources, actions, departments) {
    const policies = [
      // Hospital Admin - full access
      {
        key: 'hospital_admin_full_access',
        description: 'Hospital administrators have full access to all records',
        subjects: ['role:hospital_admin'],
        actions: actions,
        resources: resources.map(r => `resource:${r.key}`),
        effect: 'allow'
      },

      // Department Head - department-wide access
      {
        key: 'department_head_access',
        description: 'Department heads can access all records in their department',
        subjects: ['role:department_head'],
        actions: ['read', 'write', 'search', 'audit'],
        resources: resources.map(r => `resource:${r.key}`),
        effect: 'allow',
        conditions: {
          'user.department': {
            'equals': '${resource.department}'
          }
        }
      },

      // Attending Physician - patient-specific access
      {
        key: 'attending_physician_access',
        description: 'Attending physicians can access records of their patients',
        subjects: ['role:attending_physician'],
        actions: ['read', 'write', 'search'],
        resources: resources.map(r => `resource:${r.key}`),
        effect: 'allow',
        conditions: {
          'user.department': {
            'equals': '${resource.department}'
          },
          'user.shift_active': {
            'equals': true
          }
        }
      },

      // Nurse - shift and assignment based access
      {
        key: 'nurse_access',
        description: 'Nurses can access records during their shift for assigned patients',
        subjects: ['role:registered_nurse'],
        actions: ['read', 'search'],
        resources: ['resource:patient_record', 'resource:vital_signs', 'resource:medication_record'],
        effect: 'allow',
        conditions: {
          'user.department': {
            'equals': '${resource.department}'
          },
          'user.shift_active': {
            'equals': true
          },
          'user.assigned_patients': {
            'contains': '${resource.patient_id}'
          }
        }
      },

      // Lab Technician - lab results only
      {
        key: 'lab_tech_access',
        description: 'Lab technicians can only access lab results',
        subjects: ['role:lab_technician'],
        actions: ['read', 'write', 'search'],
        resources: ['resource:lab_result'],
        effect: 'allow'
      },

      // Radiologist - imaging studies only
      {
        key: 'radiologist_access',
        description: 'Radiologists can access imaging studies and reports',
        subjects: ['role:radiologist'],
        actions: ['read', 'write', 'search'],
        resources: ['resource:imaging_study'],
        effect: 'allow'
      },

      // Temporary Staff - time-limited access
      {
        key: 'temp_staff_access',
        description: 'Temporary staff have limited, time-bound access',
        subjects: ['role:temp_staff'],
        actions: ['read', 'search'],
        resources: ['resource:patient_record', 'resource:vital_signs'],
        effect: 'allow',
        conditions: {
          'user.access_expiry': {
            'after': '${time.now}'
          },
          'user.department': {
            'equals': '${resource.department}'
          }
        }
      }
    ];

    // Create policies
    for (const policy of policies) {
      try {
        await this.permit.api.policies.create(policy);
        console.log(`✅ Created policy: ${policy.key}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️  Policy already exists: ${policy.key}`);
        } else {
          console.error(`❌ Error creating policy ${policy.key}:`, error.message);
        }
      }
    }
  }

  /**
   * Check if user has permission to access a resource
   */
  async checkPermission(user, action, resource, context = {}) {
    try {
      const decision = await this.permit.check(
        {
          key: user.id,
          attributes: {
            email: user.email,
            role: user.role,
            department: user.department,
            shift_active: this.isShiftActive(user),
            access_expiry: user.accessExpiry,
            assigned_patients: user.assignedPatients || []
          }
        },
        action,
        {
          type: resource.type,
          key: resource.id,
          attributes: {
            department: resource.department,
            patient_id: resource.patientId,
            sensitivity_level: resource.sensitivityLevel || 'normal'
          }
        }
      );

      return decision;
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user is currently in their shift
   */
  isShiftActive(user) {
    if (!user.shiftStart || !user.shiftEnd) {
      return true; // No shift restrictions
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    return currentTime >= user.shiftStart && currentTime <= user.shiftEnd;
  }

  /**
   * Create a new user in Permit.io
   */
  async createUser(userData) {
    try {
      const user = await this.permit.api.users.create({
        key: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        attributes: {
          role: userData.role,
          department: userData.department,
          shift_start: userData.shiftStart,
          shift_end: userData.shiftEnd,
          access_expiry: userData.accessExpiry
        }
      });

      // Assign role to user
      await this.permit.api.roleAssignments.assign({
        user: userData.id,
        role: userData.role,
        tenant: 'default'
      });

      return user;
    } catch (error) {
      console.error('❌ Error creating user in Permit.io:', error);
      throw error;
    }
  }
}

module.exports = PermitService;