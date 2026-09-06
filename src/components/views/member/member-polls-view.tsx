'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Poll, PollOption, PollVote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Check, Loader2, Lock, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { readApiJson } from '@/lib/client-api';

function sameSelections(left: Set<string>, right: Set<string>) {
  return left.size === right.size && [...left].every((id) => right.has(id));
}

export function MemberPollsView() {
  const { user } = useAppStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({});

  const fetchPolls = useCallback(async () => {
    try {
      const response = await fetch('/api/polls', { cache: 'no-store' });
      const data = await readApiJson<Poll[]>(response, 'Không thể tải danh sách bình chọn');
      setPolls(data);
    } catch {
      toast.error('Không thể tải danh sách bình chọn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPolls();
  }, [fetchPolls]);

  /** The API deliberately returns only this viewer's votes, never other voters. */
  function getSavedSelections(poll: Poll) {
    return new Set(
      (poll.options || [])
        .filter((option) => (option.votes || []).some((vote: PollVote) => vote.userId === user?.id))
        .map((option) => option.id)
    );
  }

  function getCurrentSelections(poll: Poll) {
    return new Set(draftSelections[poll.id] || [...getSavedSelections(poll)]);
  }

  function getTotalSelections(poll: Poll) {
    return (poll.options || []).reduce(
      (sum, option) => sum + (option._count?.votes ?? option.votes?.length ?? 0),
      0
    );
  }

  function getOptionStats(poll: Poll, option: PollOption) {
    const totalSelections = getTotalSelections(poll);
    const voteCount = option._count?.votes ?? option.votes?.length ?? 0;
    const percentage = totalSelections > 0 ? Math.round((voteCount / totalSelections) * 100) : 0;
    return { voteCount, percentage };
  }

  function toggleOption(poll: Poll, optionId: string) {
    if (poll.status !== 'active' || votingPollId === poll.id) return;

    const next = getCurrentSelections(poll);
    if (poll.allowMultipleChoices) {
      next.has(optionId) ? next.delete(optionId) : next.add(optionId);
    } else if (next.has(optionId)) {
      next.clear();
    } else {
      next.clear();
      next.add(optionId);
    }

    setDraftSelections((current) => ({ ...current, [poll.id]: [...next] }));
  }

  async function submitVote(poll: Poll) {
    if (!user?.id) {
      toast.error('Bạn cần đăng nhập để bình chọn');
      return;
    }

    const optionIds = [...getCurrentSelections(poll)];
    setVotingPollId(poll.id);
    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds }),
      });
      const updatedPoll = await readApiJson<Poll>(response, 'Không thể cập nhật bình chọn');

      setPolls((current) => current.map((item) => item.id === updatedPoll.id ? updatedPoll : item));
      setDraftSelections((current) => {
        const next = { ...current };
        delete next[poll.id];
        return next;
      });
      toast.success(optionIds.length > 0 ? 'Đã lưu bình chọn' : 'Đã bỏ bình chọn');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi bình chọn');
    } finally {
      setVotingPollId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải bình chọn...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bình chọn</h1>
        <p className="text-muted-foreground">
          {polls.length > 0
            ? `${polls.filter((poll) => poll.status === 'active').length} bình chọn đang hoạt động`
            : 'Tham gia bình chọn của nhóm'}
        </p>
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-muted-foreground">Không có bình chọn nào</h3>
            <p className="mt-1 text-sm text-muted-foreground">Bình chọn mới sẽ xuất hiện ở đây</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const isActive = poll.status === 'active';
            const savedSelections = getSavedSelections(poll);
            const selectedOptionIds = getCurrentSelections(poll);
            const selectionsChanged = !sameSelections(savedSelections, selectedOptionIds);
            const totalSelections = getTotalSelections(poll);
            const isVoting = votingPollId === poll.id;

            return (
              <Card key={poll.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base leading-snug">{poll.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {poll.allowMultipleChoices ? 'Chọn nhiều phương án' : 'Chọn một phương án'}
                        </Badge>
                      </div>
                      {poll.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{poll.description}</p>
                      )}
                    </div>
                    <Badge
                      variant={isActive ? 'default' : 'secondary'}
                      className={cn(
                        'shrink-0',
                        isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {isActive ? 'Đang hoạt động' : 'Đã đóng'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {isActive && (
                    <p className="text-xs text-muted-foreground">
                      {poll.allowMultipleChoices
                        ? 'Bạn có thể tick nhiều lựa chọn, sau đó nhấn Cập nhật bình chọn.'
                        : 'Chọn một lựa chọn, sau đó nhấn Bình chọn.'}
                    </p>
                  )}

                  <div className="space-y-2">
                    {(poll.options || []).map((option) => {
                      const stats = getOptionStats(poll, option);
                      const isSelected = selectedOptionIds.has(option.id);
                      const canToggle = isActive && !isVoting;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={!canToggle}
                          onClick={() => toggleOption(poll, option.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            'relative w-full overflow-hidden rounded-lg border p-3 text-left transition-all',
                            canToggle && 'cursor-pointer hover:border-primary hover:bg-primary/5',
                            isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                            !canToggle && 'cursor-default',
                            isVoting && 'pointer-events-none opacity-60'
                          )}
                        >
                          {stats.percentage > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-lg bg-primary/10 transition-all duration-500"
                              style={{ width: `${stats.percentage}%` }}
                            />
                          )}
                          <div className="relative flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center border-2',
                                  poll.allowMultipleChoices ? 'rounded-md' : 'rounded-full',
                                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 bg-background'
                                )}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span className="truncate text-sm font-medium">{option.label}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-sm font-semibold text-primary">{stats.percentage}%</span>
                              <span className="ml-1 text-xs text-muted-foreground">({stats.voteCount})</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      <p>Tổng {totalSelections} lượt chọn</p>
                      {selectedOptionIds.size > 0 && isActive && (
                        <p className="mt-0.5 font-medium text-primary">Đã tick {selectedOptionIds.size} lựa chọn</p>
                      )}
                    </div>
                    {isActive ? (
                      <Button
                        size="sm"
                        disabled={!selectionsChanged || isVoting}
                        onClick={() => void submitVote(poll)}
                      >
                        {isVoting ? (
                          <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Đang lưu</>
                        ) : selectedOptionIds.size === 0 ? (
                          'Bỏ bình chọn'
                        ) : savedSelections.size > 0 ? (
                          <><Vote className="mr-1.5 h-4 w-4" />Cập nhật bình chọn</>
                        ) : (
                          <><Vote className="mr-1.5 h-4 w-4" />Bình chọn</>
                        )}
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Bình chọn đã đóng</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
