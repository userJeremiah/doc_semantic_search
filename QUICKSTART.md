# 🚀 Quick Start Guide

## Overview
This is a **secure AI-powered hospital search system** that combines semantic search with dynamic access control to protect sensitive patient data.

## ⚡ Quick Demo
```bash
npm run demo
```
This runs an interactive demonstration of the security features without requiring external API keys.

## 🏗️ Full Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure your API keys:
```bash
cp .env.example .env
```

Edit `.env` with your real credentials:
```env
# Required for production
PERMIT_TOKEN=your-permit-io-api-token
ALGOLIA_APP_ID=your-algolia-app-id  
ALGOLIA_API_KEY=your-algolia-api-key
ALGOLIA_ADMIN_KEY=your-algolia-admin-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. Initialize Sample Data
Make a POST request to initialize the system:
```bash
curl -X POST http://localhost:3000/api/admin/initialize \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json"
```

## 🔐 Test Users

| Email | Password | Role | Department |
|-------|----------|------|------------|
| `admin@hospital.com` | `password123` | Hospital Admin | Administration |
| `michael.chen@hospital.com` | `password123` | Attending Physician | Cardiology |
| `nurse.smith@hospital.com` | `password123` | Registered Nurse | Cardiology |
| `temp.nurse@hospital.com` | `password123` | Temporary Staff | Emergency |

## 📡 Key API Endpoints

### Authentication
```bash
# Login
POST /api/auth/login
{
  "email": "doctor@hospital.com",
  "password": "password123"
}
```

### Search (Requires Authentication)
```bash
# Secure search
GET /api/search?q=John Doe
Authorization: Bearer <token>

# Get record details  
GET /api/search/record/{recordId}
Authorization: Bearer <token>

# Search suggestions
GET /api/search/suggestions?q=John
Authorization: Bearer <token>
```

### Administration (Admin Only)
```bash
# System statistics
GET /api/admin/stats
Authorization: Bearer <admin-token>

# Audit logs
GET /api/admin/audit
Authorization: Bearer <admin-token>

# User management
GET /api/admin/users
Authorization: Bearer <admin-token>
```

## 🧪 Testing
```bash
# Run demo (no setup required)
npm run demo

# Run test suite
npm test

# Run with coverage
npm run test:coverage
```

## 🔒 Security Features

### Role-Based Access Control
- **Hospital Admin**: Full system access
- **Department Head**: Department-wide access  
- **Attending Physician**: Patient records in their department
- **Registered Nurse**: Assigned patients only + shift restrictions
- **Lab Technician**: Lab results only
- **Temporary Staff**: Time-limited access

### Access Control Examples

✅ **Allowed**: Cardiologist searching for cardiology patients  
❌ **Denied**: Nurse accessing patients from different department  
❌ **Denied**: Temporary staff with expired access  
❌ **Denied**: Regular nurse accessing high-sensitivity records  

### Audit & Compliance
- Every search is logged with user details
- Record access tracking for HIPAA compliance
- Export functionality with proper authorization
- Security event monitoring

## 🔧 Configuration

### Permit.io Setup
1. Create account at [permit.io](https://permit.io)
2. Get API token from dashboard
3. The system auto-creates healthcare policies

### Algolia Setup  
1. Create account at [algolia.com](https://algolia.com)
2. Create new application
3. Get App ID and API keys
4. The system auto-configures search index

## 📊 System Architecture

```
Client Request → Authentication → Access Control → Search Engine → Audit Log
     ↓              ↓                ↓              ↓             ↓
   Frontend      JWT Tokens      Permit.io      Algolia     Database
```

## 🏥 Healthcare Compliance

### HIPAA Ready
- ✅ Access controls and user authentication
- ✅ Audit logging of all data access
- ✅ Data encryption in transit and at rest
- ✅ Role-based permissions
- ✅ Breach detection and logging

### GDPR Compliant
- ✅ Data subject access controls
- ✅ Right to be forgotten (data deletion)
- ✅ Consent management
- ✅ Data processing audit trails

## 🚨 Production Considerations

### Security Hardening
- Use HTTPS only in production
- Set strong JWT secrets (32+ characters)
- Enable rate limiting
- Configure CORS properly
- Use environment variables for secrets

### Monitoring
- Set up log aggregation (ELK stack)
- Configure alerts for security events
- Monitor API response times
- Track user access patterns

### Scalability
- Use Redis for session management
- Implement database connection pooling  
- Set up load balancing
- Configure auto-scaling policies

## 🆘 Troubleshooting

### Common Issues

**❌ Permit.io connection errors**
```bash
# Check API token and PDP URL
echo $PERMIT_TOKEN
echo $PERMIT_PDP_URL
```

**❌ Algolia search not working**
```bash
# Verify API keys and app ID
echo $ALGOLIA_APP_ID
echo $ALGOLIA_API_KEY
```

**❌ JWT token errors**
```bash
# Ensure JWT_SECRET is set
echo $JWT_SECRET
```

### Getting Help
1. Check the demo: `npm run demo`
2. Review logs in terminal output
3. Verify environment variables
4. Test with provided sample users

---

**🏥 Built for Healthcare Security**  
*"AI makes data easy to find. Permit.io ensures only the right people find it."*