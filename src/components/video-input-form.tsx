import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import {
  FileAudio2,
  FileVideo,
  FileVolume,
  Pause,
  Play,
  Upload,
  Video,
  Youtube,
} from "lucide-react";

import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";

import { fetchMP3Link } from "../lib/api";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/api";
import Swal from "sweetalert2";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { AlertMessage } from "./alert-message";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const statusMessage = {
  converting: "Convertendo...",
  uploading: "Carregando...",
  generating: "Transcrevendo...",
  success: "Sucesso!",
};

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mp3AudioFile, setMp3AudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("waiting");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    setYoutubeUrl(newLink);
  };

  const handleVideoFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.currentTarget;

    if (!files) {
      return;
    }

    const selectedFiles = files[0];

    setVideoFile(selectedFiles);
  };

  const handleAudioFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.currentTarget;

    if (!files) {
      return;
    }

    const selectedFiles = files[0];

    setMp3AudioFile(selectedFiles);
  };

  const handlePlayAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Erro ao reproduzir áudio:", error);
        });
    }
  };

  const handlePauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const convertVideoToAudio = async (video: File) => {
    console.log("Convert started.");

    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    ffmpeg.on("progress", (progress) => {
      console.log("Convert progress: " + Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const data = await ffmpeg.readFile("output.mp3");

    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert finished.");

    return audioFile;
  };

  const isValidYouTubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  };

  const extractYouTubeVideoId = (url: string) => {
    const pattern =
      /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  const handleUploadFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = promptInputRef.current?.value;

    if (!videoFile && !youtubeUrl && !mp3AudioFile) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Selecione um arquivo ou insira um link do YouTube válido.",
        background: "#1F2937",
        color: "#FFFFFF",
      });
      setStatus("waiting");
      return;
    }

    setShowAlert(true);

    console.log("Starting video conversion");

    setStatus("converting");

    let audioFile;

    if (mp3AudioFile) {
      audioFile = mp3AudioFile;
    }

    if (youtubeUrl) {
      if (!isValidYouTubeUrl(youtubeUrl)) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Insira um link válido do YouTube.",
          background: "#1F2937",
          color: "#FFFFFF",
        });
        setStatus("waiting");
        return;
      }

      try {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (videoId) {
          const mp3Link = await fetchMP3Link(videoId);
          const response = await fetch(mp3Link);
          const mp3Data = await response.blob();

          audioFile = new File([mp3Data], "audio.mp3", {
            type: "audio/mpeg",
          });

          console.log("Áudio do YouTube baixado com sucesso.");
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Link do YouTube inválido.",
            background: "#1F2937",
            color: "#FFFFFF",
          });
          setStatus("waiting");
        }
      } catch (error) {
        console.error("Erro ao buscar o link do MP3:", error);
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "Ocorreu um erro ao buscar o link do MP3.",
          background: "#1F2937",
          color: "#FFFFFF",
        });
        setStatus("waiting");
      }
    } else if (videoFile) {
      audioFile = await convertVideoToAudio(videoFile);
    }
    console.log("Audio conversion completed");
    if (audioFile) {
      const data = new FormData();

      data.append("file", audioFile);

      console.log("Uploading audio file");

      setStatus("uploading");

      const response = await api.post("/videos", data);

      console.log("Upload completed");

      const videoId = response.data.video.id;

      setStatus("generating");

      console.log("Generating transcription");

      await api.post(`/videos/${videoId}/transcription`, {
        prompt,
      });

      console.log("Transcription completed");

      setStatus("success");

      props.onVideoUploaded(videoId);

      setShowAlert(false);
    }
  };

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null;
    }

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadFile} className="space-y-6">
      <Tabs defaultValue="video" className="space-y-6">
        <TabsList className="w-full flex justify-around">
          <TabsTrigger
            value="video"
            className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Video />
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <FileAudio2 />
          </TabsTrigger>
          <TabsTrigger
            value="YouTube"
            className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Youtube />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video">
          <Label
            htmlFor="video"
            className="relative border-[1.5px] w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {previewURL ? (
              <video
                src={previewURL}
                controls={false}
                className="pointer-events-none absolute inset-0"
              />
            ) : (
              <>
                <FileVideo className="w-4 h-4" />
                Selecione um vídeo
              </>
            )}
          </Label>

          <input
            type="file"
            id="video"
            accept="video/mp4"
            className="sr-only"
            onChange={handleVideoFileSelected}
            disabled={status !== "waiting"}
          />
        </TabsContent>

        <TabsContent value="audio">
          {mp3AudioFile ? (
            <>
              {isPlaying ? (
                <button
                  type="button"
                  onClick={handlePauseAudio}
                  className="relative border-[1.5px] w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground"
                >
                  <audio
                    id="audioElement"
                    ref={audioElementRef}
                    src={mp3AudioFile ? URL.createObjectURL(mp3AudioFile) : ""}
                    className="pointer-events-none absolute inset-0"
                    autoPlay
                  />
                  <Pause className="w-4 h-4" />
                  Pausar Áudio
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="relative border-[1.5px] w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground"
                >
                  <audio
                    id="audioElement"
                    ref={audioElementRef}
                    src={mp3AudioFile ? URL.createObjectURL(mp3AudioFile) : ""}
                    className="pointer-events-none absolute inset-0"
                  />
                  <Play className="w-4 h-4" />
                  Reproduzir Áudio
                </button>
              )}
            </>
          ) : (
            <Label
              htmlFor="audio"
              className="relative border-[1.5px] w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <>
                <FileVolume className="w-4 h-4" />
                Selecione um áudio
              </>
            </Label>
          )}
          <input
            type="file"
            id="audio"
            accept="audio/mpeg"
            className="sr-only"
            onChange={handleAudioFileSelected}
            disabled={status !== "waiting"}
          />
        </TabsContent>

        <TabsContent value="YouTube" className="space-y-2">
          <Label htmlFor="youtube">Link do YouTube</Label>
          <Input
            placeholder="Cole o link de um vídeo do Youtube aqui!"
            type="url"
            className="w-full h-10"
            value={youtubeUrl}
            onChange={handleInputChange}
            id="youtube"
          />
          <span className="text-xs text-muted-foreground italic mt-1 flex flex-col gap-1">
            <p>Para melhor exeriência use vídeos de até 10min!</p>
            Esse processo pode demorar alguns segundos ou minutos dependendo do
            tamanho do vídeo.
          </span>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt" className="">
          Prompt de transcrição
        </Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== "waiting"}
          id="transcription_prompt"
          className="h-20 resize-none gap-2 leading-relaxed"
          placeholder="Inclua palavras-chaves mencionadas no vídeo separadas por vígula (,)"
        />
      </div>

      <Button
        data-success={status === "success"}
        disabled={status !== "waiting"}
        type="submit"
        className="w-full data-[success=true]:bg-emerald-400"
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessage[status]
        )}
      </Button>

      {showAlert && <AlertMessage status={status} />}
    </form>
  );
}
