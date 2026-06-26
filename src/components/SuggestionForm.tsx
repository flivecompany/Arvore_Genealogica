import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSuggestion } from "@/lib/feedback";
import { useToast } from "@/hooks/use-toast";

/** Formulário de envio de sugestão, reaproveitado no botão flutuante e na
 *  página de Novidades. */
export function SuggestionForm({ onSent }: { onSent?: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await createSuggestion(title, description);
      toast({
        title: "Sugestão enviada!",
        description: "Obrigado — vamos analisar com carinho.",
      });
      setTitle("");
      setDescription("");
      onSent?.();
    } catch (err) {
      toast({
        title: "Não foi possível enviar",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Sua ideia</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Exportar a árvore em GEDCOM"
          required
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Detalhes (opcional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte mais sobre como isso ajudaria você."
          rows={4}
          maxLength={1000}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Enviar sugestão
      </Button>
    </form>
  );
}
