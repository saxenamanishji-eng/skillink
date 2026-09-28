import mysql from 'mysql2/promise';
import { createDatabaseConfig } from '../../backend/config/databaseConfig.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const dbConfig = createDatabaseConfig();

const testPassword = process.env.SEED_USER_PASSWORD;
if (!testPassword) {
  throw new Error('Set SEED_USER_PASSWORD to match the local demo seed before running database tests.');
}
if (process.env.NODE_ENV === 'production' || /railway|rlwy/i.test(dbConfig.host) || process.env.RAILWAY_PROJECT_ID) {
  throw new Error('Database tests are disabled against production and Railway databases.');
}
if (process.env.ALLOW_DB_TESTS !== 'true') {
  throw new Error('Set ALLOW_DB_TESTS=true to run the database test suite.');
}

const API_BASE = 'http://localhost:5000/api';

async function runConstraintTests() {
  console.log('===============================================================');
  console.log('🧪 SkillLink Automated Constraint & Business Logic Test Suite');
  console.log('===============================================================');

  let connection;
  let passedCount = 0;
  let totalCount = 0;

  const assertTest = (name, condition, errorDetail = '') => {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${totalCount}. ${name}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${totalCount}. ${name} -> ${errorDetail}`);
    }
  };

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL successfully for constraint assertions.\n');

    // Fetch test users
    const [users] = await connection.query('SELECT id, username, role FROM users');
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    const aliceId = userMap['alice_tech']?.id;
    const bobId = userMap['bob_coder']?.id;
    const charlieId = userMap['charlie_data']?.id;

    // -------------------------------------------------------------
    // TEST 1: Attempt Self-Connection (Database CHECK constraint)
    // -------------------------------------------------------------
    try {
      await connection.query(
        'INSERT INTO connections (requester_id, receiver_id, status) VALUES (?, ?, "pending")',
        [aliceId, aliceId]
      );
      assertTest('Self-connection must fail CHECK constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Self-connection rejected by chk_no_self_connection',
        err.message.includes('chk_no_self_connection') || err.errno === 3819 || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED',
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 2: Duplicate Reverse Connection (STORED pair_key UNIQUE)
    // -------------------------------------------------------------
    // Alice & Bob are already connected in seed. Attempting to insert Bob -> Alice must fail on pair_key UNIQUE
    try {
      await connection.query(
        'INSERT INTO connections (requester_id, receiver_id, status) VALUES (?, ?, "pending")',
        [bobId, aliceId]
      );
      assertTest('Duplicate reverse connection must fail pair_key UNIQUE constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Duplicate reverse connection rejected by pair_key UNIQUE constraint',
        err.message.includes('uq_connection_pair') || err.errno === 1062 || err.code === 'ER_DUP_ENTRY',
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 3: Self-Endorsement (Database CHECK constraint)
    // -------------------------------------------------------------
    try {
      const [skills] = await connection.query('SELECT id FROM skills LIMIT 1');
      await connection.query(
        'INSERT INTO endorsements (from_user_id, to_user_id, skill_id, rating) VALUES (?, ?, ?, 10)',
        [aliceId, aliceId, skills[0].id]
      );
      assertTest('Self-endorsement must fail CHECK constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Self-endorsement rejected by chk_no_self_endorsement',
        err.message.includes('chk_no_self_endorsement') || err.errno === 3819,
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 4: Invalid Endorsement Rating (Rating not between 1 and 10)
    // -------------------------------------------------------------
    try {
      const [skills] = await connection.query('SELECT id FROM skills LIMIT 1');
      await connection.query(
        'INSERT INTO endorsements (from_user_id, to_user_id, skill_id, rating) VALUES (?, ?, ?, 15)',
        [bobId, aliceId, skills[0].id]
      );
      assertTest('Endorsement rating > 10 must fail CHECK constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Invalid endorsement rating rejected by chk_endorsement_rating',
        err.message.includes('chk_endorsement_rating') || err.errno === 3819,
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 5: Self-Booking (Customer cannot book own service)
    // -------------------------------------------------------------
    try {
      const [svc] = await connection.query('SELECT id FROM services WHERE user_skill_id IN (SELECT id FROM user_skills WHERE user_id = ?)', [aliceId]);
      await connection.query(
        `INSERT INTO bookings (service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, price)
         VALUES (?, ?, ?, '2026-12-01', '10:00:00', '11:00:00', 'online', 'pending', 450)`,
        [svc[0].id, aliceId, aliceId]
      );
      assertTest('Self-booking must fail chk_no_self_booking', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Self-booking rejected by chk_no_self_booking',
        err.message.includes('chk_no_self_booking') || err.errno === 3819,
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 6: Invalid Time Range (end_time <= start_time)
    // -------------------------------------------------------------
    try {
      const [svc] = await connection.query('SELECT id FROM services WHERE user_skill_id IN (SELECT id FROM user_skills WHERE user_id = ?)', [aliceId]);
      await connection.query(
        `INSERT INTO bookings (service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, price)
         VALUES (?, ?, ?, '2026-12-01', '16:00:00', '15:00:00', 'online', 'pending', 450)`,
        [svc[0].id, bobId, aliceId]
      );
      assertTest('Invalid booking time order (16:00 to 15:00) must fail CHECK constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Invalid time order rejected by chk_booking_time_order',
        err.message.includes('chk_booking_time_order') || err.errno === 3819,
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Review Rating Range (Rating not between 1 and 5)
    // -------------------------------------------------------------
    try {
      const [bk] = await connection.query('SELECT id FROM bookings LIMIT 1');
      await connection.query(
        'INSERT INTO reviews (booking_id, reviewer_id, provider_id, rating, comment) VALUES (?, ?, ?, 6, "Invalid")',
        [bk[0].id, bobId, aliceId]
      );
      assertTest('Review rating > 5 must fail CHECK constraint', false, 'Insert succeeded unexpectedly');
    } catch (err) {
      assertTest(
        'Review rating out-of-range rejected by chk_review_rating',
        err.message.includes('chk_review_rating') || err.errno === 3819,
        err.message
      );
    }

    // -------------------------------------------------------------
    // TEST 8: HTTP API Business Logic: Non-Admin blocked from /api/admin/*
    // -------------------------------------------------------------
    try {
      // Login as normal user Bob
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'bob_coder', password: testPassword })
      });
      const loginData = await loginRes.json();
      const token = loginData.token;

      // Try hitting admin dashboard
      const adminRes = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      assertTest(
        'Non-admin user blocked from /api/admin/dashboard (HTTP 403)',
        adminRes.status === 403
      );
    } catch (err) {
      assertTest('Non-admin check error', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 9: HTTP API Business Logic: Live status re-check on suspended user
    // -------------------------------------------------------------
    try {
      // 1. Register a temporary user
      const tempUsername = `temp_${Date.now()}`;
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: tempUsername,
          full_name: 'Temporary User',
          email: `${tempUsername}@skilllink.edu`,
          password: testPassword
        })
      });
      const regData = await regRes.json();
      const validToken = regData.token;
      const tempId = regData.user.id;

      // 2. Token works initially
      const meRes1 = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });
      const meData1 = await meRes1.json();
      const initialAuthSuccess = meRes1.status === 200 && meData1.success;

      // 3. Admin suspends user in database
      await connection.query('UPDATE users SET status = "suspended" WHERE id = ?', [tempId]);

      // 4. Token immediately fails on next request due to live DB re-check
      const meRes2 = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${validToken}` }
      });

      assertTest(
        'Live DB status re-check: Suspended user token immediately rejected with HTTP 403',
        initialAuthSuccess && meRes2.status === 403
      );

      // Clean up temp user
      await connection.query('DELETE FROM users WHERE id = ?', [tempId]);
    } catch (err) {
      assertTest('Live status check error', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 10: Double-Booking Overlap Prevention Transaction (Section 8)
    // -------------------------------------------------------------
    try {
      // Login as Alice (Provider) and Charlie (Customer)
      const aliceLogin = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'alice_tech', password: testPassword })
      });
      const charlieLogin = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'charlie_data', password: testPassword })
      });
      const charlieToken = (await charlieLogin.json()).token;

      // Get Alice's service
      const [svcRows] = await connection.query(
        'SELECT id FROM services WHERE user_skill_id IN (SELECT id FROM user_skills WHERE user_id = ?) LIMIT 1',
        [aliceId]
      );
      const serviceId = svcRows[0].id;

      const testDate = '2026-11-20';
      const slotStart = '14:00';
      const slotEnd = '15:00';

      // First booking creation
      const bookRes1 = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${charlieToken}`
        },
        body: JSON.stringify({
          service_id: serviceId,
          booking_date: testDate,
          start_time: slotStart,
          end_time: slotEnd,
          mode: 'online',
          notes: 'First booking test'
        })
      });
      const bookData1 = await bookRes1.json();
      const firstBookingId = bookData1.bookingId;

      // Confirm first booking in DB
      await connection.query('UPDATE bookings SET status = "confirmed" WHERE id = ?', [firstBookingId]);

      // Attempt second overlapping booking creation (14:30 to 15:30)
      const bookRes2 = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${charlieToken}`
        },
        body: JSON.stringify({
          service_id: serviceId,
          booking_date: testDate,
          start_time: '14:30',
          end_time: '15:30',
          mode: 'online',
          notes: 'Colliding overlapping booking'
        })
      });

      assertTest(
        'Double-booking collision rejected with HTTP 409 Conflict',
        bookRes2.status === 409
      );

      // Clean up test bookings
      await connection.query('DELETE FROM bookings WHERE id = ?', [firstBookingId]);
    } catch (err) {
      assertTest('Double-booking test error', false, err.message);
    }

    console.log('\n===============================================================');
    console.log(`Test Execution Summary: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount/totalCount)*100)}%)`);
    console.log('===============================================================');

  } catch (error) {
    console.error('Test suite runner failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

runConstraintTests();
