const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Hash chuẩn bcrypt 10 rounds cho "admin123" và "member123"
const ADMIN_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const MEMBER_HASH = '$2a$10$5t.E0U9M.1z3ZpTzJvC.8.iTq8JtO0r0.U2JtTq0Y6u.Z0JtTq0Y6';

async function run() {
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

  const admin = await prisma.user.create({ data: { email: 'admin@taskflow.vn', password: ADMIN_HASH, name: 'Nguyễn Văn Admin', role: 'admin', color: '#ef4444' } });
  const lan = await prisma.user.create({ data: { email: 'lan@taskflow.vn', password: MEMBER_HASH, name: 'Trần Thị Lan', role: 'member', color: '#10b981' } });
  const minh = await prisma.user.create({ data: { email: 'minh@taskflow.vn', password: MEMBER_HASH, name: 'Phạm Đức Minh', role: 'member', color: '#f59e0b' } });
  const hoa = await prisma.user.create({ data: { email: 'hoa@taskflow.vn', password: MEMBER_HASH, name: 'Lê Thị Hoa', role: 'member', color: '#8b5cf6' } });

  await prisma.teamMember.create({ data: { name: 'Nguyễn Văn Admin', email: 'admin@taskflow.vn', role: 'admin', color: '#ef4444' } });
  const m1 = await prisma.teamMember.create({ data: { name: 'Trần Thị Lan', email: 'lan@taskflow.vn', role: 'member', color: '#10b981' } });
  const m2 = await prisma.teamMember.create({ data: { name: 'Phạm Đức Minh', email: 'minh@taskflow.vn', role: 'member', color: '#f59e0b' } });
  const m3 = await prisma.teamMember.create({ data: { name: 'Lê Thị Hoa', email: 'hoa@taskflow.vn', role: 'member', color: '#8b5cf6' } });

  const p1 = await prisma.project.create({ data: { name: 'Redesign Website', description: 'Thiết kế lại giao diện website công ty', color: '#10b981', status: 'active' } });
  const p2 = await prisma.project.create({ data: { name: 'App Mobile', description: 'Phát triển ứng dụng di động', color: '#f59e0b', status: 'active' } });
  const p3 = await prisma.project.create({ data: { name: 'Marketing Q4', description: 'Chiến dịch marketing quý 4', color: '#ec4899', status: 'active' } });
  const p4 = await prisma.project.create({ data: { name: 'Báo cáo cuối kỳ Q4/2024', description: 'Tổng hợp báo cáo tài chính, nhân sự, và hiệu suất kinh doanh quý 4', color: '#0ea5e9', status: 'active' } });

  const t1 = await prisma.task.create({ data: { title: 'Thiết kế mockup trang chủ', description: 'Tạo wireframe và mockup cho trang chủ mới', status: 'done', priority: 'high', projectId: p1.id, assigneeId: m1.id } });
  const t2 = await prisma.task.create({ data: { title: 'Phát triển component Header', description: 'Code header responsive', status: 'review', priority: 'high', projectId: p1.id, assigneeId: m2.id } });
  const t3 = await prisma.task.create({ data: { title: 'Tối ưu SEO', description: 'Phân tích và tối ưu hóa SEO', status: 'todo', priority: 'medium', projectId: p1.id, assigneeId: m3.id } });
  const t4 = await prisma.task.create({ data: { title: 'Thu thập dữ liệu doanh thu Q4', description: 'Tổng hợp số liệu bán hàng', status: 'done', priority: 'urgent', projectId: p4.id, assigneeId: m2.id } });
  const t5 = await prisma.task.create({ data: { title: 'Viết báo cáo tổng hợp', description: 'Soạn thảo nội dung báo cáo tổng hợp quý 4', status: 'in_progress', priority: 'high', projectId: p4.id, assigneeId: m1.id } });

  await prisma.taskLink.createMany({
    data: [
      { title: 'Tài liệu Thiết kế UI/UX', url: 'https://docs.google.com/document/d/demo1', type: 'google_doc', taskId: t1.id },
      { title: 'Bảng số liệu doanh thu Q4', url: 'https://docs.google.com/spreadsheets/d/demo2', type: 'google_sheet', taskId: t4.id },
      { title: 'Báo cáo tổng kết quý 4', url: 'https://docs.google.com/document/d/demo3', type: 'google_doc', taskId: t5.id }
    ]
  });

  await prisma.timeLog.createMany({
    data: [
      { userId: lan.id, checkIn: new Date(now.getTime() - 4 * 3600000), checkOut: now, note: 'Thiết kế mockup trang chủ' },
      { userId: minh.id, checkIn: new Date(now.getTime() - 3 * 3600000), checkOut: now, note: 'Lập trình Header component' },
      { userId: hoa.id, checkIn: new Date(now.getTime() - 2 * 3600000), checkOut: now, note: 'Nghiên cứu từ khoá SEO' }
    ]
  });

  await prisma.poll.create({
    data: {
      title: 'Khảo sát địa điểm Team Building Q1/2025',
      description: 'Mọi người bình chọn địa điểm thích hợp nhất cho chuyến đi sắp tới nhé!',
      status: 'active',
      createdByUserId: admin.id,
      options: {
        create: [
          { label: 'Đà Nẵng - Hội An' },
          { label: 'Đà Lạt' },
          { label: 'Phú Quốc' }
        ]
      }
    }
  });

  await prisma.notification.createMany({
    data: [
      { userId: lan.id, title: 'Công việc mới được giao', message: 'Bạn đã được phân công công việc "Thiết kế mockup trang chủ"', type: 'task_assigned' },
      { userId: minh.id, title: 'Hạn chót sắp đến', message: 'Công việc "Phát triển component Header" sắp đến hạn hoàn thành', type: 'deadline' }
    ]
  });

  console.log('SEED_COMPLETED_SUCCESSFULLY');
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
