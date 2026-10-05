import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { detectFiducialMarkers } from '../../../src/lib/omr/omrMarkerDetector.ts';
import {
  generate20ItemGridMetadata,
  generate40ItemGridMetadata,
  generate60ItemGridMetadata,
  generate80ItemGridMetadata,
  generate100ItemGridMetadata,
  getTemplateGridForItems
} from '../../../src/lib/omr/omrTemplateGeometry.ts';

describe('OMR Marker Detector & Compact Geometry Unit Tests', () => {
  it('detectFiducialMarkers should detect 4 black square markers on white background', () => {
    const width = 400;
    const height = 400;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill background with white (255)
    data.fill(255);

    // Draw 4 black squares (size: 20x20 px) near the 4 corners
    const markerSize = 20;
    const drawSquare = (startX, startY) => {
      for (let y = startY; y < startY + markerSize; y++) {
        for (let x = startX; x < startX + markerSize; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = 10;     // R
          data[idx + 1] = 10; // G
          data[idx + 2] = 10; // B
          data[idx + 3] = 255;
        }
      }
    };

    // Top-Left (20, 20)
    drawSquare(20, 20);
    // Top-Right (360, 20)
    drawSquare(360, 20);
    // Bottom-Left (20, 360)
    drawSquare(20, 360);
    // Bottom-Right (360, 360)
    drawSquare(360, 360);

    const result = detectFiducialMarkers(data, width, height, 1.0);

    assert.equal(result.found, true);
    assert.equal(result.markersDetected, 4);
    assert.ok(result.corners !== null);

    // Verify corners are correctly assigned
    assert.ok(result.corners.topLeft.x < 100 && result.corners.topLeft.y < 100);
    assert.ok(result.corners.topRight.x > 300 && result.corners.topRight.y < 100);
    assert.ok(result.corners.bottomLeft.x < 100 && result.corners.bottomLeft.y > 300);
    assert.ok(result.corners.bottomRight.x > 300 && result.corners.bottomRight.y > 300);
    assert.ok(result.confidence > 0.6);
  });

  it('detectFiducialMarkers should return found: false when fewer than 4 markers exist', () => {
    const width = 300;
    const height = 300;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);

    // Only draw 2 squares
    const markerSize = 16;
    for (let y = 10; y < 10 + markerSize; y++) {
      for (let x = 10; x < 10 + markerSize; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0;
      }
    }
    for (let y = 10; y < 10 + markerSize; y++) {
      for (let x = 270; x < 270 + markerSize; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0;
      }
    }

    const result = detectFiducialMarkers(data, width, height, 1.0);
    assert.equal(result.found, false);
    assert.equal(result.corners, null);
    assert.equal(result.markersDetected, 2);
  });

  it('Rev 11.0 full-page side-by-side geometry should place Student ID & Seat No on left sidebar and Questions on right zone', () => {
    const grid20 = generate20ItemGridMetadata(4);
    const grid40 = generate40ItemGridMetadata(4);
    const grid60 = generate60ItemGridMetadata(4);
    const grid80 = generate80ItemGridMetadata(5);
    const grid100 = generate100ItemGridMetadata(6);

    for (const grid of [grid20, grid40, grid60, grid80, grid100]) {
      // Full-page fiducial markers should frame the entire A4 sheet (bottom v >= 0.90)
      assert.ok(grid.fiducialMarkers.topLeft.v <= 0.08, `Top marker v too large: ${grid.fiducialMarkers.topLeft.v}`);
      assert.ok(grid.fiducialMarkers.bottomLeft.v >= 0.90, `Bottom marker v too small: ${grid.fiducialMarkers.bottomLeft.v}`);
      assert.ok(grid.fiducialMarkers.bottomRight.v >= 0.90, `Bottom marker v too small: ${grid.fiducialMarkers.bottomRight.v}`);

      // Student ID grid (5 digits = 50 bubbles) must sit in Left Sidebar (u < 0.30)
      assert.equal(grid.studentIdGrid.digitsCount, 5);
      assert.equal(grid.studentIdGrid.digits.length, 50);
      for (const d of grid.studentIdGrid.digits) {
        assert.ok(d.u > 0.08 && d.u < 0.30, `Student ID digit u out of left sidebar bounds: ${d.u}`);
      }

      // Seat No grid (2 digits = 20 bubbles) must sit in Left Sidebar below Student ID (u < 0.25, v > 0.55)
      assert.ok(grid.seatNoGrid, 'seatNoGrid must exist in Rev 11.0');
      assert.equal(grid.seatNoGrid.digitsCount, 2);
      assert.equal(grid.seatNoGrid.digits.length, 20);
      for (const s of grid.seatNoGrid.digits) {
        assert.ok(s.u > 0.08 && s.u < 0.25, `Seat No digit u out of left sidebar bounds: ${s.u}`);
        assert.ok(s.v > 0.55 && s.v < 0.90, `Seat No digit v out of bounds: ${s.v}`);
      }

      // Question bubbles must sit in Right Answer Zone (u > 0.34)
      for (const q of grid.questionBlocks) {
        for (const b of q.bubbles) {
          assert.ok(b.u > 0.34 && b.u < 0.95, `Bubble for item ${q.itemNo} choice ${b.choice} u out of right zone: ${b.u}`);
          assert.ok(b.v > 0.25 && b.v < 0.95, `Bubble for item ${q.itemNo} choice ${b.choice} v out of bounds: ${b.v}`);
        }
      }
    }
  });

  it('getTemplateGridForItems should support variable choiceCount up to 6 (A-F)', () => {
    const grid4 = getTemplateGridForItems(40, 4);
    assert.equal(grid4.choiceCount, 4);
    assert.deepEqual(grid4.questionBlocks[0].bubbles.map(b => b.choice), ['A', 'B', 'C', 'D']);

    const grid5 = getTemplateGridForItems(40, 5);
    assert.equal(grid5.choiceCount, 5);
    assert.deepEqual(grid5.questionBlocks[0].bubbles.map(b => b.choice), ['A', 'B', 'C', 'D', 'E']);

    const grid6 = getTemplateGridForItems(40, 6);
    assert.equal(grid6.choiceCount, 6);
    assert.deepEqual(grid6.questionBlocks[0].bubbles.map(b => b.choice), ['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('detectFiducialMarkers should detect all 6 black square markers (4 corners + 2 mid-side)', () => {
    const width = 400;
    const height = 400;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);

    const drawSquare = (startX, startY, size = 20) => {
      for (let y = startY; y < startY + size; y++) {
        for (let x = startX; x < startX + size; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = 10;
          data[idx + 1] = 10;
          data[idx + 2] = 10;
          data[idx + 3] = 255;
        }
      }
    };

    drawSquare(20, 20, 20);   // TL
    drawSquare(360, 20, 20);  // TR
    drawSquare(20, 190, 18);  // ML
    drawSquare(360, 190, 18); // MR
    drawSquare(20, 360, 20);  // BL
    drawSquare(360, 360, 20); // BR

    const result = detectFiducialMarkers(data, width, height, 1.0);
    assert.equal(result.found, true);
    assert.equal(result.markersDetected, 6);
    assert.ok(result.corners.midLeft !== undefined);
    assert.ok(result.corners.midRight !== undefined);
    assert.ok(result.midPoints !== null);
  });

  it('all 5 tiers should include 6 fiducial markers and right-edge row timingMarks', () => {
    for (const count of [20, 40, 60, 80, 100]) {
      const grid = getTemplateGridForItems(count, 4);
      assert.ok(grid.fiducialMarkers.midLeft, `Tier ${count} missing midLeft marker`);
      assert.ok(grid.fiducialMarkers.midRight, `Tier ${count} missing midRight marker`);
      assert.ok(Array.isArray(grid.timingMarks) && grid.timingMarks.length > 0, `Tier ${count} missing timingMarks`);
      assert.equal(grid.subjectiveScores.length, 0, `Tier ${count} should have 0 subjective blocks in Rev 11.0 pure multiple-choice mode`);
    }
  });

  it('detectFiducialMarkers should detect markers on real-world dark desk background with mobile camera', () => {
    const W = 640;
    const H = 480;
    const data = new Uint8ClampedArray(W * H * 4);

    // 1. Dark desk background (gray ~65)
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = 68;     // R
      data[i * 4 + 1] = 64; // G
      data[i * 4 + 2] = 60; // B
      data[i * 4 + 3] = 255;
    }

    // 2. White A4 paper in center
    const paperX = 180, paperY = 40, paperW = 280, paperH = 400;
    for (let y = paperY; y < paperY + paperH; y++) {
      for (let x = paperX; x < paperX + paperW; x++) {
        const idx = (y * W + x) * 4;
        data[idx] = 225;
        data[idx + 1] = 225;
        data[idx + 2] = 225;
      }
    }

    // 3. Draw 6 markers on paper (8x8 px)
    const mw = 8, mh = 8;
    const markers = [
      { x: paperX + Math.round(paperW * 0.065), y: paperY + Math.round(paperH * 0.045) },  // TL
      { x: paperX + Math.round(paperW * 0.935), y: paperY + Math.round(paperH * 0.045) },  // TR
      { x: paperX + Math.round(paperW * 0.045), y: paperY + Math.round(paperH * 0.500) },  // ML
      { x: paperX + Math.round(paperW * 0.955), y: paperY + Math.round(paperH * 0.500) },  // MR
      { x: paperX + Math.round(paperW * 0.065), y: paperY + Math.round(paperH * 0.955) },  // BL
      { x: paperX + Math.round(paperW * 0.935), y: paperY + Math.round(paperH * 0.955) },  // BR
    ];

    for (const m of markers) {
      for (let my = m.y - Math.floor(mh / 2); my <= m.y + Math.floor(mh / 2); my++) {
        for (let mx = m.x - Math.floor(mw / 2); mx <= m.x + Math.floor(mw / 2); mx++) {
          if (mx >= 0 && mx < W && my >= 0 && my < H) {
            const idx = (my * W + mx) * 4;
            data[idx] = 12; data[idx + 1] = 12; data[idx + 2] = 12;
          }
        }
      }
    }

    const result = detectFiducialMarkers(data, W, H, 0.6761);
    assert.equal(result.found, true, `Markers should be detected on dark desk, got ${result.markersDetected}`);
    assert.ok(result.markersDetected >= 4, `At least 4 markers detected: ${result.markersDetected}`);
    assert.ok(result.corners !== null);
  });
});
