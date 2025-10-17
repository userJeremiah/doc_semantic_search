require('dotenv').config();
const { Permit } = require('permitio');

/**
 * Script to inspect current Permit.io configuration
 * This will show all roles, resources, policies, and users configured in your tenant
 */

async function inspectPermitConfig() {
  try {
    console.log('🔍 Connecting to Permit.io...\n');
    
    if (!process.env.PERMIT_TOKEN) {
      throw new Error('PERMIT_TOKEN not found in environment variables');
    }
    
    const permit = new Permit({
      token: process.env.PERMIT_TOKEN,
      pdp: process.env.PERMIT_PDP_URL || 'https://cloudpdp.api.permit.io',
    });

    console.log('📋 PERMIT.IO CONFIGURATION OVERVIEW');
    console.log('='.repeat(80));
    console.log(`Token: ${process.env.PERMIT_TOKEN.substring(0, 20)}...`);
    console.log(`PDP URL: ${process.env.PERMIT_PDP_URL}`);
    console.log('='.repeat(80));
    console.log();

    // Fetch Roles
    console.log('👥 ROLES:');
    console.log('-'.repeat(80));
    try {
      const roles = await permit.api.roles.list();
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          console.log(`  ✓ ${role.key.padEnd(25)} - ${role.name}`);
          if (role.description) {
            console.log(`    Description: ${role.description}`);
          }
        });
        console.log(`\n  Total roles: ${roles.length}`);
      } else {
        console.log('  ⚠️  No roles found. Run initialization to create roles.');
      }
    } catch (error) {
      console.error('  ❌ Error fetching roles:', error.message);
    }
    console.log();

    // Fetch Resources
    console.log('📦 RESOURCES:');
    console.log('-'.repeat(80));
    try {
      const resources = await permit.api.resources.list();
      if (resources && resources.length > 0) {
        resources.forEach(resource => {
          console.log(`  ✓ ${resource.key.padEnd(25)} - ${resource.name}`);
          if (resource.actions && resource.actions.length > 0) {
            console.log(`    Actions: ${resource.actions.map(a => a.key || a).join(', ')}`);
          }
          if (resource.description) {
            console.log(`    Description: ${resource.description}`);
          }
        });
        console.log(`\n  Total resources: ${resources.length}`);
      } else {
        console.log('  ⚠️  No resources found. Run initialization to create resources.');
      }
    } catch (error) {
      console.error('  ❌ Error fetching resources:', error.message);
    }
    console.log();

    // Fetch Users
    console.log('👤 USERS:');
    console.log('-'.repeat(80));
    try {
      const users = await permit.api.users.list();
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`  ✓ ${user.key.padEnd(25)} - ${user.email || 'No email'}`);
          if (user.first_name || user.last_name) {
            console.log(`    Name: ${user.first_name || ''} ${user.last_name || ''}`);
          }
          if (user.attributes) {
            console.log(`    Attributes:`, JSON.stringify(user.attributes, null, 2).split('\n').join('\n      '));
          }
        });
        console.log(`\n  Total users: ${users.length}`);
      } else {
        console.log('  ℹ️  No users found in Permit.io yet.');
      }
    } catch (error) {
      console.error('  ❌ Error fetching users:', error.message);
    }
    console.log();

    // Fetch Role Assignments
    console.log('🔐 ROLE ASSIGNMENTS:');
    console.log('-'.repeat(80));
    try {
      const roleAssignments = await permit.api.roleAssignments.list();
      if (roleAssignments && roleAssignments.length > 0) {
        roleAssignments.forEach(assignment => {
          console.log(`  ✓ User: ${assignment.user} → Role: ${assignment.role} (Tenant: ${assignment.tenant || 'default'})`);
        });
        console.log(`\n  Total assignments: ${roleAssignments.length}`);
      } else {
        console.log('  ℹ️  No role assignments found yet.');
      }
    } catch (error) {
      console.error('  ❌ Error fetching role assignments:', error.message);
    }
    console.log();

    // Try to fetch policies (may not be available in all Permit SDKs)
    console.log('📜 POLICIES:');
    console.log('-'.repeat(80));
    try {
      // Note: Policy listing may require different API methods depending on Permit version
      if (permit.api.policies && permit.api.policies.list) {
        const policies = await permit.api.policies.list();
        if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`  ✓ ${policy.key || policy.id}`);
            if (policy.description) {
              console.log(`    Description: ${policy.description}`);
            }
            if (policy.subjects) {
              console.log(`    Subjects: ${policy.subjects.join(', ')}`);
            }
            if (policy.actions) {
              console.log(`    Actions: ${policy.actions.join(', ')}`);
            }
            if (policy.resources) {
              console.log(`    Resources: ${policy.resources.join(', ')}`);
            }
          });
          console.log(`\n  Total policies: ${policies.length}`);
        } else {
          console.log('  ⚠️  No policies found. Run initialization to create policies.');
        }
      } else {
        console.log('  ℹ️  Policy listing not available in this SDK version.');
        console.log('  ℹ️  Policies are typically created through roles and resource permissions.');
      }
    } catch (error) {
      console.error('  ❌ Error fetching policies:', error.message);
    }
    console.log();

    console.log('='.repeat(80));
    console.log('✅ Configuration inspection complete!');
    console.log('='.repeat(80));

    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(80));
    
    const rolesExist = await permit.api.roles.list().then(r => r && r.length > 0).catch(() => false);
    const resourcesExist = await permit.api.resources.list().then(r => r && r.length > 0).catch(() => false);
    
    if (!rolesExist || !resourcesExist) {
      console.log('  ⚠️  Your Permit.io tenant needs initialization.');
      console.log('  📝 Run: npm start');
      console.log('  📝 Then: POST /api/admin/initialize with admin token');
      console.log('      This will create all required roles, resources, and policies.');
    } else {
      console.log('  ✅ Your Permit.io tenant appears to be configured.');
      console.log('  📝 You can now use the search API with role-based access control.');
    }
    console.log();

  } catch (error) {
    console.error('\n❌ Fatal error inspecting Permit.io configuration:');
    console.error(error);
    console.error('\n💡 Make sure:');
    console.error('  1. Your PERMIT_TOKEN is valid and has API access');
    console.error('  2. Your network can reach Permit.io API');
    console.error('  3. NODE_ENV is not set to "test" (currently: ' + process.env.NODE_ENV + ')');
  }
}

// Run the inspection
inspectPermitConfig();
