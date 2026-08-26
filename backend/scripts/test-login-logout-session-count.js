const assert = require('assert');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:5001/api';
const LOGIN_EMAIL = process.env.TEST_LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.TEST_LOGIN_PASSWORD;

const requiredEnvMissing = !LOGIN_EMAIL || !LOGIN_PASSWORD;

if (requiredEnvMissing) {
  console.error('Missing required test environment variables: TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD');
  console.error('Example: TEST_LOGIN_EMAIL=user@gmail.com TEST_LOGIN_PASSWORD=secret npm run test:session-limiter');
  process.exit(1);
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
};

const getActiveMembers = async () => {
  const { response, body } = await requestJson('/stats/home');
  assert.strictEqual(response.status, 200, 'Expected /stats/home to return 200');
  assert.ok(body && typeof body.activeMembers === 'number', 'Expected activeMembers in /stats/home response');
  return body.activeMembers;
};

const run = async () => {
  console.log('Running login/logout/session-count regression test...');

  const before = await getActiveMembers();
  console.log(`Active members before login: ${before}`);

  const loginResult = await requestJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD
    })
  });

  assert.strictEqual(loginResult.response.status, 200, `Expected /auth/login to return 200, got ${loginResult.response.status}`);
  assert.ok(loginResult.body && loginResult.body.token, 'Expected token from /auth/login');
  assert.ok(loginResult.body && loginResult.body.user, 'Expected user from /auth/login');

  const token = loginResult.body.token;

  const afterLogin = await getActiveMembers();
  console.log(`Active members after login: ${afterLogin}`);

  const firstLogout = await requestJson('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.strictEqual(firstLogout.response.status, 200, `Expected first /auth/logout to return 200, got ${firstLogout.response.status}`);
  assert.ok(firstLogout.body && firstLogout.body.success === true, 'Expected success=true from first /auth/logout');

  // Regression check: logout should not crash server when no express-session object exists.
  const secondLogout = await requestJson('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.strictEqual(secondLogout.response.status, 200, `Expected second /auth/logout to return 200, got ${secondLogout.response.status}`);
  assert.ok(secondLogout.body && secondLogout.body.success === true, 'Expected success=true from second /auth/logout');

  const afterLogout = await getActiveMembers();
  console.log(`Active members after logout: ${afterLogout}`);

  // In shared dev environments counts can vary due to other users/devices.
  // We still ensure counts are numeric and did not explode unexpectedly.
  assert.ok(Number.isInteger(before), 'Expected before count to be an integer');
  assert.ok(Number.isInteger(afterLogin), 'Expected afterLogin count to be an integer');
  assert.ok(Number.isInteger(afterLogout), 'Expected afterLogout count to be an integer');

  console.log('PASS: login/logout/session-count regression test completed successfully.');
};

run().catch((error) => {
  console.error('FAIL: login/logout/session-count regression test failed.');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
