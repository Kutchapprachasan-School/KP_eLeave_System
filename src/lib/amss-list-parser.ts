interface AMSSParsedRow {
  amssLink: string;
  receiveNo: string;
  docRefNo: string;
  title: string;
  senderOrg: string;
  dateText: string;
}

export function parseAMSSListHtml(html: string): AMSSParsedRow[] {
  const documents: AMSSParsedRow[] = [];
  
  // Find all table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = rowRegex.exec(html)) !== null) {
    const rowContent = match[1];
    
    // Look for bookdetail_receive_sch.php links
    const linkMatch = rowContent.match(/href=["']([^"']*bookdetail_receive_sch\.php\?id=(\d+)[^"']*)["']/i);
    if (!linkMatch) continue;
    
    const amssLink = linkMatch[1];
    
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
    
    if (tds.length >= 5) {
      // Typically:
      // Index 1 or 2 is receive no / register no
      // Index 2 or 3 is doc ref no (เลขที่หนังสือ)
      // Index 3 or 4 is title/subject (เรื่อง)
      // Index 4 or 5 is sender (จาก)
      // We will parse dynamically based on columns
      const receiveNo = tds[1] || "";
      const docRefNo = tds[2] || "";
      const title = tds[3] || "";
      const senderOrg = tds[4] || "";
      const dateText = tds[5] || "";
      
      documents.push({
        amssLink,
        receiveNo,
        docRefNo,
        title,
        senderOrg,
        dateText
      });
    }
  }
  
  return documents;
}
