export interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent',
  secondary: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400 border-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
};

export default function Button({
  label,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  ariaLabel,
}: ButtonProps) {
  const isInactive = disabled || loading;

  return (
    <button
      type="button"
      onClick={isInactive ? undefined : onClick}
      disabled={isInactive}
      aria-label={ariaLabel}
      aria-disabled={isInactive}
      aria-busy={loading}
      className={`
        inline-flex items-center justify-center gap-2
        max-w-[200px] w-full px-4 py-2
        text-sm font-medium rounded-md border
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors
        ${variantStyles[variant]}
        ${isInactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {loading && (
        <svg
          aria-hidden="true"
          className="w-4 h-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {label}
    </button>
  );
}
