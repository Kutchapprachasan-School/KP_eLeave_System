const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  console.log('--- 1. Checking for Test Accounts in User Table ---');
  const userCheck = await client.query(`
    SELECT id, email, name, role, "isApproved", "createdAt" 
    FROM public."User" 
    WHERE email ILIKE '%test%' OR name ILIKE '%ทดสอบ%';
  `);
  console.log('Orphaned Test Accounts Found:', userCheck.rows.length);
  if (userCheck.rows.length > 0) {
    console.table(userCheck.rows);
  }

  console.log('\n--- 2. Checking Total Real Users in Database ---');
  const totalUsers = await client.query('SELECT count(*) as total FROM public."User";');
  console.log('Total Users in User Table:', totalUsers.rows[0]);

  console.log('\n--- 3. Checking Student Affairs Sandbox Test Records ---');
  const studentCheck = await client.query('SELECT id, "studentCode", "firstName", "lastName", "status" FROM public."Student";');
  console.log('Total Students count:', studentCheck.rows.length);
  if (studentCheck.rows.length > 0) console.table(studentCheck.rows);

  const auditCheck = await client.query('SELECT count(*) as count FROM public."StudentAffairsAuditLog";');
  console.log('Total Student Affairs Audit logs count:', auditCheck.rows[0].count);

  const behaviorCheck = await client.query('SELECT count(*) as count FROM public."BehaviorRecord";');
  console.log('Total Behavior Records count:', behaviorCheck.rows[0].count);

  await client.end();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
