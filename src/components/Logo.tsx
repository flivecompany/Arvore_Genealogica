import logo from "@/assets/logo-flive.svg";
import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={logo} alt="Flive Company" className="h-8 w-auto" />
      {withText && (
        <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">
          Árvore Genealógica
        </span>
      )}
    </span>
  );
}
