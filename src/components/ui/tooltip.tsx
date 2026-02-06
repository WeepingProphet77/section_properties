import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={cn(
          "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs",
          "rounded-md bg-foreground text-background shadow-md whitespace-nowrap"
        )}>
          {content}
        </div>
      )}
    </div>
  );
}
