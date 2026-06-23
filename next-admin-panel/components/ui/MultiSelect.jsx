'use client'

import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'

export default function MultiSelect({
    label,
    options = [],
    value = [],
    onChange,
    placeholder = 'Select...',
    isMulti = true,
    maxSelected = null,
    allowCustomValues = false,
    ...props
}) {
    const customStyles = {
        control: (base, state) => ({
            ...base,
            background: 'var(--datatable-bg)',
            borderColor: state.isFocused
                ? 'var(--ring)'
                : 'var(--datatable-border-strong)',
            borderRadius: 10,
            minHeight: 42,
            boxShadow: state.isFocused
                ? '0 0 0 1px var(--ring)'
                : 'none',
            transition: 'all 0.15s ease',
            '&:hover': {
                borderColor: state.isFocused
                    ? 'var(--ring)'
                    : 'var(--datatable-border-strong)',
            },
        }),

        menu: (base) => ({
            ...base,
            background: 'var(--card)',
            border: '1px solid var(--datatable-border-strong)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
            zIndex: 50,
        }),

        option: (base, state) => ({
            ...base,
            background: state.isSelected
                ? 'var(--datatable-accent)'
                : state.isFocused
                    ? 'var(--datatable-hover)'
                    : 'transparent',
            color: state.isSelected
                ? 'white'
                : 'var(--foreground)',
            cursor: 'pointer',
        }),

        multiValue: (base) => ({
            ...base,
            background: 'var(--datatable-row-alt)',
            borderRadius: 6,
        }),

        multiValueLabel: (base) => ({
            ...base,
            color: 'var(--foreground)',
            fontSize: 13,
        }),

        multiValueRemove: (base) => ({
            ...base,
            color: 'var(--muted-foreground)',
            ':hover': {
                background: 'var(--datatable-hover)',
                color: 'var(--foreground)',
            },
        }),

        input: (base) => ({
            ...base,
            color: 'var(--foreground)',
        }),

        placeholder: (base) => ({
            ...base,
            color: 'var(--muted-foreground)',
        }),

        singleValue: (base) => ({
            ...base,
            color: 'var(--foreground)',
        }),

        indicatorSeparator: () => ({ display: 'none' }),

        dropdownIndicator: (base) => ({
            ...base,
            color: 'var(--muted-foreground)',
            ':hover': {
                color: 'var(--foreground)',
            },
        }),
    }

    const baseOptions = options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    )

    const valueArr = isMulti
        ? Array.isArray(value)
            ? value
            : value
                ? [value]
                : []
        : value
            ? [value]
            : []

    const valueOptionSet = new Set(baseOptions.map((o) => String(o.value)))

    const extraOptions = valueArr
        .filter((v) => v != null && v !== '' && !valueOptionSet.has(String(v)))
        .map((v) => ({ value: String(v), label: String(v) }))

    const selectOptions = extraOptions.length
        ? [...baseOptions, ...extraOptions]
        : baseOptions

    const selectValue = isMulti
        ? selectOptions.filter((o) => valueArr.includes(o.value))
        : selectOptions.find((o) => o.value === value) || null

    const handleChange = (selected) => {
        if (isMulti) {
            const selectedValues = selected?.map((s) => s.value) || []
            if (maxSelected && selectedValues.length > maxSelected) return
            onChange(selectedValues)
        } else {
            onChange(selected?.value || '')
        }
    }

    const SelectComponent = allowCustomValues ? CreatableSelect : Select

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium mb-1 text-foreground">
                    {label}
                </label>
            )}

            <SelectComponent
                options={selectOptions}
                value={selectValue}
                onChange={handleChange}
                isMulti={isMulti}
                placeholder={placeholder}
                styles={customStyles}
                classNamePrefix="react-select"
                {...props}
            />
        </div>
    )
}
