import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.taskLink.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();

  const adminUser = await prisma.user.create({
    data: { email: 'admin@taskflow.vn', password: hashSync('admin123', 10), name: 'Nguyễn Văn Admin', role: 'admin', color: '#ef4444' },
  });
  const memberUser1 = await prisma.user.create({
    data: { email: 'lan@taskflow.vn', password: hashSync('member123', 10), name: 'Trần Thị Lan', role: 'member', color: '#10b981' },
  });
  const memberUser2 = await prisma.user.create({
    data: { email: 'minh@taskflow.vn', password: hashSync('member123', 10), name: 'Phạm Đức Minh', role: 'member', color: '#f59e0b' },
  });
  const memberUser3 = await prisma.user.create({
    data: { email: 'hoa@taskflow.vn', password: hashSync('member123', 10), name: 'Lê Thị Hoa', role: 'member', color: '#8b5cf6' },
  });

  await prisma.teamMember.create({ data: { name: 'Nguyễn Văn Admin', email: 'admin@taskflow.vn', role: 'admin', color: '#ef4444' } });
  const member1 = await prisma.teamMember.create({ data: { name: 'Trần Thị Lan', email: 'lan@taskflow.vn', role: 'member', color: '#10b981' } });
  const member2 = await prisma.teamMember.create({ data: { name: 'Phạm Đức Minh', email: 'minh@taskflow.vn', role: 'member', color: '#f59e0b' } });
  const member3 = await prisma.teamMember.create({ data: { name: 'Lê Thị Hoa', email: 'hoa@taskflow.vn', role: 'member', color: '#8b5cf6' } });

  const project1 = await prisma.project.create({ data: { name: 'Redesign Website', description: 'Thiết kế lại giao diện website công ty', color: '#10b981', status: 'active' } });
  const project2 = await prisma.project.create({ data: { name: 'App Mobile', description: 'Phát triển ứng dụng di động cho iOS và Android', color: '#f59e0b', status: 'active' } });
  const project3 = await prisma.project.create({ data: { name: 'Marketing Q4', description: 'Chiến dịch marketing quý 4', color: '#ec4899', status: 'active' } });

  const taskData = [
    { title: 'Thiết kế mockup trang chủ', description: 'Tạo wireframe và mockup cho trang chủ mới', status: 'done', priority: 'high', projectId: project1.id, assigneeId: member1.id, dueDate: new Date(Date.now() - 3 * 86400000) },
    { title: 'Phát triển component Header', description: 'Code header responsive với navigation menu', status: 'review', priority: 'high', projectId: project1.id, assigneeId: member2.id, dueDate: new Date(Date.now() + 1 * 86400000) },
    { title: 'Tối ưu SEO', description: 'Phân tích và tối ưu hóa SEO cho toàn bộ trang', status: 'todo', priority: 'medium', projectId: project1.id, assigneeId: member3.id, dueDate: new Date(Date.now() + 5 * 86400000) },
    { title: 'Thiết kế API backend', description: 'Thiết kế RESTful API cho ứng dụng mobile', status: 'in_progress', priority: 'urgent', projectId: project2.id, assigneeId: member2.id, dueDate: new Date(Date.now() + 2 * 86400000) },
    { title: 'UI/UX cho màn hình đăng nhập', description: 'Thiết kế giao diện đăng nhập và đăng ký', status: 'in_progress', priority: 'high', projectId: project2.id, assigneeId: member1.id, dueDate: new Date(Date.now() + 3 * 86400000) },
    { title: 'Viết test case', description: 'Viết unit test cho các module chính', status: 'todo', priority: 'medium', projectId: project2.id, assigneeId: member3.id, dueDate: new Date(Date.now() + 7 * 86400000) },
    { title: 'Lên kế hoạch content', description: 'Lên lịch và nội dung bài đăng mạng xã hội', status: 'done', priority: 'high', projectId: project3.id, assigneeId: member1.id, dueDate: new Date(Date.now() - 5 * 86400000) },
    { title: 'Thiết kế banner QC', description: 'Tạo banner quảng cáo cho chiến dịch', status: 'in_progress', priority: 'medium', projectId: project3.id, assigneeId: member3.id, dueDate: new Date(Date.now() + 4 * 86400000) },
    { title: 'Phân tích đối thủ', description: 'Nghiên cứu và phân tích chiến lược đối thủ', status: 'review', priority: 'low', projectId: project3.id, assigneeId: member2.id, dueDate: new Date(Date.now() + 6 * 86400000) },
    { title: 'Cấu hình CI/CD', description: 'Thiết lập pipeline tự động hóa deployment', status: 'todo', priority: 'urgent', projectId: project1.id, assigneeId: member2.id, dueDate: new Date(Date.now() + 1 * 86400000) },
  ];

  const createdTasks = [];
  for (const t of taskData) createdTasks.push(await prisma.task.create({ data: t }));

  await prisma.taskLink.createMany({
    data: [
      { title: 'Spec Trang chủ', url: 'https://docs.google.com/document/d/example1', type: 'google_doc', taskId: createdTasks[0].id },
      { title: 'Bảng tiến độ UI', url: 'https://docs.google.com/spreadsheets/d/example2', type: 'google_sheet', taskId: createdTasks[4].id },
      { title: 'API Documentation', url: 'https://docs.google.com/document/d/example3', type: 'google_doc', taskId: createdTasks[3].id },
      { title: 'Content Calendar', url: 'https://docs.google.com/spreadsheets/d/example4', type: 'google_sheet', taskId: createdTasks[6].id },
      { title: 'Test Plan', url: 'https://docs.google.com/document/d/example5', type: 'google_doc', taskId: createdTasks[5].id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { title: 'Công việc mới', message: 'Bạn được giao việc: Tối ưu SEO', type: 'task_assigned', userId: memberUser3.id, read: false },
      { title: 'Sắp đến hạn', message: 'Việc "Phát triển component Header" sẽ đến hạn trong 1 ngày', type: 'deadline', userId: memberUser2.id, read: false },
      { title: 'Hoàn thành công việc', message: 'Trần Thị Lan đã hoàn thành "Thiết kế mockup trang chủ"', type: 'success', userId: adminUser.id, read: true },
      { title: 'Công việc mới', message: 'Bạn được giao việc: Thiết kế banner QC', type: 'task_assigned', userId: memberUser3.id, read: false },
      { title: 'Cần xem xét', message: 'Việc "Phát triển component Header" đang chờ review', type: 'info', userId: adminUser.id, read: false },
      { title: 'Công việc mới', message: 'Bạn được giao việc: Viết test case', type: 'task_assigned', userId: memberUser3.id, read: true },
      { title: 'Sắp đến hạn', message: 'Việc "Cấu hình CI/CD" sẽ đến hạn trong 1 ngày', type: 'deadline', userId: memberUser2.id, read: false },
      { title: 'Chào mừng', message: 'Chào mừng bạn đến với TaskFlow! Bắt đầu quản lý công việc ngay.', type: 'info', userId: memberUser1.id, read: true },
    ],
  });

  console.log('Seed completed!');
  console.log('Admin: admin@taskflow.vn / admin123');
  console.log('Member: lan@taskflow.vn / member123');
  console.log('Member: minh@taskflow.vn / member123');
  console.log('Member: hoa@taskflow.vn / member123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
