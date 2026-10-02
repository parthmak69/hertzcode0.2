import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import * as portfolioController from '../controllers/portfolioController.js';

import uploadParser from '../middleware/uploadMiddleware.js';

const checkAuth = (req, res, next) => next();

const router = express.Router();

router.use(checkAuth);

// Category summary endpoint
router.get(['/categories-summary', '/portfolio/categories-summary'], portfolioController.getCategoriesSummary);

// Explicit subpath category folder routes
router.get('/portfolio-categories/list', portfolioController.listPortfolioCategories);
router.get('/portfolio-categories', portfolioController.listPortfolioCategories);
router.post('/portfolio-categories', uploadParser, portfolioController.createPortfolioCategory);
router.delete('/portfolio-categories/:id', portfolioController.deletePortfolioCategory);

// Explicit bulk delete
router.post('/bulk-delete', portfolioController.bulkDeleteRecords);
router.post('/portfolio/bulk-delete', portfolioController.bulkDeleteRecords);

// Disambiguated router handlers for mounted endpoints (e.g. /admin/portfolio vs /admin/portfolio-categories)
router.get('/', (req, res, next) => {
  const url = req.baseUrl || req.originalUrl || '';
  if (url.includes('portfolio-categories') || url.includes('portfolio_categories')) {
    return portfolioController.listPortfolioCategories(req, res, next);
  }
  return portfolioController.getRecordsList(req, res, next);
});

router.post('/', uploadParser, (req, res, next) => {
  const url = req.baseUrl || req.originalUrl || '';
  if (url.includes('portfolio-categories') || url.includes('portfolio_categories')) {
    return portfolioController.createPortfolioCategory(req, res, next);
  }
  return portfolioController.createRecord(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  const url = req.baseUrl || req.originalUrl || '';
  if (url.includes('portfolio-categories') || url.includes('portfolio_categories')) {
    return portfolioController.deletePortfolioCategory(req, res, next);
  }
  return portfolioController.deleteRecord(req, res, next);
});

router.get('/:id', (req, res, next) => {
  const url = req.baseUrl || req.originalUrl || '';
  if (url.includes('portfolio-categories') || url.includes('portfolio_categories')) {
    return portfolioController.listPortfolioCategories(req, res, next);
  }
  return portfolioController.getRecordDetail(req, res, next);
});

router.put('/:id', uploadParser, portfolioController.updateRecord);
router.patch('/:id', portfolioController.patchRecordStatus);

export default router;
