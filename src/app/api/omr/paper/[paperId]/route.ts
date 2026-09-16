import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePrintedSheetsAction } from "@/app/actions/omr";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await context.params;

    if (!paperId) {
      return NextResponse.json({ error: "Missing paperId" }, { status: 400 });
    }

    const paper = await prisma.examPaper.findUnique({
      where: { id: paperId },
      include: {
        template: true,
        subjectiveItems: {
          orderBy: { itemNo: "asc" }
        },
        answerKeys: {
          select: {
            id: true,
            versionCode: true,
            _count: { select: { items: true } }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!paper) {
      return NextResponse.json({ error: "ไม่พบข้อมูลแบบทดสอบที่ระบุ" }, { status: 404 });
    }

    const sheets = await prisma.examPrintedSheet.findMany({
      where: { examPaperId: paperId },
      orderBy: [
        { classroom: "asc" },
        { seatNo: "asc" },
        { studentId: "asc" }
      ]
    });

    return NextResponse.json({
      paper,
      sheets
    });
  } catch (err: any) {
    console.error("Error fetching exam paper:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลแบบทดสอบ" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await context.params;
    const body = await request.json();
    const students = body.students || [];

    if (!paperId || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Invalid payload or empty students list" }, { status: 400 });
    }

    const sheets = await generatePrintedSheetsAction({
      examPaperId: paperId,
      students
    });

    return NextResponse.json({
      success: true,
      sheetsCount: sheets.length,
      sheets
    });
  } catch (err: any) {
    console.error("Error generating printed sheets:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการสร้างกระดาษคำตอบ" },
      { status: 500 }
    );
  }
}
