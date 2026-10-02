import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as categoryModel from '../models/categoryModel.js';

export const listCategories = async (req, res) => {
  try {
    const categories = await categoryModel.getAllCategories(req.user?.id || 1);
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
    }

    let imageUrl = rawData.image_url || rawData.primary_image_url || rawData.photo || '';
    if (req.file && req.file.path) imageUrl = req.file.path;
    if (imageUrl) cleanData.image_url = imageUrl;

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
    } else if (rawData.parent_id === null || rawData.parentId === null) {
      cleanData.parent_id = null;
    }

    if (rawData.primaryImageAction === 'remove') {
      cleanData.image_url = '';
    } else {
      let imageUrl = rawData.image_url || rawData.primary_image_url || rawData.photo;
      if (req.file && req.file.path) imageUrl = req.file.path;
      if (imageUrl !== undefined) cleanData.image_url = imageUrl;
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
