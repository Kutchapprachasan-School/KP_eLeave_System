export const SYNTHETIC_POSITIONS_WHITELIST = ['หัวหน้างานบุคคล', 'ผู้ตรวจสอบ', 'เจ้าหน้าที่บุคคล'];
export const CIVIL_SERVICE_POSITIONS_ALLOWLIST = ['ครู', 'ครูผู้ช่วย', 'พนักงานราชการ', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว', 'ครูอัตราจ้าง'];

export function parseAmbiguityResolutions(rawResolutions?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!rawResolutions) return map;
  const pairs = rawResolutions.split(',').map(s => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [userId, targetPosition] = pair.split(':').map(s => s.trim());
    if (!userId || !targetPosition) throw new Error(`Invalid format: ${pair}`);
    if (!CIVIL_SERVICE_POSITIONS_ALLOWLIST.includes(targetPosition)) {
      throw new Error(`Invalid position: ${targetPosition}`);
    }
    map[userId] = targetPosition;
  }
  return map;
}

export interface MigrationPlanAction {
  action: 'CREATE_ASSIGNMENT' | 'NORMALIZE_POSITION' | 'FLAG_AMBIGUOUS';
  userId: string;
  dutyType?: 'HR_HEAD' | 'INSPECTOR' | 'HR_STAFF' | 'DIVISION_HEAD' | 'DEPT_HEAD';
  divisionScope?: 'ACADEMIC' | 'PERSONNEL' | 'GENERAL' | 'BUDGET' | null;
  departmentScope?: string | null;
  newPosition?: string;
  reason?: string;
}

export interface MigrationPlanResult {
  actions: MigrationPlanAction[];
  summary: {
    inspected: number;
    migrated: number;
    skipped: number;
    ambiguous: number;
  };
}

export function planMigration(
  users: Array<{ id: string; position: string | null }>,
  existingAssignments: Array<{ userId: string; dutyType: string; divisionScope?: string | null; departmentScope?: string | null; revokedAt: Date | null }>,
  resolutions: Record<string, string> = {}
): MigrationPlanResult {
  const actions: MigrationPlanAction[] = [];
  let migrated = 0;
  let skipped = 0;
  let ambiguous = 0;

  for (const u of users) {
    if (!u.position || !SYNTHETIC_POSITIONS_WHITELIST.includes(u.position)) {
      continue; // Not a synthetic user
    }

    if (u.position === 'หัวหน้างานบุคคล') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'HR_HEAD' && a.revokedAt === null);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'HR_HEAD', divisionScope: null, departmentScope: null });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'ผู้ตรวจสอบ') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'INSPECTOR' && a.revokedAt === null);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'INSPECTOR', divisionScope: null, departmentScope: null });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'เจ้าหน้าที่บุคคล') {
      if (resolutions[u.id]) {
        const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'HR_STAFF' && a.revokedAt === null);
        if (!already) {
          actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'HR_STAFF', divisionScope: null, departmentScope: null });
        }
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: resolutions[u.id] });
        migrated++;
      } else {
        ambiguous++;
        actions.push({ action: 'FLAG_AMBIGUOUS', userId: u.id, reason: 'Requires resolution via --resolve-ambiguous' });
      }
    }
  }

  return { actions, summary: { inspected: users.length, migrated, skipped, ambiguous } };
}
