import { cn } from "@/lib/utils";

function LoadingSpinner({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "primary" | "secondary";
}) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-3",
  };

  const variantClasses = {
    default:
      "border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-300",
    primary:
      "border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400",
    secondary:
      "border-gray-300 border-t-purple-600 dark:border-gray-700 dark:border-t-purple-400",
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "animate-spin rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      />
      <div
        className={cn(
          "absolute top-0 left-0 rounded-full animate-ping opacity-30",
          sizeClasses[size],
          {
            "bg-gray-800 dark:bg-gray-300": variant === "default",
            "bg-blue-600 dark:bg-blue-400": variant === "primary",
            "bg-purple-600 dark:bg-purple-400": variant === "secondary",
          },
          "scale-75"
        )}
      />
    </div>
  );
}

export { LoadingSpinner };
