import React, { useState, useRef, useEffect } from 'react';

interface SmartDateInputProps {
  value: string;
  onChange: (e: { target: { value: string; name?: string } }) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  min?: string;
  max?: string;
  [key: string]: unknown;
}

/**
 * Smart date input that supports quick-entry shortcuts like Sage Accounting:
 * - Type just a day (e.g. "16") + Tab → auto-fills current month/year → 2026/04/16
 * - Type day/month (e.g. "16/05") + Tab → auto-fills current year → 2026/05/16
 * - Type full date (e.g. "2026/05/16") → used as-is
 * 
 * Display format: yyyy/mm/dd
 * Value format: YYYY-MM-DD (standard HTML date input format)
 */
export function SmartDateInput({ value, onChange, className, style, placeholder, disabled, name }: SmartDateInputProps) {
  const toDisplay = (val: string): string => {
    if (!val) return '';
    return val.split('T')[0].replace(/-/g, '/');
  };

  const [text, setText] = useState(toDisplay(value));
  const [isFocused, setIsFocused] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setText(toDisplay(value));
    }
  }, [value, isFocused]);

  const smartComplete = (input: string): string => {
    const s = input.trim();
    if (!s) return '';

    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');

    // Just a day number: 1-31
    if (/^\d{1,2}$/.test(s)) {
      const day = parseInt(s);
      if (day >= 1 && day <= 31) {
        return `${y}/${m}/${day.toString().padStart(2, '0')}`;
      }
    }

    // dd/mm format
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) {
      const [d, mo] = s.split('/');
      const day = parseInt(d);
      const month = parseInt(mo);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${y}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
      }
    }

    // Full yyyy/mm/dd
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
      const [yr, mo, d] = s.split('/');
      return `${yr}/${mo.padStart(2, '0')}/${d.padStart(2, '0')}`;
    }

    // Full yyyy-mm-dd (with dashes)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const [yr, mo, d] = s.split('-');
      return `${yr}/${mo.padStart(2, '0')}/${d.padStart(2, '0')}`;
    }

    return s;
  };

  const fireChange = (displayStr: string) => {
    const completed = smartComplete(displayStr);
    setText(completed);

    if (!completed) {
      onChange({ target: { value: '', name } });
      return;
    }

    // Convert yyyy/mm/dd display to YYYY-MM-DD value
    const isoVal = completed.replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoVal)) {
      const testDate = new Date(isoVal + 'T00:00:00');
      if (!isNaN(testDate.getTime())) {
        onChange({ target: { value: isoVal, name } });
        return;
      }
    }
    // Invalid date — revert to previous value
    setText(toDisplay(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    fireChange(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fireChange(text);
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setText(toDisplay(v));
    onChange({ target: { value: v, name } });
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        className={className}
        style={{ ...style, paddingRight: '2.5rem' }}
        placeholder={placeholder || 'yyyy/mm/dd'}
        disabled={disabled}
        name={name}
      />
      {/* Calendar icon (visual only, clicks pass through to hidden date input) */}
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {/* Hidden native date picker - overlays the calendar icon area for click */}
      <input
        ref={datePickerRef}
        type="date"
        value={value ? value.split('T')[0] : ''}
        onChange={handlePickerChange}
        className="absolute right-0 top-0 h-full w-10 opacity-0 cursor-pointer"
        tabIndex={-1}
        disabled={disabled}
      />
    </div>
  );
}
