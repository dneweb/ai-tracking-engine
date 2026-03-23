'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#1F1F1F]'
      )}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
