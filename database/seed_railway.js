import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createDatabaseConfig } from '../backend/config/databaseConfig.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const dbConfig = createDatabaseConfig();

function assertSafeDemoSeed() {
  const host = dbConfig.host.toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production'
    || process.env.RAILWAY_ENVIRONMENT
    || process.env.RAILWAY_PROJECT_ID
    || /railway|rlwy/i.test(host);
  if (isProduction) {
    throw new Error('Demo seeding is disabled for production and Railway databases.');
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('Set ALLOW_DESTRUCTIVE_SEED=true to explicitly reset a local development database.');
  }
}

async function seedDatabase() {
  console.log('Starting SkillLink local demo database seeding...');
  let connection;

  try {
    assertSafeDemoSeed();
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to Railway MySQL. Clearing existing demo data...');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'admin_audit_logs', 'helpdesk_attachments', 'helpdesk_messages', 'helpdesk_tickets',
      'helpdesk_categories', 'help_articles', 'reports', 'complaints', 'reviews',
      'bookings', 'availability', 'services', 'notifications', 'endorsements',
      'blocks', 'connections', 'external_profiles', 'user_skills', 'skills',
      'password_reset_tokens', 'user_private', 'users'
    ];

    for (const t of tables) {
      await connection.query(`TRUNCATE TABLE ${t}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Inserting seed users on Railway...');
    const salt = await bcrypt.genSalt(10);
    const seedPassword = process.env.SEED_USER_PASSWORD;
    if (!seedPassword) throw new Error('Set SEED_USER_PASSWORD for local demo accounts.');
    const commonHash = await bcrypt.hash(seedPassword, salt);

    const users = [
      {
        username: 'admin_user',
        full_name: 'Platform Administrator',
        email: 'admin@skilllink.edu',
        password_hash: commonHash,
        college: 'SkillLink Central Institute',
        branch: 'Computer Science & Engineering',
        graduation_year: 2024,
        bio: 'Chief System Administrator for SkillLink academic & networking platform.',
        location: 'Bengaluru, India',
        role: 'admin',
        status: 'active',
        phone: '+91-9876543210'
      },
      {
        username: 'alice_tech',
        full_name: 'Alice Sharma',
        email: 'alice@skilllink.edu',
        password_hash: commonHash,
        college: 'Delhi Technological University',
        branch: 'Computer Engineering',
        graduation_year: 2025,
        bio: 'Full Stack React & Node.js Developer passionate about peer mentoring and clean architecture.',
        location: 'New Delhi, India',
        role: 'user',
        status: 'active',
        phone: '+91-9876543211'
      },
      {
        username: 'bob_coder',
        full_name: 'Bob Verma',
        email: 'bob@skilllink.edu',
        password_hash: commonHash,
        college: 'Delhi Technological University',
        branch: 'Information Technology',
        graduation_year: 2025,
        bio: 'Competitive programmer and backend enthusiast exploring DBMS and distributed caching.',
        location: 'New Delhi, India',
        role: 'user',
        status: 'active',
        phone: '+91-9876543212'
      },
      {
        username: 'charlie_data',
        full_name: 'Charlie Patel',
        email: 'charlie@skilllink.edu',
        password_hash: commonHash,
        college: 'IIT Bombay',
        branch: 'Electrical & Data Science',
        graduation_year: 2026,
        bio: 'Data scientist focused on Python, SQL query optimization, and applied ML.',
        location: 'Mumbai, India',
        role: 'user',
        status: 'active',
        phone: '+91-9876543213'
      },
      {
        username: 'diana_design',
        full_name: 'Diana Roy',
        email: 'diana@skilllink.edu',
        password_hash: commonHash,
        college: 'NID Ahmedabad',
        branch: 'Interaction Design',
        graduation_year: 2025,
        bio: 'Product & UI/UX designer crafting intuitive digital experiences and design systems.',
        location: 'Ahmedabad, India',
        role: 'user',
        status: 'active',
        phone: '+91-9876543214'
      }
    ];

    const userMap = {};
    for (const u of users) {
      const [res] = await connection.query(
        `INSERT INTO users (username, full_name, email, password_hash, college, branch, graduation_year, bio, location, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.username, u.full_name, u.email, u.password_hash, u.college, u.branch, u.graduation_year, u.bio, u.location, u.role, u.status]
      );
      userMap[u.username] = res.insertId;

      await connection.query(
        `INSERT INTO user_private (user_id, phone) VALUES (?, ?)`,
        [res.insertId, u.phone]
      );
    }

    console.log('Inserting master skills...');
    const skills = [
      { name: 'React Development', category: 'Web Development', description: 'Building responsive, component-driven client applications with React and Vite.' },
      { name: 'Node.js & Express', category: 'Backend Development', description: 'RESTful API construction, middleware pipelines, and JWT session handling.' },
      { name: 'MySQL & Database Design', category: 'Databases', description: 'Relational schema design, normalization up to 3NF, indexing, and ACID transactions.' },
      { name: 'Python & Data Analysis', category: 'Data Science', description: 'Pandas, NumPy, and SQL data extraction pipelines for analytical queries.' },
      { name: 'UI/UX Interface Design', category: 'Design', description: 'User flows, wireframing, component tokens, and accessible Figma mockups.' },
      { name: 'DSA & Algorithms', category: 'Computer Science', description: 'Data structures, time complexity optimization, and problem solving.' },
      { name: 'System Architecture', category: 'Engineering', description: 'Microservices vs Monolith trade-offs, caching, and database replication.' }
    ];

    const skillMap = {};
    for (const s of skills) {
      const [res] = await connection.query(
        `INSERT INTO skills (name, category, description) VALUES (?, ?, ?)`,
        [s.name, s.category, s.description]
      );
      skillMap[s.name] = res.insertId;
    }

    console.log('Assigning skills to users...');
    const userSkills = [
      { username: 'alice_tech', skillName: 'React Development', proficiency: 9 },
      { username: 'alice_tech', skillName: 'Node.js & Express', proficiency: 8 },
      { username: 'alice_tech', skillName: 'MySQL & Database Design', proficiency: 8 },
      { username: 'bob_coder', skillName: 'DSA & Algorithms', proficiency: 9 },
      { username: 'bob_coder', skillName: 'MySQL & Database Design', proficiency: 7 },
      { username: 'bob_coder', skillName: 'Node.js & Express', proficiency: 7 },
      { username: 'charlie_data', skillName: 'Python & Data Analysis', proficiency: 10 },
      { username: 'charlie_data', skillName: 'MySQL & Database Design', proficiency: 9 },
      { username: 'diana_design', skillName: 'UI/UX Interface Design', proficiency: 10 },
      { username: 'diana_design', skillName: 'React Development', proficiency: 6 }
    ];

    const userSkillMap = {};
    for (const us of userSkills) {
      const uId = userMap[us.username];
      const sId = skillMap[us.skillName];
      const [res] = await connection.query(
        `INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)`,
        [uId, sId, us.proficiency]
      );
      userSkillMap[`${us.username}_${us.skillName}`] = res.insertId;
    }

    console.log('Adding external profiles...');
    await connection.query(
      `INSERT INTO external_profiles (user_id, platform, username, profile_url) VALUES
       (?, 'github', 'alice-sharma-dev', 'https://github.com/alice-sharma-dev'),
       (?, 'linkedin', 'alicesharma', 'https://linkedin.com/in/alicesharma'),
       (?, 'github', 'bob-verma-code', 'https://github.com/bob-verma-code'),
       (?, 'github', 'charlie-patel-data', 'https://github.com/charlie-patel-data'),
       (?, 'portfolio', 'dianadesign.me', 'https://dianaroy.design')`,
      [userMap['alice_tech'], userMap['alice_tech'], userMap['bob_coder'], userMap['charlie_data'], userMap['diana_design']]
    );

    console.log('Creating initial connections...');
    await connection.query(
      `INSERT INTO connections (requester_id, receiver_id, status, where_we_met) VALUES (?, ?, 'accepted', 'DTU Hackathon 2024')`,
      [userMap['alice_tech'], userMap['bob_coder']]
    );
    await connection.query(
      `INSERT INTO connections (requester_id, receiver_id, status, where_we_met) VALUES (?, ?, 'accepted', 'Smart India Hackathon Finalist Group')`,
      [userMap['bob_coder'], userMap['charlie_data']]
    );
    await connection.query(
      `INSERT INTO connections (requester_id, receiver_id, status, where_we_met) VALUES (?, ?, 'pending', 'Women in Tech Delhi Meetup')`,
      [userMap['diana_design'], userMap['alice_tech']]
    );

    console.log('Adding endorsements...');
    await connection.query(
      `INSERT INTO endorsements (from_user_id, to_user_id, skill_id, rating, message) VALUES (?, ?, ?, 10, 'Outstanding React developer and architect. Built frontend in record time during Hackathon!')`,
      [userMap['bob_coder'], userMap['alice_tech'], skillMap['React Development']]
    );
    await connection.query(
      `INSERT INTO endorsements (from_user_id, to_user_id, skill_id, rating, message) VALUES (?, ?, ?, 9, 'Brilliant algorithm problem solver and competitive coder.')`,
      [userMap['alice_tech'], userMap['bob_coder'], skillMap['DSA & Algorithms']]
    );

    console.log('Creating bookable services...');
    const [svc1] = await connection.query(
      `INSERT INTO services (user_skill_id, category, title, description, pricing_type, price, currency, duration_minutes, online_available, in_person_available, is_active)
       VALUES (?, 'Tutoring', '1-on-1 React & Vite Architecture Mentoring', 'Comprehensive session covering component lifecycles, hooks, context API, and routing setup.', 'hourly', 450.00, 'INR', 60, TRUE, TRUE, TRUE)`,
      [userSkillMap['alice_tech_React Development']]
    );
    const [svc2] = await connection.query(
      `INSERT INTO services (user_skill_id, category, title, description, pricing_type, price, currency, duration_minutes, online_available, in_person_available, is_active)
       VALUES (?, 'Design', 'App & Web UI/UX Review and Wireframing', 'Heuristic review of your interface, typography consistency, and Figma design tokens advice.', 'per_session', 800.00, 'INR', 90, TRUE, FALSE, TRUE)`,
      [userSkillMap['diana_design_UI/UX Interface Design']]
    );
    const [svc3] = await connection.query(
      `INSERT INTO services (user_skill_id, category, title, description, pricing_type, price, currency, duration_minutes, online_available, in_person_available, is_active)
       VALUES (?, 'Consulting', 'MySQL Query & Schema Optimization Consulting', 'Deep-dive analysis of EXPLAIN execution plans, index tuning, and normalization advice.', 'hourly', 600.00, 'INR', 60, TRUE, FALSE, TRUE)`,
      [userSkillMap['charlie_data_MySQL & Database Design']]
    );

    console.log('Setting availability schedules...');
    await connection.query(
      `INSERT INTO availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
       (?, 1, '14:00:00', '18:00:00', TRUE),
       (?, 3, '14:00:00', '18:00:00', TRUE),
       (?, 5, '14:00:00', '18:00:00', TRUE)`,
      [userMap['alice_tech'], userMap['alice_tech'], userMap['alice_tech']]
    );
    await connection.query(
      `INSERT INTO availability (provider_id, day_of_week, start_time, end_time, is_available) VALUES
       (?, 6, '10:00:00', '16:00:00', TRUE),
       (?, 0, '10:00:00', '16:00:00', TRUE)`,
      [userMap['charlie_data'], userMap['charlie_data']]
    );

    console.log('Creating sample bookings and reviews...');
    const [bk1] = await connection.query(
      `INSERT INTO bookings (service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, notes, price, currency, responded_at, completed_at)
       VALUES (?, ?, ?, '2026-03-15', '14:00:00', '15:00:00', 'online', 'completed', 'Help understanding React context and custom hooks.', 450.00, 'INR', '2026-03-14 10:00:00', '2026-03-15 15:30:00')`,
      [svc1.insertId, userMap['bob_coder'], userMap['alice_tech']]
    );
    await connection.query(
      `INSERT INTO reviews (booking_id, reviewer_id, provider_id, rating, comment)
       VALUES (?, ?, ?, 5, 'Exceptional mentor! Alice broke down state management concepts so clearly. Highly recommend for any BTech student.')`,
      [bk1.insertId, userMap['bob_coder'], userMap['alice_tech']]
    );

    await connection.query(
      `INSERT INTO bookings (service_id, customer_id, provider_id, booking_date, start_time, end_time, mode, status, notes, price, currency, responded_at)
       VALUES (?, ?, ?, '2026-10-12', '16:00:00', '17:00:00', 'online', 'confirmed', 'Reviewing front-end dashboard components integration.', 450.00, 'INR', NOW())`,
      [svc1.insertId, userMap['charlie_data'], userMap['alice_tech']]
    );

    console.log('Seeding Helpdesk Categories...');
    const helpdeskCategories = [
      { name: 'Account & Authentication', description: 'Login, registration, password resets, and session security' },
      { name: 'Profile & Privacy', description: 'Profile information, visibility settings, and bio editing' },
      { name: 'Skills & Endorsements', description: 'Adding skills, proficiency ratings, and peer recognitions' },
      { name: 'Connections & Networking', description: 'Peer networking, discovering campus talent, and connection requests' },
      { name: 'Services & Availability', description: 'Creating service listings, setting weekly availability, and hourly rates' },
      { name: 'Bookings & Cash Terms', description: 'Requesting bookings, double-booking prevention, and completion workflow' },
      { name: 'Reviews & Ratings', description: 'Leaving star ratings and feedback for completed bookings' },
      { name: 'Complaints & Reports', description: 'Filing complaints and reporting policy violations' },
      { name: 'Technical Issues', description: 'Bug reports, UI glitches, and database connectivity inquiries' },
      { name: 'Other Support', description: 'General feedback and non-listed queries' }
    ];

    const categoryMap = {};
    for (const c of helpdeskCategories) {
      const [res] = await connection.query(
        `INSERT INTO helpdesk_categories (name, description) VALUES (?, ?)`,
        [c.name, c.description]
      );
      categoryMap[c.name] = res.insertId;
    }

    console.log('Seeding Help Articles (Knowledge Base)...');
    const articles = [
      {
        title: 'How to Add Skills and Set Proficiency Levels',
        slug: 'how-to-add-skills-proficiency',
        category: 'Skills',
        content: `### Adding Skills to Your SkillLink Profile\n\n1. Navigate to **My Profile** or **Skills** from the sidebar.\n2. Click on the **Add Skill** button.\n3. Search from the standardized directory of skills or type a new skill name.\n4. Select your **Proficiency Level** on a scale from 1 (Novice) to 10 (Master/Expert).\n5. Click **Save Skill**.\n\n*Tip:* Your skills become eligible for peer endorsements from connected peers and can be turned into bookable services!`
      },
      {
        title: 'Connecting and Networking with Campus Peers',
        slug: 'connecting-and-networking-with-peers',
        category: 'Connections',
        content: `### How Peer Networking Works in SkillLink\n\nSkillLink helps students and campus professionals discover talent, collaborate on projects, and build professional networks.\n\n#### Discovering Peers:\n- Open **Discover Peers** from the navigation menu.\n- Search by name, skill category, or proficiency level.\n- Click on any peer card to view their verified skills, offerings, and ratings.\n\n#### Connecting & Sending Requests:\n- On a peer's public profile, click **Connect**.\n- Optionally add a note on where you met or why you'd like to connect.\n- Once accepted, peers can leave mutual skill endorsements and book sessions.`
      },
      {
        title: 'Booking a Skill-Based Service & Understanding Cash-Only Payment',
        slug: 'booking-service-cash-payment-terms',
        category: 'Bookings',
        content: `### Booking Peer Services on SkillLink\n\nSkillLink allows students and professionals to offer peer mentoring, consulting, and project reviews.\n\n#### Step-by-Step Booking:\n1. Search for providers in **Discover** or browse the **Services** catalog.\n2. Select a service and click **Book Session**.\n3. Choose an available time slot within the provider\'s active schedule.\n4. Add any context notes and submit your request.\n\n#### Cash-Only Payment Notice:\n**SkillLink does not process digital payments.** All agreed service prices are paid directly between the customer and provider in cash or agreed personal peer transfer outside the app.`
      },
      {
        title: 'How to Cancel or Reschedule a Booking Request',
        slug: 'cancelling-rescheduling-bookings',
        category: 'Bookings',
        content: `### Managing Your Bookings\n\n- **Pending Requests:** Either the customer or the provider may cancel a pending booking request at any time prior to confirmation.\n- **Confirmed Bookings:** If an unexpected conflict arises, either party may mark the booking as **Cancelled** with an optional reason note.\n- **Double-Booking Protection:** Our database utilizes strict index-range locking and transaction isolation to ensure no provider is booked twice for the same time window.`
      },
      {
        title: 'Configuring Your Weekly Availability Windows',
        slug: 'configuring-weekly-availability-schedule',
        category: 'Availability',
        content: `### Setting Up Your Booking Schedule\n\nProviders can specify exact time windows for each day of the week (Sunday=0 to Saturday=6):\n1. Go to **Availability** in the dashboard.\n2. Select day of week, start time, and end time (e.g. Monday 14:00 to 18:00).\n3. Click **Add Availability Slot**.\n4. The database enforces that \`end_time > start_time\` and prevents overlapping availability windows.`
      },
      {
        title: 'Submitting a Complaint vs Reporting Content vs Filing a Helpdesk Ticket',
        slug: 'support-systems-helpdesk-complaints-reports',
        category: 'Support',
        content: `### When to Use Which Support Channel:\n\n- **Helpdesk:** Use for platform assistance ("I need help using SkillLink" — how to add skills, reset password, change schedule).\n- **Complaint:** Use when you have a specific dispute or issue requiring formal admin investigation ("I have a problem or issue with a booking, provider, or review").\n- **Report:** Use to flag policy violations ("This content violates platform terms" — spam, harassment, fake profiles, inappropriate listings).`
      }
    ];

    for (const a of articles) {
      await connection.query(
        `INSERT INTO help_articles (title, slug, category, content, status, author_id, published_at)
         VALUES (?, ?, ?, ?, 'published', ?, NOW())`,
        [a.title, a.slug, a.category, a.content, userMap['admin_user']]
      );
    }

    console.log('Seeding Sample Helpdesk Ticket & Message...');
    const [tkt] = await connection.query(
      `INSERT INTO helpdesk_tickets (user_id, category_id, subject, description, status, priority, assigned_admin_id)
       VALUES (?, ?, 'Query regarding Connecting with Campus Peers', 'I would like to know how to connect with students from other departments.', 'in_progress', 'normal', ?)`,
      [userMap['bob_coder'], categoryMap['Connections & Networking'], userMap['admin_user']]
    );

    await connection.query(
      `INSERT INTO helpdesk_messages (ticket_id, sender_id, message) VALUES
       (?, ?, 'Hello Bob, you can browse all students across departments via the Discover page and send connection requests directly from their profiles.'),
       (?, ?, 'Understood, thank you! The search filter by department worked perfectly.')`,
      [tkt.insertId, userMap['admin_user'], tkt.insertId, userMap['bob_coder']]
    );

    console.log('Seeding Sample Notification...');
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id, related_entity_type, related_entity_id, is_read)
       VALUES (?, 'endorsement_received', 'New Skill Endorsement!', 'Bob Verma recognized your proficiency in React Development.', ?, 'endorsement', 1, FALSE)`,
      [userMap['alice_tech'], userMap['bob_coder']]
    );

    console.log('Seeding Admin Audit Log...');
    await connection.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, reason, old_data, new_data)
       VALUES (?, 'system_init_seed', 'system', 1, 'Initial platform seed dataset deployed successfully.', JSON_OBJECT('status', 'empty'), JSON_OBJECT('status', 'seeded'))`,
      [userMap['admin_user']]
    );

    console.log('Railway MySQL database seeded successfully with all 22 tables and demo records!');
  } catch (error) {
    console.error('Database seeding failed with error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
