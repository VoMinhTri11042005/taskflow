import { LoginForm } from '@/components/auth/login-form';

// Invitation links intentionally bypass the authenticated workspace. This
// keeps a Leader/Admin session intact while letting the person who scanned a
// QR code register or sign in as a Member.
export default function JoinPage() {
  return <LoginForm initialMode="register" />;
}
