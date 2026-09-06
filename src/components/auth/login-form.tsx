'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Eye, EyeOff, Loader2, UserPlus, ShieldCheck, UserRound, BriefcaseBusiness, Clock3, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/layout/brand-mark';

export function LoginForm() {
  const { setUser, setCurrentView } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite')?.trim();
    if (!token) return;

    let active = true;
    setMode('register');
    setRole('member');
    fetch(`/api/member-invites/validate?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.valid) throw new Error(data.error || 'Link mời không hợp lệ');
        return data as { leaderName: string; label: string | null };
      })
      .then((data) => {
        if (active) setInvite({ token, leaderName: data.leaderName, label: data.label });
      })
      .catch((error) => {
        if (active) setInviteError(error instanceof Error ? error.message : 'Link mời không hợp lệ');
      });

    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode: 'login' | 'register') {
    // Login and registration must never share credentials. Besides clearing the
    // controlled values, the inactive fields stay read-only until selected to
    // stop browser password managers from treating registration as login.
    setMode(nextMode);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('member');
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
      const userData = data.user || data;
      setUser(userData);
      setCurrentView(
        userData.role === 'admin'
          ? 'admin-overview'
          : userData.role === 'leader'
            ? 'leader-dashboard'
            : 'my-tasks'
      );
      toast.success(`Chào mừng ${userData.name}!`);
    } catch {
      toast.error('Lỗi kết nối server');
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
 role: invite ? 'member' : role,
 inviteToken: invite?.token,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
 <BrandMark size={56} className="mx-auto shadow-lg" />
 <h1 className="text-3xl font-bold tracking-tight">TaskFlow</h1>
 <p className="text-muted-foreground">Quản lý công việc nhóm hiệu quả</p>
        </div>

        <Card className="shadow-lg border-0">
 <CardHeader className="space-y-1">
   <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
     <Button
       type="button"
       variant={mode === 'login' ? 'default' : 'ghost'}
       size="sm"
       onClick={() => changeMode('login')}
     >
       Đăng nhập
     </Button>
     <Button
       type="button"
       variant={mode === 'register' ? 'default' : 'ghost'}
       size="sm"
       onClick={() => changeMode('register')}
     >
       Đăng ký
     </Button>
   </div>
   <CardTitle className="text-xl">
     {mode === 'login' ? 'Đăng nhập' : registrationNotice ? 'Đăng ký thành công' : 'Tạo tài khoản'}
   </CardTitle>
   <CardDescription>
     {mode === 'login'
       ? 'Nhập thông tin tài khoản để tiếp tục'
       : registrationNotice ? 'Tài khoản chỉ có thể đăng nhập sau khi được duyệt.' : 'Đăng ký để gửi yêu cầu duyệt tài khoản mới'}
   </CardDescription>
 </CardHeader>
 <CardContent>
   {registrationNotice ? (
     <div className="space-y-5 py-4 text-center">
       <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
         <Clock3 className="h-7 w-7" />
       </div>
       <div className="space-y-2">
         <h3 className="text-lg font-semibold">Yêu cầu đang chờ duyệt</h3>
         <p className="text-sm leading-6 text-muted-foreground">{registrationNotice}</p>
       </div>
       <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
         Bạn sẽ đăng nhập được ngay sau khi tài khoản được {invite ? `Leader ${invite.leaderName}` : 'Leader hoặc Quản trị viên'} phê duyệt.
       </div>
       <Button type="button" className="w-full" onClick={() => changeMode('login')}>
         Về trang đăng nhập
       </Button>
     </div>
   ) : mode === 'login' ? (
     <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
       <div className="space-y-2">
         <Label>Đăng nhập với vai trò</Label>
         <div className="grid grid-cols-3 gap-2">
           <Button type="button" variant={loginRole === 'admin' ? 'default' : 'outline'} size="sm" className="h-12 flex-col gap-0.5 text-xs" onClick={() => setLoginRole('admin')}>
             <ShieldCheck className="h-4 w-4" />
             Quản trị
           </Button>
           <Button type="button" variant={loginRole === 'leader' ? 'default' : 'outline'} size="sm" className="h-12 flex-col gap-0.5 text-xs" onClick={() => setLoginRole('leader')}>
             <BriefcaseBusiness className="h-4 w-4" />
             Leader
           </Button>
           <Button type="button" variant={loginRole === 'member' ? 'default' : 'outline'} size="sm" className="h-12 flex-col gap-0.5 text-xs" onClick={() => setLoginRole('member')}>
             <UserRound className="h-4 w-4" />
             Thành viên
           </Button>
         </div>
         <p className="text-xs text-muted-foreground">Vai trò phải trùng với tài khoản đã được phê duyệt.</p>
       </div>
       <div className="space-y-2">
         <Label htmlFor="email">Email</Label>
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
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor="password">Mật khẩu</Label>
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
           />
           <Button
             type="button"
             variant="ghost"
             size="icon"
             className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
             onClick={() => setShowPassword(!showPassword)}
           >
             {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
           </Button>
         </div>
       </div>
       <Button type="submit" className="w-full" disabled={loading}>
         {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
         Đăng nhập
       </Button>
     </form>
   ) : (
     <form key="taskflow-register-form" onSubmit={handleRegister} className="space-y-4" autoComplete="off">
       <div className="space-y-2">
         <Label htmlFor="name">Họ và tên</Label>
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
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor="register-email">Email</Label>
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
         />
       </div>
       {invite ? (
         <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
           <div className="flex items-start gap-2">
             <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
             <div className="space-y-1">
               <p className="font-semibold">Bạn được mời vào nhóm của {invite.leaderName}</p>
               <p className="text-xs leading-5 text-amber-800">
                 {invite.label ? `Lời mời: ${invite.label}. ` : ''}Tài khoản này sẽ là Thành viên và chỉ Leader trên mới có thể duyệt.
               </p>
             </div>
           </div>
         </div>
       ) : (
         <div className="space-y-2">
           <Label htmlFor="register-role">Vai trò</Label>
           <div className="grid grid-cols-2 gap-2">
             <Button
               type="button"
               variant={role === 'member' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setRole('member')}
             >
               <UserRound className="mr-1.5 h-4 w-4" />
               Thành viên
             </Button>
             <Button
               type="button"
               variant={role === 'leader' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setRole('leader')}
             >
               <ShieldCheck className="mr-1.5 h-4 w-4" />
               Leader
             </Button>
           </div>
           {inviteError && <p className="text-xs text-destructive">{inviteError}. Bạn vẫn có thể đăng ký theo luồng thông thường.</p>}
         </div>
       )}
       <div className="space-y-2">
         <Label htmlFor="register-password">Mật khẩu</Label>
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
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
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
         />
       </div>
       <Button type="submit" className="w-full" disabled={loading}>
         {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
         Đăng ký
       </Button>
     </form>
   )}

 </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
 TaskFlow v2.0 - Tích hợp Google Docs & Sheets
        </p>
      </div>
    </div>
  );
}
