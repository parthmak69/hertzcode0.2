import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as portfolioModel from '../models/portfolioModel.js';

export const listPortfolioCategories = async (req, res) => {
  try {
    const categories = await portfolioModel.listPortfolioCategories(req.user?.id || 1);
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPortfolioCategory = async (req, res) => {
  try {
    const fields = { name: req.body.name || req.body.category || 'New Folder' };
    if (req.body.image_url) fields.image_url = req.body.image_url;
    if (req.file && req.file.path) fields.image_url = req.file.path;

    const result = await portfolioModel.createPortfolioCategory(fields, req.user?.id || 1);
    res.status(201).json({ success: true, data: { id: result.insertId || result.id, ...fields } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deletePortfolioCategory = async (req, res) => {
  try {
    await portfolioModel.deletePortfolioCategory(req.params.id, req.user?.id || 1);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCategoriesSummary = async (req, res) => {
  try {
    const summary = await portfolioModel.getCategoriesSummary(req.user?.id || 1);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecordsList = async (req, res) => {
  try {
    const query = {
      search: req.query.search || '',
      category: req.query.category || '',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sortBy: req.query.sortBy || 'id',
      sortOrder: req.query.sortOrder || 'desc'
    };
    const records = await portfolioModel.getRecordsList(query, req.user?.id || 1);
    const total = await portfolioModel.countRecords(query, req.user?.id || 1);
    res.json({ success: true, data: records, pagination: { total, page: query.page, limit: query.limit } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecordDetail = async (req, res) => {
  try {
    const record = await portfolioModel.getRecordById(req.params.id, req.user?.id || 1);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createRecord = async (req, res) => {
  try {
    const fields = { ...req.body };
    if (req.file && req.file.path) fields.image_url = req.file.path;
    const result = await portfolioModel.createRecord(fields, req.user?.id || 1);
    res.status(201).json({ success: true, data: { id: result.insertId || result.id, ...fields } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRecord = async (req, res) => {
  try {
    const fields = { ...req.body };
    if (req.file && req.file.path) fields.image_url = req.file.path;
    await portfolioModel.updateRecord(req.params.id, fields, req.user?.id || 1);
    res.json({ success: true, message: 'Record updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteRecord = async (req, res) => {
  try {
    await portfolioModel.deleteRecord(req.params.id, req.user?.id || 1);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkDeleteRecords = async (req, res) => {
  try {
    const ids = req.body.ids || [];
    await portfolioModel.deleteRecords(ids, req.user?.id || 1);
    res.json({ success: true, message: 'Records deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const patchRecordStatus = async (req, res) => {
  try {
    const status = req.body.status || req.body.switch_active;
    await portfolioModel.updateRecordStatus(req.params.id, status, req.user?.id || 1);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
