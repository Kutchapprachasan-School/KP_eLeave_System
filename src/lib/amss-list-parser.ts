interface AMSSParsedRow {
  amssLink: string;
  receiveNo: string;
  docRefNo: string;
  title: string;
  senderOrg: string;
  dateText: string;
}

export function parseAMSSListHtml(input: string, baseUrl?: string): AMSSParsedRow[] {
  const documents: AMSSParsedRow[] = [];
  if (!input || typeof input !== "string") return documents;

  const cleanBaseUrl = baseUrl ? (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") : "https://amss.sesaud.go.th/";

  // 1. Try HTML Table Parsing
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let hasTrMatch = false;

  while ((match = rowRegex.exec(input)) !== null) {
    hasTrMatch = true;
    const rowContent = match[1];

    // Extract td contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
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

    // Look for standard href or onclick check(...) link
    let amssLink = "";
    const hrefMatch =
      rowContent.match(/href=["']([^"']*(?:id=\d+|receive_detail|bookdetail)[^"']*)["']/i) ||
      rowContent.match(/href=["']([^"']+)["']/i);

    if (hrefMatch && hrefMatch[1] && !hrefMatch[1].startsWith("#") && !hrefMatch[1].startsWith("javascript:")) {
      amssLink = hrefMatch[1];
    } else {
      const onclickMatch =
        rowContent.match(/check\(['"]([^'"]+)['"]\s*,\s*['"]?(\d+)['"]?/i) ||
        rowContent.match(/open\(['"]([^'"]+)['"]\s*,\s*['"]?(\d+)['"]?/i);
      if (onclickMatch) {
        const page = onclickMatch[1];
        const b_id = onclickMatch[2];
        amssLink = `index.php?option=book&task=main/${page}&id=${b_id}`;
      }
    }

    // Fallback amssLink using AMSS ID in tds[0] if no explicit link found
    if (!amssLink) {
      const amssIdMatch = rowContent.match(/id=(\d+)/i) || (tds[0] && tds[0].match(/^\d{4,9}$/));
      const amssId = amssIdMatch ? (typeof amssIdMatch === "string" ? amssIdMatch : amssIdMatch[1]) : tds[0];
      if (amssId) {
        amssLink = `index.php?option=book&task=main/receive_detail&id=${amssId}`;
      } else {
        amssLink = `index.php?option=book&task=main/receive_detail&id=${Date.now()}`;
      }
    }

    // Format relative URL to absolute URL
    if (cleanBaseUrl && !amssLink.startsWith("http://") && !amssLink.startsWith("https://")) {
      try {
        amssLink = new URL(amssLink.replace(/^\/+/, ""), cleanBaseUrl).toString();
      } catch (e) {
        amssLink = cleanBaseUrl + amssLink;
      }
    }

    if (tds.length >= 7) {
      // 7-column layout (Standard AMSS++ receive list)
      // Index 0: AMSS ID / Receive No (e.g. 169346)
      // Index 1: Doc Ref No (e.g. ที่ ศธ 04349/ว3194)
      // Index 2: Title / Subject (e.g. ประกาศรายชื่อโรงเรียน...)
      // Index 3: Click details
      // Index 4: Date (e.g. 21 กค 2569)
      // Index 5: Sender Org (e.g. กลุ่มนิเทศ ติดตาม...)
      const receiveNo = tds[0] || "";
      const docRefNo = tds[1] || "";
      const title = tds[2] || "";
      const dateText = tds[4] || tds[6] || "";
      const senderOrg = tds[5] || tds[3] || "";

      if (title && title !== "เรื่อง" && (docRefNo || receiveNo)) {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    } else if (tds.length >= 4) {
      // 4-6 column fallback layout
      const receiveNo = tds[0] || "";
      const docRefNo = tds[1] || "";
      const title = tds[2] || "";
      const senderOrg = tds[3] || "";
      const dateText = tds[4] || "";

      if (title && title !== "เรื่อง") {
        documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
      }
    }
  }

  // 2. Fallback to Plain Text Tabular / Copied Text Parsing (if no <tr> found)
  if (!hasTrMatch || documents.length === 0) {
    const lines = input.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("ที่") && trimmed.includes("เรื่อง")) continue;

      // Split by tab (\t) or 2+ consecutive spaces
      const parts = trimmed.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 4) {
        // Find part with ศธ or doc ref
        const receiveNo = parts[0] || "";
        const docRefNo = parts.find((p) => p.includes("ศธ") || p.includes("ที่")) || parts[1] || "";
        const titleIndex = parts.findIndex((p) => p !== receiveNo && p !== docRefNo && p.length > 5);
        const title = titleIndex !== -1 ? parts[titleIndex] : parts[2] || "";
        const dateText = parts.find((p) => /\d{1,2}\s+[ก-ฮ].*\s+\d{4}/.test(p)) || "";
        const senderOrg = parts.find((p) => p.includes("กลุ่ม") || p.includes("สพ") || p.includes("สำนักงาน") || p.includes("งาน")) || "";

        const amssIdMatch = receiveNo.match(/^\d{4,9}$/);
        const amssId = amssIdMatch ? amssIdMatch[0] : Date.now().toString();
        const amssLink = `${cleanBaseUrl}index.php?option=book&task=main/receive_detail&id=${amssId}`;

        if (title && title.length > 3) {
          documents.push({ amssLink, receiveNo, docRefNo, title, senderOrg, dateText });
        }
      }
    }
  }

  return documents;
}
