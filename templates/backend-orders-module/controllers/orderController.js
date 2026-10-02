import * as orderModel from '../models/orderModel.js';

export const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.getAllOrders(req.user?.id || 1);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrderDetail = async (req, res) => {
  try {
    const order = await orderModel.getOrderById(req.params.id, req.user?.id || 1);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { customer_name, total_amount, status, items } = req.body;
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const orderData = {
      customer_name: customer_name.trim(),
      total_amount: parseFloat(total_amount) || 0.00,
      status: status || 'Pending'
    };

    const newOrder = await orderModel.createOrder(orderData, items || [], req.user?.id || 1);
    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    console.error('createOrder Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    await orderModel.updateOrderStatus(id, status, req.user?.id || 1);
    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('updateOrderStatus Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    await orderModel.deleteOrder(id, req.user?.id || 1);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('deleteOrder Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
