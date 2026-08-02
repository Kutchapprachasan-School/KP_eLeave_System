import type {
  TimeSlot,
  ScheduleBlock,
  ConstraintDefinition,
  ConstraintEvaluationContext,
  ConstraintViolation,
  IConstraintPlugin,
  ConstraintSeverity
} from "../types.ts";

/**
 * 1. Teacher Overlap Plugin (HARD)
 */
export class TeacherOverlapConstraintPlugin implements IConstraintPlugin {
  readonly code = "NO_TEACHER_OVERLAP";
  readonly name = "ห้ามครูสอนซ้อนในคาบเดียวกัน";
  readonly category = "TEACHER" as const;
  readonly defaultSeverity = "HARD" as const;
  readonly defaultWeight = 10000;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const map = new Map<string, ScheduleBlock[]>();

    for (const b of context.blocks) {
      if (!b.timeSlotId || !b.teacherIds || b.teacherIds.length === 0) continue;
      for (const tId of b.teacherIds) {
        const key = `${tId}_${b.timeSlotId}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
      }
    }

    for (const [key, blockList] of map.entries()) {
      if (blockList.length > 1) {
        const [tId, tsId] = key.split("_");
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight,
          message: `ครู (ID: ${tId}) มีคาบสอนซ้อนกัน ${blockList.length} วิชาใน TimeSlot ${tsId}`,
          affectedBlockIds: blockList.map(b => b.id),
          entityDetails: { teacherId: tId, timeSlotId: tsId }
        });
      }
    }

    return violations;
  }
}

/**
 * 2. Room Overlap Plugin (HARD)
 */
export class RoomOverlapConstraintPlugin implements IConstraintPlugin {
  readonly code = "NO_ROOM_OVERLAP";
  readonly name = "ห้ามใช้ห้องเรียนซ้อนกันในคาบเดียวกัน";
  readonly category = "ROOM" as const;
  readonly defaultSeverity = "HARD" as const;
  readonly defaultWeight = 10000;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const map = new Map<string, ScheduleBlock[]>();

    for (const b of context.blocks) {
      if (!b.timeSlotId || !b.roomId) continue;
      const key = `${b.roomId}_${b.timeSlotId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }

    for (const [key, blockList] of map.entries()) {
      if (blockList.length > 1) {
        const [rId, tsId] = key.split("_");
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight,
          message: `ห้องเรียน (ID: ${rId}) ถูกใช้งานซ้ำกัน ${blockList.length} วิชาใน TimeSlot ${tsId}`,
          affectedBlockIds: blockList.map(b => b.id),
          entityDetails: { timeSlotId: tsId }
        });
      }
    }

    return violations;
  }
}

/**
 * 3. Schedule Block Locking & Activity Scope Plugin (HARD)
 */
export class ScheduleBlockLockConstraintPlugin implements IConstraintPlugin {
  readonly code = "SCHEDULE_BLOCK_LOCK";
  readonly name = "คาบล็อคกิจกรรมประจำ (พักเที่ยง/ลูกเสือ/ชุมนุม/สวดมนต์)";
  readonly category = "STUDENT" as const;
  readonly defaultSeverity = "HARD" as const;
  readonly defaultWeight = 10000;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const lockedActivityBlocks = context.blocks.filter(b => b.type !== "ACADEMIC_SUBJECT" && b.timeSlotId);

    for (const act of lockedActivityBlocks) {
      // Find any academic blocks placed on the same timeSlot and matching targetGrade/targetClassroom scope
      const academicOverlap = context.blocks.filter(b => 
        b.type === "ACADEMIC_SUBJECT" && 
        b.timeSlotId === act.timeSlotId &&
        this.isScopeOverlap(b, act)
      );

      if (academicOverlap.length > 0) {
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight * academicOverlap.length,
          message: `วิชาเรียน ${academicOverlap.map(a => a.subjectCode || a.title).join(", ")} ซ้อนทับคาบกิจกรรม ${act.title}`,
          affectedBlockIds: [act.id, ...academicOverlap.map(a => a.id)],
          entityDetails: { timeSlotId: act.timeSlotId }
        });
      }
    }

    return violations;
  }

  private isScopeOverlap(b: ScheduleBlock, act: ScheduleBlock): boolean {
    if (!act.targetGradeIds && !act.targetClassroomIds) return true; // Applies to All School
    if (act.targetClassroomIds && b.targetClassroomIds) {
      return act.targetClassroomIds.some(id => b.targetClassroomIds!.includes(id));
    }
    if (act.targetGradeIds && b.targetGradeIds) {
      return act.targetGradeIds.some(id => b.targetGradeIds!.includes(id));
    }
    return true;
  }
}

/**
 * 4. Subject Nature Preference Plugin (CRITICAL_SOFT)
 * Heavy theory/math -> Morning (periods 1-3), Practical/art -> Afternoon
 */
export class SubjectNatureConstraintPlugin implements IConstraintPlugin {
  readonly code = "SUBJECT_NATURE_TIME";
  readonly name = "ธรรมชาติวิชา (วิชาหนักลงเช้า / วิชาปฏิบัติลงบ่าย)";
  readonly category = "ACADEMIC" as const;
  readonly defaultSeverity = "CRITICAL_SOFT" as const;
  readonly defaultWeight = 500;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const tsMap = new Map(context.timeSlots.map(ts => [ts.id, ts]));

    for (const b of context.blocks) {
      if (b.type !== "ACADEMIC_SUBJECT" || !b.timeSlotId) continue;
      const ts = tsMap.get(b.timeSlotId);
      if (!ts) continue;

      const title = (b.title || "").toLowerCase();
      const code = (b.subjectCode || "").toLowerCase();
      const isHeavy = title.includes("คณิต") || title.includes("วิทย์") || title.includes("อังกฤษ") || code.startsWith("ค") || code.startsWith("ว");
      const isPractical = title.includes("ศิลปะ") || title.includes("พละ") || title.includes("การงาน") || title.includes("ดนตรี");

      if (isHeavy && ts.periodIndex > 4) {
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight,
          message: `วิชาหนัก (${b.subjectCode || b.title}) ถูกจัดในคาบบ่าย (คาบ ${ts.periodIndex})`,
          affectedBlockIds: [b.id],
          entityDetails: { timeSlotId: ts.id }
        });
      }

      if (isPractical && ts.periodIndex <= 3) {
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight / 2,
          message: `วิชาปฏิบัติ/ศิลปะ (${b.subjectCode || b.title}) ถูกจัดในคาบเช้า (คาบ ${ts.periodIndex})`,
          affectedBlockIds: [b.id],
          entityDetails: { timeSlotId: ts.id }
        });
      }
    }

    return violations;
  }
}

/**
 * 5. No-Gap / Hole Prevention Plugin (SOFT)
 * Prevents gaps in teacher schedules (e.g. teaching period 1, empty 2, teaching 3)
 */
export class NoGapHoleConstraintPlugin implements IConstraintPlugin {
  readonly code = "TEACHER_NO_GAP";
  readonly name = "ป้องกันคาบฟันหลอของครูผู้สอน";
  readonly category = "TEACHER" as const;
  readonly defaultSeverity = "SOFT" as const;
  readonly defaultWeight = 200;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const tsMap = new Map(context.timeSlots.map(ts => [ts.id, ts]));

    // Group blocks by teacher and dayOfWeek
    const teacherDayMap = new Map<string, number[]>();

    for (const b of context.blocks) {
      if (!b.timeSlotId || !b.teacherIds) continue;
      const ts = tsMap.get(b.timeSlotId);
      if (!ts) continue;

      for (const tId of b.teacherIds) {
        const key = `${tId}_day_${ts.dayOfWeek}`;
        if (!teacherDayMap.has(key)) teacherDayMap.set(key, []);
        teacherDayMap.get(key)!.push(ts.periodIndex);
      }
    }

    for (const [key, periods] of teacherDayMap.entries()) {
      if (periods.length < 2) continue;
      const sorted = [...new Set(periods)].sort((a, b) => a - b);
      const minP = sorted[0];
      const maxP = sorted[sorted.length - 1];
      const span = maxP - minP + 1;
      const gaps = span - sorted.length;

      if (gaps > 0) {
        const [tId, dayStr] = key.split("_day_");
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight * gaps,
          message: `ครู (ID: ${tId}) มีคาบฟันหลอ ${gaps} คาบ ในวัน ${dayStr}`,
          affectedBlockIds: [],
          entityDetails: { teacherId: tId }
        });
      }
    }

    return violations;
  }
}

/**
 * 6. Daily Workload Balancing Plugin (SOFT)
 * Balances teaching load across days of the week
 */
export class WorkloadBalanceConstraintPlugin implements IConstraintPlugin {
  readonly code = "TEACHER_WORKLOAD_BALANCE";
  readonly name = "เฉลี่ยภาระงานสอนต่อวันของครู";
  readonly category = "TEACHER" as const;
  readonly defaultSeverity = "SOFT" as const;
  readonly defaultWeight = 100;

  evaluate(context: ConstraintEvaluationContext): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const tsMap = new Map(context.timeSlots.map(ts => [ts.id, ts]));

    const teacherDayCounts = new Map<string, Map<number, number>>();

    for (const b of context.blocks) {
      if (!b.timeSlotId || !b.teacherIds) continue;
      const ts = tsMap.get(b.timeSlotId);
      if (!ts) continue;

      for (const tId of b.teacherIds) {
        if (!teacherDayCounts.has(tId)) teacherDayCounts.set(tId, new Map());
        const dayMap = teacherDayCounts.get(tId)!;
        dayMap.set(ts.dayOfWeek, (dayMap.get(ts.dayOfWeek) || 0) + 1);
      }
    }

    for (const [tId, dayMap] of teacherDayCounts.entries()) {
      const counts = Array.from(dayMap.values());
      if (counts.length < 2) continue;
      const maxC = Math.max(...counts);
      const minC = Math.min(...counts);

      if (maxC - minC > 3) {
        violations.push({
          constraintCode: this.code,
          severity: this.defaultSeverity,
          penaltyScore: this.defaultWeight * (maxC - minC),
          message: `ครู (ID: ${tId}) มีภาระงานสอนต่อวันเหลื่อมล้ำกันมากเกินไป (สูงสุด ${maxC} คาบ, ต่ำสุด ${minC} คาบ)`,
          affectedBlockIds: [],
          entityDetails: { teacherId: tId }
        });
      }
    }

    return violations;
  }
}

/**
 * Master Constraint Pipeline Registry
 */
export class ConstraintPipelineRegistry {
  private plugins: IConstraintPlugin[] = [
    new TeacherOverlapConstraintPlugin(),
    new RoomOverlapConstraintPlugin(),
    new ScheduleBlockLockConstraintPlugin(),
    new SubjectNatureConstraintPlugin(),
    new NoGapHoleConstraintPlugin(),
    new WorkloadBalanceConstraintPlugin()
  ];

  public registerPlugin(plugin: IConstraintPlugin) {
    this.plugins.push(plugin);
  }

  public evaluateAll(
    context: ConstraintEvaluationContext,
    enabledDefinitions: ConstraintDefinition[] = []
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const enabledCodeMap = new Map(
      enabledDefinitions.filter(d => d.isEnabled !== false).map(d => [d.code, d])
    );

    for (const plugin of this.plugins) {
      // If definitions passed, check if enabled
      if (enabledDefinitions.length > 0 && !enabledCodeMap.has(plugin.code)) {
        continue;
      }
      const pluginViolations = plugin.evaluate(context);
      violations.push(...pluginViolations);
    }

    return violations;
  }
}
