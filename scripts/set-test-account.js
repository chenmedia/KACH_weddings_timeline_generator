// One-off admin script: create or update the manual-QA/test user in Clerk.
//
// Clerk users live in Clerk's own store (not our Postgres), so this talks to the
// Clerk Backend API. Run it locally with a Clerk SECRET key (never the
// publishable key):
//
//   CLERK_SECRET_KEY=sk_live_... npm run test-account
//   # or override the defaults:
//   CLERK_SECRET_KEY=sk_live_... TEST_EMAIL=qa@example.com TEST_PASSWORD='…' npm run test-account
//
// Defaults: test@test.com / test123test123.
//
// Notes:
//  - `skip_password_checks` bypasses Clerk's breached/weak-password rejection so
//    simple QA passwords are accepted.
//  - This only sets the email + password. If the instance enforces new-device /
//    sign-in verification (an emailed code), a non-deliverable address like
//    test@test.com can never receive that code — disable verification in the
//    Clerk Dashboard, or use a real mailbox, for the test login to complete.
import process from 'node:process';

const API = 'https://api.clerk.com/v1';
const SECRET = process.env.CLERK_SECRET_KEY;
const EMAIL = process.env.TEST_EMAIL || 'test@test.com';
const PASSWORD = process.env.TEST_PASSWORD || 'test123test123';

if (!SECRET) {
  console.error('CLERK_SECRET_KEY is not set.');
  console.error('Run: CLERK_SECRET_KEY=sk_... npm run test-account');
  process.exit(1);
}
if (!SECRET.startsWith('sk_')) {
  console.error('CLERK_SECRET_KEY does not look like a Clerk secret key (expected sk_...).');
  process.exit(1);
}

async function clerk(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body?.errors)
      ? body.errors.map((e) => e.long_message || e.message).join('; ')
      : res.statusText;
    throw new Error(`Clerk ${init.method || 'GET'} ${path} -> ${res.status}: ${detail}`);
  }
  return body;
}

async function main() {
  console.log(`Looking up ${EMAIL} ...`);
  const found = await clerk(`/users?email_address[]=${encodeURIComponent(EMAIL)}`);
  const existing = Array.isArray(found) ? found[0] : null;

  if (existing) {
    console.log(`Found user ${existing.id} — updating password.`);
    await clerk(`/users/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: PASSWORD, skip_password_checks: true }),
    });
    console.log('✓ Password updated.');
  } else {
    console.log('No existing user — creating one.');
    const created = await clerk('/users', {
      method: 'POST',
      body: JSON.stringify({
        email_address: [EMAIL],
        password: PASSWORD,
        skip_password_checks: true,
      }),
    });
    console.log(`✓ Created user ${created.id}.`);
  }

  console.log(`\nTest login ready: ${EMAIL} / ${PASSWORD}`);
  console.log('If sign-in still asks for an emailed code (new-device verification),');
  console.log('disable it in the Clerk Dashboard, or use a deliverable mailbox.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
