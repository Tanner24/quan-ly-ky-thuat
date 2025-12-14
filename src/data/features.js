import {
    AlertTriangle,
    BookOpen,
    Truck,
    ClipboardList,
    Cpu,
    Database,
    Wrench,
    FileText,
    RefreshCw
} from 'lucide-react';

export const features = [
    {
        id: 'reports',
        title: 'Báo cáo',
        description: 'Tổng hợp báo cáo và thống kê hoạt động.',
        icon: FileText,
        link: '/reports',
        color: 'text-teal-500'
    },
    {
        id: 'vehicles',
        title: 'Quản lý Xe',
        description: 'Theo dõi lịch bảo dưỡng và giờ hoạt động của xe.',
        icon: Truck,
        link: '/vehicles',
        color: 'text-blue-600'
    },
    {
        id: 'driver-logs',
        title: 'Nhật ký Lái xe',
        description: 'Quản lý và xem giờ làm việc của lái xe.',
        icon: ClipboardList,
        link: '/driver-logs',
        color: 'text-slate-500'
    },
    {
        id: 'maintenance-guide',
        title: 'Hướng dẫn bảo dưỡng',
        description: 'Quy trình và hướng dẫn bảo dưỡng kỹ thuật.',
        icon: Wrench,
        link: '/part-analysis',
        color: 'text-blue-500'
    },
    {
        id: 'error-code',
        title: 'Tra cứu mã lỗi',
        description: 'Nhập mã lỗi để nhận các bước khắc phục sự cố.',
        icon: AlertTriangle,
        link: '/error-code',
        color: 'text-red-500'
    },
    {
        id: 'maintenance',
        title: 'Tra cứu OEM',
        description: 'Tra cứu tài liệu kỹ thuật từ các hãng.',
        icon: BookOpen,
        link: '/maintenance',
        color: 'text-green-500'
    },
    {
        id: 'vincons-sync',
        title: 'Đồng bộ Vincons',
        description: 'Kết nối và lấy dữ liệu từ hệ thống Vincons.',
        icon: RefreshCw,
        link: '/vincons-sync',
        color: 'text-indigo-600'
    },
    {
        id: 'course-finder',
        title: 'Tìm khóa học',
        description: 'Tìm các khóa học trực tuyến về kỹ thuật.',
        icon: Cpu,
        link: '/course-finder',
        color: 'text-purple-500'
    },
    {
        id: 'settings',
        title: 'Quản lý Dữ liệu',
        description: 'Sao lưu, khôi phục, đồng bộ dữ liệu hệ thống.',
        icon: Database,
        link: '/settings',
        color: 'text-gray-600'
    }
];
