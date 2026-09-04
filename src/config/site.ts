export interface SiteConfig {
  name: string;
  description: string;
  version: string;
  url: string;
  links: {
    github: string;
    docs: string;
  };
}

export const siteConfig: SiteConfig = {
  name: 'TaskFlow',
  description: 'Nền tảng quản lý công việc và dự án nhóm hiện đại tích hợp Google Workspace, chấm công và biểu quyết.',
  version: '2.0.0',
  url: 'https://taskflow.vn',
  links: {
    github: 'https://github.com/VoMinhTri11042005/taskflow',
    docs: '/docs',
  },
};
