import { Github } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export function Header() {
  return (
    <div className="px-5 md:px-6 py-4 md:py-6 flex items-center justify-between border-b">
      <h1 className="text-xl font-bold md:text-3xl">facilita.ai</h1>

      <div className='flex items-center gap-2 md:gap-3'>

        <a href="https://www.buymeacoffee.com/viniciuspra" target='_blank' className='active:scale-95 w-20 md:w-32'>
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee!"/>
        </a>

        <Separator orientation='vertical' className='h-6'/>

        <Button variant={'outline'} className='flex items-center gap-2 w-24 md:w-32'>
          <Github className='w-3 h-3 md:w-4 md:h-4'/> 
          <a href="https://github.com/viniciuspra/facilita-ai-web" target='_blank' className='text-xs md:text-base'>GitHub</a>
        </Button>

        <Separator orientation='vertical' className='h-6'/>

        <ModeToggle/>
      </div>
    </div>
  )
};
