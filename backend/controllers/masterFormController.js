import masterFormModel from '../models/masterFormModel.js';

function mapEndpointToCategory(endpoint) {
  if (!endpoint) return null;
  const ep = String(endpoint).toLowerCase();
  if (ep === 'master-form' || ep === 'master_form' || ep === 'master_form_inputs' || ep === 'masterform') return null;
  if (ep.includes('product') || ep.includes('stock')) return 'grocery_staples';
  if (ep.includes('coupon') || ep.includes('promo')) return 'coupons_promos';
  if (ep.includes('salesm') || ep.includes('vendor') || ep.includes('crm') || ep.includes('customer') || ep.includes('delivery')) return 'crm_vendor';
  if (ep.includes('config') || ep.includes('setting')) return 'system_configs';
  return null;
}

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return typeof val === 'string' ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function formatRow(row) {
  if (!row) return null;
  const primaryImg = row.primary_image_url || row.image_url || row.photo || row.image || '';
  const docFile = row.document_file_url || row.file_url || row.file || '';
  const titleVal = row.text_title ?? row.title ?? row.name ?? row.full_name ?? '';
  const activeVal = row.switch_active === 1 || row.switch_active === true || row.is_active === 1 || row.is_active === true || row.active === true;

  return {
    ...row,
    id: row.id,
    text_title: titleVal,
    title: titleVal,
    name: titleVal,
    fullName: titleVal,
    full_name: titleVal,
    price: row.decimal_price,
    decimal_price: row.decimal_price,
    qty: row.integer_qty,
    quantity: row.integer_qty,
    stock: row.integer_qty,
    integer_qty: row.integer_qty,
    range_slider_value: row.range_slider_value ?? 50,
    switch_active: activeVal ? 1 : 0,
    is_active: activeVal,
    active: activeVal,
    primary_image_url: primaryImg,
    image_url: primaryImg,
    document_file_url: docFile,
    file_url: docFile,
    gallery_images: safeJsonParse(row.gallery_images, []),
    multi_select_tags: safeJsonParse(row.multi_select_tags, []),
    json_metadata: safeJsonParse(row.json_metadata, {}),
    repeater_data: safeJsonParse(row.repeater_data, []),
  };
}

function mapBodyToTableFields(body = {}, category = null) {
  const fields = {};

  fields.text_title = body.text_title || body.title || body.name || body.full_name || body.fullName || 'Untitled Entry';
  fields.slug = body.slug || (fields.text_title ? fields.text_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
  fields.email = (body.email && String(body.email).trim()) ? String(body.email).trim() : null;
  fields.password_hash = body.password_hash || body.password || ('$unusable$' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
  fields.website_url = body.website_url || body.url || body.website || '';
  fields.phone = body.phone || body.mobile || '';
  fields.integer_qty = parseInt(body.integer_qty ?? body.qty ?? body.quantity ?? body.stock ?? 1) || 0;
  fields.decimal_price = parseFloat(body.decimal_price ?? body.price ?? body.amount ?? body.cost ?? 0.0) || 0.0;
  fields.tax_percentage = parseFloat(body.tax_percentage ?? body.tax ?? 0.0) || 0.0;
  fields.range_slider_value = parseInt(body.range_slider_value ?? 50) || 50;
  fields.short_notes = body.short_notes || body.subtitle || body.description || '';
  fields.rich_wysiwyg_content = body.rich_wysiwyg_content || body.content || body.wysiwyg || '';
  fields.dropdown_selection = body.dropdown_selection || category || 'grocery_staples';
  fields.radio_selection = body.radio_selection || 'credit_card';
  fields.checkbox_toggle = (body.checkbox_toggle === 1 || body.checkbox_toggle === true || body.checkbox_toggle === '1' || body.checkbox_toggle === 'true') ? 1 : 0;
  fields.switch_active = (body.switch_active === 1 || body.switch_active === true || body.switch_active === '1' || body.switch_active === 'true' || body.is_active === 1 || body.is_active === true) ? 1 : 0;

  if (body.date_picker) {
    const rawDate = String(body.date_picker).trim();
    fields.date_picker = rawDate.includes('T') ? rawDate.split('T')[0] : (typeof body.date_picker === 'string' ? body.date_picker.split('T')[0] : new Date(body.date_picker).toISOString().split('T')[0]);
  }
  if (body.datetime_picker) {
    const rawDt = String(body.datetime_picker).trim();
    fields.datetime_picker = rawDt.includes('T') ? rawDt.replace('T', ' ').replace('Z', '').split('.')[0] : (typeof body.datetime_picker === 'string' ? body.datetime_picker.substring(0, 19) : new Date(body.datetime_picker).toISOString().replace('T', ' ').substring(0, 19));
  }
  if (body.time_picker) {
    const rawTime = String(body.time_picker).trim();
    fields.time_picker = rawTime.includes('T') ? (rawTime.split('T')[1]?.split('.')[0] || rawTime) : rawTime;
  }

  const primaryImg = body.primary_image_url || body.image_url || body.photo || body.image || '';
  if (primaryImg) fields.primary_image_url = primaryImg;

  const docFile = body.document_file_url || body.file_url || body.file || '';
  if (docFile) fields.document_file_url = docFile;

  if (body.gallery_images !== undefined) {
    fields.gallery_images = typeof body.gallery_images === 'object' ? JSON.stringify(body.gallery_images) : body.gallery_images;
  }
  if (body.multi_select_tags !== undefined) {
    fields.multi_select_tags = typeof body.multi_select_tags === 'object' ? JSON.stringify(body.multi_select_tags) : body.multi_select_tags;
  }
  if (body.json_metadata !== undefined) {
    fields.json_metadata = typeof body.json_metadata === 'object' ? JSON.stringify(body.json_metadata) : body.json_metadata;
  }
  if (body.repeater_data !== undefined) {
    fields.repeater_data = typeof body.repeater_data === 'object' ? JSON.stringify(body.repeater_data) : body.repeater_data;
  }

  return fields;
}

const masterFormController = {
  async getRecordDetail(req, res) {
    const executingUserId = req.user?.id || 1;
    const { endpoint, id } = req.params;
    const targetId = id || endpoint;
    const category = mapEndpointToCategory(endpoint);

    if (!targetId || targetId === 'undefined' || isNaN(Number(targetId)) || targetId === 'master-form' || targetId === 'master_form' || targetId === 'master_form_inputs' || targetId === 'masterform') {
      return masterFormController.getRecordsList(req, res);
    }

    try {
      const record = await masterFormModel.getRecordById(targetId, category, executingUserId);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Resource record not found.' });
      }
      return res.json({ success: true, data: formatRow(record) });
    } catch (err) {
      console.error('[Detail Fetch Error]', err);
      return res.status(500).json({ success: false, message: 'Database fetch failure: ' + err.message });
    }
  },

  async getRecordsList(req, res) {
    const executingUserId = req.user?.id || 1;
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    try {
      const page = parseInt(req.query.page || '1') || 1;
      const limit = parseInt(req.query.limit || '10') || 10;
      const sortBy = req.query.sort_by || 'id';
      const sortOrder = req.query.sort_order || 'asc';
      const search = req.query.search || '';

      const totalItems = await masterFormModel.countRecords({ category, search }, executingUserId);
      const totalPages = Math.ceil(totalItems / limit) || 1;

      const rows = await masterFormModel.getRecordsList({ category, search, page, limit, sortBy, sortOrder }, executingUserId);

      return res.json({
        success: true,
        data: rows.map(formatRow),
        meta: {
          pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit }
        }
      });
    } catch (err) {
      console.error('[List Query Error]', err);
      return res.status(500).json({ success: false, message: 'Database query execution error: ' + err.message });
    }
  },

  async createRecord(req, res) {
    const executingUserId = req.user?.id || 1;
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    try {
      const fields = mapBodyToTableFields(req.body, category);
      if (req.uploadedUrl || req.fileUrl) {
        fields.primary_image_url = req.uploadedUrl || req.fileUrl;
      }
      const insertRes = await masterFormModel.createRecord(fields, category, executingUserId);

      return res.json({
        success: true,
        message: 'Record created successfully.',
        data: { id: insertRes.insertId, ...fields }
      });
    } catch (err) {
      console.error('[Create Record Error]', err);
      return res.status(500).json({ success: false, message: 'Database insert failed: ' + err.message });
    }
  },

  async updateRecord(req, res) {
    const executingUserId = req.user?.id || 1;
    const id = req.params.id || req.body.id;
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    try {
      const fields = mapBodyToTableFields(req.body, category);
      if (req.uploadedUrl || req.fileUrl) {
        fields.primary_image_url = req.uploadedUrl || req.fileUrl;
      }
      await masterFormModel.updateRecord(id, fields, category, executingUserId);

      return res.json({
        success: true,
        message: 'Record updated successfully.',
        data: { id, ...fields }
      });
    } catch (err) {
      console.error('[Update Record Error]', err);
      return res.status(500).json({ success: false, message: 'Database update failed: ' + err.message });
    }
  },

  async deleteRecord(req, res) {
    const executingUserId = req.user?.id || 1;
    const id = req.params.id || req.body.id;
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    try {
      await masterFormModel.deleteRecord(id, category, executingUserId);
      return res.json({
        success: true,
        message: 'Record deleted successfully.'
      });
    } catch (err) {
      console.error('[Delete Record Error]', err);
      return res.status(500).json({ success: false, message: 'Database deletion failed: ' + err.message });
    }
  },

  async patchRecordStatus(req, res) {
    const executingUserId = req.user?.id || 1;
    const id = req.params.id || req.body.id;
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    try {
      let newStatus = req.body.switch_active ?? req.body.is_active ?? req.body.active;
      if (newStatus === undefined) {
        const existing = await masterFormModel.getRecordStatus(id, category);
        newStatus = (existing?.switch_active === 1) ? 0 : 1;
      } else {
        newStatus = (newStatus === 1 || newStatus === true || newStatus === '1' || newStatus === 'true') ? 1 : 0;
      }

      await masterFormModel.updateRecordStatus(id, newStatus, category, executingUserId);
      return res.json({
        success: true,
        message: 'Record status updated successfully.',
        data: { active: newStatus === 1 }
      });
    } catch (err) {
      console.error('[Patch Status Error]', err);
      return res.status(500).json({ success: false, message: 'Database status update failed: ' + err.message });
    }
  },

  async bulkDeleteRecords(req, res) {
    const executingUserId = req.user?.id || 1;
    const ids = req.body.ids || (req.body.id ? [req.body.id] : []);
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No record IDs provided for deletion.' });
    }

    try {
      await masterFormModel.deleteRecords(ids, category, executingUserId);
      return res.json({
        success: true,
        message: `Successfully deleted ${ids.length} records.`
      });
    } catch (err) {
      console.error('[Bulk Delete Error]', err);
      return res.status(500).json({ success: false, message: 'Database bulk deletion failed: ' + err.message });
    }
  },

  async bulkImportRecords(req, res) {
    const executingUserId = req.user?.id || 1;
    const records = req.body?.records || req.body?.rows || req.body?.data || (Array.isArray(req.body) ? req.body : []);
    const { endpoint } = req.params;
    const category = mapEndpointToCategory(endpoint);

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No records provided for bulk import.' });
    }

    try {
      let importedCount = 0;
      for (const row of records) {
        const fields = mapBodyToTableFields(row, category);
        await masterFormModel.createRecord(fields, category, executingUserId);
        importedCount++;
      }
      return res.json({
        success: true,
        message: `Successfully imported ${importedCount} records.`,
        count: importedCount
      });
    } catch (err) {
      console.error('[Bulk Import Error]', err);
      return res.status(500).json({ success: false, message: 'Database bulk import failed: ' + err.message });
    }
  }
};

export default masterFormController;
