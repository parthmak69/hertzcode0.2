import * as productModel from '../models/productModel.js';

export const listProducts = async (req, res) => {
  try {
    const products = await productModel.getAllProducts(req.user?.id || 1);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductDetail = async (req, res) => {
  try {
    const product = await productModel.getProductById(req.params.id, req.user?.id || 1);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, price, stock, description } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    const imgUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || req.body?.photo || req.body?.image || req.body?.image_url;

    const cleanData = {
      name: name.trim(),
      price: parseFloat(price) || 0.00,
      stock: parseInt(stock) || 0
    };

    if (imgUrl) {
      cleanData.image_url = imgUrl;
      cleanData.photo = imgUrl;
    }
    if (description !== undefined) cleanData.description = description;

    const result = await productModel.createProduct(cleanData, req.user?.id || 1);
    res.status(201).json({ success: true, data: { id: result.insertId || result.id, ...cleanData } });
  } catch (err) {
    console.error('createProduct Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const { name, price, stock, description } = req.body;
    const cleanData = {};

    const imgUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || req.body?.photo || req.body?.image || req.body?.image_url;

    if (name !== undefined) cleanData.name = name.trim();
    if (price !== undefined) cleanData.price = parseFloat(price) || 0.00;
    if (stock !== undefined) cleanData.stock = parseInt(stock) || 0;
    if (imgUrl) {
      cleanData.image_url = imgUrl;
      cleanData.photo = imgUrl;
    }
    if (description !== undefined) cleanData.description = description;

    await productModel.updateProduct(id, cleanData, req.user?.id || 1);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error('updateProduct Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    await productModel.deleteProduct(id, req.user?.id || 1);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('deleteProduct Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const seedDemoProducts = async (req, res) => {
  try {
    const products = await productModel.getAllProducts(req.user?.id || 1);
    res.json({ success: true, message: 'Demo products loaded successfully', data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

