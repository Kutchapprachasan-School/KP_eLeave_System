const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Supabase Usage & Egress Quota Calculations', () => {
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0.00 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const idx = Math.min(i, sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, idx)).toFixed(dm)) + ' ' + sizes[idx];
  }

  function calculateMetric(name, usedBytes, limitBytes) {
    const safeLimit = limitBytes > 0 ? limitBytes : 1;
    const percentUsed = parseFloat(((usedBytes / safeLimit) * 100).toFixed(1));
    const remainingBytes = Math.max(0, limitBytes - usedBytes);

    let status = 'HEALTHY';
    if (percentUsed >= 95) {
      status = 'CRITICAL';
    } else if (percentUsed >= 80) {
      status = 'WARNING';
    }

    return {
      name,
      usedBytes,
      usedFormatted: formatBytes(usedBytes),
      limitBytes,
      limitFormatted: formatBytes(limitBytes),
      remainingBytes,
      remainingFormatted: formatBytes(remainingBytes),
      percentUsed,
      status,
    };
  }

  it('should correctly format bytes across units', () => {
    assert.strictEqual(formatBytes(1024), '1 KB');
    assert.strictEqual(formatBytes(1048576), '1 MB');
    assert.strictEqual(formatBytes(5368709120), '5 GB');
  });

  it('should return HEALTHY when egress usage is low (<80%)', () => {
    const limit = 5 * 1024 * 1024 * 1024; // 5 GB
    const used = 0.5 * 1024 * 1024 * 1024; // 500 MB (10%)
    const metric = calculateMetric('Egress', used, limit);

    assert.strictEqual(metric.percentUsed, 10.0);
    assert.strictEqual(metric.status, 'HEALTHY');
    assert.strictEqual(metric.remainingFormatted, '4.5 GB');
  });

  it('should trigger WARNING when egress usage reaches 80% threshold', () => {
    const limit = 5 * 1024 * 1024 * 1024; // 5 GB
    const used = 4.2 * 1024 * 1024 * 1024; // 4.2 GB (84%)
    const metric = calculateMetric('Egress', used, limit);

    assert.strictEqual(metric.status, 'WARNING');
    assert.strictEqual(metric.percentUsed, 84.0);
  });

  it('should trigger CRITICAL when egress usage reaches 95% threshold', () => {
    const limit = 5 * 1024 * 1024 * 1024; // 5 GB
    const used = 4.8 * 1024 * 1024 * 1024; // 4.8 GB (96%)
    const metric = calculateMetric('Egress', used, limit);

    assert.strictEqual(metric.status, 'CRITICAL');
    assert.strictEqual(metric.percentUsed, 96.0);
  });
});
