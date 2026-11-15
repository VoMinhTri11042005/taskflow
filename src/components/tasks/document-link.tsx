'use client';

import * as React from 'react';
import { ExternalLink, MonitorPlay } from 'lucide-react';
import { getGoogleEmbedUrl, getSafeExternalUrl } from '@/lib/google-embed';
import type { TaskLink } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Open supported Google documents inside the workspace, with an external fallback. */
export function DocumentLink({ link }: { link: TaskLink }) {
  const [open, setOpen] = React.useState(false);
  const externalUrl = getSafeExternalUrl(link.url);
  const embedUrl = getGoogleEmbedUrl(link.url);

  return (
    <>
      {embedUrl ? (
        <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left" aria-label={`Xem tài liệu ${link.title} trong ứng dụng`}>
          <span className="flex items-center gap-1 truncate text-xs font-semibold hover:text-primary">{link.title}<MonitorPlay className="h-3 w-3 shrink-0" /></span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Xem trong ứng dụng · {link.url}</span>
        </button>
      ) : externalUrl ? (
        <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-xs font-semibold hover:text-primary">{link.title}<ExternalLink className="h-3 w-3 shrink-0" /></span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Mở trong tab mới · {link.url}</span>
        </a>
      ) : (
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{link.title}</p><p className="mt-0.5 text-[11px] text-destructive">Liên kết không hợp lệ hoặc không an toàn.</p></div>
      )}
      {embedUrl && externalUrl && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-none flex-col gap-3 overflow-hidden p-3 sm:h-[90dvh] sm:w-[95vw] sm:max-w-[95vw] sm:p-5">
            <DialogHeader className="pr-8">
              <DialogTitle className="truncate">{link.title}</DialogTitle>
              <DialogDescription>Đây là bản xem trước. Để chỉnh sửa, hãy mở bản gốc trong tab mới. Nếu tài liệu không hiển thị, hãy đăng nhập Google và kiểm tra quyền chia sẻ; một số trình duyệt có thể không hỗ trợ xem tại đây.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end">
              <Button asChild variant="outline" size="sm"><a href={externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Mở bản gốc</a></Button>
            </div>
            <iframe title={`Tài liệu: ${link.title}`} src={embedUrl} className="min-h-0 w-full flex-1 rounded-md border bg-white" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
