"use server";

// Local precompiled lists of Thai public holidays for 2025, 2026, 2027
const LOCAL_THAI_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2025: [
    { date: "2025-01-01", name: "วันขึ้นปีใหม่ (New Year's Day)" },
    { date: "2025-02-12", name: "วันมาฆบูชา (Makha Bucha Day)" },
    { date: "2025-04-07", name: "วันหยุดชดเชยวันจักรี (Substitution for Chakri Day)" },
    { date: "2025-04-14", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2025-04-15", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2025-04-16", name: "วันหยุดพิเศษเพิ่มเติมเทศกาลสงกรานต์ (Songkran Festival Holiday)" },
    { date: "2025-05-01", name: "วันแรงงานแห่งชาติ (National Labour Day)" },
    { date: "2025-05-05", name: "วันหยุดชดเชยวันฉัตรมงคล (Substitution for Coronation Day)" },
    { date: "2025-05-12", name: "วันหยุดชดเชยวันวิสาขบูชา (Substitution for Visakha Bucha Day)" },
    { date: "2025-06-02", name: "วันหยุดราชการพิเศษ (Additional Special Holiday)" },
    { date: "2025-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี (H.M. Queen Suthida's Birthday)" },
    { date: "2025-07-10", name: "วันอาสาฬหบูชา (Asarnha Bucha Day)" },
    { date: "2025-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (H.M. King Maha Vajiralongkorn's Birthday)" },
    { date: "2025-08-11", name: "วันหยุดราชการพิเศษ (Additional Special Holiday)" },
    { date: "2025-08-12", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ (Mother's Day)" },
    { date: "2025-10-13", name: "วันคล้ายวันสวรรคต ร.9 (H.M. King Bhumibol Adulyadej Memorial Day)" },
    { date: "2025-10-23", name: "วันปิยมหาราช (Chulalongkorn Day)" },
    { date: "2025-12-05", name: "วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ (Father's Day)" },
    { date: "2025-12-10", name: "วันรัฐธรรมนูญ (Constitution Day)" },
    { date: "2025-12-31", name: "วันสิ้นปี (New Year's Eve)" }
  ],
  2026: [
    { date: "2026-01-01", name: "วันขึ้นปีใหม่ (New Year's Day)" },
    { date: "2026-01-02", name: "วันหยุดราชการพิเศษ (Additional Special Holiday)" },
    { date: "2026-03-03", name: "วันมาฆบูชา (Makha Bucha Day)" },
    { date: "2026-04-06", name: "วันจักรี (Chakri Memorial Day)" },
    { date: "2026-04-13", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2026-04-14", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2026-04-15", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2026-05-01", name: "วันแรงงานแห่งชาติ (National Labour Day)" },
    { date: "2026-05-04", name: "วันฉัตรมงคล (Coronation Day)" },
    { date: "2026-05-11", name: "วันพืชมงคล (Royal Ploughing Ceremony)" },
    { date: "2026-06-01", name: "วันหยุดชดเชยวันวิสาขบูชา (Substitution for Visakha Bucha Day)" },
    { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี (H.M. Queen Suthida's Birthday)" },
    { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (H.M. King Maha Vajiralongkorn's Birthday)" },
    { date: "2026-07-29", name: "วันอาสาฬหบูชา (Asarnha Bucha Day)" },
    { date: "2026-07-30", name: "วันเข้าพรรษา (Buddhist Lent Day)" },
    { date: "2026-08-12", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ (Mother's Day)" },
    { date: "2026-10-13", name: "วันคล้ายวันสวรรคต ร.9 (H.M. King Bhumibol Adulyadej Memorial Day)" },
    { date: "2026-10-23", name: "วันปิยมหาราช (Chulalongkorn Day)" },
    { date: "2026-12-05", name: "วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ (Father's Day)" },
    { date: "2026-12-07", name: "วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 (Substitution for Father's Day)" },
    { date: "2026-12-10", name: "วันรัฐธรรมนูญ (Constitution Day)" },
    { date: "2026-12-31", name: "วันสิ้นปี (New Year's Eve)" }
  ],
  2027: [
    { date: "2027-01-01", name: "วันขึ้นปีใหม่ (New Year's Day)" },
    { date: "2027-02-21", name: "วันมาฆบูชา (Makha Bucha Day)" },
    { date: "2027-02-22", name: "วันหยุดชดเชยวันมาฆบูชา (Substitution for Makha Bucha Day)" },
    { date: "2027-04-06", name: "วันจักรี (Chakri Memorial Day)" },
    { date: "2027-04-13", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2027-04-14", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2027-04-15", name: "วันสงกรานต์ (Songkran Festival)" },
    { date: "2027-05-01", name: "วันแรงงานแห่งชาติ (National Labour Day)" },
    { date: "2027-05-03", name: "วันหยุดชดเชยวันแรงงานแห่งชาติ (Substitution for Labour Day)" },
    { date: "2027-05-04", name: "วันฉัตรมงคล (Coronation Day)" },
    { date: "2027-05-20", name: "วันวิสาขบูชา (Visakha Bucha Day)" },
    { date: "2027-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี (H.M. Queen Suthida's Birthday)" },
    { date: "2027-07-18", name: "วันอาสาฬหบูชา (Asarnha Bucha Day)" },
    { date: "2027-07-19", name: "วันเข้าพรรษา (Buddhist Lent Day)" },
    { date: "2027-07-20", name: "วันหยุดชดเชยวันอาสาฬหบูชา (Substitution for Asarnha Bucha Day)" },
    { date: "2027-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (H.M. King Maha Vajiralongkorn's Birthday)" },
    { date: "2027-08-12", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ (Mother's Day)" },
    { date: "2027-10-13", name: "วันคล้ายวันสวรรคต ร.9 (H.M. King Bhumibol Adulyadej Memorial Day)" },
    { date: "2027-10-23", name: "วันปิยมหาราช (Chulalongkorn Day)" },
    { date: "2027-10-25", name: "วันหยุดชดเชยวันปิยมหาราช (Substitution for Chulalongkorn Day)" },
    { date: "2027-12-05", name: "วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อแห่งชาติ (Father's Day)" },
    { date: "2027-12-06", name: "วันหยุดชดเชยวันคล้ายวันพระบรมราชสมภพ ร.9 (Substitution for Father's Day)" },
    { date: "2027-12-10", name: "วันรัฐธรรมนูญ (Constitution Day)" },
    { date: "2027-12-31", name: "วันสิ้นปี (New Year's Eve)" }
  ]
};




import { prisma } from "@/lib/db";

import { getSession } from "@/lib/auth-session";

import { revalidatePath } from "next/cache";



// Check permissions: ADMIN, HR Head (หัวหน้างานบุคคล/เจ้าหน้าที่บุคคล), or INSPECTOR (ผู้ตรวจสอบ)

async function checkPermission() {

  const session = await getSession();

  if (!session?.user) throw new Error("Unauthorized");

  

  const user = session.user as any;

  const isAdmin = user.role === "ADMIN" || user.position === "แอดมิน";

  const isHR = user.position === "หัวหน้างานบุคคล" || user.position === "เจ้าหน้าที่บุคคล";

  const isInspector = user.position === "ผู้ตรวจสอบ";



  if (!isAdmin && !isHR && !isInspector) {

    throw new Error("Permission denied");

  }

  return user;

}



export async function getHolidays(yearBE?: number) {

  const where: any = {};

  if (yearBE) {

    const yearCE = yearBE - 543;

    const start = new Date(Date.UTC(yearCE, 0, 1, 0, 0, 0));

    const end = new Date(Date.UTC(yearCE, 11, 31, 23, 59, 59));

    where.OR = [

      {

        startDate: { gte: start, lte: end }

      },

      {

        endDate: { gte: start, lte: end }

      },

      {

        startDate: { lte: start },

        endDate: { gte: end }

      }

    ];

  }

  return prisma.holiday.findMany({

    where,

    orderBy: { startDate: "asc" },

  });

}



export async function createHoliday(startDateStr: string, endDateStr: string, name: string, isWorkday: boolean = false) {

  await checkPermission();

  const startDate = new Date(startDateStr + "T00:00:00.000Z");

  const endDate = new Date(endDateStr + "T00:00:00.000Z");

  

  const res = await prisma.holiday.create({

    data: { startDate, endDate, name, isWorkday, isCustom: true },

  });



  revalidatePath("/dashboard");

  revalidatePath("/history");

  return res;

}



export async function updateHoliday(id: string, startDateStr: string, endDateStr: string, name: string, isWorkday: boolean = false, isCustom: boolean = true) {

  await checkPermission();

  const startDate = new Date(startDateStr + "T00:00:00.000Z");

  const endDate = new Date(endDateStr + "T00:00:00.000Z");



  const res = await prisma.holiday.update({

    where: { id },

    data: { startDate, endDate, name, isWorkday, isCustom },

  });



  revalidatePath("/dashboard");

  revalidatePath("/history");

  return res;

}



export async function deleteHoliday(id: string) {

  await checkPermission();

  const res = await prisma.holiday.delete({

    where: { id },

  });



  revalidatePath("/dashboard");

  revalidatePath("/history");

  return res;

}



export async function searchInternetHolidays(yearBE: number) {
  await checkPermission();
  const yearCE = yearBE - 543;

  // Retrieve iApp API key from settings
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: { iappApiKey: true }
  });

  const apiKey = settings?.iappApiKey?.trim();
  const isUrlOrEmpty = !apiKey || apiKey.startsWith("http://") || apiKey.startsWith("https://") || apiKey.includes("api.iapp.co.th");

  // Fallback to local precompiled holidays if API Key is not set or is an URL, and year is supported
  if (isUrlOrEmpty && LOCAL_THAI_HOLIDAYS[yearCE]) {
    return LOCAL_THAI_HOLIDAYS[yearCE].map(item => ({
      dateStr: item.date,
      name: item.name
    }));
  }

  if (!apiKey) {
    throw new Error(
      "ไม่พบ iApp API Key กรุณากรอก API Key ในส่วนตั้งค่าก่อนเพื่อดาวน์โหลดข้อมูลวันหยุดราชการไทย"
    );
  }
  if (apiKey.startsWith("http://") || apiKey.startsWith("https://") || apiKey.includes("api.iapp.co.th")) {
    throw new Error(
      "ค่าที่ระบุในช่อง API Key มีรูปแบบเป็น URL เว็บไซต์ กรุณาระบุเป็น API Key ที่เป็นชุดตัวอักษร/รหัสโทเค็นที่ได้รับจากเว็บไซต์ iapp.co.th (ไม่ใช่ที่อยู่ลิงก์ API)"
    );
  }

  try {
    const response = await fetch(
      `https://api.iapp.co.th/v3/store/data/thai-holiday?holiday_type=public&year=${yearCE}`,
      {
        headers: {
          apikey: apiKey
        }
      }
    );

    if (!response.ok) {
      // Fallback if request fails (e.g. rate limit / network error) and year is locally cached
      if (LOCAL_THAI_HOLIDAYS[yearCE]) {
        return LOCAL_THAI_HOLIDAYS[yearCE].map(item => ({
          dateStr: item.date,
          name: item.name
        }));
      }
      throw new Error(`Failed to fetch from iApp API: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      if (LOCAL_THAI_HOLIDAYS[yearCE]) {
        return LOCAL_THAI_HOLIDAYS[yearCE].map(item => ({
          dateStr: item.date,
          name: item.name
        }));
      }
      return [];
    }

    const data = JSON.parse(text);
    const list = data.holidays || [];
    return list.map((item: any) => ({
      dateStr: item.date,
      name: item.name
    }));
  } catch (error: any) {
    console.error("Error searching holidays, attempting local fallback:", error);
    if (LOCAL_THAI_HOLIDAYS[yearCE]) {
      return LOCAL_THAI_HOLIDAYS[yearCE].map(item => ({
        dateStr: item.date,
        name: item.name
      }));
    }
    throw new Error(error.message || "Failed to search holidays");
  }
}

export async function importSelectedHolidays(items: { dateStr: string; name: string }[]) {

  await checkPermission();



  const imported = [];

  for (const item of items) {

    const startDate = new Date(item.dateStr + "T00:00:00.000Z");

    const endDate = new Date(item.dateStr + "T00:00:00.000Z");



    const existing = await prisma.holiday.findFirst({

      where: { startDate }

    });



    if (existing) {

      const updated = await prisma.holiday.update({

        where: { id: existing.id },

        data: { name: item.name, endDate, isCustom: false }

      });

      imported.push(updated);

    } else {

      const created = await prisma.holiday.create({

        data: {

          startDate,

          endDate,

          name: item.name,

          isCustom: false,

          isWorkday: false

        }

      });

      imported.push(created);

    }

  }



  revalidatePath("/dashboard");

  revalidatePath("/history");

  return { success: true, count: imported.length };

}

