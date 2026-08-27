const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Simulate the logic from src/lib/attachment-utils.ts for Node testing
function parseDocumentUrls(documentUrl) {
  if (!documentUrl || !documentUrl.trim()) return [];

  let rawList = [];
  const trimmed = documentUrl.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else {
        rawList = [parsed];
      }
    } catch {
      rawList = trimmed.split(',');
    }
  } else {
    rawList = trimmed.split(',');
  }

  return rawList
    .map((item, idx) => {
      let url = '';
      let name = 'เอกสารแนบ ' + (idx + 1);
      let sizeBytes;
      let mimeType;

      if (typeof item === 'string') {
        url = item.trim();
      } else if (item && typeof item === 'object') {
        url = item.url || item.preview || '';
        name = item.name || name;
        sizeBytes = item.sizeBytes || item.size;
        mimeType = item.mimeType || item.type;
      }

      if (!url) return null;

      const isDataImage = url.startsWith('data:image/');
      const isDataPdf = url.startsWith('data:application/pdf');
      const cleanUrl = url.split('?')[0].toLowerCase();
      const isHttpImage = /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(cleanUrl);
      const isHttpPdf = /\.pdf$/i.test(cleanUrl);

      return {
        name,
        url,
        preview: url,
        isImage: isDataImage || isHttpImage,
        isPdf: isDataPdf || isHttpPdf || (!isDataImage && !isHttpImage),
        sizeBytes,
        mimeType,
      };
    })
    .filter(Boolean);
}

describe('Attachment Normalizer & Polymorphic Parser Tests', () => {
  it('should parse legacy Base64 JSON array', () => {
    const raw = JSON.stringify([
      { name: 'ใบรับรองแพทย์.pdf', preview: 'data:application/pdf;base64,JVBERi0xLjQK...' },
      { name: 'รูปถ่าย.jpg', preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...' }
    ]);

    const result = parseDocumentUrls(raw);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'ใบรับรองแพทย์.pdf');
    assert.strictEqual(result[0].isPdf, true);
    assert.strictEqual(result[0].isImage, false);

    assert.strictEqual(result[1].name, 'รูปถ่าย.jpg');
    assert.strictEqual(result[1].isImage, true);
    assert.strictEqual(result[1].isPdf, false);
  });

  it('should parse new Supabase Storage JSON array with both url and preview', () => {
    const raw = JSON.stringify([
      { name: 'cert.pdf', url: 'https://proj.supabase.co/storage/v1/object/public/leave-attachments/cert.pdf', preview: 'https://proj.supabase.co/storage/v1/object/public/leave-attachments/cert.pdf' }
    ]);

    const result = parseDocumentUrls(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'cert.pdf');
    assert.strictEqual(result[0].isPdf, true);
    assert.strictEqual(result[0].isImage, false);
    assert.strictEqual(result[0].url, 'https://proj.supabase.co/storage/v1/object/public/leave-attachments/cert.pdf');
  });

  it('should parse comma-delimited HTTP URLs', () => {
    const raw = 'https://cdn.udkp.ac.th/doc1.pdf, https://cdn.udkp.ac.th/photo.png';
    const result = parseDocumentUrls(raw);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].isPdf, true);
    assert.strictEqual(result[1].isImage, true);
  });
});
