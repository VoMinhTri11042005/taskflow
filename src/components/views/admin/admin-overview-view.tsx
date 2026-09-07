'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import { readApiJson } from '@/lib/client-api';

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PendingAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type DirectorySummary = {
  leaderCount: number;
  memberCount: number;
  approvedLeaderCount: number;
  approvedMemberCount: number;
  approvedCount: number;
  pendingLeaderCount: number;
  pendingMemberCount: number;
  pendingCount: number;
};

type LeaderDirectoryItem = {
  id: string;
  name: string;
  email: string;
  color: string;
  status: string;
  memberCount: number;
  approvedMemberCount: number;
  pendingMemberCount: number;
};

type MemberDirectoryItem = {
  id: string;
  name: string;
  email: string;
  color: string;
  status: string;
  leaderId: string | null;
  leader: {
    id: string;
    name: string;
    email: string;
    color: string;
    status: string;
  } | null;
};

type LeaderDirectoryResponse = {
  summary: DirectorySummary;
  pendingAccounts: PendingAccount[];
  leaders: LeaderDirectoryItem[];
  pageInfo: PageInfo;
};

type MemberDirectoryResponse = {
  members: MemberDirectoryItem[];
  pageInfo: PageInfo;
};

function AccountStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    approved: { label: 'Đang hoạt động', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    pending: { label: 'Chờ duyệt', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    rejected: { label: 'Đã từ chối', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  }[status] || { label: status, className: 'border-slate-200 bg-slate-50 text-slate-700' };

  return <Badge className={`shrink-0 font-medium ${statusConfig.className}`}>{statusConfig.label}</Badge>;
}

function InitialAvatar({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
      style={{ backgroundColor: color || '#6366f1' }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toLocaleUpperCase() || '?'}
    </span>
  );
}

function PaginationControls({
  pageInfo,
  onPageChange,
  label,
}: {
  pageInfo: PageInfo;
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (pageInfo.total <= pageInfo.pageSize) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <p className="text-xs text-muted-foreground">
        {label}: {pageInfo.total.toLocaleString('vi-VN')} kết quả · Trang {pageInfo.page}/{pageInfo.totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageInfo.page - 1)}
          disabled={pageInfo.page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageInfo.page + 1)}
          disabled={pageInfo.page >= pageInfo.totalPages}
          aria-label="Trang sau"
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminOverviewView() {
  const [leaderDirectory, setLeaderDirectory] = useState<LeaderDirectoryResponse | null>(null);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [leaderPage, setLeaderPage] = useState(1);
  const [leadersLoading, setLeadersLoading] = useState(true);

  const [memberQuery, setMemberQuery] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberDirectory, setMemberDirectory] = useState<MemberDirectoryResponse | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const normalizedQuery = leaderQuery.trim();
    const timerId = window.setTimeout(() => {
      async function loadLeaderDirectory() {
        setLeadersLoading(true);
        try {
          const params = new URLSearchParams({
            mode: 'leaders',
            page: String(leaderPage),
            limit: '12',
          });
          if (normalizedQuery) params.set('q', normalizedQuery);

          const response = await fetch(`/api/admin/directory?${params.toString()}`, { cache: 'no-store' });
          const data = await readApiJson<LeaderDirectoryResponse>(response, 'Không thể tải thống kê Leader');
          if (active) setLeaderDirectory(data);
        } catch {
          if (active) setLeaderDirectory(null);
        } finally {
          if (active) setLeadersLoading(false);
        }
      }

      void loadLeaderDirectory();
    }, normalizedQuery ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [leaderPage, leaderQuery]);

  useEffect(() => {
    let active = true;
    const normalizedQuery = memberQuery.trim();

    if (normalizedQuery.length < 2) {
      return () => {
        active = false;
      };
    }

    const timerId = window.setTimeout(() => {
      async function searchMembers() {
        setMembersLoading(true);
        try {
          const params = new URLSearchParams({
            mode: 'members',
            q: normalizedQuery,
            page: String(memberPage),
            limit: '12',
          });
          const response = await fetch(`/api/admin/directory?${params.toString()}`, { cache: 'no-store' });
          const data = await readApiJson<MemberDirectoryResponse>(response, 'Không thể tìm thành viên');
          if (active) setMemberDirectory(data);
        } catch {
          if (active) setMemberDirectory(null);
        } finally {
          if (active) setMembersLoading(false);
        }
      }

      void searchMembers();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [memberPage, memberQuery]);

  const summary = useMemo<DirectorySummary>(() => {
    return leaderDirectory?.summary || {
      leaderCount: 0,
      memberCount: 0,
      approvedLeaderCount: 0,
      approvedMemberCount: 0,
      approvedCount: 0,
      pendingLeaderCount: 0,
      pendingMemberCount: 0,
      pendingCount: 0,
    };
  }, [leaderDirectory]);

  const statCards = [
    {
      label: 'Tài khoản đang quản lý',
      value: summary.leaderCount + summary.memberCount,
      description: 'Leader và thành viên đã có hồ sơ',
      icon: UsersRound,
      className: 'border-slate-200 bg-slate-50',
      iconClassName: 'bg-slate-900 text-white',
    },
    {
      label: 'Leader',
      value: summary.leaderCount,
      description: 'Tài khoản điều phối nhóm',
      icon: UserRound,
      className: 'border-amber-200 bg-amber-50',
      iconClassName: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Thành viên',
      value: summary.memberCount,
      description: 'Tài khoản thực hiện công việc',
      icon: Users,
      className: 'border-emerald-200 bg-emerald-50',
      iconClassName: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Chờ duyệt',
      value: summary.pendingCount,
      description: 'Yêu cầu đăng ký cần xử lý',
      icon: Clock3,
      className: 'border-violet-200 bg-violet-50',
      iconClassName: 'bg-violet-100 text-violet-700',
    },
  ];

  const pendingAccounts = leaderDirectory?.pendingAccounts || [];
  const leaderItems = leaderDirectory?.leaders || [];
  const memberItems = memberDirectory?.members || [];
  const memberSearchReady = memberQuery.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground">Thống kê nhanh các tài khoản trong hệ thống</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={stat.className}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tình trạng phê duyệt
          </CardTitle>
          <CardDescription>Admin chỉ quản lý tài khoản và yêu cầu đăng ký.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Đã sẵn sàng sử dụng</p>
            <p className="mt-1 text-2xl font-bold">{summary.approvedCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm text-amber-800">Leader chờ duyệt</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{summary.pendingLeaderCount}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-sm text-violet-800">Thành viên chờ duyệt</p>
            <p className="mt-1 text-2xl font-bold text-violet-900">{summary.pendingMemberCount}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4 text-amber-600" />
                Phân bổ thành viên theo Leader
              </CardTitle>
              <CardDescription className="mt-1">
                Mỗi Leader hiển thị tổng Member, số đang hoạt động và yêu cầu chờ duyệt.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={leaderQuery}
                onChange={(event) => {
                  setLeaderQuery(event.target.value);
                  setLeaderPage(1);
                }}
                placeholder="Tìm tên hoặc email Leader"
                className="pl-9"
                aria-label="Tìm Leader"
              />
            </div>
          </CardHeader>
          <CardContent>
            {leadersLoading && !leaderDirectory ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải thống kê Leader...
              </div>
            ) : leaderItems.length > 0 ? (
              <>
                <div className="divide-y overflow-hidden rounded-xl border">
                  {leaderItems.map((leader) => (
                    <div key={leader.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialAvatar name={leader.name} color={leader.color} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{leader.name}</p>
                            <AccountStatusBadge status={leader.status} />
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{leader.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-72">
                        <div className="rounded-lg bg-slate-100 px-2 py-2">
                          <p className="text-lg font-bold text-slate-900">{leader.memberCount}</p>
                          <p className="text-[11px] text-slate-600">Tổng Member</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 px-2 py-2">
                          <p className="text-lg font-bold text-emerald-700">{leader.approvedMemberCount}</p>
                          <p className="text-[11px] text-emerald-700">Hoạt động</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 px-2 py-2">
                          <p className="text-lg font-bold text-amber-700">{leader.pendingMemberCount}</p>
                          <p className="text-[11px] text-amber-700">Chờ duyệt</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {leaderDirectory && (
                  <PaginationControls
                    pageInfo={leaderDirectory.pageInfo}
                    onPageChange={setLeaderPage}
                    label="Leader"
                  />
                )}
              </>
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {leaderQuery.trim() ? 'Không tìm thấy Leader phù hợp.' : 'Chưa có tài khoản Leader trong hệ thống.'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-primary" />
                Tra cứu Member theo Leader quản lý
              </CardTitle>
              <CardDescription className="mt-1">
                Nhập tên hoặc email để biết ngay Member thuộc Leader nào. Kết quả được tìm trực tiếp từ hệ thống.
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setMemberQuery(nextQuery);
                  setMemberPage(1);
                  setMemberDirectory(null);
                  if (nextQuery.trim().length < 2) setMembersLoading(false);
                }}
                placeholder="Nhập tên hoặc email Thành viên"
                className="pl-9"
                aria-label="Tìm Thành viên theo tên hoặc email"
              />
            </div>
          </CardHeader>
          <CardContent>
            {!memberSearchReady ? (
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nhập ít nhất 2 ký tự để tra cứu Member. Danh sách lớn không được tải toàn bộ về trình duyệt.
              </div>
            ) : membersLoading && !memberDirectory ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tìm Member...
              </div>
            ) : memberItems.length > 0 ? (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Tìm được {memberDirectory?.pageInfo.total.toLocaleString('vi-VN')} kết quả phù hợp.
                </p>
                <div className="divide-y overflow-hidden rounded-xl border">
                  {memberItems.map((member) => (
                    <div key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialAvatar name={member.name} color={member.color} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{member.name}</p>
                            <AccountStatusBadge status={member.status} />
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm sm:min-w-56">
                        <p className="text-xs text-muted-foreground">Leader quản lý</p>
                        <p className="truncate font-medium">
                          {member.leader ? member.leader.name : 'Chưa phân Leader'}
                        </p>
                        {member.leader && <p className="truncate text-xs text-muted-foreground">{member.leader.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {memberDirectory && (
                  <PaginationControls
                    pageInfo={memberDirectory.pageInfo}
                    onPageChange={setMemberPage}
                    label="Member"
                  />
                )}
              </>
            ) : (
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy Member phù hợp với từ khóa này.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yêu cầu mới cần duyệt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                </div>
                <Badge variant="outline">{account.role === 'leader' ? 'Leader' : 'Thành viên'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
