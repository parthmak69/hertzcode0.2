'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiClient } from '@/utils/api';
import { toast } from '@/components/ui/Toast';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  Loader2,
  DollarSign,
  Layers
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete State
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/products');
      if (res.success) {
        setProducts(res.data || []);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name || '');
      setPrice(product.price !== undefined ? String(product.price) : '');
      setStock(product.stock !== undefined ? String(product.stock) : '');
      setImage(product.image || product.photo || product.image_url || product.primary_image_url || '');
    } else {
      setEditingProduct(null);
      setName('');
      setPrice('');
      setStock('');
      setImage('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price) || 0.00,
        stock: parseInt(stock) || 0,
        image: image.trim(),
        photo: image.trim(),
        image_url: image.trim()
      };

      let res;
      if (editingProduct) {
        res = await apiClient.put(`/admin/products/${editingProduct.id}`, payload);
      } else {
        res = await apiClient.post('/admin/products', payload);
      }

      if (res.success) {
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Product submit error:', err);
      toast.error('Something went wrong');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const targetId = typeof deletingProduct === 'object' ? (deletingProduct.id || deletingProduct._id) : deletingProduct;
    if (!targetId) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(`/admin/products/${targetId}`);
      if (res.success) {
        toast.success('Product deleted successfully');
        setDeletingProduct(null);
        fetchProducts();
      } else {
        toast.error(res.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Delete product error:', err);
      toast.error('Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Products Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your store items, prices, and stock inventory.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/95 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Total Items: <span className="text-foreground font-bold">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No products found</p>
            <p className="text-xs mt-1">Create your first product item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/40 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Photo</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Price ($)</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredProducts.map((item) => {
                  const imgPath = item.photo || item.image || item.image_url || item.primary_image_url || '';
                  const imgSrc = imgPath ? (imgPath.startsWith('http') || imgPath.startsWith('data:') ? imgPath : imgPath.startsWith('/') ? imgPath : `/${imgPath}`) : '';

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition">
                      <td className="px-6 py-4 font-semibold text-xs text-muted-foreground">#{item.id}</td>
                      <td className="px-6 py-4">
                        {imgSrc ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-secondary/40">
                            <img
                              src={imgSrc}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center bg-secondary/60 text-muted-foreground">
                              <Package className="w-5 h-5 opacity-40" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-border bg-secondary/40 flex items-center justify-center text-muted-foreground">
                            <Package className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">{item.name}</td>
                      <td className="px-6 py-4 font-semibold text-primary">${parseFloat(item.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          (item.stock || 0) > 10 ? 'bg-emerald-500/10 text-emerald-600' : (item.stock || 0) > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {item.stock || 0} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                          title="Edit product"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(item)}
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Noise-Canceling Headphones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Product Image URL / Upload Path</label>
            <input
              type="text"
              placeholder="e.g. /uploads/products/headphone.jpg or https://..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="99.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Stock Quantity *</label>
              <input
                type="number"
                placeholder="50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border/60 hover:bg-muted/40 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition flex items-center gap-1.5"
            >
              {submitLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingProduct ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}
