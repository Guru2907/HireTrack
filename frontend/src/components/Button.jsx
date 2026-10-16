const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover',
  secondary: 'border-line-strong bg-paper-raised text-ink hover:border-ink-muted hover:bg-white',
  ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-paper-sunk hover:text-ink',
  danger: 'border-danger bg-danger text-white hover:border-danger-hover hover:bg-danger-hover',
};
// "closing" was the old red cancel/reset style; it now maps to the neutral secondary style.
VARIANTS.closing = VARIANTS.secondary;

const SIZES = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

// Also used to style <Link>s as buttons.
export const buttonClasses = (variant = 'primary', size = 'md', className = '') =>
  `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`;

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
