'use client'

/* -------------------------------------------------------------------------- */
/*                                  INPUT                                     */
/* -------------------------------------------------------------------------- */

export function Input({ label, required, error, helperText, className = '', ...props }) {
    const inputClass = `
    w-full px-3 py-2 rounded-lg border transition-all duration-200 text-sm
    bg-secondary/30 border-border text-foreground
    placeholder:text-muted-foreground/50
    focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-card
    ${error ? 'border-destructive focus:ring-destructive' : ''}
    ${className}
  `

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 text-foreground">
                    {label} {required && '*'}
                </label>
            )}
            <input className={inputClass} required={required} {...props} />
            {error && (
                <p className="mt-1 text-xs text-destructive">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
            )}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*                                  SELECT                                    */
/* -------------------------------------------------------------------------- */

export function Select({
    label,
    required,
    options = [],
    placeholder,
    className = '',
    ...props
}) {
    const safeValue = props.value ?? ''
    const shouldShowEmptyOption = placeholder || safeValue === ''
    const emptyOptionLabel = placeholder || 'Select an option'
    const inputClass = `
    w-full px-3 py-2 rounded-lg border transition-all duration-200 text-sm
    bg-secondary/30 border-border text-foreground cursor-pointer
    focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-card
    ${className}
  `

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 text-foreground">
                    {label} {required && '*'}
                </label>
            )}

            <select className={inputClass} required={required} {...props} value={safeValue}>
                {shouldShowEmptyOption && (
                    <option value="">
                        {emptyOptionLabel}
                    </option>
                )}

                {options.map((opt) => (
                    <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-card text-foreground"
                    >
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*                                 TEXTAREA                                   */
/* -------------------------------------------------------------------------- */

export function Textarea({ label, required, error, helperText, className = '', ...props }) {
    const inputClass = `
    w-full px-3 py-2 rounded-lg border transition-all duration-200 text-sm
    bg-secondary/30 border-border text-foreground
    placeholder:text-muted-foreground/50
    focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-card
    ${error ? 'border-destructive focus:ring-destructive' : ''}
    ${className}
  `

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 text-foreground">
                    {label} {required && '*'}
                </label>
            )}
            <textarea className={inputClass} required={required} {...props} />
            {error && (
                <p className="mt-1 text-xs text-destructive">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
            )}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*                                 CHECKBOX                                   */
/* -------------------------------------------------------------------------- */

export function Checkbox({ label, description, className = '', ...props }) {
    return (
        <label
            className={`flex items-start gap-3 cursor-pointer text-foreground ${className}`}
        >
            <input
                type="checkbox"
                className="
          mt-1 w-4 h-4 rounded
          border-border bg-input
          text-primary
          focus:ring-2 focus:ring-ring
        "
                {...props}
            />

            <div>
                <span className="text-sm font-medium">{label}</span>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {description}
                    </p>
                )}
            </div>
        </label>
    )
}

/* -------------------------------------------------------------------------- */
/*                                RADIO GROUP                                 */
/* -------------------------------------------------------------------------- */

export function RadioGroup({
    label,
    name,
    options = [],
    value,
    onChange,
}) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-2 text-foreground">
                    {label}
                </label>
            )}

            <div className="flex flex-wrap gap-4">
                {options.map((opt) => (
                    <label
                        key={opt.value}
                        className="flex items-center gap-2 cursor-pointer text-foreground"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={opt.value}
                            checked={value === opt.value}
                            onChange={onChange}
                            className="
                w-4 h-4
                border-border
                text-primary
                focus:ring-2 focus:ring-ring
              "
                        />
                        <span className="text-sm">{opt.label}</span>
                    </label>
                ))}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*                               RANGE SLIDER                                 */
/* -------------------------------------------------------------------------- */

export function RangeSlider({
    label,
    min = 0,
    max = 100,
    value,
    onChange,
    unit = '',
}) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 text-foreground">
                    {label}
                </label>
            )}

            <input
                type="range"
                min={min}
                max={max}
                value={value || min}
                onChange={onChange}
                className="
          w-full h-2 rounded-lg appearance-none cursor-pointer
          bg-secondary
        "
            />

            <div className="text-xs mt-1 text-muted-foreground">
                {value || min} {unit}
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*                               FORM SECTION                                 */
/* -------------------------------------------------------------------------- */

export function FormSection({ title, children }) {
    return (
        <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
            {title && (
                <h3 className="text-base font-semibold mb-4 pb-3 border-b border-border/50 text-foreground">
                    {title}
                </h3>
            )}
            {children}
        </div>
    )
}
