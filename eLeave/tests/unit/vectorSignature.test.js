const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

function sanitizeSvg(svgContent) {
  if (!svgContent) return '';
  let clean = svgContent.trim();
  clean = clean.replace(/<\?xml[\s\S]*?\?>/gi, '');
  clean = clean.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  const dangerousTags = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style'];
  for (const tag of dangerousTags) {
    const regex = new RegExp('<' + tag + '[\\s\\S]*?>[\\s\\S]*?<\\/' + tag + '>', 'gi');
    clean = clean.replace(regex, '');
    const selfClosing = new RegExp('<' + tag + '[\\s\\S]*?\\/?>', 'gi');
    clean = clean.replace(selfClosing, '');
  }
  clean = clean.replace(/\son\w+\s*=\s*(['\"]).*?\1/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');
  clean = clean.replace(/(href|xlink:href)\s*=\s*(['\"])javascript:.*?\2/gi, '');
  if (!clean.toLowerCase().includes('<svg')) {
    throw new Error('Invalid SVG content: Missing <svg> root element');
  }
  if (!clean.includes('xmlns=')) {
    clean = clean.replace(/<svg/i, '<svg xmlns=\"http://www.w3.org/2000/svg\"');
  }
  return clean;
}

function exportStrokesToSvg(strokes, width, height, strokeColor = '#0f172a', strokeWidth = 3) {
  if (!strokes || strokes.length === 0) {
    return '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ' + width + ' ' + height + '\" width=\"' + width + '\" height=\"' + height + '\"></svg>';
  }
  let pathD = '';
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      pathD += 'M ' + stroke[0].x.toFixed(1) + ' ' + stroke[0].y.toFixed(1) + ' l 0.1 0.1 ';
      continue;
    }
    pathD += 'M ' + stroke[0].x.toFixed(1) + ' ' + stroke[0].y.toFixed(1) + ' ';
    if (stroke.length === 2) {
      pathD += 'L ' + stroke[1].x.toFixed(1) + ' ' + stroke[1].y.toFixed(1) + ' ';
    } else {
      for (let i = 1; i < stroke.length - 1; i++) {
        const p1 = stroke[i];
        const p2 = stroke[i + 1];
        const midX = ((p1.x + p2.x) / 2).toFixed(1);
        const midY = ((p1.y + p2.y) / 2).toFixed(1);
        pathD += 'Q ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + ', ' + midX + ' ' + midY + ' ';
      }
      const last = stroke[stroke.length - 1];
      pathD += 'L ' + last.x.toFixed(1) + ' ' + last.y.toFixed(1) + ' ';
    }
  }
  const rawSvg = '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ' + width + ' ' + height + '\" width=\"' + width + '\" height=\"' + height + '\"><path d=\"' + pathD.trim() + '\" stroke=\"' + strokeColor + '\" stroke-width=\"' + strokeWidth + '\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/></svg>';
  return sanitizeSvg(rawSvg);
}

describe('Vector SVG Signature Engine & Sanitizer Tests', () => {
  it('should export smooth Bezier curves with explicit width, height and viewBox', () => {
    const strokes = [
      [
        { x: 10, y: 20 },
        { x: 30, y: 50 },
        { x: 60, y: 80 },
        { x: 100, y: 40 }
      ]
    ];
    const svg = exportStrokesToSvg(strokes, 400, 200);

    assert.ok(svg.includes('viewBox=\"0 0 400 200\"'));
    assert.ok(svg.includes('width=\"400\"'));
    assert.ok(svg.includes('height=\"200\"'));
    assert.ok(svg.includes('stroke=\"#0f172a\"'));
    assert.ok(svg.includes('Q ')); // Quadratic Bezier curve indicator
  });

  it('should strip malicious script tags and event handlers from SVG', () => {
    const dirtySvg = '<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"><script>alert(\"XSS\")</script><path d=\"M0 0 L10 10\"/><foreignObject><iframe src=\"evil.com\"/></foreignObject></svg>';
    const clean = sanitizeSvg(dirtySvg);

    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('alert('));
    assert.ok(!clean.includes('onload='));
    assert.ok(!clean.includes('<foreignObject>'));
    assert.ok(!clean.includes('<iframe>'));
    assert.ok(clean.includes('<path d=\"M0 0 L10 10\"/>'));
  });
});
