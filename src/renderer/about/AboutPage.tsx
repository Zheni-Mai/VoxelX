// src/renderer/about/AboutPage.tsx
import { motion } from 'framer-motion'
import { Shield, FileText, Heart, Globe, Code2, Users, MessageCircle, Facebook, Twitter, Link } from 'lucide-react'
import bg1 from '@/assets/backgrounds/launcher.png'
import { MotionDiv } from '../utils/motion'
 
const socialLinks = [
  {
    name: 'Discord',
    icon: MessageCircle,
    url: 'https://join.foxstudio.site',
    color: 'hover:bg-indigo-600',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    url: 'https://facebook.com/voxelxlauncher', 
    color: 'hover:bg-blue-600',
  },
  {
    name: 'Twitter / X',
    icon: Twitter,
    url: 'https://twitter.com/voxelxlauncher', 
    color: 'hover:bg-sky-500',
  },
  {
    name: 'Website',
    icon: Link,
    url: 'https://foxstudio.site',
    color: 'hover:bg-purple-600',
  },
]

const sections = [
  {
    id: 'introduction',
    title: 'VoxelX Launcher',
    subtitle: 'Next Gen Minecraft Launcher',
    icon: Code2,
    hasImage: true,
    imageUrl: bg1,
    imageAlt: 'Giao diện launcher Minecraft hiện đại và đẹp mắt',
    content: (
      <>
        <p className="text-lg leading-relaxed text-gray-300 mb-6">
          VoxelX là launcher Minecraft thế hệ mới được xây dựng với tình yêu dành cho cộng đồng người chơi Việt Nam và toàn thế giới.
        </p>
        <p className="text-lg leading-relaxed text-gray-300 mb-6">
          Chúng tôi tin rằng trải nghiệm chơi Minecraft nên <span className="text-cyan-400 font-semibold">mượt mà, đẹp mắt và dễ sử dụng</span> – không cần cấu hình phức tạp.
        </p>
        <p className="text-lg leading-relaxed text-gray-300">
          Với công nghệ hiện đại như <span className="text-emerald-400">React + Electron + TypeScript</span>, VoxelX mang đến giao diện mượt mà, hiệu ứng đẹp mắt và tính năng mạnh mẽ.
        </p>
      </>
    ),
  },
  {
    id: 'integrity',
    title: 'Tính Toàn Vẹn & Minh Bạch',
    subtitle: 'Chúng tôi cam kết bảo vệ bạn',
    icon: Shield,
    hasImage: false,
    content: (
      <ul className="space-y-4 text-gray-300">
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
          <span>
            <strong>Không malware, không Virus</strong> – mã nguồn launcher được kiểm tra kỹ lưỡng
          </span>
        </li>
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
          <span>
            <strong>Không thu thập dữ liệu cá nhân</strong> tất cả dữ liệu về tài khoản đều lưu cục bộ trên máy
          </span>
        </li>
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
          <span>
            <strong>Tất cả kết nối đều được mã hóa</strong> và chỉ đến các server chính thức của Mojang/Microsoft/Ely.by
          </span>
        </li>
        <li className="flex items-start gap-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
          <span>
            <strong>Không bán dữ liệu, không quảng cáo ẩn</strong> – chúng tôi tôn trọng quyền riêng tư của bạn
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: 'community',
    title: 'Dành Cho Cộng Đồng',
    subtitle: 'Built with love ❤️ từ Việt Nam',
    icon: Heart,
    hasImage: true,
    imageUrl: 'https://thesmartlocal.com/vietnam/wp-content/uploads/2021/03/hcm-mausoleum-behind.jpg',
    imageAlt: 'Cộng đồng Minecraft Việt Nam tái hiện Lăng Bác',
    content: (
      <>
        <p className="text-lg leading-relaxed text-gray-300 mb-6">
          VoxelX được phát triển bởi một nhóm nhỏ đam mê Minecraft tại Việt Nam, với mong muốn mang đến launcher <span className="text-cyan-400">đẹp - nhanh - ổn định</span> cho anh em chơi server Việt.
        </p>
        <p className="text-lg leading-relaxed text-gray-300">
          Chúng tôi luôn lắng nghe góp ý từ cộng đồng để cải thiện launcher mỗi ngày.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Chính Sách Quyền Riêng Tư',
    subtitle: 'Chúng tôi không lưu trữ dữ liệu cá nhân',
    icon: Users,
    hasImage: false,
    content: (
      <div className="space-y-6 text-gray-300">
        <p>Launcher chỉ lưu trữ cục bộ trên máy bạn:</p>
        <ul className="list-disc list-inside space-y-2 ml-6">
          <li>Tên tài khoản và token đăng nhập (được mã hóa nếu cần)</li>
          <li>Cấu hình profile, theme, cài đặt launcher</li>
          <li>Danh sách instance và mod</li>
        </ul>
        <p>
          <strong>Không có dữ liệu nào</strong> được gửi về server của chúng tôi trừ:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-6">
          <li>Số lượng người online (ẩn danh hoàn toàn)</li>
          <li>Kiểm tra cập nhật launcher</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'terms',
    title: 'Điều Khoản Sử Dụng',
    subtitle: 'Vui lòng tuân thủ để có trải nghiệm tốt nhất',
    icon: FileText,
    hasImage: false,
    content: (
      <div>
        <ul className="space-y-2 text-gray-300 ml-6">
            <p>• VoxelX là launcher <strong>miễn phí</strong>, không bán tài khoản, không bán mod</p>
            <p>• Không sử dụng launcher để phát tán phần mềm độc hại</p>
            <p>• Không phân phối lại launcher dưới tên khác mà không có sự cho phép</p>
            <p>• Chúng tôi có quyền từ chối hỗ trợ nếu phát hiện hành vi vi phạm</p>
            <p className="mt-6 text-cyan-400">
            VoxelX không liên kết chính thức với Mojang Studios hay Microsoft.<br />
            Minecraft là thương hiệu của Mojang Studios.
            </p>
        </ul>
      </div>
    ),
  },
  {
    id: 'global',
    title: 'Hỗ Trợ Toàn Cầu',
    subtitle: 'Dành cho mọi người chơi Minecraft trên thế giới',
    icon: Globe,
    hasImage: true,
    imageUrl: 'https://news.microsoft.com/source/wp-content/uploads/2024/03/Women-of-Minecraft-banner-final.jpg',
    imageAlt: 'Cộng đồng Minecraft toàn cầu đa dạng',
    content: (
      <>
        <p className="text-lg leading-relaxed text-gray-300 mb-6">
          Dù bạn chơi ở Việt Nam, Singapore, Mỹ hay châu Âu – VoxelX đều hoạt động mượt mà với:
        </p>
        <ul className="space-y-2 text-gray-300 ml-6">
          <li>• Hỗ trợ đăng nhập Microsoft (chính chủ)</li>
          <li>• Hỗ trợ Ely.by (cracked - an toàn)</li>
          <li>• Tối ưu hóa Java tự động</li>
          <li>• Tải mod/fabric nhanh chóng</li>
          <li>• Giao diện tiếng Việt & tiếng Anh</li>
        </ul>
        <p className="mt-8 text-cyan-400 font-medium text-xl">
          Chào mừng bạn đến với gia đình VoxelX! 🎮
        </p>
      </>
    ),
  },
]

export default function AboutPage() {

    const handleSocialClick = (url: string) => {
    window.open(url, '_blank')
  }
  return (
    <div className="relative min-h-screen py-20 px-6 lg:px-10 overflow-hidden">
      
      <div className="fixed inset-0 -z-10 bg-black/50" />

      <div className="relative max-w-7xl mx-auto">
        <MotionDiv
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h1 className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6 drop-shadow-2xl">
            VoxelX
          </h1>
          <p className="text-2xl lg:text-3xl text-gray-300 font-light drop-shadow-lg">
            Next Gen Minecraft Launcher • v2.0
          </p>
          <p className="text-xl text-gray-400 mt-4 drop-shadow-md">
            Built with love in Vietnam 🇻🇳 • For the global Minecraft community 🌍
          </p>
        </MotionDiv>
        {sections.map((section, index) => {
          const isEven = index % 2 === 0
          const textOrder = isEven ? 'lg:order-1' : 'lg:order-2'
          const imageOrder = isEven ? 'lg:order-2' : 'lg:order-1'

          return (
            <MotionDiv
              key={section.id}
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-150px" }}
              transition={{ duration: 0.9, delay: index * 0.15 }}
              className="mb-24 lg:mb-32"
            >
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className={`${textOrder} ${!section.hasImage ? 'lg:col-span-2' : ''}`}>
                  <div className="p-10 lg:p-12 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl border border-cyan-500/30">
                        <section.icon size={36} className="text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">
                          {section.title}
                        </h2>
                        <p className="text-xl lg:text-2xl text-gray-300 mt-2">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="prose prose-invert max-w-none text-base lg:text-lg">
                      {section.content}
                    </div>
                  </div>
                </div>
                {section.hasImage && (
                  <div className={`${imageOrder}`}>
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                      <img
                        src={section.imageUrl}
                        alt={section.imageAlt}
                        className="w-full h-full object-cover aspect-video lg:aspect-auto"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            </MotionDiv>
          )
        })}
        <MotionDiv
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center py-20"
        >
          <p className="text-3xl lg:text-5xl font-light text-gray-200 leading-relaxed drop-shadow-2xl">
            Cảm ơn bạn đã đồng hành cùng <span className="text-cyan-400 font-bold">VoxelX</span>
          </p>
          <p className="text-xl lg:text-2xl text-gray-400 mt-8 drop-shadow-md">
            Hành trình chỉ mới bắt đầu...
          </p>
        </MotionDiv>
        <MotionDiv
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex justify-center gap-6 py-12"
        >
          {socialLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => handleSocialClick(link.url)}
              className={`p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl ${link.color}`}
              aria-label={`Tham gia ${link.name}`}
            >
              <link.icon size={28} className="text-white" />
            </button>
          ))}
        </MotionDiv>
      </div>
    </div>
  )
}