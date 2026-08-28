# Task 4: Admin Interface Components

## Summary
Built 5 admin interface components for the TaskFlow project with Vietnamese UI.

## Files Modified/Created

### 1. `src/components/layout/admin-sidebar.tsx` (Updated)
- Added new nav items: `board`, `polls`, `activity` with proper icons and Vietnamese labels
- Added notification bell icon with unread badge count from store
- Bell opens a `DropdownMenu` showing latest 5 notifications with relative time
- Shows bell badge when sidebar is collapsed too
- Imported: `LayoutDashboard, FolderKanban, KanbanSquare, Users, BarChart3, Activity, TrendingUp, Settings, LogOut, ClipboardList, Bell`

### 2. `src/components/views/admin/admin-polls-view.tsx` (Created)
- Header with "Bình chọn" title and "Tạo bình chọn" button
- List of poll cards with: title, description, status badge (cyan=active, gray=closed), created date
- Horizontal progress bars showing vote counts and percentages per option
- Total votes count with border-top separator
- "Kết quả cuối cùng" label on closed polls
- "Đóng bình chọn" button for active polls, "Xóa" button for all
- Create dialog with title, optional description, dynamic options (2-10, add/remove)
- Fetches from GET /api/polls, creates POST, closes PUT, deletes DELETE

### 3. `src/components/views/admin/admin-activity-view.tsx` (Created)
- Header with "Hoạt động" title and member filter dropdown (from store members)
- Timeline-style list with: colored avatar initials, user name, action icon (LogIn/LogOut/Eye)
- Vietnamese action labels: "Đăng nhập", "Đăng xuất", "Xem trang"
- Relative time using date-fns with Vietnamese locale
- Groups by date: "Hôm nay", "Hôm qua", older dates in dd/MM/yyyy
- Loading skeleton state and empty state
- Fetches from GET /api/activity-logs with optional userId query param

### 4. `src/components/views/members-view.tsx` (Updated)
- Added Key button per member card → dialog showing email from GET /api/members/credentials?userId=X
- Added KeyRound button → reset password dialog with new password input → POST /api/auth/reset-password
- Added green dot online indicator on member avatar based on activity logs (login without logout in last 30 min)
- All existing CRUD functionality preserved

### 5. `src/components/views/admin/admin-settings-view.tsx` (Updated)
- Added inline profile edit: "Chỉnh sửa" button → name input with "Lưu"/"Hủy" buttons → PUT /api/auth/update-profile
- Updates user in store after successful save
- Added "Đổi mật khẩu" card with: current password, new password, confirm password inputs
- Validation: min 6 chars, confirm match → POST /api/auth/change-password
- All existing system info and seed data cards preserved

## Lint Status
- All files pass ESLint with zero errors
- Dev server compiles successfully with no issues