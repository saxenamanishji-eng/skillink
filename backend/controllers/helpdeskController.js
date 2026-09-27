import pool from '../config/db.js';
import path from 'path';
import fs from 'fs';

/**
 * Get all active helpdesk categories
 * GET /api/helpdesk/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query('SELECT * FROM helpdesk_categories WHERE is_active = TRUE ORDER BY name ASC');
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('[GetHelpdeskCategories Controller Error]:', error);
    next(error);
  }
};

/**
 * Get user's helpdesk tickets
 * GET /api/helpdesk/tickets
 */
export const getTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [tickets] = await pool.query(
      `SELECT t.*, c.name as category_name,
              (SELECT COUNT(*) FROM helpdesk_messages WHERE ticket_id = t.id) as message_count
       FROM helpdesk_tickets t
       JOIN helpdesk_categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.updated_at DESC`,
      [userId]
    );

    return res.status(200).json({ success: true, tickets });
  } catch (error) {
    console.error('[GetHelpdeskTickets Controller Error]:', error);
    next(error);
  }
};

/**
 * Get single ticket details and conversation thread
 * GET /api/helpdesk/tickets/:id
 */
export const getTicketById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ticketId = parseInt(req.params.id, 10);

    const [ticketRows] = await pool.query(
      `SELECT t.*, c.name as category_name, u.username, u.full_name, u.email,
              adm.full_name as assigned_admin_name
       FROM helpdesk_tickets t
       JOIN helpdesk_categories c ON t.category_id = c.id
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users adm ON t.assigned_admin_id = adm.id
       WHERE t.id = ? AND (t.user_id = ? OR ? = 'admin')`,
      [ticketId, userId, req.user.role]
    );

    if (ticketRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
    }

    const ticket = ticketRows[0];

    // Fetch conversation messages
    const [messages] = await pool.query(
      `SELECT m.*, u.username as sender_username, u.full_name as sender_name, u.role as sender_role, u.profile_picture as sender_avatar
       FROM helpdesk_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.ticket_id = ?
       ORDER BY m.created_at ASC`,
      [ticketId]
    );

    // Fetch attachments
    const [attachments] = await pool.query(
      `SELECT a.id, a.ticket_id, a.message_id, a.file_name, a.file_size, a.created_at
       FROM helpdesk_attachments a
       WHERE a.ticket_id = ?`,
      [ticketId]
    );

    ticket.messages = messages;
    ticket.attachments = attachments;

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error('[GetTicketById Controller Error]:', error);
    next(error);
  }
};

/**
 * Create a new helpdesk ticket
 * POST /api/helpdesk/tickets
 */
export const createTicket = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { category_id, subject, description, priority = 'normal' } = req.body;

    const categoryId = parseInt(category_id, 10);
    if (!categoryId || isNaN(categoryId)) {
      return res.status(400).json({ success: false, message: 'Please select a valid helpdesk category.' });
    }
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }

    await connection.beginTransaction();

    const [tktResult] = await connection.query(
      `INSERT INTO helpdesk_tickets (user_id, category_id, subject, description, priority, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [userId, categoryId, subject.trim(), description.trim(), priority]
    );

    const ticketId = tktResult.insertId;

    // Create initial message
    await connection.query(
      `INSERT INTO helpdesk_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)`,
      [ticketId, userId, description.trim()]
    );

    // Handle file attachment if uploaded
    if (req.file) {
      await connection.query(
        `INSERT INTO helpdesk_attachments (ticket_id, message_id, file_path, file_name, file_size, uploaded_by)
         VALUES (?, NULL, ?, ?, ?, ?)`,
        [ticketId, req.file.path, req.file.originalname, req.file.size, userId]
      );
    }

    // Notification to user
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES (?, 'helpdesk_ticket_created', 'Helpdesk Ticket Created', ?, 'helpdesk_ticket', ?)`,
      [userId, `Your support ticket #${ticketId} ("${subject.trim()}") has been created.`, ticketId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticketId
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CreateTicket Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Reply to a helpdesk ticket
 * POST /api/helpdesk/tickets/:id/messages
 */
export const replyTicket = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const ticketId = parseInt(req.params.id, 10);
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    await connection.beginTransaction();

    const [tktRows] = await connection.query(
      'SELECT * FROM helpdesk_tickets WHERE id = ? FOR UPDATE',
      [ticketId]
    );

    if (tktRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const ticket = tktRows[0];
    const isOwner = ticket.user_id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Not authorized to reply to this ticket.' });
    }

    // Insert message
    const [msgRes] = await connection.query(
      'INSERT INTO helpdesk_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)',
      [ticketId, userId, message.trim()]
    );

    // If user replies to a resolved/closed/waiting_for_user ticket, bump status back to 'open' (Section 6)
    if (isOwner && ['resolved', 'closed', 'waiting_for_user'].includes(ticket.status)) {
      await connection.query(
        'UPDATE helpdesk_tickets SET status = "open", updated_at = NOW() WHERE id = ?',
        [ticketId]
      );
    } else {
      await connection.query('UPDATE helpdesk_tickets SET updated_at = NOW() WHERE id = ?', [ticketId]);
    }

    // Notify other party
    if (isOwner && ticket.assigned_admin_id) {
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES (?, 'helpdesk_reply', 'New Ticket Reply', ?, 'helpdesk_ticket', ?)`,
        [ticket.assigned_admin_id, `${req.user.full_name} replied to ticket #${ticketId}.`, ticketId]
      );
    } else if (isAdmin) {
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES (?, 'helpdesk_reply', 'Support Team Replied', ?, 'helpdesk_ticket', ?)`,
        [ticket.user_id, `Support team replied to your ticket #${ticketId}.`, ticketId]
      );
    }

    await connection.commit();
    return res.status(201).json({ success: true, message: 'Reply posted successfully.', messageId: msgRes.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('[ReplyTicket Controller Error]:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Securely stream an attachment (authenticated check)
 * GET /api/helpdesk/attachments/:id
 */
export const downloadAttachment = async (req, res, next) => {
  try {
    const attachmentId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const [rows] = await pool.query(
      `SELECT a.*, t.user_id as ticket_owner_id
       FROM helpdesk_attachments a
       JOIN helpdesk_tickets t ON a.ticket_id = t.id
       WHERE a.id = ?`,
      [attachmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const attachment = rows[0];

    if (attachment.ticket_owner_id !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this attachment.' });
    }

    if (!fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ success: false, message: 'File is no longer present on server storage.' });
    }

    res.download(attachment.file_path, attachment.file_name);
  } catch (error) {
    console.error('[DownloadAttachment Controller Error]:', error);
    next(error);
  }
};
