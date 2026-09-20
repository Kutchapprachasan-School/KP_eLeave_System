const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const conn = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function clean() {
  await client.connect();
  console.log('Cleaning up remaining test student records...');

  await client.query('ALTER TABLE public."StudentMeritNomination" DISABLE TRIGGER USER;');
  await client.query('ALTER TABLE public."Student" DISABLE TRIGGER USER;');

  await client.query("DELETE FROM public.\"StudentPeriodAttendance\" WHERE \"enrollmentId\" IN (SELECT id FROM public.\"StudentEnrollment\" WHERE \"studentId\" LIKE 'std%');");
  await client.query("DELETE FROM public.\"StudentMorningAttendance\" WHERE \"enrollmentId\" IN (SELECT id FROM public.\"StudentEnrollment\" WHERE \"studentId\" LIKE 'std%');");
  await client.query("DELETE FROM public.\"StudentMedicalCertificate\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"BehaviorRecord\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentYearlyBehaviorProjection\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentStatusHistory\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentRiskAssessment\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentInterventionCase\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentMeritNomination\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentSdqEvaluation\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentHomeVisit\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"StudentEnrollment\" WHERE \"studentId\" LIKE 'std%';");
  await client.query("DELETE FROM public.\"Student\" WHERE \"id\" LIKE 'std%';");

  await client.query('ALTER TABLE public."StudentMeritNomination" ENABLE TRIGGER USER;');
  await client.query('ALTER TABLE public."Student" ENABLE TRIGGER USER;');

  const check = await client.query("SELECT count(*) as count FROM public.\"Student\";");
  console.log('Students count after cleanup:', check.rows[0].count);

  await client.end();
}

clean().catch(console.error);
