import type { Sex } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const SYMBOL: Record<Sex, string> = {
  male: "♂",
  female: "♀",
  other: "⚧",
};

const COLOR: Record<Sex, string> = {
  male: "text-male",
  female: "text-female",
  other: "text-muted-foreground",
};

export function SexIcon({ sex, className }: { sex: Sex; className?: string }) {
  return (
    <span
      aria-label={sexLabel(sex)}
      className={cn("inline-flex items-center justify-center leading-none font-semibold", COLOR[sex], className)}
    >
      {SYMBOL[sex]}
    </span>
  );
}

export function sexLabel(sex: Sex): string {
  return sex === "male" ? "Masculino" : sex === "female" ? "Feminino" : "Outro";
}
