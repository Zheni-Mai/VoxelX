// src/renderer/ads/services/bumbooHost.ts
import { Server, Zap, Coins, Users } from 'lucide-react'

export const noService = {
  id: 'nosevices',
  name: 'NoSevices',
  slogan: 'Phần quảng cáo dịch vụ',
  description: 'Quảng cáo dịch vụ nếu bạn là một studio, hosting game tại việt nam!',
  features: [
    'Bạn muốn quảng bả sản phẩm, dịch vụ',
    'Bạn muốn có nhiều người biết đến dịch vụ của bạn',
    'Quảng bá giúp đem lại lượng khách hàng lớn',
    'Tăng doanh thu cho dịch vụ',
  ],
  price: '',
  url: '',
  icon: Server,
  gradient: 'from-purple-500 to-pink-500',
  details: {
    title: 'Tại sao chọn dịch vụ này?',
    points: [
      {
        icon: Zap,
        text: 'Mở rộng thị trường',
      },
      {
        icon: Coins,
        text: 'Tăng doanh thu cho dịch vụ',
      },
      {
        icon: Users,
        text: 'Quảng bá giúp đem lại lượng khách hàng lớn',
      },
    ],
    description: 'Quảng cáo dịch vụ nếu bạn là một studio, hosting game tại việt nam!',
  },
}