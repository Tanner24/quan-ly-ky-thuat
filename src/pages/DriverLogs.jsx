import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Share2, ArrowLeft, Download, Trash2, Truck, Clock, Activity, Calendar } from 'lucide-react';

const DriverLogs = () => {
    const [copied, setCopied] = useState(false);

    const logs = useLiveQuery(
        () => db.logs.orderBy('date').reverse().toArray()
    );

    const handleShare = () => {
        const url = `${window.location.origin}/driver-logs/update`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Xóa nhật ký này?")) {
            await db.logs.delete(id);
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Nhật ký Hoạt động</h1>
                    <p className="text-slate-500">Quản lý ODO và lịch trình phương tiện.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleShare}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Share2 className="w-5 h-5 mr-2" />
                        {copied ? 'Đã sao chép Link!' : 'Chia sẻ Form Cập nhật'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Activity className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Tổng bản ghi</p>
                        <h3 className="text-2xl font-bold text-slate-900">{logs?.length || 0}</h3>
                    </div>
                </div>
            </div>

            {/* Logs Interface */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800">Lịch sử hoạt động</h3>
                    <button className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center">
                        <Download className="w-4 h-4 mr-1" /> Xuất Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã Tài Sản</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ODO Giờ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ODO KM</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!logs || logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        Chưa có dữ liệu. Hãy chia sẻ form để nhập liệu.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-900 font-medium whitespace-nowrap">{log.date}</td>
                                        <td className="px-6 py-4 text-slate-600 font-bold flex items-center gap-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-700">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            {log.assetCode || log.driverName /* Fallback for old data */}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">
                                            {log.odoHours ? `${log.odoHours}h` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">
                                            {log.odoKm ? `${log.odoKm} km` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate">{log.notes || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(log.id)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DriverLogs;
