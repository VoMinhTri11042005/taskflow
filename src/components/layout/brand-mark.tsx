import Image from 'next/image';

import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  size?: number;
  decorative?: boolean;
}

export function BrandMark({ className, size = 36, decorative = false }: BrandMarkProps) {
  return (
    <Image
      src="/taskflow-avatar.png"
      alt={decorative ? '' : 'TaskFlow'}
      width={size}
      height={size}
      preload
      className={cn('shrink-0 rounded-[22%] shadow-sm', className)}
    />
  );
}
