const { PatientRecord, MedicalRecord, User, Department } = require('./schemas');

/**
 * Sample data for testing the hospital search system
 */

// Sample Departments
const sampleDepartments = [
  new Department({
    id: 'dept_001',
    name: 'Emergency Department',
    code: 'emergency',
    description: 'Emergency medical services and trauma care',
    headOfDepartment: 'Dr. Sarah Johnson',
    location: 'Building A, Ground Floor',
    emergencyDepartment: true,
    specialties: ['Trauma', 'Critical Care', 'Emergency Medicine']
  }),
  new Department({
    id: 'dept_002',
    name: 'Cardiology',
    code: 'cardiology',
    description: 'Heart and cardiovascular system care',
    headOfDepartment: 'Dr. Michael Chen',
    location: 'Building B, 3rd Floor',
    specialties: ['Interventional Cardiology', 'Heart Surgery', 'Electrophysiology']
  }),
  new Department({
    id: 'dept_003',
    name: 'Neurology',
    code: 'neurology',
    description: 'Brain and nervous system disorders',
    headOfDepartment: 'Dr. Emily Rodriguez',
    location: 'Building C, 2nd Floor',
    specialties: ['Neurosurgery', 'Stroke Care', 'Epilepsy']
  }),
  new Department({
    id: 'dept_004',
    name: 'Pediatrics',
    code: 'pediatrics',
    description: 'Medical care for infants, children, and adolescents',
    headOfDepartment: 'Dr. Lisa Wang',
    location: 'Building D, All Floors',
    specialties: ['Neonatology', 'Pediatric Surgery', 'Child Development']
  }),
  new Department({
    id: 'dept_005',
    name: 'Radiology',
    code: 'radiology',
    description: 'Medical imaging and diagnostic services',
    headOfDepartment: 'Dr. Robert Kim',
    location: 'Building A, Basement',
    specialties: ['CT Imaging', 'MRI', 'Ultrasound', 'X-Ray']
  })
];

// Sample Users
const sampleUsers = [
  new User({
    id: 'user_001',
    email: 'admin@hospital.com',
    firstName: 'John',
    lastName: 'Administrator',
    role: 'hospital_admin',
    department: 'administration',
    employeeId: 'EMP001',
    permissions: ['full_access'],
    emergencyAccess: true
  }),
  new User({
    id: 'user_002', 
    email: 'sarah.johnson@hospital.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'department_head',
    department: 'emergency',
    employeeId: 'EMP002',
    licenseNumber: 'MD123456',
    specialization: 'Emergency Medicine',
    shiftStart: '06:00',
    shiftEnd: '18:00'
  }),
  new User({
    id: 'user_003',
    email: 'michael.chen@hospital.com',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'attending_physician',
    department: 'cardiology',
    employeeId: 'EMP003',
    licenseNumber: 'MD789012',
    specialization: 'Cardiology',
    shiftStart: '08:00',
    shiftEnd: '17:00'
  }),
  new User({
    id: 'user_004',
    email: 'nurse.smith@hospital.com',
    firstName: 'Jennifer',
    lastName: 'Smith',
    role: 'registered_nurse',
    department: 'cardiology',
    employeeId: 'EMP004',
    licenseNumber: 'RN345678',
    shiftStart: '07:00',
    shiftEnd: '19:00',
    assignedPatients: ['PAT001', 'PAT002', 'PAT005']
  }),
  new User({
    id: 'user_005',
    email: 'temp.nurse@hospital.com',
    firstName: 'Alex',
    lastName: 'Thompson',
    role: 'temp_staff',
    department: 'emergency',
    employeeId: 'TEMP001',
    licenseNumber: 'RN999888',
    shiftStart: '12:00',
    shiftEnd: '00:00',
    accessExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    assignedPatients: ['PAT003']
  }),
  new User({
    id: 'user_006',
    email: 'lab.tech@hospital.com',
    firstName: 'David',
    lastName: 'Brown',
    role: 'lab_technician',
    department: 'laboratory',
    employeeId: 'EMP006',
    licenseNumber: 'LT567890'
  }),
  new User({
    id: 'user_007',
    email: 'radiologist@hospital.com',
    firstName: 'Maria',
    lastName: 'Garcia',
    role: 'radiologist',
    department: 'radiology',
    employeeId: 'EMP007',
    licenseNumber: 'MD111222',
    specialization: 'Radiology'
  })
];

// Sample Patient Records
const samplePatients = [
  new PatientRecord({
    id: 'rec_001',
    patientId: 'PAT001',
    patientName: 'John Doe',
    medicalRecordNumber: 'MRN001234',
    dateOfBirth: '1985-03-15',
    gender: 'Male',
    department: 'cardiology',
    attendingPhysician: 'Dr. Michael Chen',
    status: 'admitted',
    priorityLevel: 'high',
    sensitivityLevel: 'normal',
    roomNumber: 'C301',
    admissionDate: '2024-01-15T08:30:00Z',
    allergies: ['Penicillin', 'Shellfish'],
    currentMedications: ['Metoprolol', 'Aspirin', 'Lisinopril'],
    medicalHistory: ['Hypertension', 'Previous MI'],
    contactInfo: {
      phone: '+1-555-0101',
      email: 'john.doe@email.com',
      address: '123 Main St, City, State 12345'
    },
    insuranceInfo: {
      provider: 'Blue Cross',
      policyNumber: 'BC123456789'
    }
  }),
  new PatientRecord({
    id: 'rec_002',
    patientId: 'PAT002',
    patientName: 'Jane Smith',
    medicalRecordNumber: 'MRN002345',
    dateOfBirth: '1992-07-22',
    gender: 'Female',
    department: 'cardiology',
    attendingPhysician: 'Dr. Michael Chen',
    status: 'admitted',
    priorityLevel: 'normal',
    sensitivityLevel: 'normal',
    roomNumber: 'C305',
    admissionDate: '2024-01-16T14:15:00Z',
    allergies: ['None known'],
    currentMedications: ['Atorvastatin'],
    medicalHistory: ['High cholesterol'],
    contactInfo: {
      phone: '+1-555-0202',
      email: 'jane.smith@email.com'
    }
  }),
  new PatientRecord({
    id: 'rec_003',
    patientId: 'PAT003',
    patientName: 'Emergency Patient',
    medicalRecordNumber: 'MRN003456',
    dateOfBirth: '1978-11-05',
    gender: 'Male',
    department: 'emergency',
    attendingPhysician: 'Dr. Sarah Johnson',
    status: 'admitted',
    priorityLevel: 'critical',
    sensitivityLevel: 'high',
    roomNumber: 'ER-02',
    admissionDate: '2024-01-17T02:45:00Z',
    allergies: ['Morphine'],
    currentMedications: ['Epinephrine'],
    medicalHistory: ['Severe asthma', 'Drug allergies']
  }),
  new PatientRecord({
    id: 'rec_004',
    patientId: 'PAT004',
    patientName: 'Child Patient',
    medicalRecordNumber: 'MRN004567',
    dateOfBirth: '2018-04-10',
    gender: 'Female',
    department: 'pediatrics',
    attendingPhysician: 'Dr. Lisa Wang',
    status: 'outpatient',
    priorityLevel: 'normal',
    sensitivityLevel: 'normal',
    admissionDate: '2024-01-17T10:00:00Z',
    allergies: ['None known'],
    currentMedications: ['Children\'s Tylenol'],
    medicalHistory: ['Routine checkup']
  }),
  new PatientRecord({
    id: 'rec_005',
    patientId: 'PAT005',
    patientName: 'Neurology Patient',
    medicalRecordNumber: 'MRN005678',
    dateOfBirth: '1965-09-18',
    gender: 'Male',
    department: 'neurology',
    attendingPhysician: 'Dr. Emily Rodriguez',
    status: 'admitted',
    priorityLevel: 'high',
    sensitivityLevel: 'normal',
    roomNumber: 'N202',
    admissionDate: '2024-01-14T16:20:00Z',
    allergies: ['Contrast dye'],
    currentMedications: ['Levetiracetam', 'Phenytoin'],
    medicalHistory: ['Epilepsy', 'Previous stroke']
  })
];

// Sample Medical Records
const sampleMedicalRecords = [
  new MedicalRecord({
    id: 'med_001',
    patientId: 'PAT001',
    recordType: 'lab_result',
    department: 'cardiology',
    doctorName: 'Dr. Michael Chen',
    doctorId: 'user_003',
    title: 'Cardiac Enzyme Panel',
    diagnosis: 'Acute Myocardial Infarction',
    summary: 'Elevated troponin levels consistent with heart attack',
    details: 'Troponin I: 15.2 ng/mL (Normal: <0.04), CK-MB: 25 ng/mL (Normal: <3.6)',
    notes: 'Patient presented with chest pain. Labs confirm MI. Started on dual antiplatelet therapy.',
    symptoms: ['Chest pain', 'Shortness of breath', 'Diaphoresis'],
    labResults: {
      troponinI: { value: 15.2, unit: 'ng/mL', normal: '<0.04', status: 'critical' },
      ckMb: { value: 25, unit: 'ng/mL', normal: '<3.6', status: 'high' }
    },
    priorityLevel: 'critical',
    sensitivityLevel: 'normal',
    followUpRequired: true,
    followUpDate: '2024-01-18T08:00:00Z'
  }),
  new MedicalRecord({
    id: 'med_002',
    patientId: 'PAT001',
    recordType: 'imaging',
    department: 'radiology',
    doctorName: 'Dr. Maria Garcia',
    doctorId: 'user_007',
    title: 'Coronary Angiography',
    diagnosis: 'Significant LAD stenosis',
    summary: '90% stenosis in left anterior descending artery',
    details: 'Coronary angiography reveals significant stenosis in proximal LAD. RCA and LCX appear normal.',
    notes: 'Recommend urgent PCI. Patient stable for procedure.',
    imagingResults: {
      studyType: 'Coronary Angiography',
      findings: '90% LAD stenosis',
      recommendation: 'Urgent PCI'
    },
    priorityLevel: 'critical'
  }),
  new MedicalRecord({
    id: 'med_003',
    patientId: 'PAT003',
    recordType: 'note',
    department: 'emergency',
    doctorName: 'Dr. Sarah Johnson',
    doctorId: 'user_002',
    title: 'Emergency Department Assessment',
    diagnosis: 'Severe Asthma Exacerbation',
    summary: 'Patient in severe respiratory distress',
    details: 'Patient presented with severe SOB, wheezing, and accessory muscle use. O2 sat 88% on room air.',
    notes: 'Administered nebulizer treatments and systemic steroids. Patient improving.',
    symptoms: ['Severe shortness of breath', 'Wheezing', 'Accessory muscle use'],
    vitalSigns: {
      bloodPressure: '145/90',
      heartRate: 120,
      respiratoryRate: 28,
      oxygenSaturation: 88,
      temperature: 98.6
    },
    medications: ['Albuterol nebulizer', 'Methylprednisolone'],
    priorityLevel: 'critical',
    sensitivityLevel: 'high'
  }),
  new MedicalRecord({
    id: 'med_004',
    patientId: 'PAT004',
    recordType: 'note',
    department: 'pediatrics',
    doctorName: 'Dr. Lisa Wang',
    doctorId: 'user_008',
    title: 'Routine Pediatric Checkup',
    diagnosis: 'Healthy child - routine checkup',
    summary: 'Normal growth and development for age',
    details: 'Height and weight within normal percentiles. Developmental milestones appropriate.',
    notes: 'Continue current feeding schedule. Next checkup in 6 months.',
    vitalSigns: {
      height: '105 cm',
      weight: '18 kg',
      headCircumference: '50 cm'
    },
    priorityLevel: 'normal'
  }),
  new MedicalRecord({
    id: 'med_005',
    patientId: 'PAT005',
    recordType: 'imaging',
    department: 'radiology',
    doctorName: 'Dr. Maria Garcia',
    doctorId: 'user_007',
    title: 'Brain MRI',
    diagnosis: 'Post-stroke changes',
    summary: 'Chronic infarct in right MCA territory',
    details: 'MRI shows chronic infarct changes in right middle cerebral artery territory. No acute findings.',
    notes: 'Consistent with patient\'s history of stroke. Continue current medications.',
    imagingResults: {
      studyType: 'Brain MRI',
      findings: 'Chronic right MCA infarct',
      recommendation: 'Continue current treatment'
    },
    priorityLevel: 'normal'
  })
];

module.exports = {
  sampleDepartments,
  sampleUsers,
  samplePatients,
  sampleMedicalRecords
};