import * as categoryModel from '../models/categoryModel.js';

export const listCategories = async (req, res) => {
  try {
    let categories = await categoryModel.getAllCategories(req.user?.id || 1);
    const parentIdParam = req.query.parentId || req.query.parent_id;
    if (parentIdParam && parentIdParam !== 'all') {
      if (parentIdParam === 'null' || parentIdParam === 'root') {
        categories = categories.filter(r => !r.parent_id && !r.parentId);
      } else {
        const pidNum = parseInt(parentIdParam);
        categories = categories.filter(r => (r.parent_id === pidNum || r.parentId === pidNum));
      }
    }
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCategoryDetail = async (req, res) => {
  try {
    const category = await categoryModel.getCategoryById(req.params.id, req.user?.id || 1);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const rawData = { ...req.body };
    const cleanData = {};

    if (rawData.name) cleanData.name = rawData.name.trim();
    if (rawData.description !== undefined) cleanData.description = rawData.description;

    const parentId = rawData.parent_id !== undefined ? rawData.parent_id : rawData.parentId;
    if (parentId !== undefined && parentId !== null && parentId !== 'null' && parentId !== '') {
      cleanData.parent_id = parseInt(parentId);
    } else {
      cleanData.parent_id = null;
    }

    let imageUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || rawData.image_url || rawData.primary_image_url || rawData.photo || '';
    if (imageUrl) {
      cleanData.image_url = imageUrl;
      cleanData.photo = imageUrl;
    }

    if (rawData.name && !cleanData.slug) {
      cleanData.slug = rawData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    }

    const result = await categoryModel.createCategory(cleanData, req.user?.id || 1);
    res.status(201).json({ success: true, data: { id: result.insertId || result.id, ...cleanData } });
  } catch (err) {
    console.error('createCategory Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const rawData = { ...req.body };
    const cleanData = {};

    if (rawData.name) cleanData.name = rawData.name.trim();
    if (rawData.description !== undefined) cleanData.description = rawData.description;

    const parentId = rawData.parent_id !== undefined ? rawData.parent_id : rawData.parentId;
    if (parentId !== undefined && parentId !== null && parentId !== 'null' && parentId !== '') {
      cleanData.parent_id = parseInt(parentId);
    } else if (rawData.parent_id === null || rawData.parentId === null || rawData.parent_id === 'null' || rawData.parentId === 'null') {
      cleanData.parent_id = null;
    }

    if (rawData.primaryImageAction === 'remove') {
      cleanData.image_url = '';
      cleanData.photo = '';
    } else {
      let imageUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || rawData.image_url || rawData.primary_image_url || rawData.photo;
      if (imageUrl !== undefined) {
        cleanData.image_url = imageUrl;
        cleanData.photo = imageUrl;
      }
    }

    await categoryModel.updateCategory(id, cleanData, req.user?.id || 1);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    console.error('updateCategory Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    await categoryModel.deleteCategory(id, req.user?.id || 1);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('deleteCategory Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
