'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/utils/api'
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    ShoppingBag,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

export default function ProductsPage() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [limit] = useState(10)
    const [totalPages, setTotalPages] = useState(1)

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [productName, setProductName] = useState('')
    const [productPrice, setProductPrice] = useState('')
    const [productStock, setProductStock] = useState('')
    const [formError, setFormError] = useState('')
    const [submitLoading, setSubmitLoading] = useState(false)

    // Delete State
    const [deletingId, setDeletingId] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const fetchProducts = async () => {
        setLoading(true)
        try {
            const res = await apiClient.get(`/admin/products?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`)
            if (res.success) {
                setProducts(res.data || [])
                setTotalPages(res.meta?.pagination?.totalPages || 1)
            }
        } catch (err) {
            console.error('Fetch products error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts()
    }, [page, searchQuery])

    // Listen to real-time database change events for products
    useEffect(() => {
        const handleDbChange = (e) => {
            const { table } = e.detail || {}
            if (table === 'products') {
                console.log('[ProductsPage] Real-time sync: products table changed. Refetching...')
                const fetchProductsSilent = async () => {
                    try {
                        const res = await apiClient.get(`/admin/products?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`)
                        if (res.success) {
                            setProducts(res.data || [])
                            setTotalPages(res.meta?.pagination?.totalPages || 1)
                        }
                    } catch (err) {
                        console.error('Fetch products error:', err)
                    }
                }
                fetchProductsSilent()
            }
        }
        window.addEventListener('db-change', handleDbChange)
        return () => window.removeEventListener('db-change', handleDbChange)
    }, [page, limit, searchQuery])

    // KPI stats calculated locally
    const stats = useMemo(() => {
        const totalItems = products.length
        const totalStock = products.reduce((acc, p) => acc + parseInt(p.stock || 0), 0)
        const outOfStock = products.filter(p => parseInt(p.stock || 0) === 0).length
        return { totalItems, totalStock, outOfStock }
    }, [products])

    const handleAdd = () => {
        setEditingProduct(null)
        setProductName('')
        setProductPrice('')
        setProductStock('')
        setFormError('')
        setIsModalOpen(true)
    }

    const handleFillFakeData = async () => {
        try {
            const res = await apiClient.get('/testing/fake-data?type=product')
            if (res.success && res.data) {
                setProductName(res.data.name || '')
                setProductPrice(res.data.price !== undefined ? res.data.price.toString() : '')
                setProductStock(res.data.stock !== undefined ? res.data.stock.toString() : '')
                setFormError('')
            }
        } catch (err) {
            console.error('Failed to fill fake product data:', err)
        }
    }

    const handleEdit = (product) => {
        setEditingProduct(product)
        setProductName(product.name || '')
        setProductPrice(product.price !== undefined ? product.price.toString() : '')
        setProductStock(product.stock !== undefined ? product.stock.toString() : '')
        setFormError('')
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!productName.trim()) {
            setFormError('Product name is required')
            return
        }
        if (!productPrice || isNaN(parseFloat(productPrice)) || parseFloat(productPrice) < 0) {
            setFormError('Price must be a positive number')
            return
        }
        if (!productStock || isNaN(parseInt(productStock)) || parseInt(productStock) < 0) {
            setFormError('Stock must be a positive integer')
            return
        }

        setSubmitLoading(true)
        setFormError('')

        try {
            const payload = {
                name: productName.trim(),
                price: parseFloat(productPrice),
                stock: parseInt(productStock)
            }

            let res
            if (editingProduct) {
                res = await apiClient.put(`/admin/products/${editingProduct.id}`, payload)
            } else {
                res = await apiClient.post('/admin/products', payload)
            }

            if (res.success) {
                setIsModalOpen(false)
                fetchProducts()
            } else {
                setFormError(res.message || 'Action failed')
            }
        } catch (err) {
            setFormError(err.message || 'Something went wrong')
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleDelete = (id) => {
        setDeletingId(id)
    }

    const confirmDelete = async () => {
        setDeleteLoading(true)
        try {
            const res = await apiClient.delete(`/admin/products/${deletingId}`)
            if (res.success) {
                setDeletingId(null)
                fetchProducts()
            }
        } catch (err) {
            console.error('Delete error:', err)
        } finally {
            setDeleteLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory & Products</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage products catalog, check stock levels, and edit details.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Product
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Catalog Items */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-xl">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Products</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.totalItems}</h2>
                    </div>
                </div>

                {/* Total Stock Volume */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-info/10 text-info rounded-xl flex items-center justify-center font-bold text-xl">
                        <TrendingUp className="w-6 h-6 text-info" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Stock Quantity</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.totalStock} units</h2>
                    </div>
                </div>

                {/* Out of Stock Card */}
                <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-xl flex items-center justify-center font-bold text-xl">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Out of Stock</span>
                        <h2 className="text-3xl font-black tracking-tight text-foreground mt-0.5">{stats.outOfStock} items</h2>
                    </div>
                </div>
            </div>

            {/* List & Controls Grid */}
            <div className="bg-card border border-border/80 rounded-2xl shadow-sm p-6 space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/20 p-4 rounded-xl border border-border/60">
                    <div className="relative w-full md:max-w-md flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setPage(1)
                            }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                        />
                    </div>
                </div>

                {/* Products Table (Desktop) */}
                <div className="hidden lg:block overflow-x-auto rounded-xl border border-border/60">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20 space-y-3 bg-secondary/5">
                            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No Products Found</h3>
                            <p className="text-xs text-muted-foreground">Get started by adding a product to your inventory.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/40 text-muted-foreground text-xs font-bold uppercase border-b border-border/80">
                                    <th className="py-4 px-6">ID</th>
                                    <th className="py-4 px-6">Product Name</th>
                                    <th className="py-4 px-6">Unit Price</th>
                                    <th className="py-4 px-6">Stock Level</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-sm">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-secondary/15 transition-all">
                                        <td className="py-4 px-6 font-mono text-xs text-muted-foreground">#{product.id}</td>
                                        <td className="py-4 px-6 font-semibold text-foreground">{product.name}</td>
                                        <td className="py-4 px-6 font-medium text-foreground">
                                            {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="py-4 px-6">
                                            {parseInt(product.stock) === 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                                    Out of Stock
                                                </span>
                                            ) : parseInt(product.stock) < 5 ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
                                                    Low Stock ({product.stock})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                                                    In Stock ({product.stock})
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                    title="Edit Product"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/15 transition-colors"
                                                    title="Delete Product"
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
                    ) : products.length === 0 ? (
                        <div className="text-center py-10 bg-secondary/5 border border-border/60 rounded-xl">
                            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30" />
                            <h3 className="text-base font-bold text-foreground">No Products Found</h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map((product) => (
                                <div key={product.id} className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between gap-4">
                                    {/* Header: ID & Name */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <span className="font-mono text-xs text-muted-foreground">#{product.id}</span>
                                            <h3 className="font-bold text-foreground text-sm truncate mt-0.5">{product.name}</h3>
                                        </div>
                                    </div>

                                    {/* Summary details */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-y border-border/40 py-2.5 my-0.5">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Price</span>
                                            <p className="font-bold text-foreground mt-0.5">₹{parseFloat(product.price).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-tight">Stock Level</span>
                                            <div className="mt-0.5">
                                                {parseInt(product.stock) === 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                                        Out of Stock
                                                    </span>
                                                ) : parseInt(product.stock) < 5 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                                                        Low ({product.stock})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                                        In Stock ({product.stock})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(product)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Edit Product
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive transition cursor-pointer active:scale-95"
                                            title="Delete Product"
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

            {/* Product Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/15 text-destructive border border-destructive/20 animate-pulse">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Product Name *</label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g. Smart Watch Active"
                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Unit Price *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                placeholder="e.g. 199.99"
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Initial Stock *</label>
                            <input
                                type="number"
                                min="0"
                                value={productStock}
                                onChange={(e) => setProductStock(e.target.value)}
                                placeholder="e.g. 50"
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={handleFillFakeData}
                            className="mr-auto px-4 py-2 text-sm font-semibold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl cursor-pointer transition flex items-center gap-1.5 active:scale-95"
                            disabled={submitLoading}
                        >
                            Fill Fake Data
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-secondary cursor-pointer transition disabled:opacity-50"
                            disabled={submitLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl cursor-pointer transition disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95"
                            disabled={submitLoading}
                        >
                            {submitLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />}
                            {editingProduct ? 'Save Changes' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deletingId !== null}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Delete Product?"
                description="Are you sure you want to remove this product from the inventory? This cannot be undone."
                confirmText="Delete"
                loading={deleteLoading}
            />
        </div>
    )
}
