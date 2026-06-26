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
  // Na árvore (/arvore) o canto inferior direito tem os controles de zoom e o
  // esquerdo tem o FAB "Adicionar pessoa"; ali o botão sobe para a esquerda,
  // acima do FAB. Nas demais telas fica no canto inferior direito.
  const onTree = pathname === "/arvore";
  const posClass = onTree ? "left-5 bottom-20" : "right-4 bottom-20 md:bottom-6";
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className={`fixed z-40 gap-2 rounded-full shadow-flive ${posClass}`}
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
