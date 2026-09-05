'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock3, ShieldCheck, UserRound, Users, UsersRound } from 'lucide-react';
import { readApiJson } from '@/lib/client-api';

type PendingAccount = {
  id: string;
  name: string;
  email: string;
  role: 'leader' | 'member';
  status: 'pending';
};

export function AdminOverviewView() {
  const { members } = useAppStore();
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([]);

  useEffect(() => {
    async function loadPendingAccounts() {
      try {
        const response = await fetch('/api/admin/users?status=pending');
        const data = await readApiJson<PendingAccount[]>(response, 'Không thể tải tài khoản chờ duyệt');
        setPendingAccounts(Array.isArray(data) ? data : []);
      } catch {
        setPendingAccounts([]);
      }
    }

    void loadPendingAccounts();
  }, []);

  const summary = useMemo(() => {
    const leaders = members.filter((member) => member.role === 'leader').length;
    const memberCount = members.filter((member) => member.role === 'member').length;
    const pendingLeaders = pendingAccounts.filter((account) => account.role === 'leader').length;
    const pendingMembers = pendingAccounts.filter((account) => account.role === 'member').length;

    return {
      leaders,
      memberCount,
      managedAccounts: leaders + memberCount,
      pending: pendingAccounts.length,
      pendingLeaders,
      pendingMembers,
    };
  }, [members, pendingAccounts]);

  const statCards = [
    {
      label: 'Tài khoản đang quản lý',
      value: summary.managedAccounts,
      description: 'Leader và thành viên đã có hồ sơ',
      icon: UsersRound,
      className: 'bg-slate-50 border-slate-200',
      iconClassName: 'bg-slate-900 text-white',
    },
    {
      label: 'Leader',
      value: summary.leaders,
      description: 'Tài khoản điều phối nhóm',
      icon: UserRound,
      className: 'bg-amber-50 border-amber-200',
      iconClassName: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Thành viên',
      value: summary.memberCount,
      description: 'Tài khoản thực hiện công việc',
      icon: Users,
      className: 'bg-emerald-50 border-emerald-200',
      iconClassName: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Chờ duyệt',
      value: summary.pending,
      description: 'Yêu cầu đăng ký cần xử lý',
      icon: Clock3,
      className: 'bg-violet-50 border-violet-200',
      iconClassName: 'bg-violet-100 text-violet-700',
    },
  ];

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
            <p className="mt-1 text-2xl font-bold">{summary.managedAccounts}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-sm text-amber-800">Leader chờ duyệt</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{summary.pendingLeaders}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-sm text-violet-800">Thành viên chờ duyệt</p>
            <p className="mt-1 text-2xl font-bold text-violet-900">{summary.pendingMembers}</p>
          </div>
        </CardContent>
      </Card>

      {summary.pending > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Yêu cầu mới cần duyệt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAccounts.slice(0, 5).map((account) => (
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
