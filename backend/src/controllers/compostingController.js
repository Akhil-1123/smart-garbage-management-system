const db = require('../config/db');
const { ok, fail } = require('../utils/response');

/**
 * GET /api/admin/composting/units
 * List all composting units.
 */
const getUnits = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM composting_units ORDER BY id ASC'
    );
    return ok(res, rows);
  } catch (error) {
    console.error('getUnits error:', error);
    return fail(res, 500, 'Failed to fetch composting units');
  }
};

/**
 * POST /api/admin/composting/units
 * Body: { name, location }
 */
const createUnit = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return fail(res, 400, 'name and location are required');
    }

    const [result] = await db.query(
      'INSERT INTO composting_units (name, location, is_active, created_at) VALUES (?, ?, TRUE, NOW())',
      [name.trim(), location.trim()]
    );

    const [newUnit] = await db.query(
      'SELECT * FROM composting_units WHERE id = ?',
      [result.insertId]
    );

    return ok(res, newUnit[0], 'Composting unit created successfully', 201);
  } catch (error) {
    console.error('createUnit error:', error);
    return fail(res, 500, 'Failed to create composting unit');
  }
};

/**
 * PUT /api/admin/composting/units/:id
 * Body: { name, location, is_active }
 */
const updateUnit = async (req, res) => {
  try {
    const unitId = Number(req.params.id);
    if (isNaN(unitId)) {
      return fail(res, 400, 'Invalid unit ID');
    }

    const { name, location, is_active } = req.body;

    const [existing] = await db.query(
      'SELECT * FROM composting_units WHERE id = ?',
      [unitId]
    );

    if (existing.length === 0) {
      return fail(res, 404, 'Composting unit not found');
    }

    await db.query(
      `UPDATE composting_units
       SET name = COALESCE(?, name),
           location = COALESCE(?, location),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        location ? location.trim() : null,
        is_active !== undefined ? Boolean(is_active) : null,
        unitId
      ]
    );

    const [updated] = await db.query(
      'SELECT * FROM composting_units WHERE id = ?',
      [unitId]
    );

    return ok(res, updated[0], 'Composting unit updated successfully');
  } catch (error) {
    console.error('updateUnit error:', error);
    return fail(res, 500, 'Failed to update composting unit');
  }
};

/**
 * GET /api/admin/composting/pending-waste
 * Waste records with processing_status = 'collected' and waste_type = 'organic'.
 */
const getPendingWaste = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        wr.id,
        wr.collection_id,
        wr.bin_id,
        wr.driver_id,
        wr.waste_type,
        wr.weight_kg,
        wr.processing_status,
        wr.recorded_at,
        wr.notes,
        du.name AS driver_name,
        b.location AS bin_location
      FROM waste_records wr
      LEFT JOIN drivers d ON wr.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      LEFT JOIN bins b ON wr.bin_id = b.id
      WHERE wr.processing_status = 'collected' AND wr.waste_type = 'organic'
      ORDER BY wr.recorded_at ASC
    `);

    return ok(res, rows);
  } catch (error) {
    console.error('getPendingWaste error:', error);
    return fail(res, 500, 'Failed to fetch pending organic waste');
  }
};

/**
 * GET /api/admin/composting/batches
 * Batches with unit name, product name, input/output kg, status, and list of waste_record ids.
 */
const getBatches = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        cb.id,
        cb.unit_id,
        cb.batch_code,
        cb.product_id,
        cb.input_weight_kg,
        cb.output_weight_kg,
        cb.status,
        cb.created_at,
        cb.completed_at,
        cu.name AS unit_name,
        p.name AS product_name,
        GROUP_CONCAT(cbw.waste_record_id ORDER BY cbw.waste_record_id ASC) AS waste_record_ids_str
      FROM compost_batches cb
      JOIN composting_units cu ON cb.unit_id = cu.id
      LEFT JOIN products p ON cb.product_id = p.id
      LEFT JOIN compost_batch_waste cbw ON cb.id = cbw.batch_id
      GROUP BY cb.id
      ORDER BY cb.created_at DESC
    `);

    const formatted = rows.map(b => {
      const ids = b.waste_record_ids_str
        ? b.waste_record_ids_str.split(',').map(Number)
        : [];
      const copy = { ...b, waste_record_ids: ids };
      delete copy.waste_record_ids_str;
      return copy;
    });

    return ok(res, formatted);
  } catch (error) {
    console.error('getBatches error:', error);
    return fail(res, 500, 'Failed to fetch compost batches');
  }
};

/**
 * POST /api/admin/composting/batches
 * Body: { unit_id, waste_record_ids: [...] }
 * Needs at least 1 id; every id must be organic and processing_status collected.
 * In ONE transaction:
 * - Generate batch_code like "BATCH-YYYYMMDD-001" (sequence per day)
 * - input_weight_kg = sum of weights
 * - insert batch (status processing)
 * - insert compost_batch_waste rows
 * - set those waste records to in_composting
 */
const createBatch = async (req, res) => {
  let connection;
  try {
    const { unit_id, waste_record_ids } = req.body;

    if (!unit_id) {
      return fail(res, 400, 'unit_id is required');
    }

    if (!waste_record_ids || !Array.isArray(waste_record_ids) || waste_record_ids.length === 0) {
      return fail(res, 400, 'waste_record_ids array with at least 1 ID is required');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Verify composting unit
    const [unitRows] = await connection.query(
      'SELECT id, name FROM composting_units WHERE id = ? AND is_active = TRUE FOR UPDATE',
      [unit_id]
    );

    if (unitRows.length === 0) {
      await connection.rollback();
      return fail(res, 400, 'Composting unit not found or inactive');
    }

    // Lock and verify waste records
    const [wasteRecords] = await connection.query(
      `SELECT id, waste_type, weight_kg, processing_status 
       FROM waste_records 
       WHERE id IN (?) FOR UPDATE`,
      [waste_record_ids]
    );

    if (wasteRecords.length !== waste_record_ids.length) {
      await connection.rollback();
      return fail(res, 400, 'One or more waste records not found');
    }

    // Every ID must be organic and processing_status collected
    for (const record of wasteRecords) {
      if (record.waste_type !== 'organic' || record.processing_status !== 'collected') {
        await connection.rollback();
        return fail(
          res,
          400,
          `Waste record #${record.id} is invalid: must be organic and in "collected" status (current: ${record.waste_type}, ${record.processing_status})`
        );
      }
    }

    // Calculate sum of input weights
    const inputWeightKg = wasteRecords.reduce((sum, r) => sum + Number(r.weight_kg), 0);

    // Generate batch_code like "BATCH-YYYYMMDD-001"
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const prefix = `BATCH-${dateStr}-`;

    const [lastBatch] = await connection.query(
      'SELECT batch_code FROM compost_batches WHERE batch_code LIKE ? ORDER BY batch_code DESC LIMIT 1 FOR UPDATE',
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (lastBatch.length > 0) {
      const parts = lastBatch[0].batch_code.split('-');
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }
    const batchCode = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // Insert batch
    const [batchResult] = await connection.query(
      `INSERT INTO compost_batches (
         unit_id, batch_code, product_id, input_weight_kg,
         output_weight_kg, status, created_at
       ) VALUES (?, ?, NULL, ?, NULL, 'processing', NOW())`,
      [unit_id, batchCode, inputWeightKg]
    );

    const batchId = batchResult.insertId;

    // Insert compost_batch_waste associations
    for (const recordId of waste_record_ids) {
      await connection.query(
        'INSERT INTO compost_batch_waste (batch_id, waste_record_id) VALUES (?, ?)',
        [batchId, recordId]
      );
    }

    // Set waste records to 'in_composting'
    await connection.query(
      "UPDATE waste_records SET processing_status = 'in_composting' WHERE id IN (?)",
      [waste_record_ids]
    );

    await connection.commit();

    // Query and return created batch
    const [newBatch] = await db.query(
      `SELECT cb.*, cu.name AS unit_name
       FROM compost_batches cb
       JOIN composting_units cu ON cb.unit_id = cu.id
       WHERE cb.id = ?`,
      [batchId]
    );

    const resBatch = {
      ...newBatch[0],
      waste_record_ids
    };

    return ok(res, resBatch, 'Compost batch created successfully', 201);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('createBatch error:', error);
    return fail(res, 500, 'Failed to create compost batch');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/admin/composting/batches/:id/complete
 * Body: { output_weight_kg, product_id }
 * Only from processing; output must be > 0 and <= input.
 * In ONE transaction:
 * - set batch completed with completed_at and product_id
 * - add Math.floor(output_weight_kg) to products.stock_quantity for that product
 * - set linked waste records to composted
 */
const completeBatch = async (req, res) => {
  let connection;
  try {
    const batchId = Number(req.params.id);
    const { output_weight_kg, product_id } = req.body;

    if (isNaN(batchId)) {
      return fail(res, 400, 'Invalid batch ID');
    }

    if (output_weight_kg === undefined || !product_id) {
      return fail(res, 400, 'output_weight_kg and product_id are required');
    }

    const outputKg = Number(output_weight_kg);
    if (isNaN(outputKg) || outputKg <= 0) {
      return fail(res, 400, 'output_weight_kg must be a positive number');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock batch
    const [batchRows] = await connection.query(
      'SELECT * FROM compost_batches WHERE id = ? FOR UPDATE',
      [batchId]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Compost batch not found');
    }

    const batch = batchRows[0];

    if (batch.status !== 'processing') {
      await connection.rollback();
      return fail(res, 400, `Batch is not in processing status. Current status: ${batch.status}`);
    }

    // Output must be <= input
    if (outputKg > Number(batch.input_weight_kg)) {
      await connection.rollback();
      return fail(
        res,
        400,
        `output_weight_kg (${outputKg} kg) cannot exceed input_weight_kg (${batch.input_weight_kg} kg)`
      );
    }

    // Lock and verify product
    const [prodRows] = await connection.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE',
      [product_id]
    );

    if (prodRows.length === 0) {
      await connection.rollback();
      return fail(res, 400, 'Product not found or inactive');
    }

    const addedStock = Math.floor(outputKg);

    // 1. Set batch completed
    await connection.query(
      `UPDATE compost_batches 
       SET status = 'completed', completed_at = NOW(), product_id = ?, output_weight_kg = ? 
       WHERE id = ?`,
      [product_id, outputKg, batchId]
    );

    // 2. Add Math.floor(output_weight_kg) to products.stock_quantity
    await connection.query(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
      [addedStock, product_id]
    );

    // 3. Set linked waste records to composted
    await connection.query(
      `UPDATE waste_records 
       SET processing_status = 'composted' 
       WHERE id IN (SELECT waste_record_id FROM compost_batch_waste WHERE batch_id = ?)`,
      [batchId]
    );

    await connection.commit();

    // Fetch updated batch and product
    const [updatedBatch] = await db.query(
      `SELECT cb.*, cu.name AS unit_name, p.name AS product_name 
       FROM compost_batches cb
       JOIN composting_units cu ON cb.unit_id = cu.id
       LEFT JOIN products p ON cb.product_id = p.id
       WHERE cb.id = ?`,
      [batchId]
    );

    const [updatedProduct] = await db.query(
      'SELECT id, name, stock_quantity FROM products WHERE id = ?',
      [product_id]
    );

    return ok(
      res,
      {
        batch: updatedBatch[0],
        product: updatedProduct[0]
      },
      `Batch completed. ${addedStock} units added to ${prodRows[0].name} stock.`
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('completeBatch error:', error);
    return fail(res, 500, 'Failed to complete compost batch');
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getUnits,
  createUnit,
  updateUnit,
  getPendingWaste,
  getBatches,
  createBatch,
  completeBatch
};
