"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type SaveApprovalStageInput = {
  stageOrder: number;
  stageName: string;
  roleName: string;
  isMandatory?: boolean;
};

export type SaveApprovalWorkflowInput = {
  id?: string;
  name: string;
  isDefault?: boolean;
  stages: SaveApprovalStageInput[];
};

export async function getApprovalWorkflowsAction() {
  try {
    let workflows = await prisma.approvalWorkflow.findMany({
      include: {
        stages: {
          orderBy: { stageOrder: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    if (workflows.length === 0) {
      const defaultWorkflow = await prisma.approvalWorkflow.create({
        data: {
          name: "กระบวนการอนุมัติมาตรฐาน 3 ขั้นตอน",
          isDefault: true,
          stages: {
            create: [
              { stageOrder: 1, stageName: "หัวหน้ากลุ่มสาระการเรียนรู้", roleName: "HEAD_OF_DEPT", isMandatory: true },
              { stageOrder: 2, stageName: "รองผู้อำนวยการฝ่ายวิชาการ", roleName: "ACADEMIC_DIRECTOR", isMandatory: true },
              { stageOrder: 3, stageName: "ผู้อำนวยการโรงเรียน", roleName: "SCHOOL_DIRECTOR", isMandatory: true }
            ]
          }
        },
        include: { stages: { orderBy: { stageOrder: "asc" } } }
      });
      workflows = [defaultWorkflow];
    }

    return workflows;
  } catch (error: any) {
    console.error("Error in getApprovalWorkflowsAction:", error);
    throw new Error(`Failed to fetch approval workflows: ${error.message}`);
  }
}

export async function saveApprovalWorkflowAction(data: SaveApprovalWorkflowInput) {
  try {
    if (!data.name) {
      throw new Error("Workflow name is required");
    }

    const workflow = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.approvalWorkflow.updateMany({
          data: { isDefault: false }
        });
      }

      if (data.id) {
        await tx.approvalStage.deleteMany({
          where: { workflowId: data.id }
        });

        return await tx.approvalWorkflow.update({
          where: { id: data.id },
          data: {
            name: data.name,
            isDefault: data.isDefault ?? false,
            stages: {
              create: data.stages.map((stage) => ({
                stageOrder: stage.stageOrder,
                stageName: stage.stageName,
                roleName: stage.roleName,
                isMandatory: stage.isMandatory ?? true
              }))
            }
          },
          include: { stages: { orderBy: { stageOrder: "asc" } } }
        });
      } else {
        return await tx.approvalWorkflow.create({
          data: {
            name: data.name,
            isDefault: data.isDefault ?? true,
            stages: {
              create: data.stages.map((stage) => ({
                stageOrder: stage.stageOrder,
                stageName: stage.stageName,
                roleName: stage.roleName,
                isMandatory: stage.isMandatory ?? true
              }))
            }
          },
          include: { stages: { orderBy: { stageOrder: "asc" } } }
        });
      }
    });

    revalidatePath("/academic/curriculum");
    return workflow;
  } catch (error: any) {
    console.error("Error in saveApprovalWorkflowAction:", error);
    throw new Error(`Failed to save approval workflow: ${error.message}`);
  }
}

export async function getPlanningSandboxScenariosAction(academicYear?: number, term?: number) {
  try {
    const where: any = {};
    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;

    return await prisma.planningSandboxScenario.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });
  } catch (error: any) {
    console.error("Error in getPlanningSandboxScenariosAction:", error);
    throw new Error(`Failed to fetch planning sandbox scenarios: ${error.message}`);
  }
}

export type SavePlanningSandboxScenarioInput = {
  id?: string;
  name: string;
  description?: string;
  academicYear: number;
  term: number;
  isPublished?: boolean;
  payloadJson: any;
  createdById?: string;
};

export async function savePlanningSandboxScenarioAction(data: SavePlanningSandboxScenarioInput) {
  try {
    if (!data.name || !data.academicYear || !data.term) {
      throw new Error("Missing required scenario fields: name, academicYear, term");
    }

    const payload = data.payloadJson || {};

    let scenario;
    if (data.id) {
      scenario = await prisma.planningSandboxScenario.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          academicYear: data.academicYear,
          term: data.term,
          isPublished: data.isPublished ?? false,
          payloadJson: payload,
          ...(data.createdById && { createdById: data.createdById })
        }
      });
    } else {
      scenario = await prisma.planningSandboxScenario.create({
        data: {
          name: data.name,
          description: data.description,
          academicYear: data.academicYear,
          term: data.term,
          isPublished: data.isPublished ?? false,
          payloadJson: payload,
          createdById: data.createdById
        }
      });
    }

    revalidatePath("/academic/curriculum");
    revalidatePath("/academic/sandbox");
    return scenario;
  } catch (error: any) {
    console.error("Error in savePlanningSandboxScenarioAction:", error);
    throw new Error(`Failed to save sandbox scenario: ${error.message}`);
  }
}

export async function compareSandboxScenariosAction(scenarioIdA: string, scenarioIdB: string) {
  try {
    const [scenarioA, scenarioB] = await Promise.all([
      prisma.planningSandboxScenario.findUnique({ where: { id: scenarioIdA } }),
      prisma.planningSandboxScenario.findUnique({ where: { id: scenarioIdB } })
    ]);

    if (!scenarioA || !scenarioB) {
      throw new Error("One or both scenarios could not be found for comparison");
    }

    const payloadA = (scenarioA.payloadJson as Record<string, any>) || {};
    const payloadB = (scenarioB.payloadJson as Record<string, any>) || {};

    const allKeys = Array.from(new Set([...Object.keys(payloadA), ...Object.keys(payloadB)]));
    const keyDiffs: Record<string, { valA: any; valB: any; changed: boolean }> = {};

    for (const key of allKeys) {
      const valA = payloadA[key];
      const valB = payloadB[key];
      const changed = JSON.stringify(valA) !== JSON.stringify(valB);
      keyDiffs[key] = { valA, valB, changed };
    }

    return {
      scenarioA,
      scenarioB,
      diff: {
        totalKeysEvaluated: allKeys.length,
        changedKeysCount: Object.values(keyDiffs).filter((k) => k.changed).length,
        keyDiffs
      }
    };
  } catch (error: any) {
    console.error("Error in compareSandboxScenariosAction:", error);
    throw new Error(`Failed to compare scenarios: ${error.message}`);
  }
}

export async function getAcademicCalendarEventsAction(academicYear: number, term?: number) {
  try {
    const year = academicYear || 2569;
    const t = term || 1;

    let calendar = await prisma.academicCalendar.findFirst({
      where: { academicYear: year, term: t },
      include: {
        events: {
          orderBy: { startDate: "asc" }
        }
      }
    });

    if (!calendar) {
      calendar = await prisma.academicCalendar.findUnique({
        where: { academicYear: year },
        include: {
          events: {
            orderBy: { startDate: "asc" }
          }
        }
      });
    }

    if (!calendar) {
      calendar = await prisma.academicCalendar.create({
        data: {
          academicYear: year,
          term: t,
          title: `ปฏิทินวิชาการ ปีการศึกษา ${year}`
        },
        include: {
          events: {
            orderBy: { startDate: "asc" }
          }
        }
      });
    }

    return calendar;
  } catch (error: any) {
    console.error("Error in getAcademicCalendarEventsAction:", error);
    throw new Error(`Failed to fetch academic calendar events: ${error.message}`);
  }
}

export type SaveAcademicEventInput = {
  id?: string;
  calendarId?: string;
  academicYear?: number;
  term?: number;
  eventType: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  locksTimetable?: boolean;
  locksSupervision?: boolean;
  description?: string;
};

export async function saveAcademicEventAction(data: SaveAcademicEventInput) {
  try {
    if (!data.title || !data.eventType || !data.startDate || !data.endDate) {
      throw new Error("Missing required event fields: title, eventType, startDate, endDate");
    }

    let targetCalendarId = data.calendarId;

    if (!targetCalendarId) {
      const year = data.academicYear || 2569;
      const t = data.term || 1;
      let cal = await prisma.academicCalendar.findFirst({
        where: { academicYear: year, term: t }
      });
      if (!cal) {
        cal = await prisma.academicCalendar.create({
          data: {
            academicYear: year,
            term: t,
            title: `ปฏิทินวิชาการ ${year}`
          }
        });
      }
      targetCalendarId = cal.id;
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    let event;
    if (data.id) {
      event = await prisma.academicEvent.update({
        where: { id: data.id },
        data: {
          calendarId: targetCalendarId,
          eventType: data.eventType,
          title: data.title,
          startDate: start,
          endDate: end,
          locksTimetable: data.locksTimetable ?? false,
          locksSupervision: data.locksSupervision ?? false,
          description: data.description
        }
      });
    } else {
      event = await prisma.academicEvent.create({
        data: {
          calendarId: targetCalendarId,
          eventType: data.eventType,
          title: data.title,
          startDate: start,
          endDate: end,
          locksTimetable: data.locksTimetable ?? false,
          locksSupervision: data.locksSupervision ?? false,
          description: data.description
        }
      });
    }

    revalidatePath("/academic/calendar");
    revalidatePath("/academic/curriculum");
    return event;
  } catch (error: any) {
    console.error("Error in saveAcademicEventAction:", error);
    throw new Error(`Failed to save academic event: ${error.message}`);
  }
}

export async function getResourceItemsAction(resourceType?: string) {
  try {
    const where = resourceType ? { resourceType } : {};
    return await prisma.resourceItem.findMany({
      where,
      include: {
        reservations: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { startTime: "asc" }
        }
      },
      orderBy: { code: "asc" }
    });
  } catch (error: any) {
    console.error("Error in getResourceItemsAction:", error);
    throw new Error(`Failed to fetch resource items: ${error.message}`);
  }
}

export type SaveResourceItemInput = {
  id?: string;
  code: string;
  name: string;
  resourceType: string;
  capacity?: number;
  location?: string;
};

export async function saveResourceItemAction(data: SaveResourceItemInput) {
  try {
    if (!data.code || !data.name || !data.resourceType) {
      throw new Error("Missing required fields: code, name, resourceType");
    }

    let resource;
    if (data.id) {
      resource = await prisma.resourceItem.update({
        where: { id: data.id },
        data: {
          code: data.code,
          name: data.name,
          resourceType: data.resourceType,
          capacity: data.capacity ?? 40,
          location: data.location
        }
      });
    } else {
      resource = await prisma.resourceItem.upsert({
        where: { code: data.code },
        update: {
          name: data.name,
          resourceType: data.resourceType,
          capacity: data.capacity ?? 40,
          location: data.location
        },
        create: {
          code: data.code,
          name: data.name,
          resourceType: data.resourceType,
          capacity: data.capacity ?? 40,
          location: data.location
        }
      });
    }

    revalidatePath("/academic/resources");
    return resource;
  } catch (error: any) {
    console.error("Error in saveResourceItemAction:", error);
    throw new Error(`Failed to save resource item: ${error.message}`);
  }
}

export type ReserveResourceInput = {
  resourceId: string;
  reservedBy: string;
  reservedFor: string;
  startTime: string | Date;
  endTime: string | Date;
  status?: string;
};

export async function reserveResourceAction(data: ReserveResourceInput) {
  try {
    if (!data.resourceId || !data.reservedBy || !data.reservedFor || !data.startTime || !data.endTime) {
      throw new Error("Missing required reservation parameters");
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (start >= end) {
      throw new Error("End time must be after start time");
    }

    const conflicts = await prisma.resourceReservation.findMany({
      where: {
        resourceId: data.resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }]
      }
    });

    if (conflicts.length > 0) {
      throw new Error("ทรัพยากรนี้ถูกจองไว้แล้วในช่วงเวลาที่เลือก");
    }

    const reservation = await prisma.resourceReservation.create({
      data: {
        resourceId: data.resourceId,
        reservedBy: data.reservedBy,
        reservedFor: data.reservedFor,
        startTime: start,
        endTime: end,
        status: data.status || "APPROVED"
      }
    });

    revalidatePath("/academic/resources");
    return reservation;
  } catch (error: any) {
    console.error("Error in reserveResourceAction:", error);
    throw new Error(`Failed to reserve resource: ${error.message}`);
  }
}
