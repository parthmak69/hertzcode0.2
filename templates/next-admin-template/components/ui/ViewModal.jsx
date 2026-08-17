'use client'

import Modal from './Modal'

export default function ViewModal({
    isOpen,
    onClose,
    title = 'Details',
    data,
    schema = [],
    size = 'md',
}) {
    if (!data) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size={size}
        >
            <div className="space-y-6 text-sm">

                {schema.map((section, i) => (
                    <div key={i}>

                        {section.title && (
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                {section.title}
                            </h3>
                        )}

                        <div className="grid grid-cols-2 gap-4">

                            {section.fields.map((field) => {

                                const value =
                                    typeof field.render === 'function'
                                        ? field.render(data)
                                        : data[field.key]

                                return (
                                    <div key={field.key}>
                                        <p className="text-muted-foreground">
                                            {field.label}
                                        </p>

                                        <div className="font-medium text-foreground mt-0.5">
                                            {value ?? '—'}
                                        </div>
                                    </div>
                                )
                            })}

                        </div>
                    </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-foreground"
                    >
                        Close
                    </button>
                </div>

            </div>
        </Modal>
    )
}