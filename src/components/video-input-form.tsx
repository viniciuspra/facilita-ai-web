import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { FileVideo, Upload, Video, Youtube } from "lucide-react";

import { Label } from "./ui/label";
import { Input } from './ui/input';
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";

import { fetchMP3Link } from '../lib/api';
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/api";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

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
  const [status, setStatus] = useState<Status>("waiting");
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    setYoutubeUrl(newLink);
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.currentTarget;

    if (!files) {
      return;
    }

    const selectedFiles = files[0];

    setVideoFile(selectedFiles);
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
    const cleanUrl = url.split('&')[0];
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(cleanUrl);
  };

  const extractYouTubeVideoId = (url: string) => {
    const cleanUrl = url.split('&')[0];

    const pattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+).*/;
    const match = cleanUrl.match(pattern);
    return match ? match[1] : null;
  };

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  
    const prompt = promptInputRef.current?.value;
  
    if (!videoFile && !youtubeUrl) {
      alert('Selecione um vídeo ou insira um link do YouTube válido.');
      return;
    }
    
    console.log('Starting video conversion');

    setStatus('converting');
  
    let audioFile;
  
    if (youtubeUrl) {
      if (!isValidYouTubeUrl(youtubeUrl)) {
        alert('Insira um link válido do YouTube.');
        return;
      }
  
      try {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (videoId) {
          const mp3Link = await fetchMP3Link(videoId);
          const response = await fetch(mp3Link);
          const mp3Data = await response.blob();
  
          audioFile = new File([mp3Data], 'audio.mp3', {
            type: 'audio/mpeg',
          });
  
          console.log('Áudio do YouTube baixado com sucesso.');
        } else {
          alert('Link do YouTube inválido.');
        }
      } catch (error) {
        console.error('Erro ao buscar o link do MP3:', error);
        alert('Ocorreu um erro ao buscar o link do MP3.');
      }
    } else if (videoFile) {
      audioFile = await convertVideoToAudio(videoFile);
    }
    console.log('Audio conversion completed');
    if (audioFile) {
      const data = new FormData();
  
      data.append('file', audioFile);
  
      console.log('Uploading audio file');

      setStatus('uploading');
  
      const response = await api.post('/videos', data);

      console.log('Upload completed');
  
      const videoId = response.data.video.id;
  
      setStatus('generating');

      console.log('Generating transcription');
  
      await api.post(`/videos/${videoId}/transcription`, {
        prompt,
      });

      console.log('Transcription completed');
  
      setStatus('success');
  
      props.onVideoUploaded(videoId);
    }
  };

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null;
    }

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <Tabs defaultValue="video" className="space-y-6">
        <TabsList className="w-full flex justify-around">
          <TabsTrigger
            value="video"
            className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Video />
          </TabsTrigger>
          <TabsTrigger
            value="YouTube"
            className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Youtube />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video">
          <label
            htmlFor="video"
            className="relative border w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
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
          </label>

          <input
            type="file"
            id="video"
            accept="video/mp4"
            className="sr-only"
            onChange={handleFileSelected}
            disabled={status !== "waiting"}
          />
        </TabsContent>
        <TabsContent value="YouTube">
        <Input
          placeholder="Cole o link de um vídeo do Youtube aqui!"
          type="url"
          className="w-full h-10"
          value={youtubeUrl}
          onChange={handleInputChange}
        />
        <span className='text-xs text-muted-foreground italic mt-1 flex flex-col gap-1'>
          <p>para melhor exeriência use vídeos de até 10min</p>
          Esse processo pode demorar alguns segundos ou minutos depende do tamanho do vídeo.
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
    </form>
  );
}
