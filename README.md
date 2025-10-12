<<<<<<< HEAD
# 🏥 Hospital Search System

A secure, AI-powered hospital search system that combines **semantic search** with **dynamic access control** to ensure only authorized personnel can access sensitive patient data.

## 🧠 The Problem

Modern hospitals have massive amounts of sensitive patient data, and while AI makes it easy to find information quickly, there's a critical security gap: **not everyone should see everything**. Traditional search systems either compromise security or usability.

## 🔐 The Solution

This system solves the security vs. usability dilemma by:
- ✅ Using **Algolia** for fast, intelligent semantic search
- ✅ Using **Permit.io** for granular, real-time access control (RBAC + ABAC)
- ✅ Ensuring compliance with healthcare regulations (HIPAA, GDPR)
- ✅ Providing audit trails for all data access

## 🚀 Key Features

### 🔍 **Smart Search**
- Semantic search across patient records, lab results, imaging studies
- Auto-complete suggestions based on user permissions
- Advanced filtering by department, date, priority, etc.
- Medical terminology understanding and synonyms

### 🛡️ **Dynamic Security**
- **Role-based** access (doctor, nurse, admin, etc.)
- **Attribute-based** permissions (department, shift hours, patient assignments)
- **Time-limited** access for temporary staff
- **Emergency overrides** for critical situations
- **Real-time** permission validation

### 📊 **Comprehensive Audit**
- Every search, view, and export is logged
- Compliance reporting for regulatory requirements
- Real-time monitoring of access patterns
- Automatic alerts for suspicious activity

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend/UI   │───▶│   Express API   │───▶│   Permit.io     │
│                 │    │                 │    │ (Access Control)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Algolia     │
                       │ (Search Engine) │
                       └─────────────────┘
```

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Search**: Algolia (semantic search with medical terminology)
- **Access Control**: Permit.io (RBAC + ABAC)
- **Authentication**: JWT tokens
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Express-validator

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Algolia account** and API keys
3. **Permit.io account** and API token
4. **Environment variables** configured

## ⚡ Quick Start

### 1. Clone and Install
```bash
git clone [repository-url]
cd hospital-search
npm install
```

### 2. Environment Setup
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your actual credentials
# - PERMIT_TOKEN=your-permit-io-token
# - ALGOLIA_APP_ID=your-algolia-app-id
# - ALGOLIA_API_KEY=your-algolia-search-key
# - ALGOLIA_ADMIN_KEY=your-algolia-admin-key
# - JWT_SECRET=your-secure-jwt-secret
```

### 3. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Initialize the System
```bash
# Use the admin endpoint to set up roles, policies, and sample data
POST http://localhost:3000/api/admin/initialize
Authorization: Bearer [admin-jwt-token]
```

## 🔑 API Authentication

### Login to get a JWT token:
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@hospital.com",
  "password": "password123"
}
```

### Use the token in subsequent requests:
```bash
Authorization: Bearer [your-jwt-token]
```

## 🏥 Sample Users (for testing)

| Role | Email | Department | Access Level |
|------|-------|------------|--------------|
| Hospital Admin | `admin@hospital.com` | Administration | Full access |
| Department Head | `sarah.johnson@hospital.com` | Emergency | Department-wide |
| Attending Physician | `michael.chen@hospital.com` | Cardiology | Patient-specific |
| Registered Nurse | `nurse.smith@hospital.com` | Cardiology | Assigned patients |
| Temporary Staff | `temp.nurse@hospital.com` | Emergency | Time-limited |
| Lab Technician | `lab.tech@hospital.com` | Laboratory | Lab results only |
| Radiologist | `radiologist@hospital.com` | Radiology | Imaging studies only |

**Default password for all users**: `password123`

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Search
- `GET /api/search?q=search-term` - Secure search
- `GET /api/search/suggestions?q=term` - Auto-complete
- `GET /api/search/record/:id` - Get specific record
- `GET /api/search/filters` - Available filters
- `POST /api/search/export` - Export search results

### Administration
- `POST /api/admin/initialize` - Initialize system
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/audit-logs` - Access audit logs
- `POST /api/admin/user-access` - Manage user permissions
- `GET /api/admin/system-health` - System health check

## 🧪 Testing the Security

### 1. Test Role-Based Access
```bash
# Login as different users and try the same search
# Doctors see more than nurses, admins see everything

# As attending physician (cardiology)
GET /api/search?q=John Doe
# Should return cardiology patients

# As nurse (cardiology) 
GET /api/search?q=John Doe
# Should return only assigned patients
```

### 2. Test Department Restrictions
```bash
# Cardiology doctor searching for emergency patient
GET /api/search?q=Emergency Patient
# Should be denied or filtered
```

### 3. Test Time-Based Access
```bash
# Temporary staff outside their access period
# Should receive "Access expired" error
```

### 4. Test Shift-Based Access
```bash
# Nurse searching outside shift hours
# Should receive "Outside shift hours" error
```

## 🎯 Real-World Scenarios

### Scenario 1: Emergency Doctor Search
```bash
# Dr. Sarah Johnson (Emergency) searches for a patient
POST /api/auth/login
{
  "email": "sarah.johnson@hospital.com",
  "password": "password123"
}

GET /api/search?q=chest pain
# Returns emergency patients with chest pain symptoms
```

### Scenario 2: Nurse Shift Access
```bash
# Nurse Jennifer Smith checks assigned patients
POST /api/auth/login
{
  "email": "nurse.smith@hospital.com", 
  "password": "password123"
}

GET /api/search?q=John Doe
# Only returns John Doe if he's assigned to this nurse
```

### Scenario 3: Admin Audit Review
```bash
# Admin reviews access logs
POST /api/auth/login
{
  "email": "admin@hospital.com",
  "password": "password123"
}

GET /api/admin/audit-logs?action=search&startDate=2024-01-01
# Returns detailed audit trail
```

## 🔒 Security Features

### Access Control Layers
1. **JWT Authentication** - Valid token required
2. **Role Verification** - Role must be authorized for endpoint
3. **Permit.io Authorization** - Fine-grained permission checking
4. **Department Filtering** - Users only see their department data
5. **Time Validation** - Shift hours and access expiry respected
6. **Patient Assignment** - Nurses only see assigned patients

### Audit & Compliance
- All searches logged with user, query, and results
- Record access tracked with timestamps
- Export activities require justification
- Failed access attempts monitored
- Real-time security alerts

## 📊 Healthcare-Specific Features

### Medical Terminology
- Synonyms for common medical terms
- Specialized search for different record types
- Priority-based result ranking

### Department Structure
- Emergency, Cardiology, Neurology, Pediatrics, etc.
- Department-specific access policies
- Specialty-based permissions

### Record Types
- Patient records, Lab results, Imaging studies
- Medication records, Vital signs, Discharge summaries
- Role-specific access to different record types

## 🚨 Emergency Procedures

### Emergency Access Override
```bash
# In critical situations, certain users can override restrictions
# This is logged and audited heavily

GET /api/search?q=critical-patient&emergency=true
# Provides expanded access with full audit trail
```

## 🔧 Configuration

### Permit.io Setup
The system automatically creates these roles and policies:
- Hospital Administrator (full access)
- Department Head (department-wide access)
- Attending Physician (patient-specific access)
- Registered Nurse (shift + assignment based)
- Lab Technician (lab results only)
- Radiologist (imaging studies only)
- Temporary Staff (time-limited access)

### Algolia Configuration
Optimized for healthcare with:
- Medical term synonyms
- Typo tolerance for complex medical words
- Priority-based ranking
- Department and record type faceting

## 📈 Monitoring & Analytics

### System Health
- Real-time service status monitoring
- Performance metrics and response times
- User activity patterns
- Search success rates

### Compliance Reporting
- Access frequency by role and department
- Data export tracking
- Failed access attempt analysis
- Regular compliance reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all security tests pass
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review audit logs for access issues
3. Contact system administrators
4. Create GitHub issues for bugs

---

**🏥 Built for healthcare professionals who need both speed and security in patient data access.**
