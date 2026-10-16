import { useId } from 'react';
import { fieldClasses, FieldLabel, FieldMessage } from './Input';

export default function Textarea({
  label,
  value,
  onChange,
  name,
  placeholder,
  rows = 6,
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
      <textarea
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={`resize-y py-2.5 leading-relaxed ${fieldClasses(Boolean(error))}`}
        {...rest}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}
