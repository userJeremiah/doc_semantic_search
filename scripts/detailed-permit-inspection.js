require('dotenv').config();
const { Permit } = require('permitio');

/**
 * Detailed Permit.io configuration inspector
 * This will fetch ALL details about your Permit.io setup including permissions
 */

async function detailedInspection() {
  try {
    console.log('🔍 Connecting to Permit.io for detailed inspection...\n');
    
    if (!process.env.PERMIT_TOKEN) {
      throw new Error('PERMIT_TOKEN not found in environment variables');
    }
    
    const permit = new Permit({
      token: process.env.PERMIT_TOKEN,
      pdp: process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
    });

    console.log('═'.repeat(100));
    console.log('📋 DETAILED PERMIT.IO CONFIGURATION INSPECTION');
    console.log('═'.repeat(100));
    console.log();

    // ========================================
    // 1. ROLES - Detailed
    // ========================================
    console.log('👥 ROLES (Detailed):');
    console.log('─'.repeat(100));
    try {
      const roles = await permit.api.roles.list();
      if (roles && roles.length > 0) {
        for (const role of roles) {
          console.log(`\n  📌 Role: ${role.key}`);
          console.log(`     Name: ${role.name}`);
          if (role.description) console.log(`     Description: ${role.description}`);
          
          // Try to get detailed role permissions
          try {
            const roleDetails = await permit.api.roles.get(role.key);
            console.log(`     Details:`, JSON.stringify(roleDetails, null, 2).split('\n').map(l => '     ' + l).join('\n'));
          } catch (e) {
            console.log(`     (Could not fetch additional details: ${e.message})`);
          }
        }
        console.log(`\n  ✅ Total roles: ${roles.length}`);
      } else {
        console.log('  ⚠️  No roles found');
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
    }
    console.log();

    // ========================================
    // 2. RESOURCES - Detailed with Actions
    // ========================================
    console.log('📦 RESOURCES (Detailed with Actions):');
    console.log('─'.repeat(100));
    try {
      const resources = await permit.api.resources.list();
      if (resources && resources.length > 0) {
        for (const resource of resources) {
          console.log(`\n  📦 Resource: ${resource.key}`);
          console.log(`     Name: ${resource.name}`);
          if (resource.description) console.log(`     Description: ${resource.description}`);
          
          if (resource.actions && resource.actions.length > 0) {
            console.log(`     Actions:`);
            resource.actions.forEach(action => {
              const actionKey = typeof action === 'string' ? action : action.key;
              const actionName = typeof action === 'string' ? action : (action.name || action.key);
              console.log(`       • ${actionKey}${actionName !== actionKey ? ` (${actionName})` : ''}`);
            });
          }
          
          // Get detailed resource info
          try {
            const resourceDetails = await permit.api.resources.get(resource.key);
            if (resourceDetails.attributes) {
              console.log(`     Attributes:`, JSON.stringify(resourceDetails.attributes, null, 2).split('\n').map(l => '     ' + l).join('\n'));
            }
          } catch (e) {
            console.log(`     (Could not fetch additional details: ${e.message})`);
          }
        }
        console.log(`\n  ✅ Total resources: ${resources.length}`);
      } else {
        console.log('  ⚠️  No resources found');
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
    }
    console.log();

    // ========================================
    // 3. RESOURCE ROLES - Permissions Matrix
    // ========================================
    console.log('🔐 PERMISSIONS MATRIX (Role → Resource → Actions):');
    console.log('─'.repeat(100));
    try {
      const roles = await permit.api.roles.list();
      const resources = await permit.api.resources.list();
      
      if (roles && resources) {
        for (const role of roles) {
          console.log(`\n  👤 Role: ${role.key}`);
          
          for (const resource of resources) {
            try {
              // Try to get permissions for this role on this resource
              const resourceRole = await permit.api.resourceRoles.get({
                resource: resource.key,
                role: role.key
              }).catch(() => null);
              
              if (resourceRole && resourceRole.permissions) {
                console.log(`     └─ ${resource.key}:`);
                console.log(`        Permissions: ${resourceRole.permissions.join(', ')}`);
              }
            } catch (e) {
              // Role doesn't have permissions on this resource
            }
          }
        }
      }
    } catch (error) {
      console.log(`  ℹ️  Cannot fetch permission matrix: ${error.message}`);
      console.log(`  ℹ️  Trying alternative approach...`);
      
      // Alternative: Try fetching resource roles directly
      try {
        const resources = await permit.api.resources.list();
        for (const resource of resources) {
          console.log(`\n  📦 Resource: ${resource.key}`);
          try {
            const resourceRoles = await permit.api.resourceRoles.list({ resource: resource.key });
            if (resourceRoles && resourceRoles.length > 0) {
              resourceRoles.forEach(rr => {
                console.log(`     └─ ${rr.role}: ${rr.permissions ? rr.permissions.join(', ') : 'N/A'}`);
              });
            } else {
              console.log(`     └─ (No role permissions configured)`);
            }
          } catch (e) {
            console.log(`     └─ (Cannot fetch: ${e.message})`);
          }
        }
      } catch (e) {
        console.log(`  ❌ Alternative approach failed: ${e.message}`);
      }
    }
    console.log();

    // ========================================
    // 4. TENANTS
    // ========================================
    console.log('🏢 TENANTS:');
    console.log('─'.repeat(100));
    try {
      const tenants = await permit.api.tenants.list();
      if (tenants && tenants.length > 0) {
        tenants.forEach(tenant => {
          console.log(`  • ${tenant.key} - ${tenant.name}`);
          if (tenant.description) console.log(`    Description: ${tenant.description}`);
        });
        console.log(`\n  Total tenants: ${tenants.length}`);
      } else {
        console.log('  ℹ️  No custom tenants (using default)');
      }
    } catch (error) {
      console.log(`  ℹ️  ${error.message}`);
    }
    console.log();

    // ========================================
    // 5. USERS (if any)
    // ========================================
    console.log('👤 USERS:');
    console.log('─'.repeat(100));
    try {
      const users = await permit.api.users.list();
      if (users && users.length > 0) {
        for (const user of users) {
          console.log(`\n  👤 User: ${user.key}`);
          console.log(`     Email: ${user.email || 'N/A'}`);
          if (user.first_name || user.last_name) {
            console.log(`     Name: ${user.first_name || ''} ${user.last_name || ''}`);
          }
          if (user.attributes) {
            console.log(`     Attributes:`, JSON.stringify(user.attributes, null, 2).split('\n').map(l => '       ' + l).join('\n'));
          }
          
          // Try to get user's role assignments
          try {
            const userRoles = await permit.api.roleAssignments.list({ user: user.key });
            if (userRoles && userRoles.length > 0) {
              console.log(`     Roles assigned:`);
              userRoles.forEach(ra => {
                console.log(`       • ${ra.role} (tenant: ${ra.tenant || 'default'})`);
              });
            }
          } catch (e) {
            console.log(`     (Could not fetch role assignments)`);
          }
        }
        console.log(`\n  Total users: ${users.length}`);
      } else {
        console.log('  ℹ️  No users synced to Permit.io yet');
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log();

    // ========================================
    // 6. CONDITION SETS (ABAC rules)
    // ========================================
    console.log('📏 CONDITION SETS (ABAC Rules):');
    console.log('─'.repeat(100));
    try {
      if (permit.api.conditionSets && permit.api.conditionSets.list) {
        const conditionSets = await permit.api.conditionSets.list();
        if (conditionSets && conditionSets.length > 0) {
          conditionSets.forEach(cs => {
            console.log(`\n  📏 Condition Set: ${cs.key || cs.id}`);
            if (cs.name) console.log(`     Name: ${cs.name}`);
            if (cs.description) console.log(`     Description: ${cs.description}`);
            if (cs.conditions) {
              console.log(`     Conditions:`, JSON.stringify(cs.conditions, null, 2).split('\n').map(l => '       ' + l).join('\n'));
            }
          });
        } else {
          console.log('  ℹ️  No condition sets (ABAC rules) configured');
        }
      } else {
        console.log('  ℹ️  Condition sets not available in this SDK version');
      }
    } catch (error) {
      console.log(`  ℹ️  ${error.message}`);
    }
    console.log();

    // ========================================
    // 7. ENVIRONMENT INFO
    // ========================================
    console.log('🌍 ENVIRONMENT INFO:');
    console.log('─'.repeat(100));
    try {
      // Try to get project/environment details
      console.log(`  API Endpoint: ${permit.config?.apiUrl || 'Default'}`);
      console.log(`  PDP Endpoint: ${process.env.PERMIT_PDP_URL || 'Default'}`);
      console.log(`  Token (first 20 chars): ${process.env.PERMIT_TOKEN.substring(0, 20)}...`);
    } catch (error) {
      console.log(`  ℹ️  ${error.message}`);
    }
    console.log();

    console.log('═'.repeat(100));
    console.log('✅ DETAILED INSPECTION COMPLETE');
    console.log('═'.repeat(100));
    console.log();

    // ========================================
    // SUMMARY & RECOMMENDATIONS
    // ========================================
    console.log('📊 CONFIGURATION SUMMARY:');
    console.log('─'.repeat(100));
    
    const roles = await permit.api.roles.list().catch(() => []);
    const resources = await permit.api.resources.list().catch(() => []);
    const users = await permit.api.users.list().catch(() => []);
    
    console.log(`  Roles configured: ${roles.length}`);
    console.log(`  Resources configured: ${resources.length}`);
    console.log(`  Users synced: ${users.length}`);
    console.log();
    
    console.log('📝 MAPPING TO CODE:');
    console.log('─'.repeat(100));
    console.log('  Your Permit.io roles → Expected in code:');
    if (roles.length > 0) {
      roles.forEach(role => {
        const mapping = {
          'admin': 'hospital_admin',
          'doctor': 'attending_physician or department_head',
          'nurse': 'registered_nurse',
          'temporary_staff': 'temp_staff'
        };
        const expected = mapping[role.key] || '⚠️  Not mapped in code';
        console.log(`    • ${role.key.padEnd(20)} → ${expected}`);
      });
    }
    console.log();
    
    console.log('  Your Permit.io resources → Expected in code:');
    if (resources.length > 0) {
      resources.forEach(resource => {
        const mapping = {
          'patient_records': 'patient_record (singular)',
          'emergency_access': '⚠️  Custom resource',
          'user_roles': '⚠️  Custom resource',
          'search_portal': '⚠️  Custom resource',
          'audit_logs': '⚠️  Custom resource'
        };
        const expected = mapping[resource.key] || '⚠️  Not mapped in code';
        console.log(`    • ${resource.key.padEnd(20)} → ${expected}`);
      });
    }
    console.log();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Run the detailed inspection
detailedInspection().catch(console.error);
