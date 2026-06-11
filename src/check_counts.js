const { pgPool } = require('./services/supabase');
const { userProfiles } = require('./utils/user-profiles');

async function check() {
  console.log('--- Database Audit: Visible Row Count Per User ---');
  for (const [id, user] of Object.entries(userProfiles)) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE authenticated');
      
      // Set claims
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [user.org_id]);
      await client.query("SELECT set_config('app.current_department', $1, true)", [user.department || '']);
      await client.query("SELECT set_config('app.current_role', $1, true)", [user.role]);
      await client.query("SELECT set_config('app.current_ceiling', $1, true)", [(user.ceiling_level || 10).toString()]);
      const clearance = Array.isArray(user.compliance_clearance) ? user.compliance_clearance.join(',') : '';
      await client.query("SELECT set_config('app.current_clearance', $1, true)", [clearance]);

      // Count matches
      const res = await client.query('SELECT COUNT(*) FROM knowledge_nodes');
      console.log(`User ID: ${id} | Name: ${user.name} | Role: ${user.role} | Count: ${res.rows[0].count}`);
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`Error checking user ${id}:`, e.message);
    } finally {
      client.release();
    }
  }
}

check().then(() => pgPool.end()).catch(console.error);
