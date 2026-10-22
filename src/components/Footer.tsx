import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className='border-hairline mt-auto border-t'>
      <div className='text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6'>
        <p>© {new Date().getFullYear()} ZipPix. Your images never leave your device.</p>
        <nav aria-label='Footer' className='flex items-center gap-1'>
          <Link to='/privacy' className='hover:text-foreground transition-colors'>
            Privacy Policy
          </Link>
          <span aria-hidden className='text-hairline px-1.5'>
            |
          </span>
          <Link to='/terms' className='hover:text-foreground transition-colors'>
            Terms of Service
          </Link>
          <span aria-hidden className='text-hairline px-1.5'>
            |
          </span>
          <a
            href='https://github.com/IfanRamza/ZipPix'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-foreground transition-colors'
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
