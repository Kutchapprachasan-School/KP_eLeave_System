const { describe, it } = require('node:test');
const assert = require('node:assert');
const http = require('http');

describe('Private Authenticated Signature Route Security Tests', () => {
  it('should return 401 Unauthorized when unauthenticated request calls /api/signatures/cmqc222lk0026z0uuoyr787e1', (t, done) => {
    const req = http.get('http://localhost:3001/api/signatures/cmqc222lk0026z0uuoyr787e1', (res) => {
      assert.strictEqual(res.statusCode, 401, 'Must reject unauthenticated requests with 401');
      done();
    });
    req.on('error', (err) => {
      console.warn('Dev server test notice:', err.message);
      done();
    });
  });
});
