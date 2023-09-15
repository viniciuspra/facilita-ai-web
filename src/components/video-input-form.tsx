import { FileVideo, Upload } from "lucide-react";

import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from '@ffmpeg/util'
import { api } from "@/lib/api";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessage = {
  converting: 'Convertendo...',
  uploading: 'Carregando...',
  generating: 'Transcrevendo...',
  success: 'Sucesso!'
}

export function VideoInputForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.currentTarget

    if (!files) {
      return
    }

    const selectedFiles = files[0]

    setVideoFile(selectedFiles)

  }

  const convertVideoToAudio = async (video: File) =>{
    console.log('Convert started.');

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    ffmpeg.on('progress', progress => {
      console.log('Convert progress: ' + Math.round(progress.progress * 100));
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], {type: 'audio/mpeg'})
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    console.log('Convert finished.');

    return audioFile;
  }

  const handleUploadVideo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return
    }

    setStatus('converting')
    
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')

    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus('success')
  }

  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className='space-y-6'>
    <label 
      htmlFor="video"
      className='relative border w-full flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors'
    >
      {
        previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0"/>
        ) : 
        (
          <>
            <FileVideo className='w-4 h-4'/>
            Selecione um vídeo
          </>
        )
      }
    </label>

    <input type="file" id="video" accept='video/mp4' className='sr-only' onChange={handleFileSelected} disabled={status !== 'waiting'}/>

    <Separator />

    <div className='space-y-2'>
      <Label 
        htmlFor="transcription_prompt"
        className=""
      >
        Prompt de transcrição
      </Label>
      <Textarea 
        ref={promptInputRef}
        disabled={status !== 'waiting'}
        id='transcription_prompt' 
        className='h-20 resize-none gap-2 leading-relaxed'
        placeholder='Inclua palavras-chaves mencionadas no vídeo separadas por vígula (,)'
      />
    </div>

    <Button data-success={status === 'success'} disabled={status !== 'waiting'} type='submit' className='w-full data-[success=true]:bg-emerald-400'>
      {
        status === 'waiting' ? (
          <>
            Carregar vídeo
            <Upload className='w-4 h-4 ml-2'/>  
          </>
        ) : (
          statusMessage[status]
        )
      }
    </Button>
  </form>
  )
};
