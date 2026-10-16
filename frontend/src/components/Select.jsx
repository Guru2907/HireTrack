import { useId } from 'react';
import { fieldClasses, FieldLabel, FieldMessage } from './Input';
import Icon from './Icon';

// options: [{ value, label }]
export default function Select({
  label,
  value,
  onChange,
  name,
  options,
  required = false,
  id,
  hint,
  error,
  className = 'mb-4',
  selectClassName = '',
  ...rest
}) {
  const autoId = useId();
  const selectId = id || `${name || 'select'}-${autoId}`;
  const messageId = `${selectId}-message`;

  return (
    <div className={className}>
      {label && (
        <FieldLabel htmlFor={selectId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`h-10 appearance-none pr-9 ${fieldClasses(Boolean(error))} ${selectClassName}`}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}
