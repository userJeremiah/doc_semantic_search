const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, checkAccessExpiry } = require('../middleware/auth');
const SecureSearchService = require('../services/secureSearch');

const router = express.Router();
const secureSearchService = new SecureSearchService();

/**
 * @route GET /api/search
 * @desc Perform secure semantic search on patient records
 * @access Private
 */
router.get('/', [
  authenticateToken,
  checkAccessExpiry,
  query('q').isString().isLength({ min: 1, max: 200 }).trim(),
  query('page').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('department').optional().isString(),
  query('recordType').optional().isString(),
  query('priorityLevel').optional().isIn(['critical', 'high', 'normal', 'low']),
  query('dateRange').optional().isIn(['last_week', 'last_month', 'last_quarter', 'older'])
], async (req, res) => {
  try {
    // Check for validation errors
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
      q: query,
      page = 0,
      limit = 20,
      department,
      recordType,
      priorityLevel,
      dateRange
    } = req.query;

    // Build search options
    const searchOptions = {
      page: parseInt(page),
      limit: parseInt(limit),
      filters: {}
    };

    // Add filters if provided
    if (department) searchOptions.filters.department = department;
    if (recordType) searchOptions.filters.recordType = recordType;
    if (priorityLevel) searchOptions.filters.priorityLevel = priorityLevel;
    if (dateRange) searchOptions.filters.dateRange = dateRange;

    // Perform secure search
    const results = await secureSearchService.secureSearch(req.user, query, searchOptions);

    // Add search metadata
    const response = {
      ...results,
      query: query,
      searchOptions: searchOptions,
      timestamp: new Date().toISOString()
    };

    console.log(`🔍 Search completed for user ${req.user.id}: "${query}" - ${results.hits.length} results`);

    res.json(response);

  } catch (error) {
    console.error('❌ Search error:', error);
    
    // Determine error type and response
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: {
          message: 'Access denied for search operation',
          code: 'SEARCH_ACCESS_DENIED'
        }
      });
    }

    if (error.message.includes('Invalid query')) {
      return res.status(400).json({
        error: {
          message: 'Invalid search query format',
          code: 'INVALID_QUERY'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Internal server error during search',
        code: 'SEARCH_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/search/suggestions
 * @desc Get search suggestions for autocomplete
 * @access Private
 */
router.get('/suggestions', [
  authenticateToken,
  checkAccessExpiry,
  query('q').isString().isLength({ min: 1, max: 100 }).trim(),
  query('type').optional().isIn(['patient', 'doctor', 'diagnosis', 'all'])
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

    const { q: query, type = 'all' } = req.query;

    const suggestions = await secureSearchService.getAuthorizedSuggestions(
      req.user,
      query,
      type
    );

    res.json({
      suggestions,
      query,
      type,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Suggestions error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error getting suggestions',
        code: 'SUGGESTIONS_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/search/record/:id
 * @desc Get detailed view of a specific record
 * @access Private
 */
router.get('/record/:id', [
  authenticateToken,
  checkAccessExpiry
], async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: {
          message: 'Record ID is required',
          code: 'MISSING_RECORD_ID'
        }
      });
    }

    const record = await secureSearchService.getAuthorizedRecord(req.user, id);

    res.json({
      record,
      accessTime: new Date().toISOString(),
      accessedBy: {
        id: req.user.id,
        name: req.user.fullName,
        role: req.user.role,
        department: req.user.department
      }
    });

  } catch (error) {
    console.error(`❌ Record access error for ID ${req.params.id}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND'
        }
      });
    }

    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: {
          message: 'Access denied to this record',
          code: 'RECORD_ACCESS_DENIED'
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Internal server error accessing record',
        code: 'RECORD_ACCESS_ERROR'
      }
    });
  }
});

/**
 * @route GET /api/search/filters
 * @desc Get available filter options for the current user
 * @access Private
 */
router.get('/filters', [
  authenticateToken,
  checkAccessExpiry
], async (req, res) => {
  try {
    // Return filter options based on user's role and department
    const filters = {
      departments: [],
      recordTypes: [
        'patient_record',
        'lab_result',
        'imaging_study',
        'medication_record',
        'vital_signs',
        'discharge_summary'
      ],
      priorityLevels: [
        'critical',
        'high',
        'normal',
        'low'
      ],
      dateRanges: [
        'last_week',
        'last_month',
        'last_quarter',
        'older'
      ]
    };

    // Customize available departments based on user role
    if (req.user.role === 'hospital_admin') {
      filters.departments = [
        'emergency',
        'cardiology',
        'neurology',
        'pediatrics',
        'radiology',
        'surgery',
        'icu',
        'oncology'
      ];
    } else {
      // Regular users can only see their own department
      filters.departments = [req.user.department];
    }

    // Customize record types based on role
    if (req.user.role === 'lab_technician') {
      filters.recordTypes = ['lab_result'];
    } else if (req.user.role === 'radiologist') {
      filters.recordTypes = ['imaging_study'];
    } else if (req.user.role === 'pharmacist') {
      filters.recordTypes = ['medication_record'];
    }

    res.json({
      filters,
      userRole: req.user.role,
      userDepartment: req.user.department
    });

  } catch (error) {
    console.error('❌ Filters error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error getting filters',
        code: 'FILTERS_ERROR'
      }
    });
  }
});

/**
 * @route POST /api/search/export
 * @desc Export search results (with additional audit logging)
 * @access Private
 */
router.post('/export', [
  authenticateToken,
  checkAccessExpiry,
  body('searchQuery').isString().isLength({ min: 1, max: 200 }),
  body('recordIds').isArray({ min: 1, max: 100 }),
  body('format').optional().isIn(['csv', 'json', 'pdf']),
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

    const { searchQuery, recordIds, format = 'json', reason } = req.body;

    // Check if user has export permissions
    const canExport = ['hospital_admin', 'department_head', 'attending_physician'].includes(req.user.role);
    
    if (!canExport) {
      return res.status(403).json({
        error: {
          message: 'Export permission denied',
          code: 'EXPORT_DENIED'
        }
      });
    }

    // Validate access to each record
    const authorizedRecords = [];
    for (const recordId of recordIds) {
      try {
        const record = await secureSearchService.getAuthorizedRecord(req.user, recordId);
        authorizedRecords.push(record);
      } catch (error) {
        console.warn(`⚠️  Skipping unauthorized record ${recordId} for user ${req.user.id}`);
      }
    }

    if (authorizedRecords.length === 0) {
      return res.status(403).json({
        error: {
          message: 'No authorized records to export',
          code: 'NO_AUTHORIZED_RECORDS'
        }
      });
    }

    // Log export activity
    const exportLog = {
      timestamp: new Date().toISOString(),
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      searchQuery,
      recordCount: authorizedRecords.length,
      requestedRecords: recordIds.length,
      format,
      reason,
      action: 'export'
    };

    console.log('📤 Export request:', JSON.stringify(exportLog, null, 2));

    // In a real implementation, you would:
    // 1. Generate the actual export file
    // 2. Store the export log in an audit database
    // 3. Possibly email the file or provide a download link
    // 4. Set up retention policies for exported data

    res.json({
      message: 'Export request processed',
      exportId: `export_${Date.now()}_${req.user.id}`,
      recordCount: authorizedRecords.length,
      format,
      status: 'processing',
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      auditLog: exportLog
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error during export',
        code: 'EXPORT_ERROR'
      }
    });
  }
});

module.exports = router;