/**
 * Permit.io Configuration Mappings
 * 
 * This file documents the mapping between the application's internal
 * role/resource/action names and the actual Permit.io configuration.
 * 
 * Based on your Permit.io tenant configuration inspected on 2025-10-15
 */

/**
 * Role Mappings
 * Maps internal application roles to Permit.io role keys
 */
const ROLE_MAPPINGS = {
  // Internal Role -> Permit.io Role
  'hospital_admin': 'admin',
  'department_head': 'doctor',
  'attending_physician': 'doctor',
  'resident_doctor': 'doctor',
  'registered_nurse': 'nurse',
  'nurse_practitioner': 'nurse',
  'lab_technician': 'nurse', // Consider creating a separate role in Permit.io
  'radiologist': 'doctor',
  'pharmacist': 'nurse', // Consider creating a separate role in Permit.io
  'temp_staff': 'temporary_staff',
  
  // Direct mappings (for when JWT uses Permit.io role names directly)
  'admin': 'admin',
  'doctor': 'doctor',
  'nurse': 'nurse',
  'temporary_staff': 'temporary_staff'
};

/**
 * Resource Type Mappings
 * Maps internal resource types to Permit.io resource keys
 */
const RESOURCE_MAPPINGS = {
  // Internal Type -> Permit.io Resource
  'patient_record': 'patient_records',
  'lab_result': 'patient_records',
  'imaging_study': 'patient_records',
  'medication_record': 'patient_records',
  'vital_signs': 'patient_records',
  'discharge_summary': 'patient_records',
  
  // Direct mappings
  'patient_records': 'patient_records',
  'emergency_access': 'emergency_access',
  'user_roles': 'user_roles',
  'search_portal': 'search_portal',
  'audit_logs': 'audit_logs'
};

/**
 * Action Mappings
 * Maps generic CRUD actions to Permit.io permission names
 */
const ACTION_MAPPINGS = {
  // Generic Action -> Permit.io Permission
  'read': 'view',
  'write': 'update',
  'search': 'search',
  'export': 'export',
  'delete': 'delete',
  'create': 'create',
  'audit': 'auditquery',
  
  // Direct mappings (for when using Permit.io permission names directly)
  'view': 'view',
  'update': 'update',
  'share': 'share',
  'recommend': 'recommend',
  'auditquery': 'auditquery',
  'exportresults': 'exportresults',
  'viewresult': 'viewresult',
  'request': 'request',
  'approve': 'approve',
  'revoke': 'revoke',
  'assign': 'assign'
};

/**
 * Your Permit.io Role Permissions (as configured)
 * Documented for reference
 */
const PERMIT_ROLE_PERMISSIONS = {
  admin: [
    'search_portal:exportresults',
    'patient_records:share',
    'search_portal:recommend',
    'patient_records:delete',
    'emergency_access:request',
    'patient_records:view',
    'user_roles:revoke',
    'user_roles:update',
    'emergency_access:revoke',
    'search_portal:auditquery',
    'patient_records:create',
    'user_roles:assign',
    'audit_logs:view',
    'patient_records:update',
    'user_roles:view',
    'emergency_access:approve',
    'search_portal:search',
    'audit_logs:export',
    'patient_records:search',
    'emergency_access:view',
    'search_portal:viewresult',
    'patient_records:export',
    'audit_logs:delete'
  ],
  doctor: [
    'search_portal:recommend',
    'patient_records:search',
    'search_portal:auditquery',
    'patient_records:view',
    'emergency_access:approve',
    'search_portal:viewresult',
    'user_roles:assign',
    'patient_records:create',
    'emergency_access:view',
    'emergency_access:request',
    'patient_records:export',
    'user_roles:view',
    'search_portal:search',
    'patient_records:update'
  ],
  nurse: [
    // To be configured in Permit.io
  ],
  temporary_staff: [
    // To be configured in Permit.io
  ]
};

/**
 * Resource Attributes (ABAC)
 * Defines the attributes available for each resource type in Permit.io
 */
const RESOURCE_ATTRIBUTES = {
  patient_records: {
    assigned_doctor_id: 'string',
    department: 'string',
    senstivity_level: 'string', // Note: typo in Permit.io config
    created_at: 'string',
    last_updated_by: 'string',
    is_anonymized: 'bool'
  },
  emergency_access: {
    requested_by: 'string',
    approved_by: 'string',
    reason: 'string',
    status: 'string',
    expiry_at: 'string'
  },
  user_roles: {
    role: 'string',
    department: 'string',
    is_active: 'bool',
    access_expiry_time: 'string'
  },
  search_portal: {
    initiated_by: 'string',
    query_scope: 'string',
    time_of_search: 'string',
    result_count: 'number',
    ai_confidence_level: 'string'
  },
  audit_logs: {
    created_by: 'string',
    action_performed: 'string',
    resouce_type: 'string', // Note: typo in Permit.io config
    severity: 'string',
    timestamp: 'string'
  }
};

/**
 * Helper Functions
 */
function mapRole(internalRole) {
  return ROLE_MAPPINGS[internalRole] || internalRole;
}

function mapResource(internalResource) {
  return RESOURCE_MAPPINGS[internalResource] || internalResource;
}

function mapAction(internalAction) {
  return ACTION_MAPPINGS[internalAction] || internalAction;
}

function getRolePermissions(permitRole) {
  return PERMIT_ROLE_PERMISSIONS[permitRole] || [];
}

function getResourceAttributes(permitResource) {
  return RESOURCE_ATTRIBUTES[permitResource] || {};
}

module.exports = {
  ROLE_MAPPINGS,
  RESOURCE_MAPPINGS,
  ACTION_MAPPINGS,
  PERMIT_ROLE_PERMISSIONS,
  RESOURCE_ATTRIBUTES,
  mapRole,
  mapResource,
  mapAction,
  getRolePermissions,
  getResourceAttributes
};
