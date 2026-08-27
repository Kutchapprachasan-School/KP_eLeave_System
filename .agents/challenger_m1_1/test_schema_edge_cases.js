import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('--- Starting Empirical Schema Edge Case Verification ---');

const schemaPath = path.resolve('prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Test 1: SubjectOffering unique constraint check
const subjectOfferingMatch = schemaContent.includes('@@unique([subjectId, teacherId, classRoomId, academicYear, term])');
console.log(`[Test 1] SubjectOffering compound unique constraint present: ${subjectOfferingMatch}`);

// Test 2: RecommendationRun model existence & structure
const recRunModelMatch = schemaContent.includes('model RecommendationRun');
console.log(`[Test 2] RecommendationRun model present: ${recRunModelMatch}`);

// Test 3: RecommendationRun -> TimetableSlot relation check
const recRunRelationMatch = schemaContent.includes('timetableSlot   TimetableSlot @relation(fields: [timetableSlotId], references: [id])');
console.log(`[Test 3] RecommendationRun timetableSlot relation present: ${recRunRelationMatch}`);

// Test 4: Check if RecommendationRun has indexes on lookup fields
const recRunIndexMatch = schemaContent.includes('@@index') && schemaContent.slice(schemaContent.indexOf('model RecommendationRun')).includes('@@index');
console.log(`[Test 4] RecommendationRun indexed for fast lookups: ${recRunIndexMatch}`);

// Test 5: Check onDelete behavior on RecommendationRun relation
const recRunOnDeleteMatch = schemaContent.slice(schemaContent.indexOf('model RecommendationRun')).includes('onDelete:');
console.log(`[Test 5] RecommendationRun has explicit onDelete policy: ${recRunOnDeleteMatch}`);

// Test 6: Validate schema via Prisma CLI 5 with DATABASE_URL
try {
  const result = execSync('npx --yes prisma@5 validate', {
    env: { ...process.env, DATABASE_URL: 'postgresql://dummy:dummy@localhost:5432/dummy' },
    cwd: path.resolve('g:/My Drive/01 Web app/01 ระบบการลา'),
    encoding: 'utf8'
  });
  console.log('[Test 6] Prisma 5 validate output:', result.trim());
} catch (err) {
  console.error('[Test 6] Prisma 5 validate failed:', err.message);
}

console.log('--- Completed Empirical Verification ---');
