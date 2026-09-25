'use client'

import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/utils/api'
import {
    Plus,
    Pencil,
    Trash2,
    Folder,
    FolderPlus,
    ChevronRight,
    ChevronDown,
    Upload,
    X,
    FolderTree,
    Loader2,
    Shuffle
} from 'lucide-react'

export default function CategoriesPage() {
    const [allCategories, setAllCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [expandedNodes, setExpandedNodes] = useState({})

    // Shuffling States
    const [isShuffled, setIsShuffled] = useState(false)
    const [shuffledWeights, setShuffledWeights] = useState({})

    // Drag and Drop States
    const [draggedNode, setDraggedNode] = useState(null)
    const [dragOverNodeId, setDragOverNodeId] = useState(null)
    const [isDraggingOverRoot, setIsDraggingOverRoot] = useState(false)

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState(null)
    const [activeParentCategory, setActiveParentCategory] = useState(null)
    const [categoryName, setCategoryName] = useState('')
    const [categoryDescription, setCategoryDescription] = useState('')
    const [categoryImage, setCategoryImage] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const [imageAction, setImageAction] = useState('none') // 'none' | 'upload' | 'remove'
    const [formError, setFormError] = useState('')
    const [submitLoading, setSubmitLoading] = useState(false)

    // Delete Modal State
    const [deletingCategory, setDeletingCategory] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Fetch all categories on mount
    const fetchAllCategories = async () => {
        setLoading(true)
        try {
            const res = await apiClient.get('/admin/categories?parentId=all')
            if (res.success) {
                setAllCategories(res.data || [])
            }
        } catch (err) {
            console.error('Fetch all categories error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllCategories()
    }, [])

    // Listen to real-time database change events for categories
    useEffect(() => {
        const handleDbChange = (e) => {
            const { table } = e.detail || {}
            if (table === 'categories') {
                console.log('[CategoriesPage] Real-time sync: categories table changed. Refetching...')
                const fetchAllCategoriesSilent = async () => {
                    try {
                        const res = await apiClient.get('/admin/categories?parentId=all')
                        if (res.success) {
                            setAllCategories(res.data || [])
                        }
                    } catch (err) {
                        console.error('Fetch all categories error:', err)
                    }
                }
                fetchAllCategoriesSilent()
            }
        }
        window.addEventListener('db-change', handleDbChange)
        return () => window.removeEventListener('db-change', handleDbChange)
    }, [])

    // Shuffling Toggle Handler
    const handleShuffleToggle = () => {
        if (!isShuffled) {
            const weights = {}
            allCategories.forEach(cat => {
                weights[cat.id] = Math.random()
            })
            setShuffledWeights(weights)
            setIsShuffled(true)
        } else {
            setIsShuffled(false)
            setShuffledWeights({})
        }
    }

    // Sync weights for new categories when shuffled mode is active
    useEffect(() => {
        if (isShuffled) {
            let updated = false
            const newWeights = { ...shuffledWeights }
            allCategories.forEach(cat => {
                if (newWeights[cat.id] === undefined) {
                    newWeights[cat.id] = Math.random()
                    updated = true
                }
            })
            if (updated) {
                setShuffledWeights(newWeights)
            }
        }
    }, [allCategories, isShuffled, shuffledWeights])

    // Build Category Tree hierarchy on the client side
    const categoryTree = useMemo(() => {
        const map = {}
        allCategories.forEach(cat => {
            map[cat.id] = { ...cat, children: [] }
        })
        const roots = []
        allCategories.forEach(cat => {
            const node = map[cat.id]
            const pId = cat.parent_id ?? cat.parentId
            if (pId === null || pId === 'null' || pId === undefined || pId === '') {
                roots.push(node)
            } else {
                const parentNode = map[pId]
                if (parentNode) {
                    parentNode.children.push(node)
                } else {
                    roots.push(node) // orphan falls back to root
                }
            }
        })
        return roots
    }, [allCategories])

    // Helper: sort tree recursively based on shuffledWeights
    const sortTree = (nodes, weights) => {
        const sorted = [...nodes].sort((a, b) => {
            const wA = weights[a.id] ?? 0
            const wB = weights[b.id] ?? 0
            return wA - wB
        })
        return sorted.map(node => {
            if (node.children && node.children.length > 0) {
                return {
                    ...node,
                    children: sortTree(node.children, weights)
                }
            }
            return node
        })
    }

    // Shuffled version of Category Tree
    const displayCategoryTree = useMemo(() => {
        if (isShuffled) {
            return sortTree(categoryTree, shuffledWeights)
        }
        return categoryTree
    }, [categoryTree, isShuffled, shuffledWeights])

    // Drag-and-Drop Handlers
    const handleDragStart = (e, node) => {
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'move'
        // Delay state update so the browser captures the drag image and starts the drag operation first
        setTimeout(() => {
            setDraggedNode(node)
        }, 0)
    }

    const handleDragEnd = () => {
        setDraggedNode(null)
        setDragOverNodeId(null)
        setIsDraggingOverRoot(false)
    }

    const handleDragOverNode = (e) => {
        e.preventDefault()
    }

    const handleDragEnterNode = (e, nodeId) => {
        e.preventDefault()
        e.stopPropagation()
        if (draggedNode && String(draggedNode.id) !== String(nodeId)) {
            setDragOverNodeId(nodeId)
        }
    }

    const handleDragLeaveNode = (e) => {
        e.stopPropagation()
        setDragOverNodeId(null)
    }

    // Helper: checks if 'parent' is a descendant of 'childId' (loop check)
    const isDescendant = (parent, childId) => {
        if (!parent || !parent.children) return false
        return parent.children.some(child => String(child.id) === String(childId) || isDescendant(child, childId))
    }

    // Helper: calculates the total height of a subtree recursively (leaf = 1)
    const getSubtreeHeight = (node) => {
        if (!node.children || node.children.length === 0) return 1
        return 1 + Math.max(...node.children.map(getSubtreeHeight))
    }

    // Helper: calculates depth of a category node in database list (1-indexed)
    const getNodeDepth = (catId) => {
        const cat = allCategories.find(c => String(c.id) === String(catId))
        const pId = cat ? (cat.parent_id ?? cat.parentId) : null
        if (!cat || pId === null || pId === 'null' || !pId) return 1
        return 1 + getNodeDepth(pId)
    }

    const updateCategoryParent = async (draggedId, parentId) => {
        setLoading(true)
        try {
            const res = await apiClient.put(`/admin/categories/${draggedId}`, {
                parentId: String(parentId)
            })

            if (res.success) {
                if (parentId !== 'null' && parentId !== null) {
                    setExpandedNodes(prev => ({ ...prev, [parentId]: true }))
                }
                fetchAllCategories()
            } else {
                alert(res.message || 'Failed to update category parent.')
            }
        } catch (err) {
            console.error('Drag and drop category update error:', err)
            alert('Something went wrong while reordering.')
        } finally {
            setLoading(false)
        }
    }

    const handleDropAsChild = async (e, targetNode) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOverNodeId(null)
        setDraggedNode(null)
        setIsDraggingOverRoot(false)

        if (!draggedNode) return
        if (String(draggedNode.id) === String(targetNode.id)) return

        // 1. Loop validation
        if (isDescendant(draggedNode, targetNode.id)) {
            alert('Cannot move a category inside its own subcategories.')
            return
        }

        // 2. Depth validation (Max 3 levels allowed)
        const targetDepth = getNodeDepth(targetNode.id)
        const subtreeHeight = getSubtreeHeight(draggedNode)

        if (targetDepth + subtreeHeight > 3) {
            alert(`Cannot move category: Exceeds the maximum catalog depth of 3 levels. Drop target depth is Level ${targetDepth}, and the dragged category height is ${subtreeHeight} levels.`)
            return
        }

        // 3. Persist re-parenting change
        await updateCategoryParent(draggedNode.id, targetNode.id)
    }

    const handleDropAsSibling = async (e, targetNode) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOverNodeId(null)
        setDraggedNode(null)
        setIsDraggingOverRoot(false)

        if (!draggedNode) return
        if (String(draggedNode.id) === String(targetNode.id)) return

        // Sibling means sharing the target's parent ID
        const targetParentId = targetNode.parent_id ?? targetNode.parentId ?? 'null'

        // 1. Loop validation
        if (targetParentId !== 'null' && (String(targetParentId) === String(draggedNode.id) || isDescendant(draggedNode, targetParentId))) {
            alert('Cannot move a category inside its own subcategories.')
            return
        }

        // 2. Depth validation
        const targetParentDepth = targetParentId === 'null' ? 0 : getNodeDepth(targetParentId)
        const subtreeHeight = getSubtreeHeight(draggedNode)

        if (targetParentDepth + subtreeHeight > 3) {
            alert(`Cannot move category: Exceeds the maximum catalog depth of 3 levels. Sibling target parent depth is Level ${targetParentDepth}, and the dragged category height is ${subtreeHeight} levels.`)
            return
        }

        // 3. Persist re-parenting change
        await updateCategoryParent(draggedNode.id, targetParentId)
    }

    const handleDropRoot = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOverRoot(false)
        setDragOverNodeId(null)
        setDraggedNode(null)

        if (!draggedNode) return

        await updateCategoryParent(draggedNode.id, 'null')
    }

    const toggleExpand = (id) => {
        setExpandedNodes(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const expandAll = () => {
        const newExpanded = {}
        allCategories.forEach(cat => {
            newExpanded[cat.id] = true
        })
        setExpandedNodes(newExpanded)
    }

    const collapseAll = () => {
        setExpandedNodes({})
    }

    const handleAddClick = () => {
        setEditingCategory(null)
        setActiveParentCategory(null)
        setCategoryName('')
        setCategoryDescription('')
        setCategoryImage(null)
        setImagePreview('')
        setImageAction('none')
        setFormError('')
        setIsModalOpen(true)
    }

    const generateFakerCategory = () => {
        const adjectives = ['Smart', 'Eco-Friendly', 'Urban', 'Pro', 'Ultra-Slim', 'Digital', 'NextGen', 'Prime', 'Elite', 'Global', 'Organic', 'Vintage', 'Modern', 'Luxury', 'Essential', 'Hyper', 'Wireless', 'Compact', 'Precision', 'Aesthetic'];
        const categoriesList = ['Electronics', 'Wearables', 'Laptops', 'Footwear', 'Home Decor', 'Kitchenware', 'Skincare', 'Fitness Gear', 'Automotive', 'Stationery', 'Jewelry', 'Audio Systems', 'Gaming Accessories', 'Lighting', 'Bags & Luggage', 'Toys & Games', 'Furniture', 'Outdoor Equipment'];
        const suffixes = ['Collection', 'Series', 'Hub', 'Essentials', 'Studio', 'Line', 'Catalog', 'Zone', 'Boutique', 'Express', 'Craft', 'Lab'];

        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const cat = categoriesList[Math.floor(Math.random() * categoriesList.length)];
        const suf = suffixes[Math.floor(Math.random() * suffixes.length)];

        const name = Math.random() > 0.4 ? `${adj} ${cat}` : `${adj} ${cat} ${suf}`;

        const verbs = ['Discover', 'Explore', 'Browse', 'Unveil', 'Experience our curated'];
        const qualities = ['premium quality', 'hand-crafted', 'next-generation', 'bestselling', 'eco-conscious', 'high-performance', 'top-rated'];
        const verb = verbs[Math.floor(Math.random() * verbs.length)];
        const quality = qualities[Math.floor(Math.random() * qualities.length)];

        const description = `${verb} ${quality} ${cat.toLowerCase()} designed for modern living and everyday efficiency.`;

        const sampleImages = [
            'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1566454825481-4e48f80aa4d7?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
        ];
        const image_url = sampleImages[Math.floor(Math.random() * sampleImages.length)];

        return { name, description, image_url };
    };

    const handleFillFakeData = async () => {
        try {
            const res = await apiClient.get('/testing/fake-data?type=category').catch(() => null);
            if (res && res.success && res.data) {
                setCategoryName(res.data.name || '');
                setCategoryDescription(res.data.description || '');
                setImagePreview(res.data.image_url || '');
                setImageAction(res.data.image_url ? 'upload' : 'none');
                setFormError('');
                return;
            }
        } catch (err) {}

        const fakeData = generateFakerCategory();
        setCategoryName(fakeData.name);
        setCategoryDescription(fakeData.description);
        setImagePreview(fakeData.image_url);
        setImageAction('upload');
        setFormError('');
    };

    const handleAddSubClick = (node) => {
        setEditingCategory(null)
        setActiveParentCategory(node)
        setCategoryName('')
        setCategoryDescription('')
        setCategoryImage(null)
        setImagePreview('')
        setImageAction('none')
        setFormError('')

        // Ensure this parent node is expanded so user sees their new creation immediately
        setExpandedNodes(prev => ({ ...prev, [node.id]: true }))
        setIsModalOpen(true)
    }

    const handleEditClick = (category, e) => {
        if (e) e.stopPropagation()
        setEditingCategory(category)
        setActiveParentCategory(null)
        setCategoryName(category.name || '')
        setCategoryDescription(category.description || '')
        setCategoryImage(null)
        setImageAction('none')
        
        if (category.image_url) {
            setImagePreview(category.image_url.startsWith('http') ? category.image_url : `/${category.image_url.replace(/^\/+/, '')}`)
        } else {
            setImagePreview('')
        }
        
        setFormError('')
        setIsModalOpen(true)
    }

    const handleDeleteClick = (category, e) => {
        if (e) e.stopPropagation()
        setDeletingCategory(category)
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setCategoryImage(file)
        setImageAction('upload')
        
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleRemovePreview = () => {
        setCategoryImage(null)
        setImagePreview('')
        setImageAction('remove')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!categoryName.trim()) {
            setFormError('Category name is required')
            return
        }

        setSubmitLoading(true)
        setFormError('')

        // Determine parentId based on nesting
        let parentId = 'null'
        if (editingCategory) {
            parentId = editingCategory.parent_id || editingCategory.parentId || 'null'
        } else {
            parentId = activeParentCategory ? activeParentCategory.id : 'null'
        }

        try {
            const formData = new FormData()
            formData.append('name', categoryName.trim())
            formData.append('description', categoryDescription.trim())
            formData.append('parentId', String(parentId))
            formData.append('primaryImageAction', imageAction)

            if (imageAction === 'upload' && categoryImage) {
                formData.append('primary_image_file', categoryImage)
            }

            let res
            if (editingCategory) {
                res = await apiClient.upload(`/admin/categories/${editingCategory.id}`, formData, 'PUT')
            } else {
                res = await apiClient.upload('/admin/categories', formData, 'POST')
            }

            if (res.success) {
                setIsModalOpen(false)
                fetchAllCategories()
            } else {
                setFormError(res.message || 'Action failed')
            }
        } catch (err) {
            setFormError(err.message || 'Something went wrong')
        } finally {
            setSubmitLoading(false)
        }
    }

    const confirmDelete = async () => {
        if (!deletingCategory) return
        setDeleteLoading(true)
        try {
            const res = await apiClient.delete(`/admin/categories/${deletingCategory.id}`)
            if (res.success) {
                setDeletingCategory(null)
                fetchAllCategories()
            } else {
                alert(res.message || 'Failed to delete category')
            }
        } catch (err) {
            console.error('Delete category error:', err)
        } finally {
            setDeleteLoading(false)
        }
    }

    // Modal title helper
    const getModalTitle = () => {
        if (editingCategory) return 'Edit Category Details'
        if (!activeParentCategory) return 'Add Parent Category (Level 1)'
        
        const getDepth = (catId) => {
            const cat = allCategories.find(c => String(c.id) === String(catId))
            const pId = cat ? (cat.parent_id ?? cat.parentId) : null
            if (!cat || pId === null || pId === 'null' || !pId) return 1
            return 1 + getDepth(pId)
        }
        
        const parentDepth = getDepth(activeParentCategory.id)
        if (parentDepth === 1) return `Add Sub-category under "${activeParentCategory.name}"`
        return `Add Sub-subcategory under "${activeParentCategory.name}"`
    }

    // Recursive Tree Node Renderer
    const renderNode = (node, depth = 0) => {
        const hasChildren = node.children && node.children.length > 0
        const isExpanded = !!expandedNodes[node.id]
        const hasImg = !!node.image_url
        const imgUrl = hasImg ? (node.image_url.startsWith('http') ? node.image_url : `/${node.image_url.replace(/^\/+/, '')}`) : ''

        const isDragOver = String(dragOverNodeId) === String(node.id)
        const isCurrentlyDragged = draggedNode && String(draggedNode.id) === String(node.id)

        return (
            <div 
                key={node.id} 
                className="w-full"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOverNode}
                onDragEnter={(e) => handleDragEnterNode(e, node.id)}
                onDragLeave={handleDragLeaveNode}
                onDrop={(e) => handleDropAsChild(e, node)}
            >
                {/* Node Row */}
                <div className={`relative flex flex-row items-center justify-between p-3.5 border-b border-border/40 transition-all duration-150 gap-3 ${
                    isDragOver && !isCurrentlyDragged
                        ? 'bg-primary/10 border-l-4 border-l-primary scale-[1.01]' 
                        : isCurrentlyDragged 
                            ? 'opacity-40 bg-secondary/5 cursor-grabbing' 
                            : 'hover:bg-secondary/10 cursor-grab'
                }`}>
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {/* Expand/Collapse Chevron */}
                        <button
                            type="button"
                            onClick={() => toggleExpand(node.id)}
                            className={`p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer text-muted-foreground ${!hasChildren ? 'opacity-20 cursor-default' : ''}`}
                            disabled={!hasChildren}
                        >
                            {isExpanded && hasChildren ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {/* Cover thumbnail */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-border/80 bg-secondary/15 flex items-center justify-center shrink-0">
                            {hasImg ? (
                                <img
                                    src={imgUrl}
                                    alt={node.name}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />
                            ) : (
                                <Folder className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-muted-foreground/50" />
                            )}
                        </div>

                        {/* Name, Badge, Count & Description */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-xs sm:text-sm truncate">{node.name}</span>
                                {hasChildren && (
                                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                        {node.children.length}
                                    </span>
                                )}
                                <span className="hidden sm:inline px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-secondary text-foreground border border-border/60">
                                    Level {depth + 1}
                                </span>
                            </div>
                            <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-sm sm:max-w-md mt-0.5">
                                {node.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons / Drop Targets */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {draggedNode && !isCurrentlyDragged ? (
                            <div className="flex items-center gap-1.5">
                                <div 
                                    onDragOver={handleDragOverNode}
                                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverNodeId(node.id) }}
                                    onDragLeave={(e) => { e.stopPropagation(); setDragOverNodeId(null) }}
                                    onDrop={(e) => handleDropAsSibling(e, node)}
                                    className={`px-2 py-1.5 sm:px-3 sm:py-1.5 border-2 border-dashed text-[10px] font-bold rounded-lg transition select-none flex items-center gap-1 cursor-pointer ${
                                        isDragOver 
                                            ? 'border-primary bg-primary/20 text-primary scale-105' 
                                            : 'border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10'
                                    }`}
                                    title="Drop as Sibling"
                                >
                                    <FolderTree className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Drop Sibling</span>
                                </div>
                                {depth < 2 && (
                                    <div 
                                        onDragOver={handleDragOverNode}
                                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverNodeId(node.id + '-child') }}
                                        onDragLeave={(e) => { e.stopPropagation(); setDragOverNodeId(null) }}
                                        onDrop={(e) => handleDropAsChild(e, node)}
                                        className={`px-2 py-1.5 sm:px-3 sm:py-1.5 border-2 border-dashed text-[10px] font-bold rounded-lg transition select-none flex items-center gap-1 cursor-pointer ${
                                            dragOverNodeId === node.id + '-child'
                                                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-500 scale-105' 
                                                : 'border-indigo-500/40 bg-indigo-500/5 text-indigo-500 hover:border-indigo-500 hover:bg-indigo-500/10'
                                        }`}
                                        title="Drop as Sub"
                                    >
                                        <FolderPlus className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Drop Sub</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Only allow adding subcategories up to 3 levels deep (Level 1 and 2 can have children) */}
                                {depth < 2 && (
                                    <button
                                        onClick={() => handleAddSubClick(node)}
                                        className="px-2 py-1 text-primary hover:bg-primary/10 transition active:scale-95 rounded-lg border border-primary/20 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                        title="Add sub-category"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Add Sub</span>
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleEditClick(node, e)}
                                    className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition active:scale-95 rounded-lg border border-border/60 cursor-pointer"
                                    title="Edit details"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(node, e)}
                                    className="p-1.5 sm:p-2 text-destructive hover:bg-destructive/10 transition active:scale-95 rounded-lg border border-destructive/20 cursor-pointer"
                                    title="Delete category"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Recursive Children Rendering */}
                {isExpanded && hasChildren && (
                    <div className="border-l border-border/30 pl-2.5 ml-3.5 sm:pl-4 sm:ml-8">
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-full bg-background p-4 lg:p-6 space-y-6 animate-in fade-in duration-200">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/60">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                        <FolderTree className="w-6 h-6 text-primary" />
                        Categories Catalog
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Manage and re-parent category folders visually by dragging and dropping them into parent categories or out to Level 1.
                    </p>
                </div>
            </div>

            {/* Top-Level Root Drop Zone (visible when dragging subcategories) */}
            {draggedNode && (draggedNode.parent_id || draggedNode.parentId) && (
                <div
                    onDragOver={handleDragOverNode}
                    onDragEnter={() => setIsDraggingOverRoot(true)}
                    onDragLeave={() => setIsDraggingOverRoot(false)}
                    onDrop={handleDropRoot}
                    className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[90%] p-6 border-2 border-dashed rounded-2xl text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-2xl backdrop-blur-md ${
                        isDraggingOverRoot
                            ? 'border-primary bg-primary/20 text-primary scale-105 shadow-primary/10'
                            : 'border-primary bg-card/90 text-primary'
                    }`}
                >
                    <FolderPlus className="w-4 h-4 animate-bounce" />
                    Drop here to move "{draggedNode.name}" out to Top-level (Level 1)
                </div>
            )}

            {/* Tree Navigation Toolbar */}
            <div className="bg-card border border-border/85 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={expandAll}
                        className="flex-1 sm:flex-initial text-center justify-center px-3.5 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-bold text-xs rounded-xl transition active:scale-98 cursor-pointer border border-border/60 shadow-sm"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="flex-1 sm:flex-initial text-center justify-center px-3.5 py-2 bg-secondary text-foreground hover:bg-secondary/80 font-bold text-xs rounded-xl transition active:scale-98 cursor-pointer border border-border/60 shadow-sm"
                    >
                        Collapse All
                    </button>
                    <button
                        type="button"
                        onClick={handleShuffleToggle}
                        className={`w-full sm:w-auto px-3.5 py-2 font-bold text-xs rounded-xl transition active:scale-98 cursor-pointer border flex items-center justify-center gap-1.5 shadow-sm ${
                            isShuffled
                                ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm'
                                : 'bg-secondary text-foreground hover:bg-secondary/80 border-border/60'
                        }`}
                        title={isShuffled ? "Reset categories order" : "Shuffle categories randomly"}
                    >
                        <Shuffle className="w-3.5 h-3.5" />
                        {isShuffled ? 'Reset Order' : 'Shuffle Categories'}
                    </button>
                </div>

                <button
                    onClick={handleAddClick}
                    className="w-full sm:w-auto py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/95 transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Top-level Category
                </button>
            </div>

            {/* Collapsible Tree Container */}
            <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                
                {/* Header Tag */}
                <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-primary" />
                        Categories Catalog Hierarchy Tree
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20">
                        Interactive View
                    </span>
                </div>

                {loading ? (
                    <div className="py-24 text-center">
                        <Loader2 className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto text-primary" />
                        <p className="mt-3 text-xs text-muted-foreground animate-pulse">Scanning database category lists...</p>
                    </div>
                ) : displayCategoryTree.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center p-6">
                        <FolderTree className="w-12 h-12 text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-bold text-foreground">No Categories Found</h3>
                        <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-xs leading-relaxed">
                            No categories are defined in the catalog structure yet. Create your first top-level category to get started.
                        </p>
                        <button
                            onClick={handleAddClick}
                            className="px-3.5 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 transition active:scale-98 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Define Category
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-border/20">
                        {displayCategoryTree.map(rootNode => renderNode(rootNode, 0))}
                    </div>
                )}
            </div>

            {/* Category Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={getModalTitle()}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {formError && (
                        <div className="p-3 text-xs font-semibold rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                            {formError}
                        </div>
                    )}

                    {!editingCategory && activeParentCategory && (
                        <div className="p-3 bg-secondary/10 border border-border/80 rounded-xl flex items-center gap-2">
                            <Folder className="w-4 h-4 text-primary shrink-0" />
                            <div className="text-xs">
                                <span className="text-muted-foreground block text-[9px] font-bold uppercase tracking-wider">Placement Location</span>
                                <span className="font-semibold text-foreground">Under {activeParentCategory.name}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider">Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Electronics, Laptops, Android"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Explain what products fit inside this category catalog..."
                            value={categoryDescription}
                            onChange={(e) => setCategoryDescription(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase text-muted-foreground tracking-wider">Category Thumbnail Image</label>
                        
                        {imagePreview ? (
                            <div className="relative rounded-xl border border-border overflow-hidden bg-secondary/15 flex items-center justify-center p-2 shadow-inner aspect-[16/10] max-h-48 w-full mx-auto">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="max-h-full max-w-full object-contain rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemovePreview}
                                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl bg-secondary/10 hover:bg-secondary/15 transition cursor-pointer text-center group">
                                <Upload className="w-8 h-8 text-muted-foreground/60 group-hover:text-primary transition-colors mb-2" />
                                <span className="text-xs font-bold text-foreground">Upload Thumbnail Graphic</span>
                                <span className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG, GIF up to 5MB</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="sr-only"
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-border/60">
                        <button
                            type="button"
                            onClick={handleFillFakeData}
                            disabled={submitLoading}
                            className="w-full sm:w-auto py-2.5 px-3.5 text-xs font-bold rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
                        >
                            ✨ Fill Fake Data
                        </button>
                        <div className="flex flex-1 gap-2.5">
                            <button
                                type="button"
                                disabled={submitLoading}
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                {submitLoading ? (
                                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FolderPlus className="w-4 h-4" />
                                )}
                                {editingCategory ? 'Update' : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Confirm Recursive Cascade Delete */}
            <ConfirmDialog
                isOpen={!!deletingCategory}
                onClose={() => setDeletingCategory(null)}
                onConfirm={confirmDelete}
                title="Delete Category?"
                description={
                    deletingCategory
                        ? `Are you sure you want to delete "${deletingCategory.name}"? WARNING: Any child subcategories nested inside it will also be permanently deleted.`
                        : ''
                }
                confirmText="Delete Category"
                confirmVariant="danger"
                loading={deleteLoading}
            />

        </div>
    )
}
