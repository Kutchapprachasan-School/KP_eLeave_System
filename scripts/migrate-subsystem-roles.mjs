import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { parseAmbiguityResolutions, planMigration, SYNTHETIC_POSITIONS_WHITELIST } from '../src/lib/roles-migration.ts';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL not found.");
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const resolveArg = args.find(a => a.startsWith('--resolve-ambiguous='));
const rawResolutions = resolveArg ? resolveArg.split('=')[1] : '';

if (!isDryRun && !isApply) {
  console.error("❌ ERROR: Must specify either --dry-run or --apply");
  console.log("Usage:");
  console.log("  node scripts/migrate-subsystem-roles.mjs --dry-run");
  console.log("  node scripts/migrate-subsystem-roles.mjs --apply [--resolve-ambiguous=\"userId:position,...\"]");
  process.exit(1);
}

async function main() {
  console.log(`=======================================================`);
  console.log(`🚀 eLeave Subsystem Roles Migration Engine (Idempotent)`);
  console.log(`=======================================================`);
  console.log(`Mode: ${isApply ? 'APPLY (Live Execution)' : 'DRY-RUN (Simulated)'}`);

  const resolutions = parseAmbiguityResolutions(rawResolutions);
  if (Object.keys(resolutions).length > 0) {
    console.log(`Ambiguity resolutions loaded:`, resolutions);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // 1. Fetch synthetic users
    const usersRes = await client.query(`
      SELECT id, name, email, position, "subjectGroup"
      FROM "User"
      WHERE position = ANY($1::text[])
      ORDER BY id ASC;
    `, [SYNTHETIC_POSITIONS_WHITELIST]);

    const users = usersRes.rows;
    console.log(`Found ${users.length} synthetic user records in database:`);
    users.forEach(u => console.log(` - [${u.id}] ${u.name} (${u.email}) | position: '${u.position}'`));

    // 2. Fetch existing active duty assignments
    const assignmentsRes = await client.query(`
      SELECT id, "userId", "dutyType", "divisionScope", "departmentScope", "revokedAt"
      FROM "UserDutyAssignment"
      WHERE "revokedAt" IS NULL;
    `);
    const existingAssignments = assignmentsRes.rows;

    // 3. Plan migration
    const plan = planMigration(users, existingAssignments, resolutions);
    console.log(`\n--- Migration Plan Summary ---`);
    console.log(`Total Inspected:  ${plan.summary.inspected}`);
    console.log(`To Migrate:       ${plan.summary.migrated}`);
    console.log(`To Skip (Exists): ${plan.summary.skipped}`);
    console.log(`Ambiguous:        ${plan.summary.ambiguous}`);

    if (plan.summary.ambiguous > 0) {
      console.warn(`\n⚠️ Warning: Found ${plan.summary.ambiguous} ambiguous user(s) requiring resolution:`);
      const ambActions = plan.actions.filter(a => a.action === 'FLAG_AMBIGUOUS');
      ambActions.forEach(a => {
        const u = users.find(usr => usr.id === a.userId);
        console.warn(` - User ID: ${a.userId}, Name: ${u?.name}, Position: '${u?.position}'`);
      });
      if (isApply) {
        console.error(`\n❌ ABORTING: Cannot run --apply while ambiguous users exist without --resolve-ambiguous`);
        console.error(`Provide resolution e.g.: --resolve-ambiguous="${ambActions.map(a => `${a.userId}:ครู`).join(',')}"`);
        process.exit(1);
      }
    }

    if (isDryRun) {
      console.log(`\n✅ DRY-RUN COMPLETED. No changes were made to the database.`);
      return;
    }

    // 4. Execute Apply in a single transaction
    console.log(`\nApplying changes in transaction...`);
    await client.query('BEGIN');

    const now = new Date();
    for (const act of plan.actions) {
      if (act.action === 'CREATE_ASSIGNMENT') {
        const assignmentId = 'uda_' + crypto.randomBytes(12).toString('hex');
        await client.query(`
          INSERT INTO "UserDutyAssignment" ("id", "userId", "dutyType", "divisionScope", "departmentScope", "assignedAt", "assignedById")
          VALUES ($1, $2, $3::"DutyType", $4::"ScopeDivision", $5::"ScopeDepartment", $6, NULL);
        `, [
          assignmentId,
          act.userId,
          act.dutyType,
          act.divisionScope || null,
          act.departmentScope || null,
          now
        ]);

        await client.query(`
          INSERT INTO "SystemLog" ("id", "actionType", "subsystem", "description", "userId", "metadata", "createdAt")
          VALUES ($1, 'DUTY_ASSIGNED', 'PERSONNEL', $2, 'SYSTEM_MIGRATION', $3, $4);
        `, [
          'log_' + crypto.randomBytes(12).toString('hex'),
          `Migrated duty ${act.dutyType} for user ${act.userId}`,
          JSON.stringify({ actorId: 'MIGRATION_CLI', assignmentId, userId: act.userId, dutyType: act.dutyType, assignedAt: now.toISOString() }),
          now
        ]);
        console.log(` ✔ Created assignment: user ${act.userId} -> ${act.dutyType} (${act.divisionScope || act.departmentScope || 'GLOBAL'})`);
      } else if (act.action === 'NORMALIZE_POSITION') {
        const oldUser = users.find(u => u.id === act.userId);
        await client.query(`
          UPDATE "User"
          SET position = $1, "updatedAt" = $2
          WHERE id = $3;
        `, [act.newPosition, now, act.userId]);

        await client.query(`
          INSERT INTO "SystemLog" ("id", "actionType", "subsystem", "description", "userId", "metadata", "createdAt")
          VALUES ($1, 'POSITION_NORMALIZED', 'PERSONNEL', $2, 'SYSTEM_MIGRATION', $3, $4);
        `, [
          'log_' + crypto.randomBytes(12).toString('hex'),
          `Normalized position for user ${act.userId} from '${oldUser?.position}' to '${act.newPosition}'`,
          JSON.stringify({ actorId: 'MIGRATION_CLI', userId: act.userId, oldPosition: oldUser?.position, newPosition: act.newPosition, timestamp: now.toISOString() }),
          now
        ]);
        console.log(` ✔ Normalized position: user ${act.userId} from '${oldUser?.position}' -> '${act.newPosition}'`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n🎉 TRANSACTION COMMITTED SUCCESSFULLY!`);
    console.log(`All synthetic users have been safely normalized to official positions and granted active UserDutyAssignments.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`\n❌ ERROR: Transaction rolled back. Reason:`, err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
