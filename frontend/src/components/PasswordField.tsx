import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

/**
 * Labeled password input with a show/hide toggle. Used for Password
 * and Confirm Password fields on the Login/Registration pages.
 */
const PasswordField = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full px-4 py-2.5 pr-11 text-sm rounded-lg border outline-none transition-colors bg-white text-black placeholder:text-gray-400 ${
            error
              ? "border-red-400 focus:border-red-500"
              : "border-gray-300 focus:border-blue-600"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors cursor-pointer"
        >
          {visible ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordField;
