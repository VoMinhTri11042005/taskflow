import Image from 'next/image';

import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  size?: number;
}

export function BrandMark({ className, size = 36 }: BrandMarkProps) {
  return (
    <Image
      src="/taskflow-avatar.png"
      alt="TaskFlow"
      width={size}
      height={size}
      priority
      className={cn('shrink-0 rounded-[22%] shadow-sm', className)}
    />
  );
}
