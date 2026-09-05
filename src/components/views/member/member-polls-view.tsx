'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import type { Poll, PollOption, PollVote } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, BarChart3, Lock, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureApiSuccess, readApiJson } from '@/lib/client-api';

export function MemberPollsView() {
  const { user } = useAppStore();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPolls() {
      try {
        const res = await fetch('/api/polls');
        const data = await readApiJson<Poll[]>(res, 'Không thể tải danh sách bình chọn');
        setPolls(data);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchPolls();
  }, []);

  /* Check if user already voted on a poll */
  function hasUserVoted(poll: Poll): string | null {
    for (const option of poll.options || []) {
      const userVote = (option.votes || []).find((v: PollVote) => v.userId === user?.id);
      if (userVote) return userVote.optionId;
    }
    return null;
  }

  /* Calculate total votes for a poll */
  function getTotalVotes(poll: Poll): number {
    return (poll.options || []).reduce((sum: number, opt: PollOption) => {
      return sum + (opt.votes || []).length;
    }, 0);
  }

  /* Get vote count and percentage for an option */
  function getOptionStats(poll: Poll, option: PollOption) {
    const totalVotes = getTotalVotes(poll);
    const voteCount = (option.votes || []).length;
    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
    return { voteCount, percentage, totalVotes };
  }

  /* Handle voting on an option */
  async function handleVote(pollId: string, optionId: string) {
    if (!user?.id) {
      toast.error('Bạn cần đăng nhập để bình chọn');
      return;
    }

    setVotingPollId(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, optionId }),
      });

      await ensureApiSuccess(res, 'Không thể bình chọn');

      toast.success('Bình chọn thành công!');

      /* Refresh polls data */
      const pollsRes = await fetch('/api/polls');
      const data = await readApiJson<Poll[]>(pollsRes, 'Không thể tải kết quả bình chọn');
      setPolls(data);
    } catch {
      toast.error('Có lỗi xảy ra khi bình chọn');
    } finally {
      setVotingPollId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Đang tải bình chọn...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bình chọn</h1>
        <p className="text-muted-foreground">
          {polls.length > 0
            ? `${polls.filter((p) => p.status === 'active').length} bình chọn đang hoạt động`
            : 'Tham gia bình chọn của nhóm'}
        </p>
      </div>

      {/* Polls list */}
      {polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Không có bình chọn nào</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Bình chọn mới sẽ xuất hiện ở đây
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const isActive = poll.status === 'active';
            const userVotedOptionId = hasUserVoted(poll);
            const totalVotes = getTotalVotes(poll);
            const isVoting = votingPollId === poll.id;

            return (
              <Card key={poll.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-snug">{poll.title}</CardTitle>
                      {poll.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {poll.description}
                        </p>
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
                  {/* Options */}
                  <div className="space-y-2">
                    {(poll.options || []).map((option: PollOption) => {
                      const stats = getOptionStats(poll, option);
                      const isUserChoice = userVotedOptionId === option.id;
                      const canVote = isActive && !userVotedOptionId && !isVoting;

                      return (
                        <button
                          key={option.id}
                          disabled={!canVote}
                          onClick={() => canVote && handleVote(poll.id, option.id)}
                          className={cn(
                            'relative w-full text-left rounded-lg border p-3 transition-all overflow-hidden',
                            canVote && 'cursor-pointer hover:border-primary hover:bg-primary/5',
                            isUserChoice && 'border-primary bg-primary/5',
                            !canVote && !isUserChoice && 'cursor-default opacity-80',
                            isVoting && 'opacity-50 pointer-events-none'
                          )}
                        >
                          {/* Percentage bar background */}
                          {(userVotedOptionId || !isActive) && stats.percentage > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 bg-primary/10 rounded-lg transition-all duration-500"
                              style={{ width: `${stats.percentage}%` }}
                            />
                          )}

                          {/* Content */}
                          <div className="relative flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isUserChoice && (
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                              {!isUserChoice && (userVotedOptionId || !isActive) && (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              {!isUserChoice && isActive && !userVotedOptionId && (
                                <div className="h-5 w-5 rounded-full border-2 border-primary/40 shrink-0" />
                              )}
                              <span className="text-sm font-medium truncate">{option.label}</span>
                            </div>

                            {/* Stats */}
                            {(userVotedOptionId || !isActive) && (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-semibold text-primary">
                                  {stats.percentage}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({stats.voteCount} phiếu)
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer info */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      Tổng {totalVotes} phiếu bầu
                    </span>
                    {isActive && !userVotedOptionId && (
                      <span className="text-xs font-medium text-primary">Bình chọn</span>
                    )}
                    {isActive && userVotedOptionId && (
                      <span className="text-xs text-emerald-600 font-medium">Đã bình chọn</span>
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
