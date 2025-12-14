import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Save, CheckCircle, Clock, Truck, Calendar, Activity, AlertTriangle, Wrench, Info } from 'lucide-react';

const DriverLogUpdate = () => {
    const [formData, setFormData] = useState({
        assetCode: '',
        date: new Date().toISOString().split('T')[0],
        odoHours: '',
        odoKm: '',
        notes: '',
        maintenanceDone: false,
        maintenanceDescription: ''
    });

    // Vehicle data fetched from DB
    const [vehicleData, setVehicleData] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Calculate maintenance status based on INPUT hours
    const [maintenanceStatus, setMaintenanceStatus] = useState(null);

    // Debounce search for asset code
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.assetCode.length >= 2) {
                findVehicle(formData.assetCode);
            } else {
                setVehicleData(null);
                setSearchError('');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.assetCode]);

    // Recalculate maintenance status when ODO Hours or Vehicle Data changes
    useEffect(() => {
        if (vehicleData && formData.odoHours) {
            const currentInputHours = parseInt(formData.odoHours) || 0;
            const nextMaintenance = vehicleData.nextMaintenanceHours || 0;

            // Only calculate if we have valid numbers
            if (nextMaintenance > 0 && currentInputHours > 0) {
                const remaining = nextMaintenance - currentInputHours;
                let status = 'safe';
                if (remaining <= 0) status = 'overdue';
                else if (remaining <= 50) status = 'warning'; // Warn if within 50 hours

                setMaintenanceStatus({
                    remaining: remaining,
                    status: status,
                    nextMaintenance: nextMaintenance
                });
            } else {
                setMaintenanceStatus(null);
            }
        } else {
            setMaintenanceStatus(null);
        }
    }, [vehicleData, formData.odoHours]);

    const findVehicle = async (code) => {
        setIsSearching(true);
        setSearchError('');
        try {
            // Case insensitive search
            // First try exact match
            let vehicle = await db.vehicles.where('plateNumber').equals(code).first();

            // If not found, try to find case insensitive manually (if manageable size) or rely on user typing correctly (normalized)
            if (!vehicle) {
                // Try searching by normalized code
                const allVehicles = await db.vehicles.toArray();
                vehicle = allVehicles.find(v => v.plateNumber.toUpperCase() === code.toUpperCase());
            }

            if (vehicle) {
                setVehicleData(vehicle);
            } else {
                setVehicleData(null);
                setSearchError('Không tìm thấy mã tài sản này.');
            }
        } catch (error) {
            console.error("Error searching vehicle:", error);
            setSearchError('Lỗi khi tìm kiếm.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.assetCode || !formData.odoHours) return;
        if (!vehicleData) {
            alert("Vui lòng nhập đúng Mã Tài Sản.");
            return;
        }

        try {
            await db.transaction('rw', db.logs, db.vehicles, async () => {
                const inputHours = parseInt(formData.odoHours) || 0;
                const inputKm = parseInt(formData.odoKm) || 0;

                // 1. Add the log
                await db.logs.add({
                    assetCode: formData.assetCode,
                    date: formData.date,
                    odoHours: inputHours,
                    odoKm: inputKm,
                    notes: formData.notes,
                    maintenanceDone: formData.maintenanceDone,
                    maintenanceDescription: formData.maintenanceDescription,
                    createdAt: new Date()
                });

                // 2. Update the vehicle
                let updateData = {
                    currentHours: Math.max(vehicleData.currentHours || 0, inputHours),
                    currentKm: Math.max(vehicleData.currentKm || 0, inputKm),
                    lastUpdated: new Date()
                };

                // 3. Handle Maintenance Reset if confirmed
                if (formData.maintenanceDone) {
                    // Reset maintenance cycle
                    // Use vehicle's maintenance interval from Excel, default to 500 if missing
                    const interval = parseInt(vehicleData.maintenanceInterval) || 500;

                    updateData.lastMaintenanceDate = formData.date;
                    updateData.lastMaintenanceHours = inputHours;
                    updateData.nextMaintenanceHours = inputHours + interval;
                    updateData.status = 'Active'; // Reset status to Active if it was Overdue

                    // 4. Auto-create Maintenance Log
                    await db.maintenanceLogs.add({
                        vehicleId: vehicleData.id,
                        date: formData.date,
                        hours: inputHours, // Record the ODO at time of maintenance
                        type: 'Bảo dưỡng định kỳ',
                        description: formData.maintenanceDescription || 'Bảo dưỡng định kỳ',
                        cost: 0,
                        performer: 'Lái xe' // Optional: mark who did it
                    });
                }

                await db.vehicles.update(vehicleData.id, updateData);
            });

            setSubmitted(true);
            setFormData({
                assetCode: '',
                date: new Date().toISOString().split('T')[0],
                odoHours: '',
                odoKm: '',
                notes: '',
                maintenanceDone: false,
                maintenanceDescription: ''
            });
            setVehicleData(null);
            setMaintenanceStatus(null);

            setTimeout(() => setSubmitted(false), 5000);
        } catch (error) {
            console.error("Failed to submit log:", error);
            alert("Có lỗi xảy ra khi lưu nhật ký. Vui lòng thử lại.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-90" />
                    <h1 className="text-2xl font-bold">Cập nhật Giờ Lái xe</h1>
                    <p className="text-blue-100 text-sm">Vui lòng nhập chính xác thông tin ODO</p>
                </div>

                <div className="p-8">
                    {submitted ? (
                        <div className="text-center py-8 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Cập nhật thành công!</h3>
                            <p className="text-slate-500">Dữ liệu đã được lưu vào hệ thống.</p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="mt-6 text-blue-600 font-medium hover:underline"
                            >
                                Nhập bản ghi khác
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Asset Code Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mã Tài Sản <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Truck className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${vehicleData ? 'text-green-500' : 'text-slate-400'}`} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.assetCode}
                                        onChange={e => {
                                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                                            setFormData({ ...formData, assetCode: val });
                                        }}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all font-mono font-bold tracking-wider ${searchError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' :
                                            vehicleData ? 'border-green-300 focus:border-green-500 focus:ring-green-200 bg-green-50' :
                                                'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        placeholder="VD: XE01"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                                    )}
                                </div>
                                {searchError && <p className="mt-1 text-xs text-red-500 font-medium">{searchError}</p>}
                                {vehicleData && (
                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-slate-500">Bộ phận:</span>
                                            <span className="font-semibold text-slate-700">{vehicleData.department || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-slate-500">Giờ máy hiện tại (DB):</span>
                                            <span className="font-mono font-bold text-slate-700">{vehicleData.currentHours || 0}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Giờ bảo dưỡng tiếp theo:</span>
                                            <span className="font-mono font-bold text-slate-700">{vehicleData.nextMaintenanceHours || 0}h</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày làm việc</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* ODO Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ODO Giờ <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="number"
                                            required
                                            step="1"
                                            min="0"
                                            value={formData.odoHours}
                                            onChange={e => setFormData({ ...formData, odoHours: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400 pl-1">Nhập số nguyên</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ODO KM <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input
                                            type="number"
                                            required
                                            step="1"
                                            min="0"
                                            value={formData.odoKm}
                                            onChange={e => setFormData({ ...formData, odoKm: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400 pl-1">Nhập số nguyên</p>
                                </div>
                            </div>

                            {/* Maintenance Status Alert */}
                            {maintenanceStatus && (
                                <div className={`p-4 rounded-xl border ${maintenanceStatus.status === 'overdue' ? 'bg-red-50 border-red-200 text-red-700' :
                                    maintenanceStatus.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                                        'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    } animate-in slide-in-from-top-2`}>
                                    <div className="flex items-start gap-3">
                                        {maintenanceStatus.status === 'overdue' ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" /> :
                                            maintenanceStatus.status === 'warning' ? <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" /> :
                                                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />}

                                        <div>
                                            <p className={`font-bold text-sm uppercase ${maintenanceStatus.status === 'overdue' ? 'text-red-700' :
                                                maintenanceStatus.status === 'warning' ? 'text-amber-700' :
                                                    'text-emerald-700'
                                                }`}>
                                                {maintenanceStatus.status === 'overdue' ? 'Quá hạn bảo dưỡng!' :
                                                    maintenanceStatus.status === 'warning' ? 'Sắp đến hạn bảo dưỡng' :
                                                        'Trạng thái bảo dưỡng tốt'}
                                            </p>
                                            <p className="text-xs mt-1 opacity-90">
                                                Giờ bảo dưỡng tiếp theo: <span className="font-mono font-bold">{maintenanceStatus.nextMaintenance}h</span>
                                                <span className="mx-2">•</span>
                                                Chu kỳ: <span className="font-mono">{vehicleData.maintenanceInterval || 500}h</span>
                                            </p>
                                            <p className="text-sm mt-1">
                                                Còn lại: <span className={`font-mono font-bold text-lg ${maintenanceStatus.remaining <= 0 ? 'text-red-600' :
                                                    maintenanceStatus.remaining <= 50 ? 'text-amber-600' : 'text-emerald-600'
                                                    }`}>{maintenanceStatus.remaining}h</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Maintenance Confirmation Checkbox */}
                            {maintenanceStatus && (maintenanceStatus.status === 'overdue' || maintenanceStatus.status === 'warning') && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3 animate-in fade-in">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <div className="flex items-center h-6">
                                            <input
                                                type="checkbox"
                                                checked={formData.maintenanceDone}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    maintenanceDone: e.target.checked,
                                                    maintenanceDescription: e.target.checked ? 'Bảo dưỡng định kỳ' : ''
                                                })}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-bold text-blue-900 block">Đã thực hiện bảo dưỡng hôm nay?</span>
                                            <span className="text-blue-700 text-xs leading-relaxed">Tích vào đây nếu bạn đã thực hiện bảo dưỡng để hệ thống reset chu kỳ và tính ngày bảo dưỡng tiếp theo.</span>
                                        </div>
                                    </label>

                                    {formData.maintenanceDone && (
                                        <div className="pl-8 animate-in slide-in-from-top-2">
                                            <div className="text-sm text-blue-800 bg-blue-100/50 p-2.5 rounded-lg mb-3 border border-blue-100">
                                                <p className="font-medium mb-1">Dự kiến mức bảo dưỡng tiếp theo:</p>
                                                <div className="font-mono text-slate-700">
                                                    <span className="font-bold text-blue-700 text-lg">{(parseInt(formData.odoHours) || 0) + (parseInt(vehicleData.maintenanceInterval) || 500)}h</span>
                                                </div>
                                            </div>
                                            <textarea
                                                value={formData.maintenanceDescription}
                                                onChange={e => setFormData({ ...formData, maintenanceDescription: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                placeholder="Chi tiết công việc (VD: Thay nhớt, lọc gió...)"
                                                rows="2"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                                    placeholder="Ghi chú về lộ trình, xe cộ..."
                                />
                            </div>

                            <button
                                type="submit"
                                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center ${(!vehicleData || isSearching) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={!vehicleData || isSearching}
                            >
                                <Save className="w-5 h-5 mr-2" />
                                Gửi Báo Cáo
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverLogUpdate;
