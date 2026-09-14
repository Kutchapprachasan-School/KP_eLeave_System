import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHomography,
  invertHomography,
  projectPoint,
  evaluateImageQuality,
  calibrateContrast,
  readBubbleFill,
  decodeStudentIdGrid,
  decodeVersionCodeGrid,
  decodeQuestionBlocks,
  processOmrSheet
} from '../../../src/lib/omr/omrEngine.ts';

describe('OMR Computer Vision Engine - Mathematical Core & Pipeline', () => {
  it('computeHomography should accurately map rectangle to transformed quad and back', () => {
    const src = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 }
    ];

    // Transformed quad with perspective distortion
    const dst = [
      { x: 10, y: 15 },
      { x: 120, y: 25 },
      { x: 110, y: 210 },
      { x: 5, y: 195 }
    ];

    const H = computeHomography(src, dst);
    assert.equal(H.length, 9);
    assert.equal(H[8], 1.0);

    // Project src points and verify they match dst points within 0.01 precision
    for (let i = 0; i < 4; i++) {
      const proj = projectPoint(H, src[i]);
      assert.ok(Math.abs(proj.x - dst[i].x) < 0.05, `X mismatch at pt ${i}: ${proj.x} vs ${dst[i].x}`);
      assert.ok(Math.abs(proj.y - dst[i].y) < 0.05, `Y mismatch at pt ${i}: ${proj.y} vs ${dst[i].y}`);
    }

    // Invert Homography and verify projection back
    const Hinv = invertHomography(H);
    for (let i = 0; i < 4; i++) {
      const back = projectPoint(Hinv, dst[i]);
      assert.ok(Math.abs(back.x - src[i].x) < 0.05, `Back X mismatch at pt ${i}: ${back.x} vs ${src[i].x}`);
      assert.ok(Math.abs(back.y - src[i].y) < 0.05, `Back Y mismatch at pt ${i}: ${back.y} vs ${src[i].y}`);
    }
  });

  it('evaluateImageQuality should detect blur when image has low variance', () => {
    const width = 100;
    const height = 100;
    // Uniform grey image (zero edges/sharpness)
    const flatData = new Uint8ClampedArray(width * height * 4).fill(180);
    const flatImage = { width, height, data: flatData };

    const iqg = evaluateImageQuality(flatImage);
    assert.equal(iqg.passed, false);
    assert.ok(iqg.issues.some(msg => msg.includes('ภาพเบลอหรือไม่คมชัดเพียงพอ')));
  });

  it('evaluateImageQuality should detect specular glare when oversaturated', () => {
    const width = 100;
    const height = 100;
    // Mostly normal image with a 10% white glare hotspot (pixel = 255)
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 150;     // R
      data[i + 1] = 150; // G
      data[i + 2] = 150; // B
      data[i + 3] = 255; // A
    }
    // Inject glare hotspot in 500 pixels (> 2%)
    for (let i = 0; i < 500 * 4; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }

    const glareImage = { width, height, data };
    const iqg = evaluateImageQuality(glareImage);
    assert.ok(iqg.glarePercentage > 2.0);
    assert.ok(iqg.issues.some(msg => msg.includes('แสงสะท้อนจ้า')));
  });

  it('calibrateContrast & readBubbleFill correctly distinguishes filled vs empty bubble', () => {
    const width = 200;
    const height = 280;
    const data = new Uint8ClampedArray(width * height * 4);

    // Initialize paper background: 240 (white)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 240;
      data[i + 1] = 240;
      data[i + 2] = 240;
      data[i + 3] = 255;
    }

    // Draw solid black marker in top-left (u = 0.03..0.08, v = 0.02..0.06)
    for (let y = Math.floor(0.02 * height); y < Math.floor(0.06 * height); y++) {
      for (let x = Math.floor(0.03 * width); x < Math.floor(0.08 * width); x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 20;
        data[idx + 1] = 20;
        data[idx + 2] = 20;
      }
    }

    // Mock template with fiducial marker
    const template = {
      canvasWidth: width,
      canvasHeight: height,
      fiducialMarkers: {
        topLeft: { u: 0.03, v: 0.02, width: 0.05, height: 0.04 },
        topRight: { u: 0.92, v: 0.02, width: 0.05, height: 0.04 },
        bottomLeft: { u: 0.03, v: 0.94, width: 0.05, height: 0.04 },
        bottomRight: { u: 0.92, v: 0.94, width: 0.05, height: 0.04 }
      },
      studentIdGrid: { digitsCount: 5, digits: [] },
      versionCodeGrid: { versions: [] },
      questionBlocks: []
    };

    const calibration = calibrateContrast({ width, height, data }, template);
    assert.ok(calibration.lPaper > 200, `Paper should be bright: ${calibration.lPaper}`);
    assert.ok(calibration.lMarker < 100, `Marker should be dark: ${calibration.lMarker}`);
    assert.ok(calibration.contrastRange > 100, `Contrast range should be > 100: ${calibration.contrastRange}`);

    // Draw a filled dark pencil bubble at (u = 0.5, v = 0.5) with radius 8px
    const cx = Math.floor(0.5 * width);
    const cy = Math.floor(0.5 * height);
    const r = 8;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const idx = ((cy + dy) * width + (cx + dx)) * 4;
          data[idx] = 35; // dark 2B pencil
          data[idx + 1] = 35;
          data[idx + 2] = 35;
        }
      }
    }

    const filledRead = readBubbleFill({ width, height, data }, 0.5, 0.5, 8 / width, calibration);
    assert.ok(filledRead.fillRatio > 0.80, `Filled bubble fill ratio should be high: ${filledRead.fillRatio}`);

    // Test an unfilled empty bubble at (u = 0.7, v = 0.5)
    const emptyRead = readBubbleFill({ width, height, data }, 0.7, 0.5, 8 / width, calibration);
    assert.equal(emptyRead.fillRatio, 0.0, `Empty bubble fill ratio should be 0: ${emptyRead.fillRatio}`);
  });

  it('decodeQuestionBlocks correctly flags single choice, multiple marks, and blanks', () => {
    const calibration = {
      lPaper: 235,
      lMarker: 25,
      contrastRange: 210,
      fillThreshold: 150
    };

    // Construct mock question blocks
    const questionBlocks = [
      {
        itemNo: 1,
        bubbles: [
          { choice: 'A', u: 0.1, v: 0.1, radius: 0.02 },
          { choice: 'B', u: 0.2, v: 0.1, radius: 0.02 },
          { choice: 'C', u: 0.3, v: 0.1, radius: 0.02 },
          { choice: 'D', u: 0.4, v: 0.1, radius: 0.02 }
        ]
      },
      {
        itemNo: 2,
        bubbles: [
          { choice: 'A', u: 0.1, v: 0.2, radius: 0.02 },
          { choice: 'B', u: 0.2, v: 0.2, radius: 0.02 },
          { choice: 'C', u: 0.3, v: 0.2, radius: 0.02 },
          { choice: 'D', u: 0.4, v: 0.2, radius: 0.02 }
        ]
      }
    ];

    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4).fill(240);

    // Fill Item 1 Choice B solidly
    const bx = Math.floor(0.2 * width);
    const by = Math.floor(0.1 * height);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const idx = ((by + dy) * width + (bx + dx)) * 4;
        data[idx] = 30;
        data[idx + 1] = 30;
        data[idx + 2] = 30;
      }
    }

    // Item 2 is left blank (no pixels filled)

    const results = decodeQuestionBlocks({ width, height, data }, questionBlocks, calibration);
    assert.equal(results.length, 2);

    // Item 1: Choice B detected with high confidence
    assert.deepEqual(results[0].detectedChoices, ['B']);
    assert.ok(results[0].confidenceScore >= 0.75);

    // Item 2: Blank detected
    assert.deepEqual(results[1].detectedChoices, []);
    assert.ok(results[1].confidenceScore >= 0.80);
  });
});
