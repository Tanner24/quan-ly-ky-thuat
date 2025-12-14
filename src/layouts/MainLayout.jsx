import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, ChevronDown, User, Briefcase, MapPin } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import NotificationPanel from '../components/NotificationPanel';
import AIChatPopup from '../components/AIChatPopup';
import InstallPrompt from '../components/InstallPrompt';

const MainLayout = () => {
    // Auto-hide sidebar on mobile by default
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Get notification count
    const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];
    const notificationCount = vehicles.filter(v => {
        const remaining = v.nextMaintenanceHours ? (v.nextMaintenanceHours - (v.currentHours || 0)) : null;
        return remaining !== null && remaining <= 50;
    }).length;

    // Resolve Project Names
    const allProjects = useLiveQuery(() => db.projects.toArray()) || [];
    const projectDisplay = React.useMemo(() => {
        if (!user || !user.assignedProjects) return null;

        const projectList = Array.isArray(user.assignedProjects) ? user.assignedProjects : [user.assignedProjects];

        const names = projectList.map(item => {
            // Try to find by ID (string/num) or Name or Code
            const project = allProjects.find(p => String(p.id) === String(item) || p.name === item || String(p.code) === String(item));
            return project ? project.name : item;
        });

        return names.join(', ');
    }, [user, allProjects]);

    const getRoleLabel = (role) => {
        const ROLES = {
            'super_admin': 'Admin Tổng',
            'admin': 'Quản trị viên',
            'project_admin': 'Admin Dự án',
            'site_manager': 'Ban chỉ huy',
            'technician': 'Kỹ thuật viên'
        };
        return ROLES[role] || role || 'Người dùng';
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Auto-close sidebar on mobile when clicking outside
    const handleMobileOverlayClick = () => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Notification Panel */}
            <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

            {/* Main Content Wrapper */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>

                {/* Navbar - Mobile Optimized */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 -ml-1 touch-manipulation"
                            aria-label="Toggle menu"
                        >
                            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <Link to="/" className="lg:hidden flex items-center gap-2">
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                            <span className="text-lg sm:text-xl font-bold text-slate-900">Quản lý xe</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Notifications - Touch friendly */}
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 sm:p-2.5 hover:bg-slate-100 rounded-full text-slate-500 relative touch-manipulation"
                            aria-label="Notifications"
                        >
                            <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
                            {notificationCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </button>

                        {/* User Menu - Mobile Optimized */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors touch-manipulation"
                                aria-label="User menu"
                            >
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <div className="text-sm font-medium text-slate-900 max-w-[120px] truncate">{user?.name}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-[120px]">
                                        {getRoleLabel(user?.role)}
                                    </div>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                            </button>

                            {/* Dropdown - Mobile friendly */}
                            {showUserMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40 sm:hidden"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                            <div className="font-bold text-slate-900 text-base">{user?.name}</div>
                                            <div className="mt-2 space-y-1.5">
                                                {/* Role/Title */}
                                                <div className="text-xs text-slate-600 flex items-center gap-2">
                                                    <div className="w-4 flex justify-center"><User className="w-3.5 h-3.5 text-blue-500" /></div>
                                                    <span className="font-medium">
                                                        {getRoleLabel(user?.role)}
                                                    </span>
                                                </div>

                                                {/* Department */}
                                                {user?.department && (
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <div className="w-4 flex justify-center"><Briefcase className="w-3.5 h-3.5 text-slate-400" /></div>
                                                        <span>{user.department}</span>
                                                    </div>
                                                )}

                                                {/* Projects */}
                                                {projectDisplay && (
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        <div className="w-4 flex justify-center"><MapPin className="w-3.5 h-3.5 text-slate-400" /></div>
                                                        <span className="truncate max-w-[180px]" title={projectDisplay}>
                                                            {projectDisplay}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors touch-manipulation"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="font-medium">Đăng xuất</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content - Mobile optimized padding */}
                <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Sidebar Overlay - Touch friendly */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={handleMobileOverlayClick}
                />
            )}

            {/* AI Assistant Chatbot */}
            <AIChatPopup />

            {/* PWA Install Prompt */}
            <InstallPrompt />
        </div>
    );
};

export default MainLayout;
