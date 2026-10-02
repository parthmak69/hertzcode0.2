import { dbQuery } from '../config/db.js';

export const ensureOrdersTables = async (executingUserId) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`customer_id\` INT DEFAULT NULL,
        \`customer_name\` VARCHAR(255) NOT NULL,
        \`customer_email\` VARCHAR(255) DEFAULT NULL,
        \`total_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`payment_method\` VARCHAR(50) DEFAULT 'COD',
        \`status\` VARCHAR(50) DEFAULT 'Pending',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create orders table if not exists');

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`unit_price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        KEY \`idx_order_id\` (\`order_id\`),
        KEY \`idx_product_id\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create order_items table if not exists');
  } catch (e) {
    console.error('ensureOrdersTables error:', e.message);
  }
};

export const getAllOrders = async (executingUserId) => {
  await ensureOrdersTables(executingUserId);
  const sql = 'SELECT * FROM `orders` ORDER BY `id` DESC';
  return dbQuery(sql, [], executingUserId, 'Fetch all orders');
};

export const getOrderById = async (id, executingUserId) => {
  await ensureOrdersTables(executingUserId);
  const orderSql = 'SELECT * FROM `orders` WHERE `id` = ? LIMIT 1';
  const orderRows = await dbQuery(orderSql, [id], executingUserId, `Fetch order ID: ${id}`);
  if (orderRows.length === 0) return null;

  const order = orderRows[0];
  const itemsSql = `
    SELECT oi.*, p.name as product_name 
    FROM \`order_items\` oi 
    LEFT JOIN \`products\` p ON oi.product_id = p.id 
    WHERE oi.order_id = ?
  `;
  const items = await dbQuery(itemsSql, [id], executingUserId, `Fetch items for order ID: ${id}`);
  order.items = items;
  return order;
};

export const createOrder = async (orderData, itemsData = [], executingUserId) => {
  await ensureOrdersTables(executingUserId);
  const columns = Object.keys(orderData);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(orderData);
  
  const sql = `INSERT INTO \`orders\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  const result = await dbQuery(sql, values, executingUserId, `Created order for: "${orderData.customer_name}"`);
  const orderId = result.insertId || result.id;

  if (itemsData && itemsData.length > 0) {
    for (const item of itemsData) {
      const itemSql = 'INSERT INTO `order_items` (`order_id`, `product_id`, `quantity`, `unit_price`) VALUES (?, ?, ?, ?)';
      await dbQuery(itemSql, [orderId, item.product_id, item.quantity || 1, item.unit_price || 0.00], executingUserId, 'Insert order item');
    }
  }

  return { id: orderId, ...orderData, items: itemsData };
};

export const updateOrderStatus = async (id, status, executingUserId) => {
  await ensureOrdersTables(executingUserId);
  const sql = 'UPDATE `orders` SET `status` = ? WHERE `id` = ?';
  return dbQuery(sql, [status, id], executingUserId, `Updated status for order ID: ${id} to "${status}"`);
};

export const deleteOrder = async (id, executingUserId) => {
  await ensureOrdersTables(executingUserId);
  await dbQuery('DELETE FROM `order_items` WHERE `order_id` = ?', [id], executingUserId, `Deleted order items for order ID: ${id}`);
  const sql = 'DELETE FROM `orders` WHERE `id` = ?';
  return dbQuery(sql, [id], executingUserId, `Deleted order ID: ${id}`);
};

export default {
  ensureOrdersTables,
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
};
