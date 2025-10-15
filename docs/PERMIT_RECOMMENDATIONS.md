# Permit.io Configuration Recommendations

Based on the detailed inspection of your Permit.io tenant (October 15, 2025), here are recommendations to enhance your authorization setup.

## ✅ What You've Done Well

1. **Rich Resource Attributes**: Your resources have comprehensive ABAC attributes
   - `patient_records` has department, assigned_doctor_id, sensitivity_level, etc.
   - `emergency_access` has proper tracking fields
   - `search_portal` has audit-friendly attributes

2. **Granular Permissions**: You've defined 23+ specific permissions instead of generic CRUD
   - Better than generic read/write/delete
   - Matches real-world healthcare workflows

3. **Audit-Ready**: You have an `audit_logs` resource with proper attributes

## 🔧 Recommended Improvements

### 1. Complete Nurse Role Permissions (HIGH PRIORITY)

**Current State**: `nurse` role has 0 permissions configured

**Recommended Permissions**:
```javascript
nurse:
  - patient_records:view      // View assigned patients
  - patient_records:search    // Search within assigned patients
  - patient_records:update    // Update vital signs, notes
  - search_portal:search      // Use search portal
  - search_portal:viewresult  // View search results
  - emergency_access:request  // Request emergency access
```

**To implement** (in Permit.io dashboard):
1. Go to Roles → nurse
2. Add permissions for patient_records: view, search, update
3. Add permissions for search_portal: search, viewresult
4. Add conditional rules based on `assigned_doctor_id` or department

### 2. Complete Temporary Staff Permissions (HIGH PRIORITY)

**Current State**: `temporary_staff` role has 0 permissions configured

**Recommended Permissions**:
```javascript
temporary_staff:
  - patient_records:view      // Limited view
  - patient_records:search    // Basic search
  - search_portal:search      // Search portal access
```

**With ABAC Conditions**:
- Check `access_expiry_time` attribute
- Check `is_active` attribute
- Limit to specific department

### 3. Add Specialized Roles (MEDIUM PRIORITY)

Consider creating separate roles for:

**a) Lab Technician**
```javascript
lab_technician:
  - patient_records:view      // View lab-related records only
  - patient_records:update    // Update lab results
  - patient_records:create    // Create lab results
  - search_portal:search      // Search for lab work
```

**b) Pharmacist**
```javascript
pharmacist:
  - patient_records:view      // View medication records
  - patient_records:update    // Update medication records
  - search_portal:search      // Search prescriptions
```

**c) Radiologist**
```javascript
radiologist:
  - patient_records:view      // View imaging records
  - patient_records:update    // Update imaging reports
  - patient_records:create    // Create imaging reports
  - search_portal:search      // Search imaging studies
```

### 4. Fix Typos in Attribute Names (LOW PRIORITY, but good practice)

**Found Typos**:
- `senstivity_level` → should be `sensitivity_level`
- `resouce_type` → should be `resource_type`

These typos are in your Permit.io configuration. While not breaking functionality, fixing them improves maintainability.

**To fix**:
1. In Permit.io dashboard, go to Resources
2. Edit `patient_records` → rename attribute `senstivity_level` to `sensitivity_level`
3. Edit `audit_logs` → rename attribute `resouce_type` to `resource_type`
4. Update the code mapping to match the corrected names

### 5. Add ABAC Conditions for Enhanced Security (MEDIUM PRIORITY)

**Recommended Condition Sets**:

**a) Department-Based Access**
```javascript
Condition: user.department == resource.department
Apply to: doctor, nurse roles
Resources: patient_records
```

**b) Assigned Doctor Matching**
```javascript
Condition: user.id == resource.assigned_doctor_id
Apply to: doctor role
Resources: patient_records
Actions: update, delete
```

**c) Sensitivity Level Restrictions**
```javascript
Condition: resource.senstivity_level != "high" OR user.role == "admin"
Apply to: nurse, temporary_staff
Resources: patient_records
```

**d) Time-Based Access for Temporary Staff**
```javascript
Condition: current_time < user.access_expiry_time
Apply to: temporary_staff
All resources
```

### 6. Leverage Emergency Access Resource (HIGH VALUE)

You have an `emergency_access` resource - make it functional:

**Workflow**:
1. User requests emergency access → `emergency_access:request`
2. System creates emergency_access record with attributes:
   - `requested_by`: user.id
   - `reason`: "Critical patient in ER"
   - `status`: "pending"
   - `expiry_at`: current_time + 4 hours

3. Admin/Doctor approves → `emergency_access:approve`
   - Updates `status` to "approved"
   - Updates `approved_by`

4. User gets temporary elevated access to specific patient records

5. Auto-revoke when `expiry_at` is reached

**Code Integration**:
```javascript
// In secureSearch.js
async checkEmergencyAccess(user, resource) {
  // Check if user has active emergency access
  const emergencyAccess = await this.permit.check(
    user,
    'view',
    { type: 'emergency_access', attributes: { status: 'approved' } }
  );
  
  if (emergencyAccess) {
    // Grant temporary access
    return true;
  }
  return false;
}
```

### 7. Add Resource-Level Policies (Advanced)

Create policies that combine role + conditions:

**Example Policy: "Nurse Can View Assigned Patients Only"**
```yaml
Policy Name: nurse_assigned_patients
Subjects: role:nurse
Resources: resource:patient_records
Actions: view, search, update
Conditions:
  - user.assigned_patients CONTAINS resource.patient_id
  - user.shift_active == true
  - user.department == resource.department
Effect: allow
```

**Example Policy: "Doctor Can Access Department Patients"**
```yaml
Policy Name: doctor_department_access
Subjects: role:doctor
Resources: resource:patient_records
Actions: view, update, create, search, export
Conditions:
  - user.department == resource.department
  - user.is_active == true
Effect: allow
```

### 8. Implement Shift-Based Access (for nurses)

Add user attributes in Permit.io:
- `shift_start`: "07:00"
- `shift_end`: "19:00"
- `shift_active`: computed field

Create condition:
```javascript
Condition: user.shift_active == true
Apply to: nurse role
All actions during shift hours
```

### 9. Add Anonymized Data Access

Leverage the `is_anonymized` attribute:

**Policy**: Research or training access to anonymized records
```yaml
Policy Name: anonymized_data_access
Subjects: role:nurse, role:temporary_staff
Resources: resource:patient_records
Actions: view, search
Conditions:
  - resource.is_anonymized == true
Effect: allow
```

This allows broader access to anonymized data for training purposes.

## 📋 Implementation Priority

### Immediate (This Week):
1. ✅ Configure nurse role permissions
2. ✅ Configure temporary_staff role permissions
3. ✅ Add ABAC condition for department matching

### Short Term (Next 2 Weeks):
4. Create specialized roles (lab_technician, pharmacist, radiologist)
5. Implement emergency access workflow
6. Add resource-level policies

### Long Term (Next Month):
7. Fix attribute typos
8. Add shift-based access conditions
9. Implement anonymized data access policies
10. Set up automated policy testing

## 🧪 Testing Your Configuration

Run these test scenarios after implementing recommendations:

### Test 1: Nurse Access
```bash
# Should ALLOW: Nurse viewing assigned patient
user: { role: "nurse", department: "cardiology", assigned_patients: ["PAT001"] }
resource: { type: "patient_records", id: "PAT001", department: "cardiology" }
action: "view"
Expected: ALLOW

# Should DENY: Nurse viewing non-assigned patient
user: { role: "nurse", department: "cardiology", assigned_patients: ["PAT001"] }
resource: { type: "patient_records", id: "PAT002", department: "cardiology" }
action: "view"
Expected: DENY
```

### Test 2: Department Boundaries
```bash
# Should DENY: Doctor accessing different department
user: { role: "doctor", department: "cardiology" }
resource: { type: "patient_records", department: "neurology" }
action: "view"
Expected: DENY
```

### Test 3: Temporary Staff Expiry
```bash
# Should DENY: Expired temporary staff
user: { role: "temporary_staff", access_expiry_time: "2025-10-14T00:00:00Z" }
resource: { type: "patient_records" }
action: "view"
Current Time: "2025-10-15T10:00:00Z"
Expected: DENY
```

## 📞 Need Help?

If you need assistance implementing any of these recommendations:
1. I can help write the Permit.io policy configurations
2. I can update the code to leverage new policies
3. I can create test scripts to validate the configuration

Would you like me to help implement any of these recommendations?
