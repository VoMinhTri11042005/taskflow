'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Eye, EyeOff, Loader2, UserPlus, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/layout/brand-mark';

export function LoginForm() {
  const { setUser } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'member' | 'leader'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Đăng nhập thất bại');
        return;
      }
      const userData = data.user || data;
      setUser(userData);
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
 role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Đăng ký thất bại');
        return;
      }
      toast.success(data.message || 'Đăng ký thành công');
      setMode('login');
      setName('');
      setPassword('');
      setConfirmPassword('');
      setRole('member');
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
       onClick={() => setMode('login')}
     >
       Đăng nhập
     </Button>
     <Button
       type="button"
       variant={mode === 'register' ? 'default' : 'ghost'}
       size="sm"
       onClick={() => setMode('register')}
     >
       Đăng ký
     </Button>
   </div>
   <CardTitle className="text-xl">
     {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
   </CardTitle>
   <CardDescription>
     {mode === 'login'
       ? 'Nhập thông tin tài khoản để tiếp tục'
       : 'Đăng ký để gửi yêu cầu duyệt tài khoản mới'}
   </CardDescription>
 </CardHeader>
 <CardContent>
   {mode === 'login' ? (
     <form onSubmit={handleLogin} className="space-y-4">
       <div className="space-y-2">
         <Label htmlFor="email">Email</Label>
         <Input
           id="email"
           type="email"
           placeholder="email@taskflow.vn"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           autoComplete="email"
         />
       </div>
       <div className="space-y-2">
         <Label htmlFor="password">Mật khẩu</Label>
         <div className="relative">
           <Input
             id="password"
             type={showPassword ? 'text' : 'password'}
             placeholder="Nhập mật khẩu"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             autoComplete="current-password"
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
     <form onSubmit={handleRegister} className="space-y-4">
       <div className="space-y-2">
         <Label htmlFor="name">Họ và tên</Label>
         <Input
           id="name"
           value={name}
           onChange={(e) => setName(e.target.value)}
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
           placeholder="email@taskflow.vn"
         />
       </div>
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
       </div>
       <div className="space-y-2">
         <Label htmlFor="register-password">Mật khẩu</Label>
         <Input
           id="register-password"
           type={showPassword ? 'text' : 'password'}
           value={password}
           onChange={(e) => setPassword(e.target.value)}
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
