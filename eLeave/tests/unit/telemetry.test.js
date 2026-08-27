const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Simulate telemetry buffer logic
const testBuffer = [];
function recordTelemetry({ actionName, durationMs, payloadBytes, userId, status = 'ok' }) {
  let finalStatus = status;
  if (payloadBytes > 150 * 1024 && finalStatus === 'ok') {
    finalStatus = 'warn';
  }
  const record = {
    id: 'tel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    actionName,
    durationMs: Math.round(durationMs),
    payloadBytes: Math.round(payloadBytes),
    timestamp: new Date().toISOString(),
    userId,
    status: finalStatus,
  };
  testBuffer.unshift(record);
  return record;
}

function getTelemetrySummary() {
  const totalRequests = testBuffer.length;
  let totalBytes = 0;
  const actionMap = {};

  for (const item of testBuffer) {
    totalBytes += item.payloadBytes;
    if (!actionMap[item.actionName]) {
      actionMap[item.actionName] = { count: 0, totalBytes: 0, totalDuration: 0 };
    }
    actionMap[item.actionName].count++;
    actionMap[item.actionName].totalBytes += item.payloadBytes;
    actionMap[item.actionName].totalDuration += item.durationMs;
  }

  const topConsumers = Object.entries(actionMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      totalBytes: data.totalBytes,
      totalKb: (data.totalBytes / 1024).toFixed(1),
      avgDurationMs: Math.round(data.totalDuration / data.count)
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return {
    totalRequests,
    totalBytes,
    totalMb: (totalBytes / (1024 * 1024)).toFixed(2),
    topConsumers
  };
}

describe('Egress Telemetry & Live Monitor Tests', () => {
  it('should record server action telemetry and detect large payloads', () => {
    const normal = recordTelemetry({
      actionName: 'getAllUsers',
      durationMs: 45,
      payloadBytes: 1024,
    });
    assert.strictEqual(normal.status, 'ok');

    const heavy = recordTelemetry({
      actionName: 'exportAllLeavesReport',
      durationMs: 320,
      payloadBytes: 200 * 1024, // 200 KB
    });
    assert.strictEqual(heavy.status, 'warn');
  });

  it('should aggregate top consumers ranked by data transfer volume', () => {
    const summary = getTelemetrySummary();
    assert.ok(summary.totalRequests >= 2);
    assert.strictEqual(summary.topConsumers[0].name, 'exportAllLeavesReport');
    assert.ok(parseFloat(summary.topConsumers[0].totalKb) > 100);
  });
});
