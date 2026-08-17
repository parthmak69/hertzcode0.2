'use client'

import ReactDatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function DatePicker({
  label,
  selected,
  onChange,
  placeholder = 'Select date',
  showTimeSelect = false,
  dateFormat = 'MMM d, yyyy',
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1 text-foreground">
          {label}
        </label>
      )}

      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholder}
        showTimeSelect={showTimeSelect}
        dateFormat={showTimeSelect ? 'MMM d, yyyy h:mm aa' : dateFormat}
        className="
                    w-full px-3 py-2 rounded-lg border transition-colors
                    bg-input border-border text-foreground
                    placeholder:text-muted-foreground
                    focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring
                "
        {...props}
      />

      <style jsx global>{`
                .react-datepicker {
                    font-family: inherit;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                    background: var(--card);
                    border: 1px solid var(--border);
                    color: var(--foreground);
                }

                .react-datepicker__header {
                    background: var(--secondary);
                    border-bottom: 1px solid var(--border);
                    border-radius: 12px 12px 0 0;
                    padding-top: 12px;
                }

                .react-datepicker__current-month {
                    color: var(--foreground);
                    font-weight: 600;
                }

                .react-datepicker__day-name {
                    color: var(--muted-foreground);
                }

                .react-datepicker__day {
                    color: var(--foreground);
                    border-radius: 8px;
                }

                .react-datepicker__day:hover {
                    background: var(--secondary);
                }

                .react-datepicker__day--selected {
                    background: var(--primary) !important;
                    color: var(--primary-foreground) !important;
                }

                .react-datepicker__day--keyboard-selected {
                    background: var(--secondary);
                }

                .react-datepicker__triangle {
                    display: none;
                }

                .react-datepicker__navigation-icon::before {
                    border-color: var(--muted-foreground);
                }

                .react-datepicker__time-container {
                    border-left: 1px solid var(--border);
                }

                .react-datepicker__time-list-item {
                    color: var(--foreground);
                }

                .react-datepicker__time-list-item:hover {
                    background: var(--secondary) !important;
                }

                .react-datepicker__time-list-item--selected {
                    background: var(--primary) !important;
                    color: var(--primary-foreground) !important;
                }

                .react-datepicker-popper {
                    z-index: 50;
                }
            `}</style>
    </div>
  )
}
