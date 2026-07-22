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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 backdrop-blur sm:static sm:mx-auto sm:mt-2 sm:max-w-content sm:border-0 sm:bg-transparent"
    >
      <ul className="mx-auto flex max-w-content items-stretch justify-between px-2 py-1 sm:justify-center sm:gap-1 sm:py-0">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1 sm:flex-none">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[11px] font-medium sm:flex-row sm:text-sm ${
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
