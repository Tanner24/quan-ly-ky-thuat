import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { X, AlertTriangle, CheckCircle, Clock, Wrench, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationPanel = ({ isOpen, onClose }) => {
    const [filter, setFilter] = useState('all'); // all, maintenance, overdue
    const [searchTerm, setSearchTerm] = useState('');

    // Get all vehicles
    const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];

    // Generate notifications
    const notifications = vehicles
        .map(vehicle => {
            const remaining = vehicle.nextMaintenanceHours
                ? (vehicle.nextMaintenanceHours - (vehicle.currentHours || 0))
                : null;

            if (remaining === null) return null;

            if (remaining <= 0) {
                return {
                    id: `overdue-${vehicle.id}`,
                    type: 'overdue',
                    title: 'Quá hạn bảo dưỡng',
                    message: `Xe ${vehicle.plateNumber} đã quá hạn ${Math.abs(remaining)}h`,
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plateNumber,
                    department: vehicle.department,
                    time: new Date(),
                    icon: AlertTriangle,
                    color: 'red'
                };
            } else if (remaining <= 50) {
                return {
                    id: `warning-${vehicle.id}`,
                    type: 'warning',
                    title: 'Sắp đến hạn bảo dưỡng',
                    message: `Xe ${vehicle.plateNumber} còn ${remaining}h nữa cần bảo dưỡng`,
                    vehicleId: vehicle.id,
                    plateNumber: vehicle.plateNumber,
                    department: vehicle.department,
                    time: new Date(),
                    icon: Clock,
                    color: 'yellow'
                };
            }

            return null;
        })
        .filter(n => n !== null);

    // Filter notifications by type
    let filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'overdue') return n.type === 'overdue';
        if (filter === 'maintenance') return n.type === 'warning';
        return true;
    });

    // Filter by search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredNotifications = filteredNotifications.filter(n =>
            n.plateNumber.toLowerCase().includes(term) ||
            n.message.toLowerCase().includes(term) ||
            (n.department && n.department.toLowerCase().includes(term))
        );
    }

    const overdueCount = notifications.filter(n => n.type === 'overdue').length;
    const warningCount = notifications.filter(n => n.type === 'warning').length;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div>
                        <h2 className="text-lg font-bold">Thông báo</h2>
                        <p className="text-xs opacity-90">
                            {notifications.length} thông báo
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filter === 'all'
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Tất cả ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('overdue')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filter === 'overdue'
                            ? 'bg-white text-red-600 border-b-2 border-red-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Quá hạn ({overdueCount})
                    </button>
                    <button
                        onClick={() => setFilter('maintenance')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${filter === 'maintenance'
                            ? 'bg-white text-yellow-600 border-b-2 border-yellow-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Cảnh báo ({warningCount})
                    </button>
                </div>

                {/* Search Box */}
                <div className="p-3 border-b border-slate-200 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã xe, bộ phận..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto h-[calc(100vh-240px)]">
                    {filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <CheckCircle className="w-16 h-16 mb-4" />
                            <p className="text-sm">Không có thông báo</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredNotifications.map(notification => {
                                const Icon = notification.icon;
                                return (
                                    <Link
                                        key={notification.id}
                                        to={`/vehicles/${notification.vehicleId}`}
                                        onClick={onClose}
                                        className="block p-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex gap-3">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.color === 'red'
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-2">
                                                    Mới nhất
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationPanel;
