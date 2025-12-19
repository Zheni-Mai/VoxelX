// src/renderer/ads/services/asakaCloud.ts
import { Server, Zap, Shield, Users } from 'lucide-react'

export const asakaCloudService = {
  id: 'asakacloud',
  name: 'Asaka Cloud',
  slogan: '#1 Hosting & VPS Game Server Việt Nam',
  description: 'Dịch vụ hosting Minecraft và game server hàng đầu với hiệu năng cao, giá rẻ nhất thị trường, hỗ trợ cài đặt tự động và đội ngũ kỹ thuật Việt Nam 24/7!',
  features: [
    'Hiệu năng cao với cấu hình mạnh mẽ',
    'Hỗ trợ one-click Minecraft, Modpack, Plugin',
    'Giá cạnh tranh nhất Việt Nam',
    'Hỗ trợ 24/7 qua Discord & Ticket',
  ],
  price: 'Từ 51.000đ/tháng',
  url: 'https://asakacloud.vn/',
  icon: Server,
  gradient: 'from-blue-500 to-cyan-500',
  details: {
    title: 'Tại sao chọn Asaka Cloud?',
    points: [
      {
        icon: Zap,
        text: 'Hiệu suất cao, độ ổn định tối ưu cho server game lớn',
      },
      {
        icon: Shield,
        text: 'Bảo mật mạnh mẽ, chống DDoS hiệu quả',
      },
      {
        icon: Users,
        text: 'Đội ngũ hỗ trợ Việt Nam nhiệt tình, phản hồi nhanh 24/7',
      },
    ],
    description: 'Asaka Cloud là nhà cung cấp hosting game & VPS hàng đầu Việt Nam năm 2025, chuyên tối ưu cho Minecraft với giá rẻ nhất thị trường, chất lượng cao và dịch vụ thân thiện.',
  },
}