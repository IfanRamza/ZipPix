import { Link } from 'react-router-dom';
import Github from '../assets/github.svg';

export function Footer() {
  return (
    <footer className='border-border/50 bg-background/50 mt-auto border-t backdrop-blur-xl'>
      <div className='container mx-auto px-4 py-6'>
        <div className='text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm md:flex-row'>
          <p>© 2025 ZipPix. Privacy-first image compression.</p>

          <div className='flex items-center gap-6'>
            <Link to='/privacy' className='transition-colors hover:text-cyan-400'>
              Privacy Policy
            </Link>
            <Link to='/terms' className='transition-colors hover:text-cyan-400'>
              Terms of Service
            </Link>
            <a
              href='https://github.com/IfanRamza/ZipPix'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-1 transition-colors hover:text-cyan-400'
            >
              <img src={Github} alt='GitHub' className='h-4 w-4' />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
