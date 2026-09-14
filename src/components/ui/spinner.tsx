import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
}

/**
 * Accessible inline spinner. Always decorative: the surrounding control keeps
 * its label and exposes busy state via `aria-busy`, so the icon is hidden from
 * assistive technology to avoid announcing a meaningless graphic.
 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <Loader2 aria-hidden="true" className={cn("h-4 w-4 animate-spin", className)} />
  );
}
