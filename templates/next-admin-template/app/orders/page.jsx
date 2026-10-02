'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiClient } from '@/utils/api';
import { toast } from '@/components/ui/Toast';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Eye,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Truck
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Detail Drawer / Modal State
  const [viewingOrder, setViewingOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Change State
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // New Order Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [createLoading, setCreateLoading] = useState(false);

  // Delete Confirmation State
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/orders');
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleViewDetails = async (orderId) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/admin/orders/${orderId}`);
      if (res.success) {
        setViewingOrder(res.data);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (err) {
      console.error('View order details error:', err);
      toast.error('Error fetching order items');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatusId(orderId);
    try {
      const res = await apiClient.put(`/admin/orders/${orderId}`, { status: newStatus });
      if (res.success) {
        toast.success(`Order #${orderId} status updated to ${newStatus}`);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        toast.error(res.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Status change error:', err);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        total_amount: parseFloat(totalAmount) || 0.00,
        status: orderStatus
      };

      const res = await apiClient.post('/admin/orders', payload);
      if (res.success) {
        toast.success('Order created successfully!');
        setIsCreateOpen(false);
        setCustomerName('');
        setTotalAmount('');
        setOrderStatus('Pending');
        fetchOrders();
      } else {
        toast.error(res.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Create order error:', err);
      toast.error('Something went wrong');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    const targetId = typeof deletingOrder === 'object' ? (deletingOrder.id || deletingOrder._id) : deletingOrder;
    if (!targetId) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/admin/orders/${targetId}`);
      if (res.success) {
        toast.success('Order deleted successfully');
        setDeletingOrder(null);
        fetchOrders();
      } else {
        toast.error(res.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Delete order error:', err);
      toast.error('Failed to delete order');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (o.id && String(o.id).includes(searchQuery));
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Shipped':
      case 'Dispatched':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Orders Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track customer orders, check order items, and update fulfillment status.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/95 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Order</span>
        </button>
      </div>

      {/* Toolbar & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name or Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground border-border/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No orders found</p>
            <p className="text-xs mt-1">Orders will appear here once customers place their purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/40 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Total Amount ($)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition">
                    <td className="px-6 py-4 font-bold text-xs text-primary">#{order.id}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{order.customer_name}</td>
                    <td className="px-6 py-4 font-bold text-foreground">${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status || 'Pending'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingStatusId === order.id}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${getStatusBadge(order.status)}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                        title="View Order Details & Items"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingOrder(order)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Order"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Total Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="150.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fulfillment Status</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border/60 hover:bg-muted/40 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition flex items-center gap-1.5"
            >
              {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Order</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Order Details & Items Modal */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Order Details #${viewingOrder?.id || ''}`}
      >
        {viewingOrder && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/40">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Customer</p>
                <p className="font-bold text-foreground mt-0.5">{viewingOrder.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total Amount</p>
                <p className="font-bold text-primary mt-0.5">${parseFloat(viewingOrder.total_amount || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold mt-0.5 border ${getStatusBadge(viewingOrder.status)}`}>
                  {viewingOrder.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Date Placed</p>
                <p className="text-xs text-foreground mt-0.5">
                  {viewingOrder.created_at ? new Date(viewingOrder.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase text-muted-foreground mb-2">Order Line Items</h4>
              {viewingOrder.items && viewingOrder.items.length > 0 ? (
                <div className="divide-y divide-border/40 border border-border/40 rounded-xl overflow-hidden">
                  {viewingOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-card">
                      <div>
                        <p className="font-bold text-xs text-foreground">{item.product_name || `Product #${item.product_id}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity} × ${parseFloat(item.unit_price || 0).toFixed(2)}</p>
                      </div>
                      <p className="font-bold text-xs text-foreground">
                        ${(parseFloat(item.quantity || 1) * parseFloat(item.unit_price || 0)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-xl border border-border/30 text-center">
                  No line items attached to this order header.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDeleteOrder}
        title="Delete Order"
        message={`Are you sure you want to delete Order #${deletingOrder?.id} (${deletingOrder?.customer_name})?`}
        confirmText="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}
