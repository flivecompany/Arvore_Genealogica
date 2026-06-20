import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup" | "forgot";

export default function Auth() {
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/arvore", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (params.get("mode") === "recovery") {
      toast({ title: "Defina uma nova senha pelo link recebido por e-mail." });
    }
  }, [params, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/arvore");
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({ title: "Conta criada! Verifique seu e-mail para confirmar." });
        setMode("signin");
      } else {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast({ title: "Enviamos um link de recuperação para seu e-mail." });
        setMode("signin");
      }
    } catch (err) {
      toast({
        title: "Não foi possível continuar",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-subtle px-4">
      <Card className="w-full max-w-sm p-6 space-y-5 shadow-flive">
        <div className="flex flex-col items-center gap-2">
          <Logo withText={false} />
          <h1 className="text-xl font-bold">Árvore Genealógica</h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === "signin" && "Entre para acessar suas árvores."}
            {mode === "signup" && "Crie sua conta."}
            {mode === "forgot" && "Recupere o acesso à sua conta."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "signin" && "Entrar"}
            {mode === "signup" && "Cadastrar"}
            {mode === "forgot" && "Enviar link de recuperação"}
          </Button>
        </form>

        <div className="text-sm text-center space-y-1">
          {mode === "signin" && (
            <>
              <button className="text-primary hover:underline" onClick={() => setMode("forgot")}>
                Esqueci minha senha
              </button>
              <div className="text-muted-foreground">
                Não tem conta?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  Cadastre-se
                </button>
              </div>
            </>
          )}
          {mode !== "signin" && (
            <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
              Voltar ao login
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
