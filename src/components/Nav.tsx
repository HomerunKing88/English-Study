'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: { href: string; label: string; short: string }[] = [
  { href: '/', label: 'Today', short: 'Today' },
  { href: '/capture', label: 'Capture', short: 'Capture' },
  { href: '/explore', label: 'Explore', short: 'Explore' },
  { href: '/review', label: 'Review', short: 'Review' },
  { href: '/my-english', label: 'My English', short: 'Mine' },
  { href: '/progress', label: 'Progress', short: 'Stats' },
  { href: '/settings', label: 'Settings', short: 'Settings' },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:mx-auto sm:mt-2 sm:max-w-content sm:border-0 sm:bg-transparent sm:pb-0"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-between px-1 py-1.5 sm:justify-center sm:gap-1 sm:py-0">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1 sm:flex-none">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium sm:min-h-0 sm:flex-row sm:px-2 sm:text-sm ${
                  active
                    ? 'text-ink sm:bg-paper-soft'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
