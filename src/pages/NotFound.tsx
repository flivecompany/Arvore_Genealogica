import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-subtle text-center px-4">
      <Seo title="Página não encontrada · Árvore Genealógica Flive" noindex />
      <div className="space-y-4">
        <h1 className="text-6xl font-extrabold bg-gradient-flive bg-clip-text text-transparent">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
        <Link to="/">
          <Button>Voltar ao início</Button>
        </Link>
      </div>
    </div>
  );
}
