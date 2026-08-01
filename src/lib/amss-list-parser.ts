interface AMSSParsedRow {
  amssLink: string;
  receiveNo: string;
  docRefNo: string;
  title: string;
  senderOrg: string;
  dateText: string;
}

// Helper to clean docRefNo and extract urgency level
export function parseDocRefAndUrgency(rawRef: string): { cleanRef: string; urgencyLevel: string; urgencyText: string } {
  if (!rawRef) return { cleanRef: "", urgencyLevel: "NORMAL", urgencyText: "ปกติ" };

  let text = rawRef.trim();
  let urgencyLevel = "NORMAL";
  let urgencyText = "ปกติ";

  if (/ด่วนที่สุด/i.test(text)) {
    urgencyLevel = "URGENT_MOST";
    urgencyText = "ด่วนที่สุด";
    text = text.replace(/ด่วนที่สุด/gi, "").trim();
  } else if (/ด่วนมาก/i.test(text)) {
    urgencyLevel = "URGENT_MORE";
    urgencyText = "ด่วนมาก";
    text = text.replace(/ด่วนมาก/gi, "").trim();
  } else if (/\bด่วน\b/i.test(text) || /ด่วน(?!ที่สุด|มาก)/i.test(text)) {
    urgencyLevel = "URGENT";
    urgencyText = "ด่วน";
    text = text.replace(/ด่วน/gi, "").trim();
  } else if (/ปกติ/i.test(text)) {
    urgencyLevel = "NORMAL";
    urgencyText = "ปกติ";
    text = text.replace(/ปกติ/gi, "").trim();
  }

  text = text.replace(/^[\s\r\n]+|[\s\r\n]+$/g, "").trim();

  return { cleanRef: text, urgencyLevel, urgencyText };
}

export function buildAmssBookDetailUrl(baseUrl: string, amssId: string): string {
  try {
    const origin = new URL(baseUrl).origin;
    return `${origin}/modules/book/main/bookdetail_school_saraban.php?b_id=${amssId}`;
  } catch (e) {
    return `https://amss.sesaud.go.th/modules/book/main/bookdetail_school_saraban.php?b_id=${amssId}`;
  }
}

export function parseAMSSListHtml(input: string, baseUrl?: string): AMSSParsedRow[] {
  const documents: AMSSParsedRow[] = [];
  if (!input || typeof input !== "string") return documents;

  const cleanBaseUrl = baseUrl ? (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") : "https://amss.sesaud.go.th/";

  // Pre-process input: if copied plain text contains multiple rows merged without newlines, split before AMSS IDs
  const processedInput = input.replace(/(\d{5,8}\s+(?:ที่\s+ศธ|ที่\s+[ก-ฮ]))/g, "\n$1");

  // Helper to check if a string is header text or navigation noise
  const isHeaderCell = (str: string) => {
    const s = str.trim();
    return (
      s === "ที่" ||
      s === "เลขหนังสือ" ||
      s === "เลขทะเบียนรับ" ||
      s === "เรื่อง" ||
      s === "จาก" ||
      s === "จากหน่วยงาน" ||
      s === "ลงวันที่" ||
      s === "รายละเอียด" ||
      s === "อ้างอิงหนังสือ (ที่)" ||
      s === "วันเวลาที่ส่ง" ||
      s === "จัดการ" ||
      s.includes("ออกจากระบบ") ||
      s.includes("สารบรรณสถานศึกษา") ||
      s.includes("ค้นหาหนังสือ") ||
      s.includes("ยังไม่ได้ส่งต่อ") ||
      s.includes("ยังไม่ได้ลงทะเบียนรับ") ||
      s.includes("หน้าแรก") ||
      s.includes("หน้าก่อน") ||
      s.includes("หน้าถัดไป") ||
      s.includes("หนังสือรับ <") ||
      s.includes("รายการหลัก") ||
      (s.startsWith("[") && s.endsWith("]"))
    );
  };

  // Helper to clean senderOrg from dates, times, and next concatenated rows
  const cleanSenderOrgText = (str: string) => {
    let s = str.trim();
    // Strip trailing date/time patterns like "24 กค 2569 15:14:43 น." or "14:11:22 น."
    s = s.replace(/\s*\d{1,2}\s+[ก-ฮ].*$/i, "");
    s = s.replace(/\s*\d{1,2}:\d{2}(?::\d{2})?\s*น\.?.*$/i, "");
    s = s.replace(/\s*มีไฟล์เอกสาร.*$/i, "");
    s = s.replace(/\s*มีไฟล์แนบ.*$/i, "");

    const noiseIdx = s.search(/(?:\d{5,8}\s+(?:ที่|ศธ))/);
    if (noiseIdx > 0) {
      s = s.substring(0, noiseIdx).trim();
    }
    return s.trim();
  };

  const isInvalidTitle = (titleText: string, docRefText: string) => {
    const t = (titleText || "").trim();
    const r = (docRefText || "").trim();
    return (
      !t ||
      t.length <= 2 ||
      t === "ยังไม่ได้ส่งต่อ" ||
      t.includes("หน้าแรก") ||
      t.includes("หน้าก่อน") ||
      t.includes("หน้าถัดไป") ||
      t.includes("หนังสือรับ <") ||
      t.includes("ยังไม่ได้ลงทะเบียนรับ") ||
      r === "ยังไม่ได้ลงทะเบียนรับ" ||
      r.includes("หน้าแรก") ||
      r.includes("สารบรรณ")
    );
  };

  // 1. Try HTML Table Parsing
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let hasTrMatch = false;

  while ((match = rowRegex.exec(processedInput)) !== null) {
    hasTrMatch = true;
    const rowContent = match[1];

    // Extract td / th contents
    const tdRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const tds: string[] = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      tds.push(
        tdMatch[1]
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      );
    }

    if (tds.length < 3) continue;

    // Filter out header rows
    if (tds.some((t) => isHeaderCell(t))) continue;

    // Extract numeric AMSS ID from row
    let amssId = "";
    const idMatch = rowContent.match(/(?:b_id|id)=(\d+)/i) || rowContent.match(/check\([^,]+,\s*['"]?(\d+)['"]?/i);
    if (idMatch && idMatch[1]) {
      amssId = idMatch[1];
    } else if (tds[0] && tds[0].match(/^\d{4,9}$/)) {
      amssId = tds[0];
    }

    let amssLink = "";
    if (amssId) {
      amssLink = buildAmssBookDetailUrl(cleanBaseUrl, amssId);
    }

    if (tds.length >= 7) {
      const receiveNo = tds[0] || "";
      const { cleanRef: docRefNo } = parseDocRefAndUrgency(tds[1] || "");
      const title = tds[2] || "";
      const dateText = tds[4] || "";
      const senderOrg = cleanSenderOrgText(tds[5] || "");

      if (!amssLink) {
        const idVal = receiveNo.match(/^\d{4,9}$/) ? receiveNo : Date.now().toString();
        amssLink = buildAmssBookDetailUrl(cleanBaseUrl, idVal);
      }

      if (!isInvalidTitle(title, docRefNo)) {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    } else if (tds.length >= 4) {
      const cleanTds = tds.filter((t) => t !== "คลิก" && t !== "รายละเอียด");
      const receiveNo = cleanTds[0] || "";
      const { cleanRef: docRefNo } = parseDocRefAndUrgency(cleanTds[1] || "");
      const title = cleanTds[2] || "";
      const senderOrg = cleanSenderOrgText(cleanTds[3] || "");
      const dateText = cleanTds[4] || "";

      if (!amssLink) {
        const idVal = receiveNo.match(/^\d{4,9}$/) ? receiveNo : Date.now().toString();
        amssLink = buildAmssBookDetailUrl(cleanBaseUrl, idVal);
      }

      if (!isInvalidTitle(title, docRefNo)) {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    }
  }

  // 2. Fallback to Plain Text Tabular / Copied Text Parsing (if no <tr> found)
  if (!hasTrMatch || documents.length === 0) {
    const lines = processedInput.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Split by tab (\t) or 2+ consecutive spaces
      const rawParts = trimmed.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      
      // Filter out header cells and "คลิก"
      const parts = rawParts.filter((p) => !isHeaderCell(p) && p !== "คลิก" && p !== "รายละเอียด");
      if (parts.length < 3) continue;

      let receiveNo = "";
      let docRefNo = "";
      let title = "";
      let senderOrg = "";
      let dateText = "";

      if (parts[0].match(/^\d{4,9}$/) && (parts[1].includes("ที่") || parts[1].includes("/"))) {
        receiveNo = parts[0];
        docRefNo = parts[1];
        title = parts[2];
        
        const dateIdx = parts.findIndex((p, idx) => idx > 2 && /\d{1,2}\s+[ก-ฮ]/.test(p));
        if (dateIdx !== -1) {
          dateText = parts[dateIdx];
          senderOrg = cleanSenderOrgText(parts.filter((_, idx) => idx > 2 && idx !== dateIdx).join(" "));
        } else {
          senderOrg = cleanSenderOrgText(parts[3] || "");
          dateText = parts[4] || "";
        }
      } else {
        const refIdx = parts.findIndex((p) => /^ที่\s*ศธ/i.test(p) || (p.startsWith("ที่") && p.includes("/")));
        if (refIdx !== -1) {
          docRefNo = parts[refIdx];
          if (refIdx > 0 && parts[0] !== docRefNo) {
            receiveNo = parts[0];
          }
        } else {
          receiveNo = parts[0];
          docRefNo = parts[1] || "";
        }

        const dateIdx = parts.findIndex((p) => /\d{1,2}\s+[ก-ฮ].*\s+\d{4}/.test(p));
        if (dateIdx !== -1) {
          dateText = parts[dateIdx];
        }

        const remaining = parts.filter((p) => p !== receiveNo && p !== docRefNo && p !== dateText);
        if (remaining.length > 0) {
          const titleCandidates = [...remaining].sort((a, b) => b.length - a.length);
          title = titleCandidates[0];
          senderOrg = cleanSenderOrgText(remaining.filter((p) => p !== title).join(" "));
        }
      }

      if (!isInvalidTitle(title, docRefNo)) {
        const amssIdMatch = receiveNo.match(/^\d{4,9}$/);
        const amssId = amssIdMatch ? amssIdMatch[0] : Date.now().toString();
        const amssLink = buildAmssBookDetailUrl(cleanBaseUrl, amssId);
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    }
  }

  return documents;
}
