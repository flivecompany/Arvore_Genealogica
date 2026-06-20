import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/storage";

/** Resolve uma URL assinada (ou retorna a URL absoluta) para um caminho do storage. */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}
