const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');

/**
 * POST /api/feedback (role: user)
 * Body: { type, collection_id?, message, rating? }
 * - type "feedback":
 *   collection_id and rating (1 to 5) are REQUIRED.
 *   The request must belong to the user and have status collected.
 *   Only ONE feedback per collection (400 on duplicate).
 *   Automatically set driver_id from request's driver.
 * - type "complaint":
 *   collection_id optional (if given, must belong to user; set driver_id from it).
 *   message required (at least 10 chars).
 *   no rating.
 *   Notify all admins on every new complaint.
 */
const submitFeedback = async (req, res) => {
  try {
    const { type, collection_id, message, rating } = req.body;

    const normalizedType = String(type || '').trim().toLowerCase();
    if (normalizedType !== 'feedback' && normalizedType !== 'complaint') {
      return fail(res, 400, 'type must be either "feedback" or "complaint"');
    }

    let targetDriverId = null;
    let targetCollectionId = collection_id ? Number(collection_id) : null;
    let numRating = null;

    if (normalizedType === 'feedback') {
      // 1. collection_id and rating (1 to 5) are REQUIRED
      if (!targetCollectionId) {
        return fail(res, 400, 'collection_id is required for feedback');
      }

      numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return fail(res, 400, 'rating must be an integer between 1 and 5');
      }

      // 2. The request must belong to user and have status collected
      const [reqRows] = await db.query(
        'SELECT id, user_id, driver_id, status FROM collection_requests WHERE id = ?',
        [targetCollectionId]
      );

      if (reqRows.length === 0) {
        return fail(res, 400, 'Collection request not found');
      }

      const colReq = reqRows[0];
      if (colReq.user_id !== req.user.id) {
        return fail(res, 400, 'Collection request does not belong to you');
      }

      if (colReq.status !== 'collected') {
        return fail(res, 400, `Feedback can only be given on collected requests. Current status: ${colReq.status}`);
      }

      // 3. Only ONE feedback per collection (400 on duplicate)
      const [existing] = await db.query(
        'SELECT id FROM feedback_complaints WHERE collection_id = ? AND type = "feedback"',
        [targetCollectionId]
      );

      if (existing.length > 0) {
        return fail(res, 400, 'Feedback has already been submitted for this collection');
      }

      targetDriverId = colReq.driver_id;
    } else {
      // type "complaint"
      if (!message || message.trim().length < 10) {
        return fail(res, 400, 'Complaint message is required and must be at least 10 characters');
      }

      if (targetCollectionId) {
        const [reqRows] = await db.query(
          'SELECT id, user_id, driver_id FROM collection_requests WHERE id = ?',
          [targetCollectionId]
        );

        if (reqRows.length === 0 || reqRows[0].user_id !== req.user.id) {
          return fail(res, 400, 'Collection request not found or does not belong to you');
        }
        targetDriverId = reqRows[0].driver_id;
      }
    }

    // Insert into feedback_complaints
    const [result] = await db.query(
      `INSERT INTO feedback_complaints (
         user_id, collection_id, driver_id, type,
         message, rating, status, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'open', NOW())`,
      [
        req.user.id,
        targetCollectionId,
        targetDriverId,
        normalizedType,
        message ? message.trim() : `Feedback rating: ${numRating}/5`,
        numRating
      ]
    );

    const feedbackId = result.insertId;

    // Notify all admins on every new complaint
    if (normalizedType === 'complaint') {
      const [admins] = await db.query(
        `SELECT u.id 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE r.name = 'admin' AND u.is_active = TRUE`
      );

      for (const admin of admins) {
        await createNotification(
          admin.id,
          'system',
          `New complaint submitted by ${req.user.name}`
        );
      }
    }

    const [newEntry] = await db.query(
      'SELECT * FROM feedback_complaints WHERE id = ?',
      [feedbackId]
    );

    return ok(res, newEntry[0], `${normalizedType === 'feedback' ? 'Feedback' : 'Complaint'} submitted successfully`, 201);
  } catch (error) {
    console.error('submitFeedback error:', error);
    return fail(res, 500, 'Failed to submit feedback or complaint');
  }
};

/**
 * GET /api/feedback/my (role: user)
 * Own items with collection info.
 */
const getMyFeedback = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         fc.id,
         fc.user_id,
         fc.collection_id,
         fc.driver_id,
         fc.type,
         fc.message,
         fc.rating,
         fc.status,
         fc.admin_response,
         fc.created_at,
         cr.address AS collection_address,
         cr.collected_at,
         du.name AS driver_name
       FROM feedback_complaints fc
       LEFT JOIN collection_requests cr ON fc.collection_id = cr.id
       LEFT JOIN drivers d ON fc.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE fc.user_id = ?
       ORDER BY fc.created_at DESC`,
      [req.user.id]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('getMyFeedback error:', error);
    return fail(res, 500, 'Failed to fetch user feedback');
  }
};

/**
 * GET /api/feedback/rateable (role: user)
 * The user's collected requests that have no feedback yet (used by UI dropdown).
 */
const getRateableCollections = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         cr.id,
         cr.bin_id,
         cr.address,
         cr.collected_at,
         cr.waste_type,
         du.name AS driver_name,
         d.vehicle_no AS driver_vehicle_no
       FROM collection_requests cr
       LEFT JOIN drivers d ON cr.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE cr.user_id = ? 
         AND cr.status = 'collected'
         AND NOT EXISTS (
           SELECT 1 
           FROM feedback_complaints fc 
           WHERE fc.collection_id = cr.id AND fc.type = 'feedback'
         )
       ORDER BY cr.collected_at DESC, cr.id DESC`,
      [req.user.id]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('getRateableCollections error:', error);
    return fail(res, 500, 'Failed to fetch rateable collections');
  }
};

/* ==========================================
   ADMIN FEEDBACK CONTROLLERS
========================================== */

/**
 * GET /api/admin/feedback (admin)
 * Optional filters: ?type= ?status=
 * With user name, driver name, rating.
 */
const getAdminFeedback = async (req, res) => {
  try {
    const { type, status } = req.query;

    let sql = `
      SELECT 
        fc.id,
        fc.user_id,
        u.name AS user_name,
        u.email AS user_email,
        fc.collection_id,
        fc.driver_id,
        du.name AS driver_name,
        fc.type,
        fc.message,
        fc.rating,
        fc.status,
        fc.admin_response,
        fc.created_at,
        cr.address AS collection_address,
        cr.collected_at
      FROM feedback_complaints fc
      JOIN users u ON fc.user_id = u.id
      LEFT JOIN drivers d ON fc.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      LEFT JOIN collection_requests cr ON fc.collection_id = cr.id
      WHERE 1=1
    `;

    const params = [];
    if (type) {
      sql += ' AND fc.type = ?';
      params.push(type.trim().toLowerCase());
    }

    if (status) {
      sql += ' AND fc.status = ?';
      params.push(status.trim().toLowerCase());
    }

    sql += ' ORDER BY fc.created_at DESC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('getAdminFeedback error:', error);
    return fail(res, 500, 'Failed to fetch admin feedback');
  }
};

/**
 * PUT /api/admin/feedback/:id (admin)
 * Body: { status, admin_response }
 * Updates status and admin response, notifies user.
 */
const updateFeedbackStatus = async (req, res) => {
  try {
    const feedbackId = Number(req.params.id);
    const { status, admin_response } = req.body;

    if (isNaN(feedbackId)) {
      return fail(res, 400, 'Invalid feedback ID');
    }

    const [existing] = await db.query(
      'SELECT id, user_id, type FROM feedback_complaints WHERE id = ?',
      [feedbackId]
    );

    if (existing.length === 0) {
      return fail(res, 404, 'Feedback/Complaint not found');
    }

    const item = existing[0];

    const validStatuses = ['open', 'in_progress', 'resolved'];
    const chosenStatus = status && validStatuses.includes(status.toLowerCase())
      ? status.toLowerCase()
      : null;

    await db.query(
      `UPDATE feedback_complaints 
       SET status = COALESCE(?, status),
           admin_response = COALESCE(?, admin_response)
       WHERE id = ?`,
      [chosenStatus, admin_response !== undefined ? admin_response.trim() : null, feedbackId]
    );

    // Notify user
    const noticeMsg = chosenStatus
      ? `Your ${item.type} #${feedbackId} status has been updated to "${chosenStatus}".`
      : `Admin responded to your ${item.type} #${feedbackId}.`;
    await createNotification(item.user_id, 'system', noticeMsg);

    const [updated] = await db.query(
      'SELECT * FROM feedback_complaints WHERE id = ?',
      [feedbackId]
    );

    return ok(res, updated[0], 'Feedback status updated successfully');
  } catch (error) {
    console.error('updateFeedbackStatus error:', error);
    return fail(res, 500, 'Failed to update feedback status');
  }
};

module.exports = {
  submitFeedback,
  getMyFeedback,
  getRateableCollections,
  getAdminFeedback,
  updateFeedbackStatus
};
