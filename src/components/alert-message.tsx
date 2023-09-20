import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, FileVideo, Loader2, PenLine } from "lucide-react";

interface AlertMessageProps {
  status: string;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({ status }) => {
  let title: string,
    description: string,
    icon: React.ReactNode | null = null;
  let alertClasses = "w-30 fixed top-0 right-10 p-4 m-4";

  switch (status) {
    case "converting":
      title = "Convertendo...";
      description = "Aguarde enquanto o vídeo está sendo convertido.";
      icon = <FileVideo className="h-4 w-4" />;
      break;
    case "uploading":
      title = "Carregando...";
      description = "Aguarde enquanto o vídeo é carregado.";
      icon = <Loader2 className="h-4 w-4" />;
      break;
    case "generating":
      title = "Transcrevendo...";
      description = "Aguarde enquanto a transcrição está sendo gerada.";
      icon = <PenLine className="h-4 w-4" />;
      break;
    case "success":
      title = "Sucesso!";
      description = "A operação foi concluída com sucesso.";
      icon = <CheckCircle2 className="h-4 w-4" />;
      break;
    default:
      return null;
  }

  return (
    <Alert className={alertClasses}>
      {icon}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
};
