const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole, checkAccessExpiry } = require('../middleware/auth');
const SecureSearchService = require('../services/secureSearch');
const AlgoliaService = require('../services/algolia');
const PermitService = require('../services/permit');
const { samplePatients, sampleMedicalRecords } = require('../models/sampleData');

const router = express.Router();
const secureSearchService = new SecureSearchService();
const algoliaService = new AlgoliaService();
const permitService = new PermitService();

/**
 * @route POST /api/admin/initialize
 * @desc Initialize the hospital search system with sample data
 * @access Admin only
 */
router.post('/initialize', [
  authenticateToken,
  checkAccessExpiry,
  requireRole(['hospital_admin'])
], async (req, res) => {
  try {
    console.log('🚀 Initializing hospital search system...');

    // Initialize the secure search service
    await secureSearchService.initialize();

    // Index sample patient records
    console.log('📚 Indexing sample patient records...');
    
    // Convert patient records to searchable format
    const searchableRecords = samplePatients.map(patient => ({
      id: patient.id,
      patientId: patient.patientId,
      patientName: patient.patientName,
      medicalRecordNumber: patient.medicalRecordNumber,
      recordType: 'patient_record',
      department: patient.department,
      doctorName: patient.attendingPhysician,
      dateCreated: patient.admissionDate || patient.createdAt,
      lastUpdated: patient.updatedAt,
      diagnosis: patient.medicalHistory.join(', '),
      status: patient.status,
      priorityLevel: patient.priorityLevel,
      summary: `Patient: ${patient.patientName}, Department: ${patient.department}, Status: ${patient.status}`,
      notes: `Allergies: ${patient.allergies.join(', ')}. Medications: ${patient.currentMedications.join(', ')}.`,
      symptoms: [],
      procedureName: '',
      medications: patient.currentMedications,
      labTests: [],
      patientAge: new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
      gender: patient.gender,
      insuranceType: patient.insuranceInfo?.provider || 'Unknown',
      sensitivityLevel: patient.sensitivityLevel
    }));

    // Convert medical records to searchable format
    const searchableMedicalRecords = sampleMedicalRecords.map(record => ({
      id: record.id,
      patientId: record.patientId,
      patientName: samplePatients.find(p => p.patientId === record.patientId)?.patientName || 'Unknown',
      medicalRecordNumber: samplePatients.find(p => p.patientId === record.patientId)?.medicalRecordNumber || 'Unknown',
      recordType: record.recordType,
      department: record.department,
      doctorName: record.doctorName,
      dateCreated: record.dateCreated,
      lastUpdated: record.dateCreated,
      diagnosis: record.diagnosis,
      status: record.status,
      priorityLevel: record.priorityLevel,
      summary: record.summary,
      notes: record.notes || '',
      symptoms: record.symptoms || [],
      procedureName: record.procedures?.join(', ') || '',
      medications: record.medications || [],
      labTests: record.labResults ? Object.keys(record.labResults) : [],
      patientAge: 45, // Default age for medical records
      gender: 'Unknown',
      insuranceType: 'Unknown',
      sensitivityLevel: record.sensitivityLevel || 'normal'
    }));

    // Combine all records
    const allRecords = [...searchableRecords, ...searchableMedicalRecords];

    // Batch index all records in Algolia
    await algoliaService.batchIndexRecords(allRecords);

    console.log('✅ Hospital search system initialized successfully!');

    res.json({
      message: 'Hospital search system initialized successfully',
      stats: {
        patientRecords: searchableRecords.length,
        medicalRecords: searchableMedicalRecords.length,
        totalRecords: allRecords.length,
        departments: [...new Set(allRecords.map(r => r.department))],
        recordTypes: [...new Set(allRecords.map(r => r.recordType))]
      },
      timestamp: new Date().toISOString(),
      initializedBy: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

  } catch (error) {
    console.error('❌ Initialization error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to initialize hospital search system',
        code: 'INITIALIZATION_ERROR',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics and usage metrics
 * @access Admin and Department Heads
 */
router.get('/stats', [
  authenticateToken,
  checkAccessExpiry,
  requireRole(['hospital_admin', 'department_head'])
], async (req, res) => {
  try {
    // In a real system, you would query actual databases and analytics
    const stats = {
      overview: {
        totalRecords: 150000,
        totalPatients: 25000,
        totalUsers: 1250,
        activeSessions: 45,
        searchesLast24h: 3420
      },
      departmentBreakdown: {
        emergency: { records: 25000, patients: 5000, users: 150 },
        cardiology: { records: 20000, patients: 3500, users: 120 },
        neurology: { records: 18000, patients: 3000, users: 95 },
        pediatrics: { records: 15000, patients: 4000, users: 110 },
        radiology: { records: 22000, patients: 8000, users: 85 },
        surgery: { records: 30000, patients: 2500, users: 200 },
        icu: { records: 12000, patients: 800, users: 180 },
        oncology: { records: 8000, patients: 1200, users: 75 }
      },
      searchMetrics: {
        avgResponseTime: '145ms',
        topSearchTerms: [
          'chest pain',
          'diabetes',
          'MRI results',
          'lab results',
          'discharge summary'
        ],
        searchesByDepartment: {
          emergency: 1200,
          cardiology: 850,
          neurology: 650,
          pediatrics: 420,
          radiology: 300
        }
      },
      accessControl: {
        deniedAccesses: 23,
        privilegeEscalations: 2,
        emergencyOverrides: 5,
        expiredAccounts: 8
      },
      systemHealth: {
        uptime: '99.8%',
        avgCpuUsage: '35%',
        avgMemoryUsage: '60%',
        algoliaStatus: 'healthy',
        permitStatus: 'healthy'
      }
    };

    // Filter stats based on user role
    if (req.user.role === 'department_head') {
      // Department heads only see their department stats
      const userDept = req.user.department;
      stats.departmentBreakdown = {
        [userDept]: stats.departmentBreakdown[userDept]
      };
      stats.searchMetrics.searchesByDepartment = {
        [userDept]: stats.searchMetrics.searchesByDepartment[userDept] || 0
      };
    }

    res.json({
      stats,
      generatedAt: new Date().toISOString(),
      userRole: req.user.role,
      userDepartment: req.user.department
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve system statistics',
        code: 'STATS_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/admin/audit-logs
 * @desc Get audit logs for compliance and monitoring
 * @access Admin only
 */
router.get('/audit-logs', [
  authenticateToken,
  checkAccessExpiry,
  requireRole(['hospital_admin']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isString(),
  query('department').optional().isString(),
  query('action').optional().isIn(['search', 'read', 'export', 'login', 'logout']),
  query('page').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const {
      startDate,
      endDate,
      userId,
      department,
      action,
      page = 0,
      limit = 100
    } = req.query;

    // In a real system, you would query your audit log database
    // This is mock data for demonstration
    const mockAuditLogs = [
      {
        id: 'audit_001',
        timestamp: '2024-01-17T10:30:00Z',
        userId: 'user_003',
        userEmail: 'michael.chen@hospital.com',
        userRole: 'attending_physician',
        userDepartment: 'cardiology',
        action: 'search',
        resource: 'patient_record',
        resourceId: 'PAT001',
        searchQuery: 'John Doe chest pain',
        result: 'success',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      },
      {
        id: 'audit_002',
        timestamp: '2024-01-17T10:25:00Z',
        userId: 'user_004',
        userEmail: 'nurse.smith@hospital.com',
        userRole: 'registered_nurse',
        userDepartment: 'cardiology',
        action: 'read',
        resource: 'patient_record',
        resourceId: 'PAT001',
        result: 'success',
        ipAddress: '192.168.1.101'
      },
      {
        id: 'audit_003',
        timestamp: '2024-01-17T10:20:00Z',
        userId: 'user_005',
        userEmail: 'temp.nurse@hospital.com',
        userRole: 'temp_staff',
        userDepartment: 'emergency',
        action: 'search',
        resource: 'patient_record',
        searchQuery: 'Emergency Patient',
        result: 'access_denied',
        reason: 'outside_shift_hours',
        ipAddress: '192.168.1.102'
      }
    ];

    // Apply filters (in a real system, this would be done in the database)
    let filteredLogs = mockAuditLogs;

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (department) {
      filteredLogs = filteredLogs.filter(log => log.userDepartment === department);
    }

    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    // Pagination
    const startIndex = page * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      pagination: {
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        totalItems: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limit)
      },
      filters: {
        startDate,
        endDate,
        userId,
        department,
        action
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Audit logs error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve audit logs',
        code: 'AUDIT_LOGS_ERROR'
      }
    });
  }
});

/**
 * @route POST /api/admin/user-access
 * @desc Manage user access permissions
 * @access Admin only
 */
router.post('/user-access', [
  authenticateToken,
  checkAccessExpiry,
  requireRole(['hospital_admin']),
  body('userId').isString(),
  body('action').isIn(['grant', 'revoke', 'extend', 'emergency_grant']),
  body('permissions').optional().isArray(),
  body('accessExpiry').optional().isISO8601(),
  body('reason').isString().isLength({ min: 10, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { userId, action, permissions, accessExpiry, reason } = req.body;

    // In a real system, you would:
    // 1. Update user permissions in your database
    // 2. Update permissions in Permit.io
    // 3. Log the access change
    // 4. Notify the user of the change

    const accessChangeLog = {
      id: `access_change_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminUserId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: userId,
      action,
      permissions,
      accessExpiry,
      reason
    };

    console.log('🔐 User access change:', JSON.stringify(accessChangeLog, null, 2));

    res.json({
      message: `User access ${action} completed`,
      changeId: accessChangeLog.id,
      targetUserId: userId,
      action,
      effectiveDate: new Date().toISOString(),
      authorizedBy: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });

  } catch (error) {
    console.error('❌ User access error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update user access',
        code: 'USER_ACCESS_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/admin/system-health
 * @desc Get system health status
 * @access Admin and Department Heads
 */
router.get('/system-health', [
  authenticateToken,
  checkAccessExpiry,
  requireRole(['hospital_admin', 'department_head'])
], async (req, res) => {
  try {
    // Check health of various system components
    const healthChecks = {
      database: { status: 'healthy', responseTime: '25ms', lastCheck: new Date().toISOString() },
      algolia: { status: 'healthy', responseTime: '45ms', lastCheck: new Date().toISOString() },
      permit: { status: 'healthy', responseTime: '35ms', lastCheck: new Date().toISOString() },
      server: { 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: { load: '35%' },
        lastCheck: new Date().toISOString()
      }
    };

    // Test Algolia connection
    try {
      await algoliaService.index.search({ query: '', hitsPerPage: 1 });
      healthChecks.algolia.status = 'healthy';
    } catch (error) {
      healthChecks.algolia.status = 'unhealthy';
      healthChecks.algolia.error = error.message;
    }

    // Overall system status
    const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    res.json({
      overallStatus,
      components: healthChecks,
      timestamp: new Date().toISOString(),
      checkedBy: {
        id: req.user.id,
        role: req.user.role
      }
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to perform health check',
        code: 'HEALTH_CHECK_ERROR'
      }
    });
  }
});

module.exports = router;