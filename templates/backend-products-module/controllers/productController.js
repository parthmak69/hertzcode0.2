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
    const { name, price, stock } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    const cleanData = {
      name: name.trim(),
      price: parseFloat(price) || 0.00,
      stock: parseInt(stock) || 0
    };

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
    const { name, price, stock } = req.body;
    const cleanData = {};

    if (name !== undefined) cleanData.name = name.trim();
    if (price !== undefined) cleanData.price = parseFloat(price) || 0.00;
    if (stock !== undefined) cleanData.stock = parseInt(stock) || 0;

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
