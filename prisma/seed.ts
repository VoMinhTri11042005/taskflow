import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskLink.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();

  const adminUser = await prisma.user.create({ data: { email: 'admin@taskflow.vn', password: hashSync('admin123', 10), name: 'Nguyễn Văn Admin', role: 'admin', color: '#ef4444' } });
  const leaderUser = await prisma.user.create({ data: { email: 'leader@taskflow.vn', password: hashSync('leader123', 10), name: 'Trần Văn Leader', role: 'leader', color: '#f59e0b' } });
  const memberUser1 = await prisma.user.create({ data: { email: 'lan@taskflow.vn', password: hashSync('member123', 10), name: 'Trần Thị Lan', role: 'member', color: '#10b981' } });
  const memberUser2 = await prisma.user.create({ data: { email: 'minh@taskflow.vn', password: hashSync('member123', 10), name: 'Phạm Đức Minh', role: 'member', color: '#f59e0b' } });
  const memberUser3 = await prisma.user.create({ data: { email: 'hoa@taskflow.vn', password: hashSync('member123', 10), name: 'Lê Thị Hoa', role: 'member', color: '#8b5cf6' } });

  await prisma.teamMember.create({ data: { name: 'Nguyễn Văn Admin', email: 'admin@taskflow.vn', role: 'admin', color: '#ef4444' } });
  await prisma.teamMember.create({ data: { name: 'Trần Văn Leader', email: 'leader@taskflow.vn', role: 'leader', color: '#f59e0b' } });
  const m1 = await prisma.teamMember.create({ data: { name: 'Trần Thị Lan', email: 'lan@taskflow.vn', role: 'member', color: '#10b981' } });
  const m2 = await prisma.teamMember.create({ data: { name: 'Phạm Đức Minh', email: 'minh@taskflow.vn', role: 'member', color: '#f59e0b' } });
  const m3 = await prisma.teamMember.create({ data: { name: 'Lê Thị Hoa', email: 'hoa@taskflow.vn', role: 'member', color: '#8b5cf6' } });

  const p1 = await prisma.project.create({ data: { name: 'Redesign Website', description: 'Thiết kế lại giao diện website công ty', color: '#10b981', status: 'active' } });
  const p2 = await prisma.project.create({ data: { name: 'App Mobile', description: 'Phát triển ứng dụng di động', color: '#f59e0b', status: 'active' } });
  const p3 = await prisma.project.create({ data: { name: 'Marketing Q4', description: 'Chiến dịch marketing quý 4', color: '#ec4899', status: 'active' } });
  const p4 = await prisma.project.create({ data: { name: 'Báo cáo cuối kỳ Q4/2024', description: 'Tổng hợp báo cáo tài chính, nhân sự, và hiệu suất kinh doanh quý 4. Admin phụ trách tổng hợp, Lan viết báo cáo, Minh xử lý dữ liệu, Hoa làm slide thuyết trình.', color: '#0ea5e9', status: 'active' } });

  const taskData = [
    { title: 'Thiết kế mockup trang chủ', description: 'Tạo wireframe và mockup cho trang chủ mới', status: 'done', priority: 'high', projectId: p1.id, assigneeId: m1.id, dueDate: new Date(now.getTime() - 3*86400000) },
    { title: 'Phát triển component Header', description: 'Code header responsive', status: 'review', priority: 'high', projectId: p1.id, assigneeId: m2.id, dueDate: new Date(now.getTime() + 1*86400000) },
    { title: 'Tối ưu SEO', description: 'Phân tích và tối ưu hóa SEO', status: 'todo', priority: 'medium', projectId: p1.id, assigneeId: m3.id, dueDate: new Date(now.getTime() + 5*86400000) },
    { title: 'Thiết kế API backend', description: 'RESTful API cho app mobile', status: 'in_progress', priority: 'urgent', projectId: p2.id, assigneeId: m2.id, dueDate: new Date(now.getTime() + 2*86400000) },
    { title: 'UI/UX màn hình đăng nhập', description: 'Thiết kế giao diện đăng nhập', status: 'in_progress', priority: 'high', projectId: p2.id, assigneeId: m1.id, dueDate: new Date(now.getTime() + 3*86400000) },
    { title: 'Viết test case', description: 'Unit test cho các module chính', status: 'todo', priority: 'medium', projectId: p2.id, assigneeId: m3.id, dueDate: new Date(now.getTime() - 1*86400000) },
    { title: 'Lên kế hoạch content', description: 'Nội dung bài đăng mạng xã hội', status: 'done', priority: 'high', projectId: p3.id, assigneeId: m1.id, dueDate: new Date(now.getTime() - 5*86400000) },
    { title: 'Thiết kế banner QC', description: 'Banner quảng cáo cho chiến dịch', status: 'in_progress', priority: 'medium', projectId: p3.id, assigneeId: m3.id, dueDate: new Date(now.getTime() + 4*86400000) },
    { title: 'Phân tích đối thủ', description: 'Nghiên cứu chiến lược đối thủ', status: 'review', priority: 'low', projectId: p3.id, assigneeId: m2.id, dueDate: new Date(now.getTime() + 6*86400000) },
    { title: 'Cấu hình CI/CD', description: 'Pipeline tự động hóa deployment', status: 'todo', priority: 'urgent', projectId: p1.id, assigneeId: m2.id, dueDate: new Date(now.getTime() + 1*86400000) },
    // === Báo cáo cuối kỳ Q4 ===
    { title: 'Thu thập dữ liệu doanh thu Q4', description: 'Tổng hợp số liệu bán hàng, chi phí, lợi nhuận từ các phòng ban. Xuất dữ liệu thô vào Google Sheet để phân tích.', status: 'done', priority: 'urgent', projectId: p4.id, assigneeId: m2.id, dueDate: new Date(now.getTime() - 2*86400000) },
    { title: 'Phân tích dữ liệu & vẽ biểu đồ', description: 'Dùng dữ liệu từ Sheet để tạo biểu đồ xu hướng doanh thu, so sánh Q3 vs Q4, phân tích KPI từng phòng ban.', status: 'in_progress', priority: 'high', projectId: p4.id, assigneeId: m2.id, dueDate: new Date(now.getTime() + 2*86400000) },
    { title: 'Viết báo cáo tổng hợp', description: 'Soạn thảo nội dung báo cáo tổng hợp quý 4: tóm tắt kết quả kinh doanh, phân tích SWOT, đề xuất chiến lược Q1/2025.', status: 'in_progress', priority: 'high', projectId: p4.id, assigneeId: m1.id, dueDate: new Date(now.getTime() + 3*86400000) },
    { title: 'Tạo slide thuyết trình', description: 'Thiết kế slide trình bày báo cáo cho cuộc họp board. Bao gồm: overview, số liệu chính, biểu đồ, kế hoạch tiếp theo.', status: 'todo', priority: 'high', projectId: p4.id, assigneeId: m3.id, dueDate: new Date(now.getTime() + 5*86400000) },
    { title: 'Tổng hợp & review cuối cùng', description: 'Admin kiểm tra toàn bộ báo cáo, slide, số liệu. Đảm bảo tính nhất quán trước khi nộp.', status: 'todo', priority: 'urgent', projectId: p4.id, assigneeId: null, dueDate: new Date(now.getTime() + 7*86400000) },
  ];

  const tasks: Array<{ id: string }> = [];
  for (const t of taskData) tasks.push(await prisma.task.create({ data: t }));

  await prisma.taskLink.createMany({
    data: [
      // === Redesign Website ===
      { title: 'Spec Trang chủ', url: 'https://docs.google.com/document/d/abc_spec_home', type: 'google_doc', taskId: tasks[0].id },
      // === App Mobile ===
      { title: 'Bảng tiến độ UI', url: 'https://docs.google.com/spreadsheets/d/def_ui_progress', type: 'google_sheet', taskId: tasks[4].id },
      { title: 'API Documentation', url: 'https://docs.google.com/document/d/ghi_api_docs', type: 'google_doc', taskId: tasks[3].id },
      // === Marketing Q4 ===
      { title: 'Content Calendar', url: 'https://docs.google.com/spreadsheets/d/jkl_content_cal', type: 'google_sheet', taskId: tasks[6].id },
      { title: 'Presentation Q4', url: 'https://docs.google.com/presentation/d/mno_q4_pres', type: 'google_slide', taskId: tasks[8].id },
      // === Báo cáo cuối kỳ Q4 ===
      { title: 'Dữ liệu thô doanh thu', url: 'https://docs.google.com/spreadsheets/d/pqr_revenue_raw', type: 'google_sheet', taskId: tasks[10].id },
      { title: 'Template báo cáo Q3', url: 'https://docs.google.com/document/d/stu_report_q3_template', type: 'google_doc', taskId: tasks[10].id },
      { title: 'Bảng phân tích KPI', url: 'https://docs.google.com/spreadsheets/d/vwx_kpi_analysis', type: 'google_sheet', taskId: tasks[11].id },
      { title: 'Biểu đồ xu hướng', url: 'https://docs.google.com/spreadsheets/d/yza_trend_charts', type: 'google_sheet', taskId: tasks[11].id },
      { title: 'Bản nháp báo cáo Q4', url: 'https://docs.google.com/document/d/bcd_q4_report_draft', type: 'google_doc', taskId: tasks[12].id },
      { title: 'Bảng số liệu tổng hợp', url: 'https://docs.google.com/spreadsheets/d/efg_summary_data', type: 'google_sheet', taskId: tasks[12].id },
      { title: 'Slide Báo cáo Q4', url: 'https://docs.google.com/presentation/d/hij_q4_slides', type: 'google_slide', taskId: tasks[13].id },
      { title: 'Template slide công ty', url: 'https://docs.google.com/presentation/d/klm_corp_template', type: 'google_slide', taskId: tasks[13].id },
      { title: 'Checklist review báo cáo', url: 'https://docs.google.com/document/d/nop_review_checklist', type: 'google_doc', taskId: tasks[14].id },
      { title: 'Form phản hồi', url: 'https://docs.google.com/forms/d/qrs_feedback_form', type: 'google_form', taskId: tasks[14].id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { title: 'Công việc mới', message: 'Bạn được giao việc: Tối ưu SEO', type: 'task_assigned', userId: memberUser3.id },
      { title: 'Sắp đến hạn', message: 'Việc "Phát triển component Header" sẽ đến hạn trong 1 ngày', type: 'deadline', userId: memberUser2.id },
      { title: 'Hoàn thành', message: 'Trần Thị Lan đã hoàn thành "Thiết kế mockup trang chủ"', type: 'task_completed', userId: adminUser.id, read: true },
      { title: 'Công việc mới', message: 'Bạn được giao việc: Thiết kế banner QC', type: 'task_assigned', userId: memberUser3.id },
      { title: 'Cần xem xét', message: '"Phát triển component Header" đang chờ review', type: 'info', userId: adminUser.id },
      { title: 'Công việc quá hạn!', message: '"Viết test case" đã quá hạn ngày hôm qua. Hãy hoàn thành sớm!', type: 'overdue', userId: memberUser3.id },
      { title: 'Chào mừng', message: 'Chào mừng bạn đến với TaskFlow!', type: 'info', userId: memberUser1.id, read: true },
      { title: 'Báo cáo Q4', message: 'Bạn được giao việc: Phân tích dữ liệu & vẽ biểu đồ cho báo cáo Q4', type: 'task_assigned', userId: memberUser2.id },
      { title: 'Báo cáo Q4', message: 'Bạn được giao việc: Viết báo cáo tổng hợp Q4/2024', type: 'task_assigned', userId: memberUser1.id },
      { title: 'Báo cáo Q4', message: 'Bạn được giao việc: Tạo slide thuyết trình báo cáo Q4', type: 'task_assigned', userId: memberUser3.id },
      { title: 'Hoàn thành', message: 'Phạm Đức Minh đã hoàn thành "Thu thập dữ liệu doanh thu Q4"', type: 'task_completed', userId: adminUser.id },
    ],
  });

  // Activity logs
  await prisma.activityLog.createMany({
    data: [
      { action: 'login', userId: adminUser.id, createdAt: new Date(now.getTime() - 3600000) },
      { action: 'login', userId: memberUser1.id, createdAt: new Date(now.getTime() - 7200000) },
      { action: 'logout', userId: memberUser1.id, createdAt: new Date(now.getTime() - 5400000) },
      { action: 'login', userId: memberUser1.id, createdAt: new Date(now.getTime() - 1800000) },
      { action: 'login', userId: memberUser2.id, createdAt: new Date(now.getTime() - 900000) },
      { action: 'login', userId: memberUser3.id, createdAt: new Date(now.getTime() - 600000) },
    ],
  });

  // Time logs - realistic sample data
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const today8am = new Date(todayStart.getTime() + 8 * 3600000);
  const today12pm = new Date(todayStart.getTime() + 12 * 3600000);
  const today1pm = new Date(todayStart.getTime() + 13 * 3600000);

  // Lan: 4 hours today (8am-12pm), plus yesterday 7.5h
  const yesterday = new Date(todayStart.getTime() - 86400000);
  await prisma.timeLog.createMany({
    data: [
      { checkIn: today8am, checkOut: today12pm, note: 'Làm việc dự án Website', userId: memberUser1.id },
      { checkIn: new Date(yesterday.getTime() + 8 * 3600000), checkOut: new Date(yesterday.getTime() + 12 * 3600000), note: 'Sáng: Design UI', userId: memberUser1.id },
      { checkIn: new Date(yesterday.getTime() + 13 * 3600000), checkOut: new Date(yesterday.getTime() + 16.5 * 3600000), note: 'Chiều: Review code', userId: memberUser1.id },
    ],
  });

  // Minh: 2.5 hours today (8am-10:30am, still ongoing), plus yesterday 6h
  await prisma.timeLog.createMany({
    data: [
      { checkIn: today8am, note: 'Phát triển API backend', userId: memberUser2.id },
      { checkIn: new Date(yesterday.getTime() + 8.5 * 3600000), checkOut: new Date(yesterday.getTime() + 12 * 3600000), note: 'Sáng: API development', userId: memberUser2.id },
      { checkIn: new Date(yesterday.getTime() + 13 * 3600000), checkOut: new Date(yesterday.getTime() + 15.5 * 3600000), note: 'Chiều: Testing', userId: memberUser2.id },
    ],
  });

  // Hoa: 3 hours today (9am-12pm), plus yesterday 5h
  await prisma.timeLog.createMany({
    data: [
      { checkIn: new Date(todayStart.getTime() + 9 * 3600000), checkOut: today12pm, note: 'Content marketing', userId: memberUser3.id },
      { checkIn: new Date(yesterday.getTime() + 9 * 3600000), checkOut: new Date(yesterday.getTime() + 12 * 3600000), note: 'Sáng: Content plan', userId: memberUser3.id },
      { checkIn: new Date(yesterday.getTime() + 13 * 3600000), checkOut: new Date(yesterday.getTime() + 15 * 3600000), note: 'Chiều: Banner design', userId: memberUser3.id },
    ],
  });

  // Polls
  const poll1 = await prisma.poll.create({ data: { title: 'Chọn ưu tiên công việc tuần tới', description: 'Bình chọn công việc cần ưu tiên nhất tuần sau', status: 'active', createdByUserId: adminUser.id } });
  const opt1a = await prisma.pollOption.create({ data: { label: 'Hoàn thành UI trang chủ', pollId: poll1.id } });
  const opt1b = await prisma.pollOption.create({ data: { label: 'Hoàn thiện API backend', pollId: poll1.id } });
  const opt1c = await prisma.pollOption.create({ data: { label: 'Triển khai marketing Q4', pollId: poll1.id } });
  await prisma.pollVote.createMany({
    data: [
      { userId: memberUser1.id, optionId: opt1a.id, pollId: poll1.id },
      { userId: memberUser2.id, optionId: opt1b.id, pollId: poll1.id },
      { userId: memberUser3.id, optionId: opt1a.id, pollId: poll1.id },
    ],
  });

  const poll2 = await prisma.poll.create({ data: { title: 'Địa điểm teambuilding cuối tháng', description: 'Chọn địa điểm cho buổi teambuilding sắp tới', status: 'active', createdByUserId: adminUser.id } });
  await prisma.pollOption.createMany({
    data: [
      { label: 'Vũng Tàu', pollId: poll2.id },
      { label: 'Đà Lạt', pollId: poll2.id },
      { label: 'Phan Thiết', pollId: poll2.id },
      { label: 'Nha Trang', pollId: poll2.id },
    ],
  });

  console.log('Seed completed!');
  console.log('Admin: admin@taskflow.vn / admin123');
  console.log('Leader: leader@taskflow.vn / leader123');
  console.log('Members: lan/minh/hoa@taskflow.vn / member123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
