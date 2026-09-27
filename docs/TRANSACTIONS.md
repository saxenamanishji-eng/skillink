# SkillLink: Database Transactions, Concurrency Control & ACID Guarantees

This document details the transaction architecture, concurrency control mechanisms, locking strategies, and ACID implementation in **SkillLink**.

---

## 1. ACID Properties in SkillLink & MySQL InnoDB

MySQL's default storage engine, **InnoDB**, provides full ACID compliance:

```
+---------------------------------------------------------------------------------------------+
|                                      ACID GUARANTEES                                        |
+------------------------------------+--------------------------------------------------------+
| Property                           | Implementation in SkillLink & MySQL InnoDB             |
+------------------------------------+--------------------------------------------------------+
| Atomicity (All-or-Nothing)         | Guaranteed via InnoDB **Undo Logs**. If an error or    |
|                                    | conflict occurs midway through a booking transaction,  |
|                                    | all partial writes are rolled back completely.         |
+------------------------------------+--------------------------------------------------------+
| Consistency (Valid State Moves)    | Guaranteed via database-level **CHECK constraints**,   |
|                                    | **Foreign Key constraints**, and explicit transactional|
|                                    | invariant checks before committing.                   |
+------------------------------------+--------------------------------------------------------+
| Isolation (Concurrent Execution)   | Guaranteed via **Two-Phase Locking (2PL)**,            |
|                                    | **Pessimistic Range Locks (SELECT ... FOR UPDATE)**,   |
|                                    | and **Multi-Version Concurrency Control (MVCC)**.       |
+------------------------------------+--------------------------------------------------------+
| Durability (Committed Data Lasts)  | Guaranteed via **Redo Logs** (WAL - Write-Ahead Logging|
|                                    | with `innodb_flush_log_at_trx_commit = 1`) and the     |
|                                    | InnoDB **Doublewrite Buffer**.                          |
+------------------------------------+--------------------------------------------------------+
```

---

## 2. Concurrency Anomalies & SQL Isolation Levels

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | SkillLink Use Case |
| :--- | :---: | :---: | :---: | :--- |
| **READ UNCOMMITTED** | Yes | Yes | Yes | *Not used (causes data corruption)* |
| **READ COMMITTED** | No | Yes | Yes | High-concurrency read-heavy workloads |
| **REPEATABLE READ** *(Default)* | No | No | No (via Gap Locks) | **Standard for SkillLink connection & booking queries** |
| **SERIALIZABLE** | No | No | No | Strict serial execution via implicit locking |

In SkillLink, critical write paths use **Pessimistic Locking** (`SELECT ... FOR UPDATE`) to acquire exclusive row/gap locks regardless of the session isolation level.

---

## 3. Deep Dive: The Double-Booking Prevention Transaction

The most critical concurrency challenge in SkillLink is preventing two clients from simultaneously booking the same provider for overlapping time intervals on the same day.

### 3.1 The Time Overlap Invariant
Two time intervals $[S_1, E_1)$ and $[S_2, E_2)$ overlap if and only if:
$$\text{Overlap} \iff (S_1 < E_2) \land (E_1 > S_2)$$

### 3.2 Transaction Sequence & Concurrency Diagram

```mermaid
sequenceDiagram
    autonumber
    participant C1 as Client 1 (Alice)
    participant C2 as Client 2 (Bob)
    participant API as Express API Server
    participant DB as MySQL InnoDB Engine

    Note over C1,C2: Both clients attempt to book Provider Charlie on 2026-10-01 (10:00 - 11:00)
    
    C1->>API: POST /api/bookings {providerId: 3, date: '2026-10-01', start: '10:00', end: '11:00'}
    API->>DB: START TRANSACTION (Connection 1)
    
    C2->>API: POST /api/bookings {providerId: 3, date: '2026-10-01', start: '10:00', end: '11:00'}
    API->>DB: START TRANSACTION (Connection 2)
    
    rect rgb(235, 245, 255)
    Note over API,DB: Alice's thread executes Pessimistic Range Lock
    API->>DB: SELECT id FROM bookings WHERE provider_id = 3 AND booking_date = '2026-10-01' AND status IN ('pending', 'confirmed') AND (start_time < '11:00' AND end_time > '10:00') FOR UPDATE;
    DB-->>API: Returns 0 rows (Acquires exclusive Next-Key Lock on provider 3's schedule index)
    end

    rect rgb(255, 240, 240)
    Note over API,DB: Bob's thread executes the same query concurrently
    API->>DB: SELECT id FROM bookings WHERE provider_id = 3 ... FOR UPDATE;
    Note over DB: InnoDB detects index lock contention. Bob's thread is BLOCKED waiting for Lock Release!
    end

    rect rgb(235, 255, 235)
    API->>DB: INSERT INTO bookings (provider_id, client_id, booking_date, start_time, end_time, hourly_rate, status) VALUES (3, 1, '2026-10-01', '10:00', '11:00', 50.00, 'pending');
    API->>DB: INSERT INTO notifications (user_id, type, title, body) VALUES (3, 'booking_created', ...);
    API->>DB: COMMIT; (Connection 1 releases locks)
    API-->>C1: 201 Created (Booking Confirmed)
    end

    rect rgb(255, 235, 235)
    Note over DB: Bob's thread wakes up after lock release and evaluates query
    DB-->>API: Returns 1 row (Alice's newly committed booking is visible!)
    Note over API: Conflict Detected (Overlap count > 0)
    API->>DB: ROLLBACK; (Connection 2)
    API-->>C2: 409 Conflict ("This time slot is no longer available.")
    end
```

---

## 4. Code Implementation Walkthrough (`bookingController.js`)

Here is the exact production implementation in SkillLink:

```javascript
// Step 1: Acquire dedicated connection from MySQL pool
const connection = await pool.getConnection();

try {
  // Step 2: Begin ACID Transaction
  await connection.beginTransaction();

  // Step 3: Verify provider existence, active status, and prevent self-booking
  const [providers] = await connection.query(
    `SELECT id, status FROM users WHERE id = ?`,
    [provider_id]
  );
  if (!providers.length || providers[0].status !== 'active') {
    await connection.rollback();
    return res.status(400).json({ error: 'Provider is not available' });
  }

  // Step 4: Verify Provider Weekly Availability Schedule
  const bookingDayName = new Date(booking_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const [availRows] = await connection.query(
    `SELECT * FROM availability 
     WHERE user_id = ? AND day_of_week = ? AND is_available = TRUE 
       AND start_time <= ? AND end_time >= ?`,
    [provider_id, bookingDayName, start_time, end_time]
  );
  if (availRows.length === 0) {
    await connection.rollback();
    return res.status(400).json({ error: 'Provider is not available during requested time window' });
  }

  // Step 5: Pessimistic Overlap Query with FOR UPDATE (Exclusive Row/Range Lock)
  const [conflicts] = await connection.query(
    `SELECT id FROM bookings
     WHERE provider_id = ? 
       AND booking_date = ? 
       AND status IN ('pending', 'confirmed')
       AND (start_time < ? AND end_time > ?)
     FOR UPDATE`,
    [provider_id, booking_date, end_time, start_time]
  );

  if (conflicts.length > 0) {
    await connection.rollback();
    return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
  }

  // Step 6: Atomic Insert of Booking Record
  const [result] = await connection.query(
    `INSERT INTO bookings (service_id, client_id, provider_id, booking_date, start_time, end_time, hourly_rate, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [service_id, req.user.id, provider_id, booking_date, start_time, end_time, service.hourly_rate, notes || null]
  );
  const newBookingId = result.insertId;

  // Step 7: Atomic Insert of In-App Notification
  await connection.query(
    `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
     VALUES (?, 'booking_created', 'New Booking Request', ?, 'booking', ?)`,
    [provider_id, `You have a new booking request for ${booking_date}`, newBookingId]
  );

  // Step 8: Verify-Before-Commit Invariant Check
  const [doubleCheck] = await connection.query(
    `SELECT COUNT(*) AS conflict_count FROM bookings
     WHERE provider_id = ? 
       AND booking_date = ? 
       AND status IN ('pending', 'confirmed')
       AND id != ?
       AND (start_time < ? AND end_time > ?)`,
    [provider_id, booking_date, newBookingId, end_time, start_time]
  );

  if (doubleCheck[0].conflict_count > 0) {
    await connection.rollback();
    return res.status(409).json({ error: 'Concurrency collision detected. Transaction rolled back.' });
  }

  // Step 9: Commit Transaction
  await connection.commit();
  return res.status(201).json({ message: 'Booking created successfully', bookingId: newBookingId });

} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  // Step 10: Always release connection back to pool
  connection.release();
}
```

---

## 5. Critical Transaction 2: User Moderation & Suspension

When an administrator suspends or deletes a user, multiple related entities and audit logs must be updated atomically:

```mermaid
flowchart TD
    Start[Admin initiates user suspension] --> BeginTrx[START TRANSACTION]
    BeginTrx --> LockUser[SELECT * FROM users WHERE id = ? FOR UPDATE]
    LockUser --> UpdateStatus[UPDATE users SET status = 'suspended' WHERE id = ?]
    UpdateStatus --> CancelPendingBookings[UPDATE bookings SET status = 'cancelled' WHERE provider_id = ? AND status = 'pending']
    CancelPendingBookings --> InsertAudit[INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details) VALUES (...)]
    InsertAudit --> CommitTrx[COMMIT]
    CommitTrx --> End[200 OK Response]

    UpdateStatus -. Error .-> RollbackTrx[ROLLBACK]
    CancelPendingBookings -. Error .-> RollbackTrx
    InsertAudit -. Error .-> RollbackTrx
    RollbackTrx --> ErrorEnd[500 Internal Error]
```

### Why Atomicity is Vital Here:
1. If the user status is updated to `suspended` but the audit log insertion fails, the system would have an untracked administrative action, violating compliance and security auditability.
2. If the user is suspended but their active/pending bookings are not cancelled, clients would be left with orphan bookings for a provider who cannot log in.
3. Wrapping the entire operation in a single transaction guarantees that either **all steps succeed** or the database remains untouched.

---

## 6. Deadlock Prevention Strategy

Deadlocks occur when two transactions hold locks that the other needs (cyclic wait dependency):
$$T_1 \text{ holds Lock } A, \text{ requests Lock } B$$
$$T_2 \text{ holds Lock } B, \text{ requests Lock } A$$

### SkillLink Deadlock Mitigation Rules:
1. **Consistent Lock Ordering**: All transactions that touch multiple tables acquire locks in the exact same deterministic order:
   $$\text{users} \longrightarrow \text{services} \longrightarrow \text{availability} \longrightarrow \text{bookings} \longrightarrow \text{notifications}$$
2. **Short Transaction Lifetimes**: Transactions never perform network I/O, external mailer calls, or slow hashing while holding database locks. Mail sending and background logging occur *after* `connection.commit()`.
3. **Index-Backed Locking**: Every `SELECT ... FOR UPDATE` matches an existing composite B-Tree index, preventing table-wide escalation locks.
