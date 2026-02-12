import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Layers } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isBatch = location.pathname === '/batch';

  return (
    <header className='border-border/50 bg-background/70 sticky top-0 z-50 border-b backdrop-blur-xl'>
      <div className='container mx-auto flex items-center justify-between px-4 py-4'>
        {/* Logo */}
        <Link to='/' className='flex items-center gap-3 transition-opacity hover:opacity-80'>
          <div className='flex h-8 w-8 items-center justify-center rounded bg-linear-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20'>
            <ImageIcon className='h-5 w-5 text-white' />
          </div>
          <h1 className='bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-bold text-transparent'>
            ZipPix
          </h1>
        </Link>

        {/* Mode Switcher & Actions */}
        <div className='flex items-center gap-3'>
          {/* Mode Toggle */}
          <div className='bg-background/50 border-border/50 flex items-center rounded-lg border p-1'>
            <Link to='/'>
              <Button
                variant={isHome ? 'default' : 'ghost'}
                size='sm'
                className={`cursor-pointer rounded ${isHome ? 'bg-cyan-500/20 text-cyan-400' : ''}`}
              >
                <ImageIcon className='mr-2 h-4 w-4' />
                Single
              </Button>
            </Link>
            <Link to='/batch'>
              <Button
                variant={isBatch ? 'default' : 'ghost'}
                size='sm'
                className={`cursor-pointer rounded ${
                  isBatch ? 'bg-cyan-500/20 text-cyan-400' : ''
                }`}
              >
                <Layers className='mr-2 h-4 w-4' />
                Batch
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
