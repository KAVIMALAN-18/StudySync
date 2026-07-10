import * as React from "react"
import { cn } from "../../lib/utils"

function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none select-none",
        {
          "border-transparent bg-indigo-600/20 text-indigo-400 border-indigo-500/30": variant === "default",
          "border-transparent bg-slate-800 text-slate-300": variant === "secondary",
          "border-transparent bg-red-500/20 text-red-400 border-red-500/30": variant === "destructive",
          "border-slate-800 text-slate-400": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
