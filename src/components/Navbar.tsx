import { cn } from '@/lib/utils';
import { Link, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Single' },
  { to: '/batch', label: 'Batch' },
];

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex size-7 items-center justify-center overflow-hidden rounded-[8px] bg-linear-to-br from-[#4f46e5] via-[#c026d3] to-[#f97316] shadow-sm',
        className,
      )}
    >
      {/* Same glyph as public/icon.svg: a Z that compresses down into pixels */}
      <svg viewBox='0 0 512 512' className='size-full' fill='#fff'>
        <path d='M150 118h212a32 32 0 0 1 25 52L231 336h45a32 32 0 0 1 0 64H150a32 32 0 0 1-25-52l156-166H150a32 32 0 0 1 0-64z' />
        <rect x='314' y='336' width='64' height='64' rx='14' />
        <rect x='398' y='352' width='32' height='32' rx='8' opacity='.8' />
      </svg>
    </span>
  );
}

export function Navbar() {
  return (
    <header className='material border-hairline sticky top-0 z-40 border-b'>
      <nav
        aria-label='Main'
        className='mx-auto flex h-13 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6'
      >
        <Link
          to='/'
          className='flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80'
          aria-label='ZipPix home'
        >
          <Logo />
          <span className='text-[17px] font-semibold tracking-tight'>ZipPix</span>
        </Link>

        <div className='bg-secondary flex rounded-full p-0.5'>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  'focus-visible:ring-ring rounded-full px-4 py-1 text-[13px] font-medium transition-all duration-200 outline-none focus-visible:ring-2',
                  isActive
                    ? 'bg-card text-foreground shadow-sm dark:bg-[#636366]'
                    : 'text-foreground/70 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
