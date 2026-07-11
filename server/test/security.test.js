const test = require('node:test');
const assert = require('node:assert/strict');
const { enforceTrustedOrigin } = require('../middleware/security');

const invoke = (middleware, { method, origin }) => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;

  middleware(
    {
      method,
      requestId: 'request-123',
      get: (header) => (header === 'Origin' ? origin : undefined),
    },
    response,
    () => { nextCalled = true; }
  );

  return { nextCalled, response };
};

test('allows state-changing browser requests from a configured origin', () => {
  const middleware = enforceTrustedOrigin(['https://app.example.edu']);
  const result = invoke(middleware, { method: 'POST', origin: 'https://app.example.edu' });

  assert.equal(result.nextCalled, true);
  assert.equal(result.response.body, null);
});

test('rejects state-changing browser requests from an untrusted origin', () => {
  const middleware = enforceTrustedOrigin(['https://app.example.edu']);
  const result = invoke(middleware, { method: 'DELETE', origin: 'https://attacker.example' });

  assert.equal(result.nextCalled, false);
  assert.equal(result.response.statusCode, 403);
  assert.deepEqual(result.response.body, {
    success: false,
    message: 'Request origin is not allowed',
    requestId: 'request-123',
  });
});

test('does not apply origin enforcement to safe methods', () => {
  const middleware = enforceTrustedOrigin(['https://app.example.edu']);
  const result = invoke(middleware, { method: 'GET', origin: 'https://attacker.example' });

  assert.equal(result.nextCalled, true);
});
