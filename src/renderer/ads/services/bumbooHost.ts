// src/renderer/ads/services/bumbooHost.ts
import { Server, Zap, Shield, Users } from 'lucide-react'

export const bumbooHostService = {
  id: 'bumboohost',
  name: 'BumbooHost',
  slogan: 'Hosting Server Game Việt Nam - Cloud VPS Chuyên Game',
  description: 'Dịch vụ hosting Minecraft & game server chất lượng cao với Cloud VPS mạnh mẽ, độ trễ thấp, uptime 99.99%, hỗ trợ cài đặt tự động và tối ưu cho cộng đồng game Việt!',
  features: [
    'Cloud VPS hiệu suất cao, đáp ứng nhanh',
    'Hỗ trợ tự động cài Minecraft, GeyserMC (cross-play Java + Bedrock)',
    'DDoS Protection & bảo mật cao',
    'Hỗ trợ 24/7, giao diện quản lý hiện đại',
  ],
  price: 'Từ 51.000đ/tháng',
  url: 'https://bumboohost.vn/',
  icon: Server,
  gradient: 'from-purple-500 to-pink-500',
  details: {
    title: 'Tại sao chọn BumbooHost?',
    points: [
      {
        icon: Zap,
        text: 'Hiệu suất vượt trội với Cloud VPS tối ưu cho game server, uptime 99.99%',
      },
      {
        icon: Shield,
        text: 'Bảo mật mạnh mẽ, chống DDoS và an toàn dữ liệu',
      },
      {
        icon: Users,
        text: 'Hỗ trợ kỹ thuật Việt Nam nhanh chóng, thân thiện 24/7',
      },
    ],
    description: 'BumbooHost là nhà cung cấp Cloud VPS và Hosting Server Game hàng đầu Việt Nam năm 2025, chuyên tối ưu cho Minecraft và các tựa game khác với giao diện mới hiện đại, cài đặt tự động chỉ trong vài phút.',
  },
}