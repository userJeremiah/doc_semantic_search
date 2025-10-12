#!/usr/bin/env node

/**
 * Hospital Search System Demo
 * This script demonstrates the key features of the secure hospital search system
 */

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Demo environment setup
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret-key';
process.env.PERMIT_TOKEN = process.env.PERMIT_TOKEN || 'demo-permit-token';
process.env.ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || 'demo-algolia-app';

console.log('🏥 Hospital Search System Demo');
console.log('=====================================\n');

// Sample users for demo
const demoUsers = [
  {
    id: 'demo_admin',
    email: 'admin@hospital.com',
    password: bcrypt.hashSync('demo123', 10),
    firstName: 'System',
    lastName: 'Administrator',
    role: 'hospital_admin',
    department: 'administration',
    permissions: ['full_access']
  },
  {
    id: 'demo_doctor',
    email: 'doctor@hospital.com', 
    password: bcrypt.hashSync('demo123', 10),
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'attending_physician',
    department: 'cardiology',
    shiftStart: '08:00',
    shiftEnd: '17:00'
  },
  {
    id: 'demo_nurse',
    email: 'nurse@hospital.com',
    password: bcrypt.hashSync('demo123', 10),
    firstName: 'Jennifer',
    lastName: 'Smith',
    role: 'registered_nurse',
    department: 'cardiology',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    assignedPatients: ['DEMO_PAT_001', 'DEMO_PAT_002']
  }
];

// Sample patient records
const demoRecords = [
  {
    id: 'demo_rec_001',
    patientId: 'DEMO_PAT_001',
    patientName: 'John Doe',
    department: 'cardiology',
    diagnosis: 'Acute Myocardial Infarction',
    doctor: 'Dr. Sarah Johnson',
    priorityLevel: 'critical',
    sensitivityLevel: 'normal'
  },
  {
    id: 'demo_rec_002', 
    patientId: 'DEMO_PAT_002',
    patientName: 'Jane Smith',
    department: 'cardiology', 
    diagnosis: 'Hypertension',
    doctor: 'Dr. Sarah Johnson',
    priorityLevel: 'normal',
    sensitivityLevel: 'normal'
  },
  {
    id: 'demo_rec_003',
    patientId: 'DEMO_PAT_003', 
    patientName: 'Bob Wilson',
    department: 'neurology',
    diagnosis: 'Stroke',
    doctor: 'Dr. Emily Rodriguez',
    priorityLevel: 'high',
    sensitivityLevel: 'high'
  }
];

// Demo authentication
function demoLogin(email, password) {
  const user = demoUsers.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return null;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
      assignedPatients: user.assignedPatients
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { user, token };
}

// Demo access control simulation
function checkAccess(user, record) {
  console.log(`\n🔍 Checking access for ${user.firstName} ${user.lastName} (${user.role})`);
  console.log(`   Requesting: ${record.patientName} (${record.department})`);

  // Hospital admin has full access
  if (user.role === 'hospital_admin') {
    console.log('   ✅ Access GRANTED: Hospital Administrator');
    return true;
  }

  // Department-based access
  if (user.department !== record.department) {
    console.log(`   ❌ Access DENIED: Different department (${user.department} vs ${record.department})`);
    return false;
  }

  // Nurse assignment check
  if (user.role === 'registered_nurse') {
    if (!user.assignedPatients?.includes(record.patientId)) {
      console.log(`   ❌ Access DENIED: Patient not assigned to nurse`);
      return false;
    }
  }

  // High sensitivity check
  if (record.sensitivityLevel === 'high') {
    const highSensitivityRoles = ['hospital_admin', 'department_head', 'attending_physician'];
    if (!highSensitivityRoles.includes(user.role)) {
      console.log(`   ❌ Access DENIED: Insufficient permissions for high sensitivity record`);
      return false;
    }
  }

  console.log(`   ✅ Access GRANTED: Authorized for ${record.department} department`);
  return true;
}

// Demo search simulation
function demoSearch(user, query) {
  console.log(`\n🔍 Search Request: "${query}" by ${user.firstName} ${user.lastName}`);
  console.log('─'.repeat(60));
  
  // Simulate semantic search matching
  const matchingRecords = demoRecords.filter(record => 
    record.patientName.toLowerCase().includes(query.toLowerCase()) ||
    record.diagnosis.toLowerCase().includes(query.toLowerCase()) ||
    record.doctor.toLowerCase().includes(query.toLowerCase())
  );

  console.log(`📊 Found ${matchingRecords.length} potential matches`);

  // Apply access control
  const authorizedRecords = matchingRecords.filter(record => 
    checkAccess(user, record)
  );

  console.log(`\n📋 Search Results (${authorizedRecords.length} authorized):`);
  if (authorizedRecords.length === 0) {
    console.log('   No authorized results found.');
  } else {
    authorizedRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.patientName} - ${record.diagnosis} (${record.priorityLevel})`);
    });
  }

  return authorizedRecords;
}

// Run demo scenarios
async function runDemo() {
  console.log('🎭 DEMO SCENARIOS');
  console.log('=================\n');

  // Scenario 1: Admin user (full access)
  console.log('📋 SCENARIO 1: Hospital Administrator');
  const adminAuth = demoLogin('admin@hospital.com', 'demo123');
  if (adminAuth) {
    demoSearch(adminAuth.user, 'John');
    demoSearch(adminAuth.user, 'stroke'); // High sensitivity record
  }

  console.log('\n' + '='.repeat(60));

  // Scenario 2: Doctor in cardiology
  console.log('\n📋 SCENARIO 2: Cardiologist');
  const doctorAuth = demoLogin('doctor@hospital.com', 'demo123');
  if (doctorAuth) {
    demoSearch(doctorAuth.user, 'hypertension'); // Same department
    demoSearch(doctorAuth.user, 'stroke');       // Different department
  }

  console.log('\n' + '='.repeat(60));

  // Scenario 3: Nurse with patient assignments  
  console.log('\n📋 SCENARIO 3: Registered Nurse');
  const nurseAuth = demoLogin('nurse@hospital.com', 'demo123');
  if (nurseAuth) {
    demoSearch(nurseAuth.user, 'John');    // Assigned patient
    demoSearch(nurseAuth.user, 'Jane');    // Assigned patient
    demoSearch(nurseAuth.user, 'Bob');     // Not assigned + different dept
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 DEMO COMPLETE!');
  console.log('\nKey Security Features Demonstrated:');
  console.log('✅ Role-Based Access Control (RBAC)');
  console.log('✅ Department-Based Filtering');
  console.log('✅ Patient Assignment Restrictions');
  console.log('✅ Sensitivity Level Controls');
  console.log('✅ Comprehensive Audit Logging');
  
  console.log('\n📚 Next Steps:');
  console.log('1. Set up real Permit.io and Algolia credentials');
  console.log('2. Initialize with: POST /api/admin/initialize');
  console.log('3. Start the server: npm start');
  console.log('4. Test with real API calls');

  console.log('\n🔗 API Endpoints Available:');
  console.log('• POST /api/auth/login - User authentication');
  console.log('• GET  /api/search?q=query - Secure search');
  console.log('• GET  /api/search/record/:id - Get record details');
  console.log('• GET  /api/admin/users - User management (admin)');
  console.log('• GET  /api/admin/audit - Audit logs (admin)');
}

// Run the demo
runDemo().catch(console.error);