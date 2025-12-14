import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ArrowLeft, Clock, Wrench, Trash2, Save, Calendar, Package } from 'lucide-react';

const VehicleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const vehicleId = parseInt(id);

    const [showLogForm, setShowLogForm] = useState(false);
    const [newLog, setNewLog] = useState({ date: new Date().toISOString().split('T')[0], hours: '', type: 'Bảo dưỡng định kỳ', description: '', cost: '' });
    const [updateHours, setUpdateHours] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const vehicle = useLiveQuery(() => db.vehicles.get(vehicleId), [vehicleId]);
    const logs = useLiveQuery(() => db.maintenanceLogs.where('vehicleId').equals(vehicleId).reverse().toArray(), [vehicleId]);

    const filteredLogs = logs?.filter(log =>
        (log.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.type || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    if (!vehicle) return <div className="p-8 text-center">Đang tải...</div>;

    const handleUpdateHours = async () => {
        if (!updateHours) return;
        await db.vehicles.update(vehicleId, {
            currentHours: parseFloat(updateHours),
            lastUpdated: new Date()
        });
        setUpdateHours('');
        alert('Đã cập nhật giờ máy!');
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        await db.maintenanceLogs.add({
            vehicleId,
            ...newLog,
            hours: parseFloat(newLog.hours) || 0,
            cost: parseFloat(newLog.cost) || 0
        });
        // Also update vehicle's lastUpdated
        await db.vehicles.update(vehicleId, { lastUpdated: new Date() });
        setNewLog({ date: new Date().toISOString().split('T')[0], hours: '', type: 'Bảo dưỡng định kỳ', description: '', cost: '' });
        setShowLogForm(false);
    };

    const handleDeleteVehicle = async () => {
        if (window.confirm('Xóa xe này và toàn bộ lịch sử?')) {
            await db.vehicles.delete(vehicleId);
            await db.maintenanceLogs.where('vehicleId').equals(vehicleId).delete();
            navigate('/vehicles');
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Chưa cập nhật';
        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <Link to="/vehicles" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-slate-900">{vehicle.plateNumber}</h1>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                            {vehicle.status}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-slate-500 text-lg">{vehicle.model}</p>
                        {vehicle.department && (
                            <p className="text-slate-600 font-medium">Bộ phận: {vehicle.department}</p>
                        )}
                        <p className="text-slate-400 text-sm">Cập nhật: {formatDate(vehicle.lastUpdated)}</p>
                    </div>
                </div>
                <button onClick={handleDeleteVehicle} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center h-fit">
                    <Trash2 className="w-4 h-4 mr-2" /> Xóa xe
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats / Update Hours */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-1 space-y-6 h-fit">
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase">Giờ hoạt động hiện tại</p>
                        <p className="text-4xl font-bold text-blue-600 font-mono mt-2">{vehicle.currentHours}h</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cập nhật Giờ máy</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={updateHours}
                                onChange={e => setUpdateHours(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300"
                                placeholder="Nhập giờ mới..."
                            />
                            <button onClick={handleUpdateHours} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                <Save className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase mb-3">Thông tin bảo dưỡng</p>
                        <ul className="space-y-3">
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-600">Thời gian BD lần cuối:</span>
                                <span className="font-medium">{filteredLogs && filteredLogs[0] ? formatDate(filteredLogs[0].date).split(' ')[0] : 'Chưa có'}</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-600">Mức BD kế tiếp:</span>
                                <span className="font-medium text-blue-600">{vehicle.nextMaintenanceHours ? `${vehicle.nextMaintenanceHours}h` : 'Chưa thiết lập'}</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-600">Giờ BD gần nhất:</span>
                                <span className="font-medium text-slate-900">{filteredLogs && filteredLogs[0] && filteredLogs[0].hours ? `${filteredLogs[0].hours}h` : 'N/A'}</span>
                            </li>
                        </ul>
                    </div>

                    <Link
                        to={`/part-analysis?assetCode=${vehicle.plateNumber}`}
                        className="mt-4 flex items-center justify-center w-full px-4 py-3 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                        <Package className="w-5 h-5 mr-2" />
                        Xem Hướng dẫn Bảo dưỡng
                    </Link>
                </div>

                {/* Maintenance Logs */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 md:col-span-2 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center">
                            <Wrench className="w-5 h-5 mr-2 text-slate-400" />
                            Nhật ký Bảo dưỡng
                        </h2>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Tìm kiếm nội dung..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-1.5 border rounded-lg text-sm w-full sm:w-48"
                            />
                            <button
                                onClick={() => setShowLogForm(!showLogForm)}
                                className="text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm whitespace-nowrap"
                            >
                                + Thêm nhật ký
                            </button>
                        </div>
                    </div>

                    {showLogForm && (
                        <div className="p-6 bg-slate-50 border-b border-slate-200">
                            <form onSubmit={handleAddLog} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày</label>
                                    <input type="date" required value={newLog.date} onChange={e => setNewLog({ ...newLog, date: e.target.value })} className="w-full p-2 rounded border" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giờ máy (lúc BD)</label>
                                    <input type="number" required value={newLog.hours} onChange={e => setNewLog({ ...newLog, hours: e.target.value })} className="w-full p-2 rounded border" placeholder="VD: 500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại</label>
                                    <select value={newLog.type} onChange={e => setNewLog({ ...newLog, type: e.target.value })} className="w-full p-2 rounded border">
                                        <option>Bảo dưỡng định kỳ</option>
                                        <option>Sửa chữa</option>
                                        <option>Thay thế phụ tùng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chi phí</label>
                                    <input type="number" value={newLog.cost} onChange={e => setNewLog({ ...newLog, cost: e.target.value })} className="w-full p-2 rounded border" placeholder="0" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả công việc</label>
                                    <input type="text" required value={newLog.description} onChange={e => setNewLog({ ...newLog, description: e.target.value })} className="w-full p-2 rounded border" placeholder="Thay nhớt, lọc gió, kiểm tra gầm..." />
                                </div>
                                <div className="flex items-end md:col-span-2">
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium">Lưu Nhật ký</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="max-h-[500px] overflow-y-auto">
                        {!filteredLogs || filteredLogs.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                {searchTerm ? 'Không tìm thấy nhật ký phù hợp.' : 'Chưa có dữ liệu bảo dưỡng.'}
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Ngày</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Giờ máy</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Loại</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nội dung</th>
                                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Chi phí</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{log.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono">{log.hours ? `${log.hours}h` : '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.type === 'Sửa chữa' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{log.description}</td>
                                            <td className="px-6 py-4 text-sm text-slate-900 font-mono text-right">
                                                {log.cost ? log.cost.toLocaleString() : '0'} đ
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetails;
