import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { initials } from "@/lib/genealogy";
import type { Person } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

interface Props {
  person: Pick<Person, "first_name" | "last_name" | "avatar_url" | "sex">;
  className?: string;
}

export function PersonAvatar({ person, className }: Props) {
  const url = useSignedUrl(person.avatar_url);
  const ring =
    person.sex === "male"
      ? "ring-male"
      : person.sex === "female"
      ? "ring-female"
      : "ring-border";
  return (
    <Avatar className={cn("ring-2 ring-offset-2 ring-offset-background", ring, className)}>
      {url && <AvatarImage src={url} alt={person.first_name} />}
      <AvatarFallback className="bg-gradient-flive text-white">
        {initials(person)}
      </AvatarFallback>
    </Avatar>
  );
}
