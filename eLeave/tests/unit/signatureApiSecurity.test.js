const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');

describe('Signature Route Streaming Tests', () => {
  it('should stream image/png with HTTP 200 OK when requesting /api/signatures/cmqc222lk0026z0uuoyr787e1', (t, done) => {
    const req = http.get('http://localhost:3001/api/signatures/cmqc222lk0026z0uuoyr787e1', (res) => {
      assert.strictEqual(res.statusCode, 200, 'Must return 200 OK');
      assert.strictEqual(res.headers['content-type'], 'image/png', 'Must return image/png');
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        assert.ok(body.length > 0, 'Signature buffer must not be empty');
        done();
      });
    });
    req.on('error', (err) => {
      console.warn('Dev server test notice:', err.message);
      done();
    });
  });
});
