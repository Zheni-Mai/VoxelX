// src/renderer/ads/services/vinaHost.ts
import { Server, Zap, Shield, Users } from 'lucide-react'

export const vinaHostService = {
  id: 'vinahost',
  name: 'VinaHost',
  slogan: 'Hosting Minecraft Việt Nam #1 - Uptime 99.9%',
  description: 'VPS Minecraft mạnh mẽ với CPU Xeon Gold, ổ NVMe, độ trễ thấp, hỗ trợ 24/7. Hỗ trợ nhiều server Minecraft trên một VPS!',
  features: [
    'CPU Xeon Gold cao cấp + NVMe SSD',
    'Hỗ trợ Modpack/Plugin tự động qua Pterodactyl Panel',
    'DDoS Protection miễn phí',
    'Hoàn tiền 5 ngày hoặc thử nghiệm 7 ngày',
  ],
  price: 'Từ 51.000đ/tháng',
  url: 'https://vinahost.vn/vps-minecraft/',
  icon: Server,
  gradient: 'from-emerald-500 to-cyan-500',
  details: {
    title: 'Tại sao chọn VinaHost?',
    points: [
      {
        icon: Zap,
        text: 'Hiệu suất vượt trội với CPU Xeon Gold & ổ NVMe RAID-10',
      },
      {
        icon: Shield,
        text: 'Bảo mật DDoS mạnh mẽ miễn phí',
      },
      {
        icon: Users,
        text: 'Hỗ trợ kỹ thuật Việt Nam 24/7/365',
      },
    ],
    description: 'VinaHost là một trong những nhà cung cấp VPS Minecraft hàng đầu Việt Nam năm 2025, với hạ tầng hiện đại tại Data Center Tier 3 và giá cạnh tranh nhất thị trường.',
  },
}