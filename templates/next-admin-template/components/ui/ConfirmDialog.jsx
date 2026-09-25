"use client"

import Modal from "@/components/ui/Modal"
import { CheckCircle2, AlertTriangle, Info, Trash2 } from "lucide-react"

const iconMap = {
    success: {
        icon: CheckCircle2,
        bg: "bg-green-500/10",
        color: "text-green-500",
    },
    warning: {
        icon: AlertTriangle,
        bg: "bg-yellow-500/10",
        color: "text-yellow-500",
    },
    danger: {
        icon: Trash2,
        bg: "bg-destructive/10",
        color: "text-destructive",
    },
    info: {
        icon: Info,
        bg: "bg-primary/10",
        color: "text-primary",
    },
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    type,
    confirmVariant = "danger", // fallback for confirmVariant
    title = "Are you sure?",
    description,
    message, // support legacy 'message'
    confirmText = "Confirm",
    cancelText = "Cancel",
    loading = false,
}) {
    const dialogType = type || confirmVariant || "danger"
    const config = iconMap[dialogType] || iconMap.danger
    const Icon = config.icon
    const dialogText = description || message || "This action cannot be undone."

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" showHeader={false} >

            <div className="p-6 text-center space-y-6">

                {/* Icon */}
                <div className="flex justify-center">
                    <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${config.bg}`}
                    >
                        <Icon className={`w-8 h-8 ${config.color}`} />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-foreground">
                    {title}
                </h2>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {dialogText}
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40 mt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-border/80 bg-secondary text-foreground text-xs sm:text-sm font-bold cursor-pointer hover:bg-secondary/80 transition active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 ${
                            dialogType === "danger"
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>

            </div>

        </Modal>
    )
}