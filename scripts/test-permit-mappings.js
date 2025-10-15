require('dotenv').config();
const PermitService = require('../services/permit');

/**
 * Test script to verify Permit.io role/resource/action mappings
 * This simulates permission checks to ensure the mapping logic works
 */

async function testPermitMappings() {
  console.log('🧪 Testing Permit.io Mappings\n');
  console.log('='.repeat(80));
  
  const permitService = new PermitService();
  
  // Test scenarios
  const testCases = [
    {
      name: 'Admin viewing patient record',
      user: {
        id: 'user_001',
        email: 'admin@hospital.com',
        role: 'hospital_admin', // Internal role
        department: 'administration'
      },
      action: 'read', // Internal action
      resource: {
        type: 'patient_record', // Internal resource type
        id: 'PAT001',
        department: 'cardiology',
        patientId: 'PAT001',
        sensitivityLevel: 'normal'
      },
      expected: 'ALLOW (admin has full access)'
    },
    {
      name: 'Doctor searching patient records',
      user: {
        id: 'user_003',
        email: 'doctor@hospital.com',
        role: 'attending_physician', // Maps to 'doctor' in Permit
        department: 'cardiology'
      },
      action: 'search',
      resource: {
        type: 'patient_record',
        id: 'PAT001',
        department: 'cardiology',
        patientId: 'PAT001',
        sensitivityLevel: 'normal'
      },
      expected: 'ALLOW (doctor has search permission)'
    },
    {
      name: 'Nurse viewing patient (needs configuration)',
      user: {
        id: 'user_004',
        email: 'nurse@hospital.com',
        role: 'registered_nurse', // Maps to 'nurse' in Permit
        department: 'cardiology',
        assignedPatients: ['PAT001']
      },
      action: 'read',
      resource: {
        type: 'patient_record',
        id: 'PAT001',
        department: 'cardiology',
        patientId: 'PAT001',
        sensitivityLevel: 'normal'
      },
      expected: 'DENY (nurse role not configured yet in Permit.io)'
    },
    {
      name: 'Temp staff accessing expired',
      user: {
        id: 'user_005',
        email: 'temp@hospital.com',
        role: 'temp_staff', // Maps to 'temporary_staff' in Permit
        department: 'emergency',
        accessExpiry: '2025-10-01T00:00:00Z' // Expired
      },
      action: 'read',
      resource: {
        type: 'patient_record',
        id: 'PAT003',
        department: 'emergency',
        patientId: 'PAT003',
        sensitivityLevel: 'normal'
      },
      expected: 'DENY (temporary_staff role not configured yet)'
    }
  ];

  console.log('\n📋 Running Test Cases:\n');
  
  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📝 Test: ${testCase.name}`);
    console.log(`   User Role (internal): ${testCase.user.role}`);
    console.log(`   Mapped to Permit.io: ${permitService.mapRoleToPermit(testCase.user.role)}`);
    console.log(`   Action (internal): ${testCase.action}`);
    console.log(`   Mapped to Permit.io: ${permitService.mapActionToPermit(testCase.action, testCase.resource.type)}`);
    console.log(`   Resource (internal): ${testCase.resource.type}`);
    console.log(`   Mapped to Permit.io: ${permitService.mapResourceToPermit(testCase.resource.type)}`);
    console.log(`   Expected: ${testCase.expected}`);
    
    try {
      const hasPermission = await permitService.checkPermission(
        testCase.user,
        testCase.action,
        testCase.resource
      );
      
      const result = hasPermission ? '✅ ALLOW' : '❌ DENY';
      console.log(`   Result: ${result}`);
      
      if (hasPermission) {
        console.log(`   ✅ Permission granted`);
      } else {
        console.log(`   ❌ Permission denied`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Mapping Summary:');
  console.log('─'.repeat(80));
  
  const roleMap = {
    'hospital_admin': 'admin',
    'attending_physician': 'doctor',
    'registered_nurse': 'nurse',
    'temp_staff': 'temporary_staff'
  };
  
  console.log('\n👥 Role Mappings:');
  Object.entries(roleMap).forEach(([internal, permit]) => {
    console.log(`   ${internal.padEnd(25)} → ${permit}`);
  });
  
  const resourceMap = {
    'patient_record': 'patient_records',
    'lab_result': 'patient_records',
    'imaging_study': 'patient_records'
  };
  
  console.log('\n📦 Resource Mappings:');
  Object.entries(resourceMap).forEach(([internal, permit]) => {
    console.log(`   ${internal.padEnd(25)} → ${permit}`);
  });
  
  const actionMap = {
    'read': 'view',
    'write': 'update',
    'search': 'search',
    'export': 'export'
  };
  
  console.log('\n🎬 Action Mappings:');
  Object.entries(actionMap).forEach(([internal, permit]) => {
    console.log(`   ${internal.padEnd(25)} → ${permit}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('─'.repeat(80));
  console.log('   1. Configure permissions for "nurse" role in Permit.io');
  console.log('   2. Configure permissions for "temporary_staff" role in Permit.io');
  console.log('   3. Add ABAC conditions for department and assigned_patients');
  console.log('   4. Test with real users and update this script with actual results');
  console.log('\n   See docs/PERMIT_RECOMMENDATIONS.md for detailed guidance');
  console.log();
}

// Run the tests
testPermitMappings().catch(console.error);
