'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Eye, EyeOff, Loader2, UserPlus, ShieldCheck, UserRound, BriefcaseBusiness, Clock3, Link2, CheckCircle2, Layers, Timer, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/layout/brand-mark';
import { notifyAuthSessionChange } from '@/lib/auth-session-client';
import { readApiJson } from '@/lib/client-api';
import type { User } from '@/types';

type LoginFormProps = {
  initialMode?: 'login' | 'register';
};

export function LoginForm({ initialMode = 'login' }: LoginFormProps) {
  const { setUser, setCurrentView } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'member' | 'leader'>('member');
  const [loginRole, setLoginRole] = useState<'admin' | 'leader' | 'member' | null>(null);
  const [loginFieldsActive, setLoginFieldsActive] = useState(false);
  const [registerFieldsActive, setRegisterFieldsActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ token: string; leaderName: string; label: string | null } | null>(null);
  const [projectInvite, setProjectInvite] = useState<{
    token: string;
    projectId: string;
    projectName: string;
    leaderName: string;
    label: string | null;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const projectToken = searchParams.get('projectInvite')?.trim();
    const memberToken = searchParams.get('invite')?.trim();
    const token = projectToken || memberToken;
    if (!token) return;

    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setMode('register');
      setRole('member');
      if (projectToken) setLoginRole('member');
      setInviteError(null);
    });
    const endpoint = projectToken ? '/api/project-invites/validate' : '/api/member-invites/validate';
    fetch(`${endpoint}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.valid) throw new Error(data.error || 'Link mời không hợp lệ');
        return data as { projectId?: string; projectName?: string; leaderName: string; label: string | null };
      })
      .then((data) => {
        if (!active) return;
        if (projectToken && data.projectId && data.projectName) {
          setProjectInvite({
            token,
            projectId: data.projectId,
            projectName: data.projectName,
            leaderName: data.leaderName,
            label: data.label,
          });
        } else {
          setInvite({ token, leaderName: data.leaderName, label: data.label });
        }
      })
      .catch((error) => {
        if (active) setInviteError(error instanceof Error ? error.message : 'Link mời không hợp lệ');
      });

    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('member');
    setLoginRole(projectInvite ? 'member' : null);
    setShowPassword(false);
    setLoginFieldsActive(false);
    setRegisterFieldsActive(false);
    setRegistrationNotice(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginRole) {
      toast.error('Vui lòng chọn vai trò đăng nhập');
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, expectedRole: loginRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Đăng nhập thất bại');
        return;
      }
      // A successful POST is not enough: browsers reject Secure cookies over
      // plain HTTP. Verify the follow-up session before rendering a workspace
      // that cannot make any authenticated API request.
      const sessionResponse = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const sessionData = await readApiJson<{ user: User | null }>(
        sessionResponse,
        'Không thể xác thực phiên đăng nhập'
      );
      if (!sessionData.user) {
        toast.error('Trình duyệt không thể lưu phiên đăng nhập. Hãy kiểm tra URL HTTPS/LAN và cấu hình cookie của máy chủ.');
        return;
      }
      const userData = sessionData.user;
      if (projectInvite && userData.role === 'member') {
        try {
          const inviteResponse = await fetch('/api/project-invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: projectInvite.token }),
          });
          const inviteData = await inviteResponse.json();
          if (inviteResponse.ok) {
            toast.success(inviteData.message || 'Đã gửi yêu cầu tham gia dự án.');
            const url = new URL(window.location.href);
            url.searchParams.delete('projectInvite');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          } else {
            toast.error(inviteData.error || 'Không thể gửi yêu cầu tham gia dự án');
          }
        } catch {
          toast.error('Không thể gửi yêu cầu tham gia dự án');
        }
      }
      setUser(userData);
      notifyAuthSessionChange();
      setCurrentView(
        userData.role === 'admin'
          ? 'admin-overview'
          : userData.role === 'leader'
            ? 'leader-dashboard'
            : 'my-tasks'
      );
      toast.success(`Chào mừng ${userData.name}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: invite || projectInvite ? 'member' : role,
          inviteToken: invite?.token,
          projectInviteToken: projectInvite?.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Đăng ký thất bại');
        return;
      }
      setRegistrationNotice(
        data.message || 'Đăng ký thành công. Tài khoản của bạn đang chờ được phê duyệt.'
      );
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRegisterFieldsActive(false);
      toast.success('Đăng ký thành công. Vui lòng chờ duyệt tài khoản.');
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Layers, label: 'Quản lý dự án & Kanban Board' },
    { icon: BarChart3, label: 'Theo dõi tiến độ thời gian thực' },
    { icon: Timer, label: 'Chấm công & Time Tracking tích hợp' },
    { icon: CheckCircle2, label: 'Tích hợp Google Docs, Sheets, Slides' },
  ];
  const loginActionClass = loginRole === 'admin'
    ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-red-500/20'
    : loginRole === 'leader'
      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/20'
      : 'bg-gradient-to-r from-zinc-950 to-zinc-700 hover:from-zinc-800 hover:to-zinc-600 shadow-zinc-950/20';
  const registerActionClass = role === 'leader'
    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/20'
    : 'bg-gradient-to-r from-zinc-950 to-zinc-700 hover:from-zinc-800 hover:to-zinc-600 shadow-zinc-950/20';

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* ── Animated Background Decorations ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/8 dark:bg-indigo-500/5 blur-3xl animate-float" />
        <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-violet-500/8 dark:bg-violet-500/5 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full bg-blue-500/6 dark:bg-blue-500/4 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(oklch(0.55_0.24_264/0.03)_1px,transparent_1px),linear-gradient(90deg,oklch(0.55_0.24_264/0.03)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(oklch(0.65_0.24_264/0.04)_1px,transparent_1px),linear-gradient(90deg,oklch(0.65_0.24_264/0.04)_1px,transparent_1px)]" />
      </div>

      {/* ── Left Panel — Desktop Hero ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] items-center justify-center p-12 relative">
        <div className="max-w-md space-y-8 animate-fade-in-up">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/25">
                TF
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">TaskFlow</h1>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Enterprise v2.0</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Nền tảng quản lý công việc nhóm hiện đại, giúp đội ngũ phối hợp và bàn giao hiệu quả.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className={`flex items-center gap-3 animate-fade-in-up stagger-${i + 2}`}>
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{feature.label}</span>
                </div>
              );
            })}
          </div>

          {/* Decorative card */}
          <div className="glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up stagger-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang hoạt động
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-black text-foreground">3</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Vai trò</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">∞</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Dự án</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-foreground">24/7</div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Theo dõi</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Auth Forms ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-6 animate-fade-in-up">
          {/* Mobile brand — only show on smaller screens */}
          <div className="text-center space-y-3 lg:hidden">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/25 mx-auto">
              TF
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">TaskFlow</h1>
              <p className="text-sm text-muted-foreground">Quản lý công việc nhóm hiệu quả</p>
            </div>
          </div>

          <Card className="glass-card shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="space-y-3 pb-4">
              {/* Tab switcher */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
                <Button
                  type="button"
                  variant={mode === 'login' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeMode('login')}
                  className={mode === 'login'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md rounded-lg font-semibold'
                    : 'text-muted-foreground hover:text-foreground rounded-lg font-medium'
                  }
                >
                  Đăng nhập
                </Button>
                <Button
                  type="button"
                  variant={mode === 'register' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeMode('register')}
                  className={mode === 'register'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md rounded-lg font-semibold'
                    : 'text-muted-foreground hover:text-foreground rounded-lg font-medium'
                  }
                >
                  Đăng ký
                </Button>
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  {mode === 'login' ? 'Đăng nhập' : registrationNotice ? 'Đăng ký thành công' : 'Tạo tài khoản'}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {mode === 'login'
                    ? 'Nhập thông tin tài khoản để tiếp tục'
                    : registrationNotice ? 'Tài khoản chỉ có thể đăng nhập sau khi được duyệt.' : 'Đăng ký để gửi yêu cầu duyệt tài khoản mới'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {registrationNotice ? (
                <div className="space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Clock3 className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Yêu cầu đang chờ duyệt</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{registrationNotice}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-left text-sm text-amber-900 dark:text-amber-300">
                    Bạn sẽ đăng nhập được ngay sau khi tài khoản được {projectInvite ? `Leader ${projectInvite.leaderName} duyệt vào dự án "${projectInvite.projectName}"` : invite ? `Leader ${invite.leaderName}` : 'Leader hoặc Quản trị viên'} phê duyệt.
                  </div>
                  <Button type="button" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-md" onClick={() => changeMode('login')}>
                    Về trang đăng nhập
                  </Button>
                </div>
              ) : mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                  {projectInvite && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                      Bạn đang mở link vào dự án <span className="font-semibold">{projectInvite.projectName}</span>. Hãy đăng nhập bằng tài khoản Thành viên để gửi yêu cầu tham gia.
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Đăng nhập với vai trò</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: 'admin' as const, label: 'Quản trị', icon: ShieldCheck, gradient: 'from-red-600 to-rose-500', ring: 'ring-red-500/30' },
                        { key: 'leader' as const, label: 'Leader', icon: BriefcaseBusiness, gradient: 'from-blue-600 to-cyan-500', ring: 'ring-blue-500/30' },
                        { key: 'member' as const, label: 'Thành viên', icon: UserRound, gradient: 'from-zinc-950 to-zinc-700', ring: 'ring-zinc-950/25' },
                      ] as const).map(({ key, label, icon: Icon, gradient, ring }) => (
                        <button
                          key={key}
                          type="button"
                          disabled={key !== 'member' && Boolean(projectInvite)}
                          onClick={() => setLoginRole(key)}
                          className={`relative h-14 flex flex-col items-center justify-center gap-1 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                            loginRole === key
                              ? `bg-gradient-to-br ${gradient} text-white border-transparent shadow-lg ring-2 ${ring} scale-[1.02]`
                              : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-muted/40 disabled:opacity-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Vai trò phải trùng với tài khoản đã được phê duyệt.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@taskflow.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setLoginFieldsActive(true)}
                      readOnly={!loginFieldsActive}
                      name="taskflow-manual-email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setLoginFieldsActive(true)}
                        readOnly={!loginFieldsActive}
                        name="taskflow-manual-password"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="rounded-xl h-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className={`w-full ${loginActionClass} text-white rounded-xl h-10 shadow-md font-semibold`} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Đăng nhập
                  </Button>
                </form>
              ) : (
                <form key="taskflow-register-form" onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold">Họ và tên</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setRegisterFieldsActive(true)}
                      readOnly={!registerFieldsActive}
                      name="taskflow-new-account-name"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder="Nguyễn Văn A"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-xs font-semibold">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setRegisterFieldsActive(true)}
                      readOnly={!registerFieldsActive}
                      name="taskflow-new-account-email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder="email@taskflow.vn"
                      className="rounded-xl h-10"
                    />
                  </div>
                  {projectInvite ? (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="space-y-1">
                          <p className="font-semibold">Bạn được mời vào dự án {projectInvite.projectName}</p>
                          <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
                            {projectInvite.label ? `Lời mời: ${projectInvite.label}. ` : ''}Tài khoản này sẽ là Thành viên của nhóm {projectInvite.leaderName}; Leader sẽ duyệt riêng yêu cầu vào dự án.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : invite ? (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                        <div className="space-y-1">
                          <p className="font-semibold">Bạn được mời vào nhóm của {invite.leaderName}</p>
                          <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
                            {invite.label ? `Lời mời: ${invite.label}. ` : ''}Tài khoản này sẽ là Thành viên và chỉ Leader trên mới có thể duyệt.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Vai trò</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('member')}
                          className={`h-12 flex items-center justify-center gap-2 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                            role === 'member'
                              ? 'bg-gradient-to-br from-zinc-950 to-zinc-700 text-white border-transparent shadow-md shadow-zinc-950/20'
                              : 'border-border/60 text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <UserRound className="h-4 w-4" />
                          Thành viên
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('leader')}
                          className={`h-12 flex items-center justify-center gap-2 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                            role === 'leader'
                              ? 'bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-transparent shadow-md shadow-blue-500/20'
                              : 'border-border/60 text-muted-foreground hover:border-primary/30'
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Leader
                        </button>
                      </div>
                      {inviteError && <p className="text-xs text-destructive">{inviteError}. Bạn vẫn có thể đăng ký theo luồng thông thường.</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-xs font-semibold">Mật khẩu</Label>
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setRegisterFieldsActive(true)}
                      readOnly={!registerFieldsActive}
                      name="taskflow-new-account-password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder="Nhập mật khẩu"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold">Xác nhận mật khẩu</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setRegisterFieldsActive(true)}
                      readOnly={!registerFieldsActive}
                      name="taskflow-confirm-new-account-password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      placeholder="Nhập lại mật khẩu"
                      className="rounded-xl h-10"
                    />
                  </div>
                  <Button type="submit" className={`w-full ${registerActionClass} text-white rounded-xl h-10 shadow-md font-semibold`} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Đăng ký
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-muted-foreground/60">
            TaskFlow Enterprise v2.0 · Tích hợp Google Docs & Sheets
          </p>
        </div>
      </div>
    </div>
  );
}
