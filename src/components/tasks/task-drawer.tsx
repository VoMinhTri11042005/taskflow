'use client';

import * as React from 'react';
import { useAppStore } from '@/stores/app-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileQuestion,
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  User,
  Flag,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function TaskDrawer() {
  const {
    selectedTask,
    taskDrawerOpen,
    closeTaskDetail,
    tasks,
    setTasks,
    projects,
    members,
    user,
  } = useAppStore();

  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [assigneeId, setAssigneeId] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState('');
  const [links, setLinks] = React.useState<any[]>([]);

  // Add Link State
  const [newLinkTitle, setNewLinkTitle] = React.useState('');
  const [newLinkUrl, setNewLinkUrl] = React.useState('');
  const [newLinkType, setNewLinkType] = React.useState('google_doc');
  const [addingLink, setAddingLink] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title || '');
      setDescription(selectedTask.description || '');
      setStatus(selectedTask.status || 'todo');
      setPriority(selectedTask.priority || 'medium');
      setAssigneeId(selectedTask.assigneeId || null);
      setDueDate(selectedTask.dueDate ? format(new Date(selectedTask.dueDate), 'yyyy-MM-dd') : '');
      setLinks(selectedTask.links || []);
    }
  }, [selectedTask]);

  if (!selectedTask) return null;

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTasks(tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
        toast.success('Đã lưu thay đổi công việc thành công!');
        closeTaskDetail();
      } else {
        toast.error('Lỗi khi lưu thông tin công việc.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Vui lòng nhập tên tài liệu và đường dẫn liên kết.');
      return;
    }

    setAddingLink(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLinkTitle,
          url: newLinkUrl,
          type: newLinkType,
        }),
      });

      if (res.ok) {
        const createdLink = await res.json();
        const updatedLinks = [...links, createdLink];
        setLinks(updatedLinks);
        setTasks(tasks.map((t) => (t.id === selectedTask.id ? { ...t, links: updatedLinks } : t)));
        setNewLinkTitle('');
        setNewLinkUrl('');
        toast.success('Đã thêm liên kết tài liệu thành công!');
      }
    } catch {
      toast.error('Lỗi khi thêm liên kết.');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedLinks = links.filter((l) => l.id !== linkId);
        setLinks(updatedLinks);
        setTasks(tasks.map((t) => (t.id === selectedTask.id ? { ...t, links: updatedLinks } : t)));
        toast.success('Đã xóa liên kết.');
      }
    } catch {
      toast.error('Lỗi khi xóa liên kết.');
    }
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'google_doc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'google_sheet':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
      case 'google_slide':
        return <Presentation className="h-4 w-4 text-amber-500" />;
      case 'google_form':
        return <FileQuestion className="h-4 w-4 text-purple-500" />;
      default:
        return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={taskDrawerOpen} onOpenChange={(open) => !open && closeTaskDetail()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedTask.project?.name || 'Chi tiết công việc'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              status === 'done' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
              status === 'review' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
              'bg-muted text-muted-foreground'
            }`}>
              {status === 'done' ? '✓ Đã hoàn thành' : status === 'in_progress' ? '● Đang làm' : status === 'review' ? '⚑ Xem xét' : '○ Cần làm'}
            </span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Input */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tiêu đề công việc</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isAdmin}
              className="mt-1.5 text-base font-bold bg-muted/30 border-border/60 focus:bg-background"
              placeholder="Nhập tiêu đề công việc..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border/40 text-xs">
            {/* Status Select */}
            <div>
              <label className="text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Trạng thái
              </label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-8 bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Cần làm (Todo)</SelectItem>
                  <SelectItem value="in_progress">Đang làm (In Progress)</SelectItem>
                  <SelectItem value="review">Xem xét (Review)</SelectItem>
                  <SelectItem value="done">Hoàn thành (Done)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Select */}
            <div>
              <label className="text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                <Flag className="h-3.5 w-3.5 text-amber-500" /> Mức độ ưu tiên
              </label>
              <Select value={priority} onValueChange={(val: any) => setPriority(val)} disabled={!isAdmin}>
                <SelectTrigger className="h-8 bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp (Low)</SelectItem>
                  <SelectItem value="medium">Trung bình (Medium)</SelectItem>
                  <SelectItem value="high">Cao (High)</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp (Urgent)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" /> Người phụ trách
              </label>
              <Select
                value={assigneeId || 'unassigned'}
                onValueChange={(val) => setAssigneeId(val === 'unassigned' ? null : val)}
                disabled={!isAdmin}
              >
                <SelectTrigger className="h-8 bg-background border-border/60">
                  <SelectValue placeholder="Chưa gán người" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa phân công</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-rose-500" /> Hạn hoàn thành
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!isAdmin}
                className="h-8 bg-background border-border/60 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mô tả & Hướng dẫn thực hiện</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isAdmin}
              rows={4}
              placeholder="Thêm mô tả chi tiết, yêu cầu hoặc ghi chú..."
              className="mt-1.5 text-sm bg-muted/30 border-border/60 focus:bg-background"
            />
          </div>

          {/* Google Workspace & External Links Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-primary" /> Tài liệu đính kèm (Google Docs, Sheets, Slides)
              </label>
            </div>

            {/* Links List */}
            <div className="space-y-2">
              {links.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground bg-muted/10">
                  Chưa có tài liệu nào được đính kèm vào công việc này.
                </div>
              ) : (
                links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/60 hover:bg-card hover:border-primary/40 transition-all group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-1.5 rounded-md bg-muted/60">
                        {getLinkIcon(link.type)}
                      </div>
                      <div className="truncate">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span className="truncate">{link.title}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
                        </a>
                        <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLink(link.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Link Form (Admin only) */}
            {isAdmin && (
              <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-2.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  + Thêm tài liệu mới
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Tên tài liệu..."
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Input
                    placeholder="Đường dẫn https://..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="h-8 text-xs bg-background sm:col-span-1"
                  />
                  <div className="flex gap-2">
                    <Select value={newLinkType} onValueChange={setNewLinkType}>
                      <SelectTrigger className="h-8 text-xs bg-background flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_doc">Google Doc</SelectItem>
                        <SelectItem value="google_sheet">Google Sheet</SelectItem>
                        <SelectItem value="google_slide">Google Slides</SelectItem>
                        <SelectItem value="google_form">Google Form</SelectItem>
                        <SelectItem value="other">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleAddLink}
                      disabled={addingLink}
                      className="h-8 px-3 text-xs bg-primary text-primary-foreground"
                    >
                      {addingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-border/50 bg-muted/10 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={closeTaskDetail} className="text-xs">
            Đóng
          </Button>
          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={saving}
            className="text-xs font-semibold px-4 gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>Lưu thay đổi</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
