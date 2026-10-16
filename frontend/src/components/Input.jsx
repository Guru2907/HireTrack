import { useId } from 'react';

export const fieldClasses = (hasError) =>
  `w-full rounded-[5px] border bg-paper-raised px-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors duration-150 focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-danger focus:border-danger focus:ring-danger/15'
      : 'border-line-strong hover:border-ink-faint focus:border-accent focus:ring-accent/15'
  }`;

export function FieldLabel({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-ink-soft">
      {children}
      {required && (
        <span className="text-accent" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function FieldMessage({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} className="mt-1.5 text-[13px] text-danger">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-[13px] text-ink-muted">
        {hint}
      </p>
    );
  }
  return null;
}

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  name,
  placeholder,
  required = false,
  id,
  hint,
  error,
  className = 'mb-4',
  ...rest
}) {
  const autoId = useId();
  const inputId = id || `${name || 'field'}-${autoId}`;
  const messageId = `${inputId}-message`;

  return (
    <div className={className}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`h-10 ${fieldClasses(Boolean(error))}`}
        {...rest}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}
