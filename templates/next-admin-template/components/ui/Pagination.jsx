'use client'

/** Sentinel value for "view all" - fetches up to this many items */
export const ITEMS_PER_PAGE_ALL = 99999
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, ITEMS_PER_PAGE_ALL]

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    onItemsPerPageChange,
}) {
    const getPageNumbers = () => {
        const pages = []
        const showPages = 5
        let start = Math.max(1, currentPage - Math.floor(showPages / 2))
        let end = Math.min(totalPages, start + showPages - 1)
        if (end - start + 1 < showPages)
            start = Math.max(1, end - showPages + 1)

        for (let i = start; i <= end; i++) pages.push(i)
        return pages
    }

    const baseIconBtn =
        'p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer'

    const pageBtn =
        'w-8 h-8 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer'

    const activePageBtn =
        'w-8 h-8 rounded-lg text-sm font-medium bg-primary text-primary-foreground cursor-pointer shadow-sm'

    const startItem =
        totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1

    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    return (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4">

            {/* Items Info + Per Page Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    {startItem}-{endItem} of {totalItems}
                </span>

                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-1 cursor-pointer rounded-md border border-border text-xs font-medium bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary hover:bg-secondary/50 transition-colors"
                >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                        <option
                            key={n}
                            value={n}
                            className="bg-card text-foreground"
                        >
                            {n >= ITEMS_PER_PAGE_ALL ? 'All' : n}
                        </option>
                    ))}
                </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-0.5">

                {/* First */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={baseIconBtn}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>

                {/* Previous */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={baseIconBtn}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={currentPage === page ? activePageBtn : pageBtn}
                    >
                        {page}
                    </button>
                ))}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={baseIconBtn}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Last */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={baseIconBtn}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>

            </div>
        </div>
    )
}
