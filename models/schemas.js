/**
 * Patient Record Schema
 */
class PatientRecord {
  constructor(data) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.patientName = data.patientName;
    this.medicalRecordNumber = data.medicalRecordNumber;
    this.dateOfBirth = data.dateOfBirth;
    this.gender = data.gender;
    this.contactInfo = data.contactInfo;
    this.emergencyContact = data.emergencyContact;
    this.insuranceInfo = data.insuranceInfo;
    this.medicalHistory = data.medicalHistory || [];
    this.allergies = data.allergies || [];
    this.currentMedications = data.currentMedications || [];
    this.department = data.department;
    this.attendingPhysician = data.attendingPhysician;
    this.admissionDate = data.admissionDate;
    this.roomNumber = data.roomNumber;
    this.status = data.status; // 'admitted', 'discharged', 'outpatient'
    this.priorityLevel = data.priorityLevel || 'normal'; // 'critical', 'high', 'normal', 'low'
    this.sensitivityLevel = data.sensitivityLevel || 'normal'; // 'high', 'normal', 'low'
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static validate(data) {
    const required = ['patientId', 'patientName', 'medicalRecordNumber', 'department'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Medical Record Schema
 */
class MedicalRecord {
  constructor(data) {
    this.id = data.id;
    this.patientId = data.patientId;
    this.recordType = data.recordType; // 'lab_result', 'imaging', 'prescription', 'note', 'procedure'
    this.department = data.department;
    this.doctorName = data.doctorName;
    this.doctorId = data.doctorId;
    this.dateCreated = data.dateCreated || new Date().toISOString();
    this.title = data.title;
    this.diagnosis = data.diagnosis;
    this.summary = data.summary;
    this.details = data.details;
    this.notes = data.notes;
    this.symptoms = data.symptoms || [];
    this.vitalSigns = data.vitalSigns;
    this.labResults = data.labResults;
    this.imagingResults = data.imagingResults;
    this.medications = data.medications || [];
    this.procedures = data.procedures || [];
    this.followUpRequired = data.followUpRequired || false;
    this.followUpDate = data.followUpDate;
    this.status = data.status || 'active';
    this.priorityLevel = data.priorityLevel || 'normal';
    this.sensitivityLevel = data.sensitivityLevel || 'normal';
    this.tags = data.tags || [];
  }
}

/**
 * User Schema
 */
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role; // 'hospital_admin', 'department_head', 'attending_physician', etc.
    this.department = data.department;
    this.employeeId = data.employeeId;
    this.licenseNumber = data.licenseNumber;
    this.specialization = data.specialization;
    this.shiftStart = data.shiftStart; // "08:00"
    this.shiftEnd = data.shiftEnd; // "16:00"
    this.accessExpiry = data.accessExpiry; // For temporary staff
    this.assignedPatients = data.assignedPatients || []; // For nurses
    this.permissions = data.permissions || [];
    this.emergencyAccess = data.emergencyAccess || false;
    this.isActive = data.isActive !== false;
    this.lastLogin = data.lastLogin;
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  get isShiftActive() {
    if (!this.shiftStart || !this.shiftEnd) return true;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= this.shiftStart && currentTime <= this.shiftEnd;
  }

  get isAccessValid() {
    if (!this.accessExpiry) return true;
    return new Date(this.accessExpiry) > new Date();
  }
}

/**
 * Department Schema
 */
class Department {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.headOfDepartment = data.headOfDepartment;
    this.location = data.location;
    this.contactInfo = data.contactInfo;
    this.specialties = data.specialties || [];
    this.emergencyDepartment = data.emergencyDepartment || false;
    this.isActive = data.isActive !== false;
  }
}

module.exports = {
  PatientRecord,
  MedicalRecord,
  User,
  Department
};