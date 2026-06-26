import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SuggestionForm } from "./SuggestionForm";

/** Botão flutuante de feedback (canto inferior direito), acima da barra
 *  inferior no mobile. Abre um diálogo com o formulário de sugestão. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // A tela da árvore já tem o FAB "Adicionar pessoa" (canto inferior esquerdo) e
  // os controles de zoom (canto inferior direito) — no mobile ainda há a barra
  // de navegação inferior. Para não sobrepor nada, o botão flutuante não aparece
  // aqui; nessa tela o acesso a Novidades/Sugestões fica no menu (ícone de perfil).
  if (pathname === "/arvore") return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed right-4 bottom-20 md:bottom-6 z-40 gap-2 rounded-full shadow-flive"
      >
        <Lightbulb className="h-4 w-4" /> Sugerir
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar sugestão</DialogTitle>
            <DialogDescription>
              Tem uma ideia para melhorar a Árvore Genealógica? Conte pra gente.
            </DialogDescription>
          </DialogHeader>
          <SuggestionForm onSent={() => setOpen(false)} />
          <div className="text-center text-sm">
            <Link
              to="/novidades"
              className="text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              Ver novidades e minhas sugestões
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
