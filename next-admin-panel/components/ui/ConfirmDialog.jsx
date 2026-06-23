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
    type = "danger", // success | warning | danger | info
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmText = "Confirm",
    cancelText = "Cancel",
    loading = false,
}) {
    const config = iconMap[type] || iconMap.danger
    const Icon = config.icon

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
                    {description}
                </p>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-lg bg-muted text-foreground cursor-pointer hover:opacity-80 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition cursor-pointer disabled:opacity-50
              ${type === "danger"
                                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                </div>

            </div>

        </Modal>
    )
}