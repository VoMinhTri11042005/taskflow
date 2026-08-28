# Task 5: Member Interface Components

## Summary
Built/updated all 5 member interface components with Vietnamese UI as specified.

## Files Created/Updated

### 1. `src/components/layout/member-sidebar.tsx` (Updated)
- Added `polls` nav item with `BarChart3` icon between 'Dự án' and 'Nhóm'
- Imported `BarChart3` from lucide-react
- Kept all existing functionality (user info, project filter, logout, collapsible, unread badge)

### 2. `src/components/views/member/my-tasks-view.tsx` (Updated)
- **Deadline countdown with red warnings:**
  - Calculates days remaining using `Math.ceil((dueDate - now) / 86400000)`
  - Overdue: RED bold "Quá hạn X ngày!" with pulsing dot + red left border (border-l-4 border-l-red-500)
  - Due today: ORANGE "Hạn hôm nay!"
  - Within 3 days: AMBER "Còn X ngày"
  - Otherwise: muted "Còn X ngày"
- **"Yêu cầu review" button:**
  - Shows for `in_progress` tasks (Send icon) instead of right arrow
  - Changes task status to `review` via PUT /api/tasks/[id]
  - Fetches admin from /api/members, creates notification via POST /api/notifications
  - Shows toast "Đã gửi yêu cầu review cho Admin"
- **Link type support:**
  - Added `google_slide` (Presentation, orange) and `google_form` (FileQuestion, violet) to linkTypeConfig
  - Each config now includes `label` property

### 3. `src/components/views/member/member-polls-view.tsx` (New)
- Header "Bình chọn" with active poll count
- Poll cards showing: title, description, status badge (active/closed)
- Clickable option buttons with vote counts and percentage bars
- Highlights user's chosen option with checkmark
- "Bình chọn" CTA for unvoted polls
- Closed polls show results only with "Đã đóng" badge
- POST /api/polls/[id]/vote for voting
- GET /api/polls to fetch polls
- Empty state: "Không có bình chọn nào"
- All Vietnamese labels with toast feedback

### 4. `src/components/views/member/profile-view.tsx` (Updated)
- **Profile edit mode:**
  - "Chỉnh sửa" pencil button next to name
  - Inline edit: name input + Lưu/Hủy buttons
  - PUT /api/auth/update-profile, updates store via setUser
- **Change password section:**
  - New Card "Đổi mật khẩu" with 3 inputs + show/hide toggles
  - Validates: current not empty, new min 6 chars, confirm matches
  - POST /api/auth/change-password
- **Activity/working time section:**
  - New Card "Lịch sử hoạt động"
  - Fetches from GET /api/activity-logs?userId={user.id}
  - Login/logout timeline with relative times
  - Working time calculation: sums login→logout pairs, counts current session if logged in
  - Displays "Tổng thời gian làm việc hôm nay: X giờ Y phút"

### 5. `src/components/views/member/notifications-view.tsx` (Updated)
- Added `overdue` type: AlertTriangle icon, red-500 color, red-50 bg
- Added `task_completed` type: CheckCircle2 icon, emerald-500 color, emerald-50 bg
- Updated existing types to match new spec colors
- Overdue notifications: red left border (border-l-4 border-l-red-500) + bg-red-50
- Kept all existing functionality (mark read, mark all read, click to read)

### 6. `src/app/page.tsx` (Updated)
- Imported MemberPollsView
- Added 'polls' case in member switch
- Added 'polls' to member view validation list

## Lint Status
✅ All files pass ESLint with no errors
✅ Dev server compiled successfully
