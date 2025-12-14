import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { features } from '../data/features';
import { Database, Truck, AlertTriangle, ClipboardList, Clock, ArrowRight, User, ClipboardCheck, XSquare, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const stats = useLiveQuery(async () => {
        const vehicles = await db.vehicles.count();
        const logs = await db.logs.count();
        const errorCodes = await db.errorCodes.count();
        const parts = await db.parts.count();
        return { vehicles, logs, errorCodes, parts };
    });

    const recentLogs = useLiveQuery(async () => {
        // Use 'id' for ordering as it's auto-increment and indexed, effectively serving as createdAt
        return await db.logs.orderBy('id').reverse().limit(5).toArray();
    });

    const dailyMonitoring = useLiveQuery(async () => {
        const today = new Date().toISOString().split('T')[0];
        const logs = await db.logs.where('date').equals(today).toArray();
        const reportedCount = new Set(logs.map(l => l.assetCode)).size;
        const totalVehicles = await db.vehicles.count();
        return {
            reported: reportedCount,
            notReported: Math.max(0, totalVehicles - reportedCount)
        };
    });

    const statCards = [
        { title: 'Tổng số xe', value: stats?.vehicles || 0, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Nhật ký', value: stats?.logs || 0, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Mã lỗi', value: stats?.errorCodes || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        { title: 'Phụ tùng', value: stats?.parts || 0, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    const reportStats = useLiveQuery(async () => {
        const vehicles = await db.vehicles.toArray();
        const overdue = vehicles.filter(v => v.nextMaintenanceHours && (Number(v.currentHours || 0) > Number(v.nextMaintenanceHours))).length;
        const upcoming = vehicles.filter(v =>
            v.nextMaintenanceHours &&
            (Number(v.nextMaintenanceHours) - Number(v.currentHours || 0) <= 50) &&
            (Number(v.nextMaintenanceHours) - Number(v.currentHours || 0) >= 0)
        ).length;
        const active = vehicles.filter(v => ['active', 'operating', 'sẵn sàng'].includes((v.status || '').toLowerCase())).length;
        const maintenance = vehicles.filter(v => ['maintenance', 'repairing', 'bảo dưỡng', 'sửa chữa'].includes((v.status || '').toLowerCase())).length;

        return { overdue, upcoming, active, maintenance };
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Header Mobile Style */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold mb-1">Tổng quan</h1>
                    <p className="text-blue-100 text-sm opacity-90">Hệ thống quản lý kỹ thuật</p>

                    <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Quick Stats in Header */}
                        <div className="flex-1 min-w-[100px] bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <p className="text-xs text-blue-100 mb-1">Tổng thiết bị</p>
                            <p className="text-2xl font-bold">{stats?.vehicles || 0}</p>
                        </div>
                        <div className="flex-1 min-w-[100px] bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                            <p className="text-xs text-blue-100 mb-1">Mã lỗi (DB)</p>
                            <p className="text-2xl font-bold">{stats?.errorCodes || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Decoration Circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-black/10 blur-2xl"></div>
            </div>

            {/* STATUS CARDS REPORT SECTION */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. QUÁ HẠN (Red) */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl font-bold text-red-600 mb-1">{reportStats?.overdue || 0}</span>
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">QUÁ HẠN</span>
                </div>

                {/* 2. SẮP ĐẾN (Yellow) */}
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl font-bold text-yellow-600 mb-1">{reportStats?.upcoming || 0}</span>
                    <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">SẮP ĐẾN</span>
                </div>

                {/* 3. HOẠT ĐỘNG (Green) */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl font-bold text-emerald-600 mb-1">{reportStats?.active || 0}</span>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">HOẠT ĐỘNG</span>
                </div>

                {/* 4. BẢO DƯỠNG (Blue/Slate) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-3xl font-bold text-slate-600 mb-1">{reportStats?.maintenance || 0}</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">BẢO DƯỠNG</span>
                </div>
            </div>

            {/* Daily Monitoring Section */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-slate-600" />
                    Giám sát Nhật trình (Hôm nay)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Reported */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col relative overflow-hidden">
                        <div className="z-10">
                            <p className="text-xs font-bold text-emerald-800 uppercase mb-1">ĐÃ GỬI BÁO CÁO</p>
                            <p className="text-3xl font-bold text-emerald-600 mb-2">{dailyMonitoring?.reported || 0}</p>
                            <Link to="/logs" className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline flex items-center">
                                Xem danh sách xe đã xong »
                            </Link>
                        </div>
                        <CheckSquare className="absolute right-3 top-3 w-10 h-10 text-emerald-200/50" />
                    </div>

                    {/* Not Reported */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col relative overflow-hidden">
                        <div className="z-10">
                            <p className="text-xs font-bold text-red-800 uppercase mb-1">CHƯA GỬI BÁO CÁO</p>
                            <p className="text-3xl font-bold text-red-600 mb-2">{dailyMonitoring?.notReported || 0}</p>
                            <Link to="/vehicles" className="text-xs font-medium text-red-700 hover:text-red-800 hover:underline flex items-center">
                                Xem danh sách cần đốn đốc »
                            </Link>
                        </div>
                        <XSquare className="absolute right-3 top-3 w-10 h-10 text-red-200/50" />
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    Chức năng chính
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {features.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <Link
                                key={idx}
                                to={feature.link}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95 flex flex-col items-center text-center gap-3"
                            >
                                <div className={`p-3 rounded-xl bg-slate-50`}>
                                    {Icon && <Icon className={`w-8 h-8 ${feature.color}`} />}
                                </div>
                                <span className="font-semibold text-sm text-slate-700">{feature.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                    Hoạt động gần đây
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {!recentLogs || recentLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Chưa có hoạt động nào.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="font-bold text-slate-900 truncate">
                                                {log.assetCode || 'Không rõ'}
                                            </p>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {log.maintenanceDone ? '✅ Đã bảo dưỡng' : `Cập nhật ODO: ${log.odoHours}h`}
                                        </p>
                                        {log.notes && <p className="text-xs text-slate-400 mt-1 truncate">"{log.notes}"</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link to="/logs" className="block p-3 text-center text-sm font-medium text-blue-600 hover:bg-slate-50 transition-colors border-t border-slate-100">
                        Xem tất cả hoạt động
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
