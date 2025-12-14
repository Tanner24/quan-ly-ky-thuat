import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
    Truck, Users, Activity, Wrench,
    AlertCircle, CheckCircle, PieChart,
    ArrowUpRight, MapPin, Calendar, Save, History, X,
    ClipboardCheck, ClipboardX // Added icons
} from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-white`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        {subtext && (
            <div className="mt-4 flex items-center text-xs text-slate-500">
                {subtext}
            </div>
        )}
    </div>
);

const ProgressBar = ({ label, value, total, color = "bg-blue-500", onClick }) => {
    const percent = total > 0 && typeof value === 'number' ? Math.round((value / total) * 100) : 0;
    return (
        <div
            className={`mb-4 last:mb-0 ${onClick ? 'cursor-pointer group' : ''}`}
            onClick={onClick}
        >
            <div className="flex justify-between text-sm mb-1.5">
                <span className={`font-medium text-slate-700 ${onClick ? 'group-hover:text-blue-600 transition-colors' : ''}`}>{label}</span>
                <span className="text-slate-500">{value} ({percent}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full ${color} transition-all duration-500`}
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    );
};

// Modal Component for Vehicle List
const VehicleListModal = ({ data, onClose }) => {
    if (!data) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{data.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">Tổng số lượng:</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{data.list.length} xe</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="px-6 py-4">Mã xe / Biển số</th>
                                <th className="px-6 py-4">Model</th>
                                <th className="px-6 py-4">Bộ phận</th>
                                <th className="px-6 py-4 text-center">Giờ hoạt động</th>
                                <th className="px-6 py-4">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.list.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">
                                        Không có xe nào trong danh sách này.
                                    </td>
                                </tr>
                            ) : (
                                data.list.map(v => (
                                    <tr key={v.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{v.plateNumber}</td>
                                        <td className="px-6 py-4 text-slate-600">{v.model}</td>
                                        <td className="px-6 py-4 text-slate-600">{v.department || '-'}</td>
                                        <td className="px-6 py-4 text-center font-mono text-slate-700">
                                            {v.currentHours ? Number(v.currentHours).toLocaleString() : '0'} h
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${v.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                                                v.status === 'maintenance' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {v.status === 'active' ? 'Hoạt động' :
                                                    v.status === 'maintenance' ? 'Bảo dưỡng' : 'Khác'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Đóng danh sách
                    </button>
                </div>
            </div>
        </div>
    );
};

const Reports = () => {
    // --- State ---
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [modalData, setModalData] = useState(null); // { title: string, list: [] }
    const isToday = selectedDate === todayStr;

    // --- Data Queries ---
    const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];
    const users = useLiveQuery(() => db.users.toArray()) || [];
    const snapshots = useLiveQuery(() => db.reportSnapshots.orderBy('date').reverse().toArray()) || [];

    // Fetch logs for the selected date to track reporting status
    const dailyLogs = useLiveQuery(async () => {
        const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate); end.setHours(23, 59, 59, 999);
        return await db.logs.where('date').between(start, end).toArray();
    }, [selectedDate]) || [];

    const historySnapshot = useLiveQuery(
        () => db.reportSnapshots.where('date').equals(selectedDate).first(),
        [selectedDate]
    );

    // --- Data Processing ---
    const calculateStats = (vehicleList, userList, logsList) => {
        const totalVehicles = vehicleList.length;
        const totalUsers = userList.length;

        // Categorize Lists
        const activeList = vehicleList.filter(v => v.status === 'active');
        const maintenanceList = vehicleList.filter(v => v.status === 'maintenance');

        const overdueList = vehicleList.filter(v =>
            v.nextMaintenanceHours && Number(v.currentHours || 0) >= Number(v.nextMaintenanceHours)
        );

        const upcomingList = vehicleList.filter(v =>
            v.nextMaintenanceHours &&
            Number(v.currentHours || 0) < Number(v.nextMaintenanceHours) &&
            (Number(v.nextMaintenanceHours) - Number(v.currentHours || 0)) <= 50
        );

        const othersList = vehicleList.filter(v => v.status !== 'active' && v.status !== 'maintenance');

        // Reporting Status Logic
        const reportedAssetCodes = new Set(logsList.map(l => l.assetCode ? l.assetCode.toString().trim().toUpperCase() : ''));
        const reportedVehiclesList = vehicleList.filter(v => reportedAssetCodes.has(v.plateNumber));
        const unreportedVehiclesList = vehicleList.filter(v => !reportedAssetCodes.has(v.plateNumber));

        // Counts
        const activeVehicles = activeList.length;
        const maintenanceVehicles = maintenanceList.length;
        const overdueVehicles = overdueList.length;
        const upcomingVehicles = upcomingList.length;

        const utilizationRate = totalVehicles > 0
            ? ((activeVehicles / totalVehicles) * 100).toFixed(1)
            : 0;

        const deptStats = vehicleList.reduce((acc, v) => {
            const dept = v.department || 'Chưa phân loại';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});

        const sortedDepts = Object.entries(deptStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return {
            totalVehicles,
            totalUsers,
            activeVehicles,
            maintenanceVehicles,
            overdueVehicles,
            upcomingVehicles,
            utilizationRate,
            deptStats,
            sortedDepts,
            // Lists for Modal
            activeList,
            maintenanceList,
            overdueList,
            upcomingList,
            othersList,
            // Reporting Stats
            reportedVehiclesList,
            unreportedVehiclesList
        };
    };

    const realtimeStats = useMemo(() => calculateStats(vehicles, users, dailyLogs), [vehicles, users, dailyLogs]);
    const displayStats = isToday ? realtimeStats : (historySnapshot?.stats || null);

    // --- Handlers ---
    const handleSaveSnapshot = async () => {
        if (!isToday) return;
        try {
            await db.reportSnapshots.put({
                date: todayStr,
                stats: realtimeStats,
                savedAt: new Date()
            });
            alert(`Đã lưu báo cáo ngày ${todayStr} thành công!`);
        } catch (error) {
            console.error(error);
            alert('Lỗi lưu báo cáo: ' + error.message);
        }
    };

    const openModal = (title, list) => {
        if (list && list.length > 0) {
            setModalData({ title, list });
        } else {
            alert('Danh sách trống!');
        }
    };

    return (
        <div className="space-y-6 pb-10 animate-fade-in relative min-h-screen">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Báo cáo Hoạt động</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {isToday ? 'Dữ liệu thời gian thực' : `Dữ liệu lịch sử: ${selectedDate}`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            max={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>

                    {isToday && (
                        <button
                            onClick={handleSaveSnapshot}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            Lưu Báo cáo
                        </button>
                    )}
                </div>
            </div>

            {/* Quick History List */}
            {snapshots.length > 0 && isToday && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {snapshots.slice(0, 5).map(snap => (
                        <button
                            key={snap.date}
                            onClick={() => setSelectedDate(snap.date)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap"
                        >
                            <History className="w-3 h-3 text-slate-400" />
                            {snap.date === todayStr ? 'Hôm nay' : snap.date}
                        </button>
                    ))}
                </div>
            )}

            {!displayStats ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <History className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="text-slate-500 font-medium text-lg">Không có dữ liệu báo cáo cho ngày này.</p>
                    <button onClick={() => setSelectedDate(todayStr)} className="mt-4 px-4 py-2 text-blue-600 hover:underline text-sm">
                        Quay về Hôm nay
                    </button>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Tổng số xe"
                            value={displayStats.totalVehicles}
                            icon={Truck} color="bg-blue-600"
                            subtext="Đang quản lý"
                        />
                        <StatCard
                            title="Hiệu suất hoạt động"
                            value={`${displayStats.utilizationRate}%`}
                            icon={Activity} color="bg-green-500"
                            subtext="Tỷ lệ xe đang sẵn sàng"
                        />
                        <StatCard
                            title="Đang bảo dưỡng"
                            value={displayStats.maintenanceVehicles}
                            icon={Wrench} color="bg-orange-500"
                            subtext="Tổng số xe dừng sửa chữa"
                        />
                        <StatCard
                            title="Nhân sự hệ thống"
                            value={displayStats.totalUsers}
                            icon={Users} color="bg-purple-500"
                            subtext="Admin & Kỹ thuật viên"
                        />
                    </div>

                    {/* Reporting Status Monitor (New Feature) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-slate-500" />
                            Giám sát Nhật trình (Hôm nay)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => openModal('Danh sách Xe Đã báo cáo', displayStats.reportedVehiclesList)}
                                className="group p-5 bg-green-50 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100/80 transition-all hover:scale-[1.01]"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-semibold text-green-800 uppercase tracking-wide">Đã gửi báo cáo</div>
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="text-3xl font-extrabold text-green-700">{displayStats.reportedVehiclesList?.length || 0}</div>
                                <div className="text-xs text-green-600 mt-1 font-medium group-hover:underline">Xem danh sách xe đã xong »</div>
                            </div>

                            <div
                                onClick={() => openModal('Danh sách Xe CHƯA báo cáo (Cần đôn đốc)', displayStats.unreportedVehiclesList)}
                                className="group p-5 bg-red-50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100/80 transition-all hover:scale-[1.01]"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-semibold text-red-800 uppercase tracking-wide">Chưa gửi báo cáo</div>
                                    <ClipboardX className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-3xl font-extrabold text-red-700">{displayStats.unreportedVehiclesList?.length || 0}</div>
                                <div className="text-xs text-red-600 mt-1 font-medium group-hover:underline">Xem danh sách cần đôn đốc »</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Status Chart */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-slate-500" />
                                Phân tích Trạng thái {isToday && '(Realtime)'}
                            </h3>

                            <div className="space-y-6">
                                <ProgressBar
                                    label="Quá hạn bảo dưỡng (Cần xử lý ngay)"
                                    value={displayStats.overdueVehicles}
                                    total={displayStats.totalVehicles}
                                    color="bg-red-600"
                                    onClick={() => openModal('Danh sách Xe Quá hạn Bảo dưỡng', displayStats.overdueList)}
                                />
                                <ProgressBar
                                    label="Sắp đến hạn (< 50h)"
                                    value={displayStats.upcomingVehicles}
                                    total={displayStats.totalVehicles}
                                    color="bg-yellow-500"
                                    onClick={() => openModal('Danh sách Xe Sắp đến hạn', displayStats.upcomingList)}
                                />
                                <ProgressBar
                                    label="Đang hoạt động (Sẵn sàng)"
                                    value={displayStats.activeVehicles}
                                    total={displayStats.totalVehicles}
                                    color="bg-green-500"
                                    onClick={() => openModal('Danh sách Xe Đang hoạt động', displayStats.activeList)}
                                />
                                <ProgressBar
                                    label="Đang bảo dưỡng / Sửa chữa"
                                    value={displayStats.maintenanceVehicles}
                                    total={displayStats.totalVehicles}
                                    color="bg-orange-500"
                                    onClick={() => openModal('Danh sách Xe Đang bảo dưỡng', displayStats.maintenanceList)}
                                />
                                <ProgressBar
                                    label="Khác / Chưa xác định"
                                    value={displayStats.totalVehicles - displayStats.activeVehicles - displayStats.maintenanceVehicles}
                                    total={displayStats.totalVehicles}
                                    color="bg-slate-300"
                                    onClick={() => openModal('Danh sách Xe Khác', displayStats.othersList)}
                                />
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div
                                    onClick={() => openModal('Xe Quá hạn Bảo dưỡng', displayStats.overdueList)}
                                    className="p-4 bg-red-50 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors group"
                                >
                                    <div className="text-2xl font-bold text-red-600 group-hover:scale-105 transition-transform">{displayStats.overdueVehicles}</div>
                                    <div className="text-xs font-semibold text-red-700 uppercase mt-1">Quá hạn</div>
                                </div>
                                <div
                                    onClick={() => openModal('Xe Sắp đến hạn Bảo dưỡng', displayStats.upcomingList)}
                                    className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition-colors group"
                                >
                                    <div className="text-2xl font-bold text-yellow-600 group-hover:scale-105 transition-transform">{displayStats.upcomingVehicles}</div>
                                    <div className="text-xs font-semibold text-yellow-700 uppercase mt-1">Sắp đến</div>
                                </div>
                                <div
                                    onClick={() => openModal('Xe Đang hoạt động', displayStats.activeList)}
                                    className="p-4 bg-green-50 rounded-lg border border-green-100 cursor-pointer hover:bg-green-100 transition-colors group"
                                >
                                    <div className="text-2xl font-bold text-green-600 group-hover:scale-105 transition-transform">{displayStats.activeVehicles}</div>
                                    <div className="text-xs font-semibold text-green-700 uppercase mt-1">Hoạt động</div>
                                </div>
                                <div
                                    onClick={() => openModal('Xe Đang Bảo dưỡng', displayStats.maintenanceList)}
                                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="text-2xl font-bold text-slate-600 group-hover:scale-105 transition-transform">{displayStats.maintenanceVehicles}</div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Bảo dưỡng</div>
                                </div>
                            </div>
                        </div>

                        {/* Department Distribution (Simplified) */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-slate-500" />
                                Phân bố Bộ phận
                            </h3>
                            <div className="space-y-4">
                                {displayStats.sortedDepts.map(([dept, count], index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]" title={dept}>{dept}</span>
                                        <span className="text-sm font-bold text-blue-600 bg-white px-2 py-0.5 rounded shadow-sm border border-blue-100">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Vehicle List Modal */}
            {modalData && <VehicleListModal data={modalData} onClose={() => setModalData(null)} />}
        </div>
    );
};

export default Reports;
