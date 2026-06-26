import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, Clock, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { joinTree, type JoinResult } from "@/lib/people";

export default function Convite() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<JoinResult | null>(null);
  const [working, setWorking] = useState(true);
  const ran = useRef(false);

  useEffect(() => {
    if (isLoading || !token) return;
    if (!user) {
      // exige login; volta para cá após autenticar
      navigate(`/auth?redirect=${encodeURIComponent(`/convite/${token}`)}`, {
        replace: true,
      });
      return;
    }
    if (ran.current) return;
    ran.current = true;
    joinTree(token)
      .then(setResult)
      .catch(() => setResult({ status: "invalid" }))
      .finally(() => setWorking(false));
  }, [isLoading, user, token, navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-md p-8 space-y-5 text-center shadow-flive">
        <Logo withText={false} />

        {working && (
          <>
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Processando seu convite...</p>
          </>
        )}

        {!working && result?.status === "joined" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
            <h1 className="text-xl font-bold">Acesso liberado!</h1>
            <p className="text-muted-foreground">
              Você agora pode editar{" "}
              <strong>{result.tree_name ?? "a árvore"}</strong>. Bom trabalho!
            </p>
            <Button className="w-full" onClick={() => navigate("/arvore")}>
              Abrir a árvore
            </Button>
          </>
        )}

        {!working && result?.status === "pending" && (
          <>
            <Clock className="h-10 w-10 mx-auto text-warning" />
            <h1 className="text-xl font-bold">Solicitação enviada!</h1>
            <p className="text-muted-foreground">
              Seu acesso para editar{" "}
              <strong>{result.tree_name ?? "a árvore"}</strong> foi solicitado.
              Assim que um administrador aprovar, você poderá editar. Enquanto
              isso, você já pode visualizar a árvore.
            </p>
            <Button className="w-full" onClick={() => navigate("/arvore")}>
              Ver a árvore
            </Button>
          </>
        )}

        {!working && result?.status === "member" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-success" />
            <h1 className="text-xl font-bold">Você já tem acesso</h1>
            <p className="text-muted-foreground">
              Você já participa de <strong>{result.tree_name ?? "esta árvore"}</strong>.
            </p>
            <Button className="w-full" onClick={() => navigate("/arvore")}>
              Abrir a árvore
            </Button>
          </>
        )}

        {!working && result?.status === "invalid" && (
          <>
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Convite inválido ou expirado</h1>
            <p className="text-muted-foreground">
              Peça um novo link de convite ao administrador da árvore.
            </p>
            <Link to="/arvore">
              <Button variant="ghost" className="w-full">
                Ir para o início
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
