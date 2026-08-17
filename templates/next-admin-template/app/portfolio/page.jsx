'use client'

import { useState, useEffect, useMemo } from 'react'
import useAdminCrud from '@/hooks/useAdminCrud'
import PortfolioModal from '@/components/modals/PortfolioModal'
import PortfolioCategoryModal from '@/components/modals/PortfolioCategoryModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { apiClient } from '@/utils/api'
import { 
    Plus, 
    Search, 
    ExternalLink, 
    Pencil, 
    Trash2, 
    Grid, 
    ImageIcon, 
    AlertCircle, 
    Loader2,
    CheckSquare,
    Square,
    Folder,
    ChevronRight,
    ArrowLeft,
    Shuffle
} from 'lucide-react'

// Tab definitions for Categories
const CATEGORY_TABS = [
    { label: 'All', value: '' },
    { label: 'Development', value: 'Development' },
    { label: 'Design', value: 'Design' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Productivity', value: 'Productivity' },
    { label: 'Others', value: 'Others' }
]

export default function PortfolioPage() {
    const [selectedCategory, setSelectedCategory] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(12)

    // Dynamic portfolio categories list state
    const [portfolioCategories, setPortfolioCategories] = useState([])
    const [catsLoading, setCatsLoading] = useState(false)

    const fetchPortfolioCategories = async () => {
        setCatsLoading(true)
        try {
            const res = await apiClient.get('/admin/portfolio-categories')
            if (res.success) {
                setPortfolioCategories(res.data || [])
            }
        } catch (err) {
            console.error('Fetch portfolio categories error:', err)
        } finally {
            setCatsLoading(false)
        }
    }

    useEffect(() => {
        fetchPortfolioCategories()
    }, [])

    // Listen to real-time database change events for portfolio categories
    useEffect(() => {
        const handleDbChange = (e) => {
            const { table } = e.detail || {}
            if (table === 'portfolio_categories') {
                console.log('[PortfolioPage] Real-time sync: portfolio_categories table changed. Refetching...')
                fetchPortfolioCategories()
            }
        }
        window.addEventListener('db-change', handleDbChange)
        return () => window.removeEventListener('db-change', handleDbChange)
    }, [])

    const {
        data,
        loading,
        create,
        update,
        remove,
        removeBulk,
        patchItem,
        refetch
    } = useAdminCrud({
        endpoint: '/admin/portfolio',
        fetchEndpoint: '/admin/portfolio?limit=1000', // Load all cards to build category summaries and client-side folder drilldowns
        defaultSort: { key: 'id', direction: 'desc' }
    })

    const categoriesList = useMemo(() => {
        return portfolioCategories.map(cat => cat.name)
    }, [portfolioCategories])

    // Reset selected IDs when category changes
    useEffect(() => {
        setSelectedIds([])
    }, [selectedCategory])

    // Calculate categories summary dynamically on the client side
    const categoriesSummary = useMemo(() => {
        return portfolioCategories.map(cat => {
            const items = data.filter(card => card.category === cat.name)
            const firstCardWithImage = items.find(card => card.image_url)
            const coverImage = cat.image_url || (firstCardWithImage ? firstCardWithImage.image_url : null)
            
            return {
                id: cat.id,
                category: cat.name,
                count: items.length,
                cover_image: coverImage
            }
        })
    }, [data, portfolioCategories])

    // Filter items based on selected category and search query
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchesCategory = item.category === selectedCategory
            const matchesSearch = searchQuery
                ? item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                : true
            return matchesCategory && matchesSearch
        })
    }, [data, selectedCategory, searchQuery])

    const [isShuffled, setIsShuffled] = useState(false)
    const [shuffledList, setShuffledList] = useState([])
    const [draggedIndex, setDraggedIndex] = useState(null)

    // Folder shuffling states
    const [isFolderShuffled, setIsFolderShuffled] = useState(false)
    const [shuffledFoldersList, setShuffledFoldersList] = useState([])
    const [draggedFolderIndex, setDraggedFolderIndex] = useState(null)

    // Fisher-Yates Shuffle algorithm
    const shuffleArray = (array) => {
        const arr = [...array]
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr
    }

    const handleShuffleToggle = () => {
        if (!isShuffled) {
            setShuffledList(shuffleArray(filteredData))
            setIsShuffled(true)
        } else {
            setIsShuffled(false)
            setShuffledList([])
        }
    }

    // Reset shuffle/drag ONLY when filters change, NOT when data updates!
    useEffect(() => {
        setIsShuffled(false)
        setShuffledList([])
    }, [selectedCategory, searchQuery])

    const displayData = useMemo(() => {
        if (isShuffled) {
            // Map the shuffled list IDs to the latest data values so we get latest toggle status, etc.
            const mappedList = shuffledList
                .map(shuffledItem => data.find(item => item.id === shuffledItem.id))
                .filter(Boolean)
            
            // Find any new items in filteredData that aren't in mappedList
            const newItems = filteredData.filter(item => !shuffledList.some(s => s.id === item.id))
            return [...mappedList, ...newItems]
        }
        return filteredData
    }, [isShuffled, shuffledList, data, filteredData])

    // Drag-and-drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.style.opacity = '0.5'
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return

        const listToReorder = isShuffled ? [...shuffledList] : [...filteredData]
        
        const realDraggedIndex = (currentPage - 1) * itemsPerPage + draggedIndex
        const realTargetIndex = (currentPage - 1) * itemsPerPage + index
        
        const draggedItem = listToReorder[realDraggedIndex]
        listToReorder.splice(realDraggedIndex, 1)
        listToReorder.splice(realTargetIndex, 0, draggedItem)

        setShuffledList(listToReorder)
        setIsShuffled(true)
    }

    const handleDragEnd = (e) => {
        setDraggedIndex(null)
        e.currentTarget.style.opacity = '1'
    }

    // Folder shuffling & Drag-and-drop handlers
    const handleFolderShuffleToggle = () => {
        if (!isFolderShuffled) {
            setShuffledFoldersList(shuffleArray(categoriesSummary))
            setIsFolderShuffled(true)
        } else {
            setIsFolderShuffled(false)
            setShuffledFoldersList([])
        }
    }

    const displayFolders = useMemo(() => {
        if (isFolderShuffled) {
            const mappedFolders = shuffledFoldersList
                .map(shuffledFolder => categoriesSummary.find(folder => folder.category === shuffledFolder.category))
                .filter(Boolean)
            
            const newFolders = categoriesSummary.filter(folder => !shuffledFoldersList.some(sf => sf.category === folder.category))
            return [...mappedFolders, ...newFolders]
        }
        return categoriesSummary
    }, [isFolderShuffled, shuffledFoldersList, categoriesSummary])

    const handleFolderDragStart = (e, index) => {
        setDraggedFolderIndex(index)
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.style.opacity = '0.5'
    }

    const handleFolderDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleFolderDrop = (e, index) => {
        e.preventDefault()
        if (draggedFolderIndex === null || draggedFolderIndex === index) return

        const listToReorder = isFolderShuffled ? [...shuffledFoldersList] : [...categoriesSummary]
        
        const draggedItem = listToReorder[draggedFolderIndex]
        listToReorder.splice(draggedFolderIndex, 1)
        listToReorder.splice(index, 0, draggedItem)

        setShuffledFoldersList(listToReorder)
        setIsFolderShuffled(true)
    }

    const handleFolderDragEnd = (e) => {
        setDraggedFolderIndex(null)
        e.currentTarget.style.opacity = '1'
    }

    // Client-side pagination
    const paginatedData = useMemo(() => {
        const realStart = (currentPage - 1) * itemsPerPage
        return displayData.slice(realStart, realStart + itemsPerPage)
    }, [displayData, currentPage, itemsPerPage])

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const totalItems = filteredData.length
    const startIndex = (currentPage - 1) * itemsPerPage

    // Selection states (for bulk actions)
    const [selectedIds, setSelectedIds] = useState([])

    // Modal and Confirmation Dialog states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRecord, setEditingRecord] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [deletingCategoryItem, setDeletingCategoryItem] = useState(null)

    const [isCatModalOpen, setIsCatModalOpen] = useState(false)

    const handleSaveCategory = async (formData) => {
        try {
            const res = await apiClient.upload('/admin/portfolio-categories', formData)
            if (res.success) {
                fetchPortfolioCategories()
                return true
            }
            return false
        } catch (err) {
            console.error('[Portfolio Page Save Category Error]', err)
            return false
        }
    }

    // Handle search query updates
    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearchQuery(value)
        setCurrentPage(1)
    }

    // Handle card select checkbox
    const toggleSelectCard = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const selectableIds = useMemo(() => {
        return filteredData.map(item => item.id)
    }, [filteredData])

    const isAllSelected = useMemo(() => {
        return selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id))
    }, [selectableIds, selectedIds])

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)))
        } else {
            setSelectedIds(prev => {
                const next = [...prev]
                selectableIds.forEach(id => {
                    if (!next.includes(id)) {
                        next.push(id)
                    }
                })
                return next
            })
        }
    }

    // Toggle active switch
    const handleToggleActive = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 1 ? 0 : 1
            await patchItem(id, { switch_active: newStatus })
        } catch (err) {
            console.error('[Portfolio Page Toggle Error]', err)
        }
    }

    // Save modal records
    const handleSaveRecord = async (formData) => {
        try {
            let res
            if (editingRecord) {
                res = await update(editingRecord.id, formData, true)
            } else {
                res = await create(formData, true)
            }
            return res?.success
        } catch (err) {
            console.error('[Portfolio Page Save Error]', err)
            return false
        }
    }


    // Delete single card
    const handleDeleteRecord = async () => {
        if (!deletingId) return
        try {
            const res = await remove(deletingId)
            if (res.success) {
                setSelectedIds(selectedIds.filter(id => id !== deletingId))
            }
        } catch (err) {
            console.error('[Portfolio Page Delete Error]', err)
        } finally {
            setDeletingId(null)
        }
    }

    // Delete category folder
    const handleDeleteCategory = async () => {
        if (!deletingCategoryItem) return
        try {
            const res = await apiClient.delete(`/admin/portfolio-categories/${deletingCategoryItem.id}`)
            if (res.success) {
                fetchPortfolioCategories()
                refetch()
            }
        } catch (err) {
            console.error('[Portfolio Page Delete Category Error]', err)
        } finally {
            setDeletingCategoryItem(null)
        }
    }

    // Delete multiple cards
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return
        try {
            const res = await removeBulk(selectedIds)
            if (res.success) {
                setSelectedIds([])
            }
        } catch (err) {
            console.error('[Portfolio Page Bulk Delete Error]', err)
        } finally {
            setBulkDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Heading Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-sm animate-in fade-in duration-200">
                <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Portfolio Cards</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage grid layout images, links, active toggles, and metadata items.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    {!selectedCategory && categoriesSummary.length > 1 && (
                        <button
                            onClick={handleFolderShuffleToggle}
                            className={`px-4 py-2.5 text-sm font-semibold rounded-xl border transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto ${
                                isFolderShuffled
                                    ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm'
                                    : 'bg-secondary text-foreground hover:bg-secondary/80 border border-border/60'
                            }`}
                            title={isFolderShuffled ? "Reset folders order" : "Shuffle folders randomly"}
                        >
                            <Shuffle className="w-4 h-4" />
                            {isFolderShuffled ? 'Reset Folders' : 'Shuffle Folders'}
                        </button>
                    )}
                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="w-full sm:w-auto px-4 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 font-semibold rounded-xl transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-border/60 shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4 text-primary" />
                        Add Category Folder
                    </button>
                    <button
                        onClick={() => {
                            setEditingRecord(null)
                            setIsModalOpen(true)
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/95 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Portfolio Card
                    </button>
                </div>
            </div>

            {/* CONDITIONAL RENDERING: Root Folders vs Drilldown Sub-cards */}
            {!selectedCategory ? (
                /* ROOT CATEGORIES GRID VIEW */
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : categoriesSummary.length === 0 ? (
                        <div className="text-center py-20 border border-dashed rounded-2xl border-border/80 bg-card">
                            <Folder className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                            <h3 className="text-base font-bold text-foreground">No Category Folders Found</h3>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first category folder to start organizing portfolio cards.</p>
                            <button
                                onClick={() => setIsCatModalOpen(true)}
                                className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 transition active:scale-98 cursor-pointer flex items-center gap-1.5 mx-auto shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Create Folder
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2 animate-in fade-in duration-300">
                            {displayFolders.map((sum, index) => (
                                <div
                                    key={sum.category}
                                    draggable
                                    onDragStart={(e) => handleFolderDragStart(e, index)}
                                    onDragOver={(e) => handleFolderDragOver(e, index)}
                                    onDrop={(e) => handleFolderDrop(e, index)}
                                    onDragEnd={handleFolderDragEnd}
                                    onClick={() => {
                                        setSelectedCategory(sum.category)
                                        setSearchQuery('')
                                        setCurrentPage(1)
                                    }}
                                    className="group bg-card rounded-2xl border border-border/85 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/45 hover:-translate-y-1 transition-all duration-300 cursor-move select-none"
                                >
                                    {/* Cover Thumbnail */}
                                    <div className="relative aspect-video w-full overflow-hidden bg-muted/40 border-b border-border/40">
                                        {sum.cover_image ? (
                                            <img
                                                src={sum.cover_image.startsWith('http') ? sum.cover_image : `http://localhost:5001/${sum.cover_image}`}
                                                alt={sum.category}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/15 text-muted-foreground group-hover:bg-primary/[0.03]">
                                                <Folder className="w-10 h-10 opacity-30 text-primary group-hover:scale-110 transition-transform duration-300" />
                                                <span className="text-[10px] font-semibold mt-1 opacity-70">No cover image</span>
                                            </div>
                                        )}
                                        {sum.count > 0 && (
                                            <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-background/90 border border-border/40 text-foreground backdrop-blur-md shadow-sm">
                                                {sum.count} items
                                            </span>
                                        )}

                                        {/* Delete Category Button overlay on hover */}
                                        {sum.id && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation() // Prevent opening category details
                                                    setDeletingCategoryItem(sum)
                                                }}
                                                className="absolute top-3 right-3 p-1.5 rounded-lg bg-destructive/80 hover:bg-destructive text-white border border-destructive/20 backdrop-blur-sm shadow-sm transition active:scale-95 cursor-pointer opacity-0 group-hover:opacity-100 z-10"
                                                title="Delete category folder"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Folder Details Footer */}
                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200 truncate">
                                                {sum.category}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* SUBCARDS DRILLDOWN VIEW */
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Breadcrumbs actions bar */}
                    <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/80 shadow-sm text-sm">
                        <div className="flex items-center gap-2 font-semibold">
                            <button 
                                onClick={() => setSelectedCategory('')} 
                                className="text-muted-foreground hover:text-primary transition cursor-pointer flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                All Categories
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                            <span className="text-foreground font-bold">{selectedCategory}</span>
                        </div>
                    </div>

                    {/* Search and Selection Filters header */}
                    <div className="bg-card border border-border/80 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary/20 p-4 rounded-xl border border-border/60">
                            {/* Search Field */}
                            <div className="relative flex-1 max-w-md w-full">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    placeholder={`Search in ${selectedCategory}...`}
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground text-xs font-semibold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Select All and Bulk Actions */}
                            <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                                {searchQuery.trim() && (
                                    <span className="text-xs text-muted-foreground font-medium bg-background px-3 py-1 rounded-full border border-border hidden sm:inline-block">
                                        Found {filteredData.length} matches
                                    </span>
                                )}

                                {filteredData.length > 1 && (
                                    <button
                                        onClick={handleShuffleToggle}
                                        className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                                            isShuffled
                                                ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm'
                                                : 'bg-background border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
                                        }`}
                                        title={isShuffled ? "Reset default sorting order" : "Shuffle cards randomly"}
                                    >
                                        <Shuffle className="w-4 h-4" />
                                        {isShuffled ? 'Reset Order' : 'Shuffle'}
                                    </button>
                                )}

                                {selectableIds.length > 0 && (
                                    <button
                                        onClick={toggleSelectAll}
                                        className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-background border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-2"
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Square className="w-4 h-4" />
                                        )}
                                        Select All
                                    </button>
                                )}

                                {selectedIds.length > 0 && (
                                    <button
                                        onClick={() => setBulkDeleting(true)}
                                        className="px-4 py-2.5 text-xs font-bold rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Selected ({selectedIds.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Cards Grid */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="text-center py-20 border border-dashed rounded-2xl border-border/80">
                                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                <h3 className="text-base font-bold text-foreground">No Cards Found</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {searchQuery ? 'Adjust your search query to find matching cards.' : 'Add your first portfolio card to this category.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
                                {paginatedData.map((item, index) => {
                                    const isSelected = selectedIds.includes(item.id)
                                    return (
                                        <div 
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`group bg-card rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-move hover:scale-[1.01] ${
                                                isSelected 
                                                    ? 'border-primary shadow shadow-primary/10 bg-primary/[0.01]' 
                                                    : 'border-border/80 shadow-sm hover:shadow-md hover:border-primary/20'
                                            }`}
                                        >
                                            {/* Card Header Image overlay */}
                                            <div className="relative aspect-video w-full overflow-hidden bg-muted/40 border-b border-border/40 select-none">
                                                {item.image_url ? (
                                                    <img
                                                        src={`http://localhost:5001/${item.image_url}`}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 text-muted-foreground">
                                                        <ImageIcon className="w-10 h-10 opacity-40 group-hover:scale-110 transition-transform duration-300" />
                                                        <span className="text-[10px] font-semibold mt-1">No cover image</span>
                                                    </div>
                                                )}

                                                {/* Selection floating checkbox */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleSelectCard(item.id)
                                                    }}
                                                    className={`absolute top-3 left-3 p-1.5 rounded-lg border backdrop-blur-md shadow-sm transition active:scale-95 cursor-pointer z-10 ${
                                                        isSelected
                                                            ? 'bg-background/95 text-primary border-primary/45'
                                                            : 'bg-background/50 border-border/40 hover:bg-background/90 text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100'
                                                    }`}
                                                    title={isSelected ? "Deselect card" : "Select card"}
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Floating Delete button overlay on hover */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDeletingId(item.id)
                                                    }}
                                                    className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-destructive/80 hover:bg-destructive text-white border border-destructive/20 backdrop-blur-sm shadow-sm transition active:scale-95 cursor-pointer opacity-0 group-hover:opacity-100 z-10"
                                                    title="Delete card"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Switch active toggle overlay */}
                                                <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/85 border border-border/40 backdrop-blur-md shadow-sm flex items-center justify-center">
                                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.switch_active === 1}
                                                            onChange={() => handleToggleActive(item.id, item.switch_active)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-7 h-4 bg-border/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Card content */}
                                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                                                <div className="space-y-1.5">
                                                    <h3 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors duration-200">
                                                        {item.title}
                                                    </h3>
                                                    {item.description ? (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {item.description}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground/40 italic">
                                                            No description provided
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action bottom drawer links/buttons */}
                                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                setEditingRecord(item)
                                                                setIsModalOpen(true)
                                                            }}
                                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition active:scale-95 cursor-pointer"
                                                            title="Edit card"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(item.id)}
                                                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition active:scale-95 cursor-pointer"
                                                            title="Delete card"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {item.button_link && (
                                                        <a
                                                            href={item.button_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2.5 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground text-xs font-semibold tracking-wide transition flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                                                        >
                                                            <span>Link</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Pagination component rendering in drilldown view */}
                        {totalPages > 1 && (
                            <div className="flex justify-center pt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Modal form */}
            <PortfolioModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingRecord(null)
                }}
                onSave={handleSaveRecord}
                record={editingRecord}
                defaultCategory={selectedCategory}
                categoriesList={categoriesList}
                onCategoryAdded={fetchPortfolioCategories}
            />

            {/* Create Category Modal */}
            <PortfolioCategoryModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                onSave={handleSaveCategory}
            />

            {/* Delete single Card Dialog */}
            <ConfirmDialog
                isOpen={deletingId !== null}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDeleteRecord}
                title="Delete Card"
                message="Are you sure you want to delete this portfolio card? This database operation is irreversible."
            />

            {/* Bulk Delete Cards Dialog */}
            <ConfirmDialog
                isOpen={bulkDeleting}
                onClose={() => setBulkDeleting(false)}
                onConfirm={handleBulkDelete}
                title="Delete Selected Cards"
                message={`Are you sure you want to delete ${selectedIds.length} portfolio cards? This operation is permanent.`}
            />
            {/* Delete Category Dialog */}
            <ConfirmDialog
                isOpen={deletingCategoryItem !== null}
                onClose={() => setDeletingCategoryItem(null)}
                onConfirm={handleDeleteCategory}
                title="Delete Category Folder"
                message={`Are you sure you want to delete the category folder "${deletingCategoryItem?.category}"? This will remove the category listing. Any items in this category will remain but will not belong to this folder anymore.`}
            />
        </div>
    )
}
