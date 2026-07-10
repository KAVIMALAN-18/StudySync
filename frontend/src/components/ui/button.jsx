import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer"
  
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline: "border border-border bg-transparent text-foreground hover:bg-white/5",
    secondary: "bg-white/10 text-foreground hover:bg-white/15",
    ghost: "text-foreground hover:bg-white/5",
    link: "text-indigo-400 underline-offset-4 hover:underline bg-transparent"
  }

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9"
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
