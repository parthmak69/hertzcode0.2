'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/utils/api'
import {
    Plus,
    Trash2,
    Eye,
    Search,
    Receipt,
    Clock,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    PlusCircle,
    MinusCircle,
    X
} from 'lucide-react'

export default function OrdersPage() {
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState([]) // For select drop downs
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [limit] = useState(10)
    const [totalPages, setTotalPages] = useState(1)

    // View Order Details state
    const [viewingOrder, setViewingOrder] = useState(null)
    const [viewingDetailsLoading, setViewingDetailsLoading] = useState(false)

    // Place Order Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [customerName, setCustomerName] = useState('')
    const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, maxStock: 0, price: 0 }])
    const [createError, setCreateError] = useState('')
    const [createLoading, setCreateLoading] = useState(false)

    // Delete Order state
    const [deletingId, setDeletingId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const res = await apiClient.get(`/admin/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`)
            if (res.success) {
                setOrders(res.data || [])
                setTotalPages(res.meta?.pagination?.totalPages || 1)
            }
        } catch (err) {
            console.error('Fetch orders error:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchProductsForDropdown = async () => {
        try {
            // Fetch products list (limit 100 for selects)
            const res = await apiClient.get('/admin/products?limit=100')
            if (res.success) {
                setProducts(res.data || [])
            }
        } catch (err) {
            console.error('Fetch products for selects error:', err)
        }
    }

    useEffect(() => {
        fetchOrders()
        fetchProductsForDropdown()
    }, [page, searchQuery])

    // Listen to real-time database change events for orders, order items, and products
    useEffect(() => {
        const handleDbChange = (e) => {
            const { table } = e.detail || {}
            if (table === 'orders' || table === 'order_items') {
                console.log('[OrdersPage] Real-time sync: orders or order_items table changed. Refetching...')
                const fetchOrdersSilent = async () => {
                    try {
                        const res = await apiClient.get(`/admin/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`)
                        if (res.success) {
                            setOrders(res.data || [])
                            setTotalPages(res.meta?.pagination?.totalPages || 1)
                        }
                    } catch (err) {
                        console.error('Fetch orders error:', err)
                    }
                }
                fetchOrdersSilent()
            }
            if (table === 'products') {
                console.log('[OrdersPage] Real-time sync: products table changed. Refetching dropdown list...')
                fetchProductsForDropdown()
            }
        }
        window.addEventListener('db-change', handleDbChange)
        return () => window.removeEventListener('db-change', handleDbChange)
    }, [page, limit, searchQuery])

    // KPI Summary stats calculated locally
    const stats = useMemo(() => {
        const totalCount = orders.length
        const totalRevenue = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0)
        const pendingCount = orders.filter(o => o.status === 'pending').length
        return { totalCount, totalRevenue, pendingCount }
    }, [orders])

    // Handle view details
    const handleViewDetails = async (id) => {
        setViewingDetailsLoading(true)
        try {
            const res = await apiClient.get(`/admin/orders/${id}`)
            if (res.success) {
                setViewingOrder(res.data)
            }
        } catch (err) {
            console.error('Fetch order details error:', err)
        } finally {
            setViewingDetailsLoading(false)
        }
    }

    // Handle status change dropdown
    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await apiClient.patch(`/admin/orders/${id}/status`, { status: newStatus })
            if (res.success) {
                fetchOrders()
                // If viewing that order right now, update it
                if (viewingOrder && viewingOrder.id === id) {
                    setViewingOrder(prev => ({ ...prev, status: newStatus }))
                }
            } else {
                alert(res.message || 'Failed to update order status.')
            }
        } catch (err) {
            console.error('Status update error:', err)
        }
    }

    // Place Order logic
    const handleOpenCreate = () => {
        setCustomerName('')
        setOrderItems([{ product_id: '', quantity: 1, maxStock: 0, price: 0 }])
        setCreateError('')
        setIsCreateOpen(true)
    }

    const handleAddItemRow = () => {
        setOrderItems(prev => [...prev, { product_id: '', quantity: 1, maxStock: 0, price: 0 }])
    }

    const handleRemoveItemRow = (index) => {
        if (orderItems.length === 1) return
        setOrderItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleRowChange = (index, field, value) => {
        const next = [...orderItems]
        if (field === 'product_id') {
            const prod = products.find(p => p.id === parseInt(value))
            if (prod) {
                next[index] = {
                    product_id: value,
                    quantity: 1,
                    maxStock: parseInt(prod.stock),
                    price: parseFloat(prod.price)
                }
            } else {
                next[index] = { product_id: '', quantity: 1, maxStock: 0, price: 0 }
            }
        } else if (field === 'quantity') {
            next[index].quantity = parseInt(value) || 1
        }
        setOrderItems(next)
    }

    const calculatedTotalOrderAmount = useMemo(() => {
        return orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    }, [orderItems])

    const handleCreateOrderSubmit = async (e) => {
        e.preventDefault()
        if (!customerName.trim()) {
            setCreateError('Customer name is required.')
            return
        }

        // Validate items
        const selectedProducts = orderItems.filter(item => item.product_id !== '')
        if (selectedProducts.length === 0) {
            setCreateError('Please select at least one product.')
            return
        }

        for (const item of selectedProducts) {
            if (item.quantity > item.maxStock) {
                const prod = products.find(p => p.id === parseInt(item.product_id))
                setCreateError(`Insufficient stock for "${prod?.name}". Available: ${item.maxStock}, Selected: ${item.quantity}`)
                return
            }
        }

        setCreateLoading(true)
        setCreateError('')

        try {
            const payload = {
                customer_name: customerName.trim(),
                items: selectedProducts.map(item => ({
                    product_id: parseInt(item.product_id),
                    quantity: item.quantity
                }))
            }

            const res = await apiClient.post('/admin/orders', payload)
            if (res.success) {
                setIsCreateOpen(false)
                fetchOrders()
                fetchProductsForDropdown() // Refresh stocks
            } else {
                setCreateError(res.message || 'Order failed')
            }
        } catch (err) {
            setCreateError(err.message || 'Failed to place order')
        } finally {
            setCreateLoading(false)
        }
    }

    const handleDelete = (id) => {
        setDeletingId(id)
    }

    const confirmDelete = async () => {
        setDeleteLoading(true)
        try {
            const res = await apiClient.delete(`/admin/orders/${deletingId}`)
            if (res.success) {
                setDeletingId(null)
                fetchOrders()
                fetchProductsForDropdown() // Refresh stocks
                if (viewingOrder && viewingOrder.id === deletingId) {
                    setViewingOrder(null)
                }
            }
        } catch (err) {
            console.error('Delete order error:', err)
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders & Billing</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage customer billing accounts, create orders, and check invoices.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Order
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Orders */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-xl">
                        <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Orders</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.totalCount}</h2>
                    </div>
                </div>

                {/* Total Net Revenue */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-success/10 text-success rounded-xl flex items-center justify-center font-bold text-xl">
                        <Receipt className="w-6 h-6 text-success" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Net Revenue</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.totalRevenue.toFixed(2)}</h2>
                    </div>
                </div>

                {/* Pending Invoices */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-warning/10 text-warning rounded-xl flex items-center justify-center font-bold text-xl">
                        <Clock className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Pending Orders</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.pendingCount}</h2>
                    </div>
                </div>
            </div>

            {/* List Table & Search controls */}
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm p-6 space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/20 p-4 rounded-xl border border-border/60">
                    <div className="relative w-full md:max-w-md flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search orders by customer name..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        />
                    </div>
                </div>

                {/* Table list */}
                {/* Table list (Desktop) */}
                <div className="hidden lg:block overflow-x-auto rounded-xl border border-border/60">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 space-y-3 bg-secondary/5">
                            <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No Orders Placed</h3>
                            <p className="text-xs text-muted-foreground">Order receipts and transactional billing lists will appear here.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/40 text-muted-foreground text-xs font-bold uppercase border-b border-border/80">
                                    <th className="py-4 px-6">Order ID</th>
                                    <th className="py-4 px-6">Customer Name</th>
                                    <th className="py-4 px-6">Total Bill</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Date Placed</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-sm">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-secondary/15 transition-all">
                                        <td className="py-4 px-6 font-mono text-xs text-muted-foreground">#ORD-{order.id}</td>
                                        <td className="py-4 px-6 font-semibold text-foreground">{order.customer_name}</td>
                                        <td className="py-4 px-6 font-semibold text-foreground">{parseFloat(order.total_amount).toFixed(2)}</td>
                                        <td className="py-4 px-6">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                className={`text-xs font-bold px-2.5 py-1 rounded-full border bg-card transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20
                                                    ${order.status === 'completed' ? 'text-success border-success/30 bg-success/5' : ''}
                                                    ${order.status === 'shipped' ? 'text-info border-info/30 bg-info/5' : ''}
                                                    ${order.status === 'pending' ? 'text-warning border-warning/30 bg-warning/5' : ''}
                                                    ${order.status === 'cancelled' ? 'text-muted-foreground border-border bg-secondary' : ''}
                                                `}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-6 text-muted-foreground text-xs">
                                            {new Date(order.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(order.id)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/15 transition-colors"
                                                    title="Cancel & Delete Order"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Card list (Mobile) */}
                <div className="block lg:hidden space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-10 bg-secondary/5 border border-border/60 rounded-xl">
                            <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No Orders Placed</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {orders.map((order) => (
                                <div key={order.id} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-4">
                                    {/* Header: Order ID & Status selection */}
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">#ORD-{order.id}</span>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-card transition cursor-pointer focus:outline-none
                                                ${order.status === 'completed' ? 'text-success border-success/30 bg-success/5' : ''}
                                                ${order.status === 'shipped' ? 'text-info border-info/30 bg-info/5' : ''}
                                                ${order.status === 'pending' ? 'text-warning border-warning/30 bg-warning/5' : ''}
                                                ${order.status === 'cancelled' ? 'text-muted-foreground border-border bg-secondary' : ''}
                                            `}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Brief summary */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/40 py-2.5 my-0.5">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Customer</span>
                                            <p className="font-bold text-foreground mt-0.5 truncate">{order.customer_name}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Total Bill</span>
                                            <p className="font-black text-primary mt-0.5">₹{parseFloat(order.total_amount).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleViewDetails(order.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer active:scale-95 border border-primary/10"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View Receipt
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(order.id)}
                                            className="p-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition cursor-pointer active:scale-95"
                                            title="Cancel & Delete Order"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <span className="text-xs text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Order Invoice/Details Modal */}
            {/* View Order Invoice/Details Modal (Desktop) */}
            <div className="hidden lg:block">
                <Modal
                    isOpen={viewingOrder !== null}
                    onClose={() => setViewingOrder(null)}
                    title={viewingOrder ? `Invoice Summary - #ORD-${viewingOrder.id}` : 'Order details'}
                >
                    {viewingOrder && (
                        <div className="space-y-5">
                            {/* Order Metadata info */}
                            <div className="grid grid-cols-2 gap-4 bg-secondary/15 p-4 rounded-xl border border-border/50 text-xs">
                                <div>
                                    <span className="block text-muted-foreground uppercase font-bold text-[10px]">Customer</span>
                                    <span className="text-sm font-semibold text-foreground">{viewingOrder.customer_name}</span>
                                </div>
                                <div>
                                    <span className="block text-muted-foreground uppercase font-bold text-[10px]">Status</span>
                                    <span className="inline-block mt-0.5">
                                        <select
                                            value={viewingOrder.status}
                                            onChange={(e) => handleStatusChange(viewingOrder.id, e.target.value)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-card transition cursor-pointer focus:outline-none
                                                ${viewingOrder.status === 'completed' ? 'text-success border-success/30 bg-success/5' : ''}
                                                ${viewingOrder.status === 'shipped' ? 'text-info border-info/30 bg-info/5' : ''}
                                                ${viewingOrder.status === 'pending' ? 'text-warning border-warning/30 bg-warning/5' : ''}
                                                ${viewingOrder.status === 'cancelled' ? 'text-muted-foreground border-border bg-secondary' : ''}
                                            `}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-muted-foreground uppercase font-bold text-[10px]">Date Placed</span>
                                    <span className="font-medium text-foreground">
                                        {new Date(viewingOrder.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-muted-foreground uppercase font-bold text-[10px]">Grand Total</span>
                                    <span className="text-sm font-black text-primary">{parseFloat(viewingOrder.total_amount).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Order Items subtable */}
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-2">Order Line Items</span>
                                <div className="rounded-xl border border-border/80 overflow-hidden text-xs">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-secondary/40 text-muted-foreground uppercase font-bold border-b border-border/85">
                                                <th className="py-2.5 px-4">Item Name</th>
                                                <th className="py-2.5 px-4">Price</th>
                                                <th className="py-2.5 px-4 text-center">Qty</th>
                                                <th className="py-2.5 px-4 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60 font-medium">
                                            {viewingOrder.items && viewingOrder.items.map((item, i) => (
                                                <tr key={i}>
                                                    <td className="py-2.5 px-4 text-foreground font-semibold">
                                                        {item.product_name || <span className="text-muted-foreground italic font-normal">(Product Deleted)</span>}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground">{parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td className="py-2.5 px-4 text-center text-foreground">{item.quantity}</td>
                                                    <td className="py-2.5 px-4 text-right text-foreground font-bold">
                                                        {(parseFloat(item.unit_price) * parseInt(item.quantity)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end pt-3">
                                <button
                                    onClick={() => setViewingOrder(null)}
                                    className="px-4 py-2 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl cursor-pointer transition active:scale-95"
                                >
                                    Close Invoice
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>

            {/* View Order Invoice/Details Bottom Sheet (Mobile) */}
            {viewingOrder && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop with blur and fade-in */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setViewingOrder(null)}
                    />
                    
                    {/* Slide-up Bottom Sheet Panel */}
                    <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-y-0 animate-in slide-in-from-bottom duration-300">
                        {/* Draggable Handle Indicator */}
                        <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-3 shrink-0" />
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pb-4 border-b border-border/60 shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-foreground">
                                    Invoice - #ORD-{viewingOrder.id}
                                </h2>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Order & billing transaction receipt</p>
                            </div>
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Body Scroll area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Metadata list */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Customer</span>
                                    <span className="font-semibold text-foreground">{viewingOrder.customer_name}</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Grand Total</span>
                                    <span className="font-bold text-primary">₹{parseFloat(viewingOrder.total_amount).toFixed(2)}</span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Date Placed</span>
                                    <span className="font-semibold text-foreground">
                                        {new Date(viewingOrder.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Status</span>
                                    <select
                                        value={viewingOrder.status}
                                        onChange={(e) => handleStatusChange(viewingOrder.id, e.target.value)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-card transition cursor-pointer focus:outline-none w-full text-center
                                            ${viewingOrder.status === 'completed' ? 'text-success border-success/30 bg-success/5' : ''}
                                            ${viewingOrder.status === 'shipped' ? 'text-info border-info/30 bg-info/5' : ''}
                                            ${viewingOrder.status === 'pending' ? 'text-warning border-warning/30 bg-warning/5' : ''}
                                            ${viewingOrder.status === 'cancelled' ? 'text-muted-foreground border-border bg-secondary' : ''}
                                        `}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            {/* Line items list */}
                            <div>
                                <span className="block text-xs font-bold uppercase text-muted-foreground mb-3">Order Line Items</span>
                                <div className="space-y-2.5">
                                    {viewingOrder.items && viewingOrder.items.map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-xl bg-secondary/20 border border-border/50 flex justify-between items-center text-xs">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <h4 className="font-bold text-foreground truncate">
                                                    {item.product_name || <span className="text-muted-foreground italic font-normal">(Product Deleted)</span>}
                                                </h4>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    ₹{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-foreground">
                                                    ₹{(parseFloat(item.unit_price) * parseInt(item.quantity)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer button */}
                        <div className="p-4 border-t border-border/60 flex justify-end shrink-0">
                            <button
                                onClick={() => setViewingOrder(null)}
                                className="px-5 py-2.5 text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground rounded-xl cursor-pointer transition active:scale-95 w-full text-center"
                            >
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Place New Order / Billing Form Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Order"
            >
                <form onSubmit={handleCreateOrderSubmit} className="space-y-4">
                    {createError && (
                        <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
                            {createError}
                        </div>
                    )}

                    {/* Customer */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Customer Name *</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                            required
                        />
                    </div>

                    {/* Dynamic Line items repeater */}
                    <div className="space-y-3.5">
                        <div className="flex justify-between items-center border-b border-border/80 pb-2">
                            <span className="text-xs font-bold uppercase text-muted-foreground">Order Items List</span>
                            <button
                                type="button"
                                onClick={handleAddItemRow}
                                className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {orderItems.map((row, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end bg-secondary/10 p-2.5 rounded-xl border border-border/50">
                                    {/* Select Product */}
                                    <div className="col-span-6">
                                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Select Product</label>
                                        <select
                                            value={row.product_id}
                                            onChange={(e) => handleRowChange(index, 'product_id', e.target.value)}
                                            className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-1 focus:ring-primary/20 focus:border-primary transition outline-none cursor-pointer"
                                            required
                                        >
                                            <option value="">-- Choose Product --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id} disabled={parseInt(p.stock) === 0}>
                                                    {p.name} (Stock: {p.stock} | {parseFloat(p.price).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-3">
                                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={row.maxStock}
                                            value={row.quantity}
                                            onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                                            disabled={!row.product_id}
                                            className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:ring-1 focus:ring-primary/20 focus:border-primary transition outline-none"
                                            required
                                        />
                                    </div>

                                    {/* Subtotal & Delete row */}
                                    <div className="col-span-3 flex items-center justify-between gap-1 pb-1">
                                        <div className="text-right flex-1">
                                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Subtotal</span>
                                            <span className="text-xs font-bold text-foreground">
                                                {(row.price * row.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        {orderItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItemRow(index)}
                                                className="p-1 rounded text-destructive hover:bg-destructive/10 transition cursor-pointer"
                                                title="Remove Item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Aggregate summary info */}
                    <div className="flex justify-between items-center bg-secondary/15 p-4 rounded-xl border border-border/80 text-sm">
                        <span className="font-bold text-muted-foreground">Order Billing Total:</span>
                        <span className="text-lg font-black text-primary">{calculatedTotalOrderAmount.toFixed(2)}</span>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-secondary cursor-pointer transition disabled:opacity-50"
                            disabled={createLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl cursor-pointer transition disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95"
                            disabled={createLoading}
                        >
                            {createLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                            Create Order
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Cancel/Delete order verification dialog */}
            <ConfirmDialog
                isOpen={deletingId !== null}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Cancel & Delete Order?"
                description="Are you sure you want to cancel and delete this order? All items in this order will be deleted from billing and the product stock levels will automatically be restored."
                confirmText="Cancel Order"
                loading={deleteLoading}
            />
        </div>
    )
}
