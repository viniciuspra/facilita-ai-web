import { Github } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export function Header() {
  return (
    <div className="px-6 py-3 flex items-center justify-between border-b">
      <h1 className="text-xl font-bold">upload.ai</h1>

      <div className='flex items-center gap-3'>
        <span className='text-sm text-muted-foreground'>
          Desenvolvido com 💜 no NLW da Rocketseat
        </span>

        <Separator orientation='vertical' className='h-6'/>

        <Button variant={'outline'} className='flex items-center gap-2'>
          <Github className='w-4 h-4'/> 
          <a href="https://github.com/viniciuspra/upload-ai-web" target='_blank'>GitHub</a>
        </Button>

        <Separator orientation='vertical' className='h-6'/>

        <ModeToggle/>
      </div>
    </div>
  )
};
