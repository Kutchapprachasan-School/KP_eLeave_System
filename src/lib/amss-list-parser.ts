interface AMSSParsedRow {
  amssLink: string;
  receiveNo: string;
  docRefNo: string;
  title: string;
  senderOrg: string;
  dateText: string;
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

  // Helper to check if a string is header text
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
      s === "จัดการ"
    );
  };

  // 1. Try HTML Table Parsing
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let hasTrMatch = false;

  while ((match = rowRegex.exec(input)) !== null) {
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

    // Extract numeric AMSS ID from row (onclick check('...',169618,11) or b_id=169618 or id=169618 or tds[0])
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
      // Standard 7-column AMSS++ receive list:
      // [0] AMSS ID (e.g. 169618)
      // [1] Doc Ref No (e.g. ที่ ศธ 04349/ว3270)
      // [2] Title / Subject
      // [3] Click details ("คลิก")
      // [4] Date (e.g. 23 กค 2569)
      // [5] Sender Org (e.g. กลุ่มนิเทศ ติดตาม...)
      // [6] Sent Time (e.g. 23 กค 2569 15:15:37 น.)
      const receiveNo = tds[0] || "";
      const docRefNo = tds[1] || "";
      const title = tds[2] || "";
      const dateText = tds[4] || "";
      const senderOrg = tds[5] || "";

      if (!amssLink) {
        const idVal = receiveNo.match(/^\d{4,9}$/) ? receiveNo : Date.now().toString();
        amssLink = buildAmssBookDetailUrl(cleanBaseUrl, idVal);
      }

      if (title && title.length > 2 && (docRefNo || receiveNo)) {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    } else if (tds.length >= 4) {
      // 4-6 column fallback layout
      const cleanTds = tds.filter((t) => t !== "คลิก" && t !== "รายละเอียด");
      const receiveNo = cleanTds[0] || "";
      const docRefNo = cleanTds[1] || "";
      const title = cleanTds[2] || "";
      const senderOrg = cleanTds[3] || "";
      const dateText = cleanTds[4] || "";

      if (!amssLink) {
        const idVal = receiveNo.match(/^\d{4,9}$/) ? receiveNo : Date.now().toString();
        amssLink = buildAmssBookDetailUrl(cleanBaseUrl, idVal);
      }

      if (title && title.length > 2) {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    }
  }

  // 2. Fallback to Plain Text Tabular / Copied Text Parsing (if no <tr> found)
  if (!hasTrMatch || documents.length === 0) {
    const lines = input.split(/\r?\n/);
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

      // Check if parts match standard 6/7 column copied AMSS++ row:
      // [0] AMSS ID (e.g. 169618)
      // [1] Doc Ref (e.g. ที่ ศธ 04349/ว3270)
      // [2] Title (e.g. เลื่อนกำหนดการ...)
      // [3] Date (e.g. 23 กค 2569)
      // [4] Sender Org (e.g. กลุ่มนิเทศ...)
      if (parts[0].match(/^\d{4,9}$/) && (parts[1].includes("ที่") || parts[1].includes("/"))) {
        receiveNo = parts[0];
        docRefNo = parts[1];
        title = parts[2];
        
        // Find date part (e.g. 23 กค 2569)
        const dateIdx = parts.findIndex((p, idx) => idx > 2 && /\d{1,2}\s+[ก-ฮ]/.test(p));
        if (dateIdx !== -1) {
          dateText = parts[dateIdx];
          senderOrg = parts.filter((_, idx) => idx > 2 && idx !== dateIdx).join(" ");
        } else {
          senderOrg = parts[3] || "";
          dateText = parts[4] || "";
        }
      } else {
        // Fallback robust identification
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
          senderOrg = remaining.filter((p) => p !== title).join(" ");
        }
      }

      if (title && title.length > 2) {
        const amssIdMatch = receiveNo.match(/^\d{4,9}$/);
        const amssId = amssIdMatch ? amssIdMatch[0] : Date.now().toString();
        const amssLink = buildAmssBookDetailUrl(cleanBaseUrl, amssId);
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    }
  }

  return documents;
}
