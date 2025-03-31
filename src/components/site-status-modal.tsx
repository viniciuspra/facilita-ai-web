import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SiteStatusModal() {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Aviso Importante
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Este site não está mais em funcionamento. A API utilizada para
            processar as solicitações foi desativada.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground">
            Infelizmente, o serviço{" "}
            <code className="text-violet-400">
              facilita-ai-api.onrender.com
            </code>{" "}
            não está mais disponível. Agradecemos por ter utilizado nossa
            plataforma.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
