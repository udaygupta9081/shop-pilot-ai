export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

/**
 * Shared labeled text input used by the Login/Registration pages
 * (Name, Email fields). Not used by the Search page, which has its own
 * search-specific input.
 */
const TextField = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  autoComplete,
}: TextFieldProps) => {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-4 py-2.5 text-sm rounded-lg border outline-none transition-colors bg-white text-black placeholder:text-gray-400 ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-gray-300 focus:border-blue-600"
        }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextField;
