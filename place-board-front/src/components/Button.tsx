import { cn } from '@/libs/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'icon' | 'sm' | 'md';
  variant?: 'danger' | 'minus' | 'plus' | 'primary' | 'secondary';
}

const buttonVariants: Record<NonNullable<ButtonProps['variant']>, string> = {
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  minus: 'bg-red-500 text-white',
  plus: 'bg-green-500 text-white',
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300',
  secondary: 'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400',
};

const buttonSizes: Record<NonNullable<ButtonProps['size']>, string> = {
  icon: 'h-6 w-6 text-lg',
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
};

function Button({ variant = 'plus', size = 'icon', children, className = '', ...props }: ButtonProps) {
  const variantClasses = buttonVariants[variant];
  const sizeClasses = buttonSizes[size];

  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold transition outline-none',
        variantClasses,
        sizeClasses,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
