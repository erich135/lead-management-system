import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password entry that stays hidden until the eye is pressed.
 * Toggling visibility does not change the text already typed.
 */
export function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  required = false,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        className={className}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </>
  );
}
