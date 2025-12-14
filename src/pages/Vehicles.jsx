import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';
import { Plus, Truck, ArrowLeft, Download, Upload, RefreshCw, AlertTriangle, Wrench, LayoutGrid, List, ArrowUpDown, ArrowDownAZ, SortAsc, SortDesc, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useAuth } from '../contexts/AuthContext';

const Vehicles = () => {
    const { user } = useAuth(); // Get current user
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ plateNumber: '', department: '', currentHours: '', status: 'Active' });
    const [syncStatus, setSyncStatus] = useState(null);
    const [filterType, setFilterType] = useState('all'); // all | overdue | safe
    const [sortType, setSortType] = useState('plateNumber'); // plateNumber | hours_desc | hours_asc
    const [viewMode, setViewMode] = useState('grid'); // grid | list
    const [page, setPage] = useState(0); // Pagination state
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const fileInputRef = useRef(null);

    // Permission Logic
    const isSuper = user?.role === 'admin' || user?.role === 'super_admin';
    const myProjects = React.useMemo(() => {
        if (!user || isSuper) return [];
        return Array.isArray(user.assignedProjects) ? user.assignedProjects : [user.assignedProjects];
    }, [user, isSuper]);

    // Fetch and Filter vehicles
    const vehicles = useLiveQuery(async () => {
        let allVehicles = await db.vehicles.toArray();

        // SECURITY FILTER: Only show vehicles belonging to user's assigned projects
        if (!isSuper && myProjects.length > 0) {
            allVehicles = allVehicles.filter(v =>
                // Check exact Project ID match OR Department name match (for flexibility)
                myProjects.includes(v.projectId) ||
                myProjects.some(p => String(p) === String(v.projectId)) ||
                myProjects.includes(v.department)
            );
        }
        return allVehicles;
    }, [isSuper, myProjects]);

    // Fetch All Projects (For lookup)
    const allProjects = useLiveQuery(() => db.projects.toArray());

    const filteredVehicles = vehicles?.filter(v => {
        // Filter by status (overdue/safe)
        if (filterType === 'all') {
            // Continue to other filters
        } else {
            const remaining = v.nextMaintenanceHours ? (v.nextMaintenanceHours - (v.currentHours || 0)) : null;
            if (filterType === 'overdue' && (remaining === null || remaining > 0)) return false;
            if (filterType === 'safe' && remaining !== null && remaining <= 0) return false;
        }

        // Filter by department
        if (departmentFilter !== 'all' && v.department !== departmentFilter) return false;

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchPlateNumber = (v.plateNumber || '').toLowerCase().includes(term);
            const matchDepartment = (v.department || '').toLowerCase().includes(term);
            const matchModel = (v.model || '').toLowerCase().includes(term);
            if (!matchPlateNumber && !matchDepartment && !matchModel) return false;
        }

        return true;
    });

    const sortedVehicles = [...(filteredVehicles || [])].sort((a, b) => {
        if (sortType === 'plateNumber') return a.plateNumber.localeCompare(b.plateNumber);
        if (sortType === 'hours_desc') return (b.currentHours || 0) - (a.currentHours || 0);
        if (sortType === 'hours_asc') return (a.currentHours || 0) - (b.currentHours || 0);
        return 0;
    });

    // Get unique departments
    const departments = useLiveQuery(async () => {
        const allVehicles = await db.vehicles.toArray();
        const uniqueDepts = [...new Set(allVehicles.map(v => v.department).filter(d => d))];
        return uniqueDepts.sort();
    }, []);

    // ... (keep helper functions like getValue, handleSyncWithLogs, handleFixData, handleFileUpload, handleDownloadTemplate, getStatusColor, getStatusText same)

    // Normalize keys helper
    const getValue = (row, keys) => {
        const rowKeys = Object.keys(row);
        for (const k of keys) {
            // Remove whitespace, newlines, underscores, converting to lowercase for comparison
            const normalizedSearch = k.toLowerCase().replace(/[\s\n\r_]+/g, '');
            const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[\s\n\r_]+/g, '') === normalizedSearch);
            if (foundKey) return row[foundKey];
        }
        return undefined;
    };

    // 1. Sync Logic
    const handleSyncWithLogs = async () => {
        if (!window.confirm('Bạn có chắc muốn đồng bộ? Dữ liệu Giờ/Km của xe sẽ được cập nhật theo Nhật ký hoạt động mới nhất.')) return;

        setSyncStatus('loading');
        try {
            const logs = await db.logs.toArray();
            const vehiclesList = await db.vehicles.toArray();

            const stats = {};
            logs.forEach(log => {
                const code = log.assetCode;
                if (!code) return;

                if (!stats[code]) stats[code] = { hours: 0, km: 0 };

                const h = parseFloat(log.odoHours) || 0;
                const k = parseFloat(log.odoKm) || 0;

                if (h > stats[code].hours) stats[code].hours = h;
                if (k > stats[code].km) stats[code].km = k;
            });

            let updateCount = 0;
            await db.transaction('rw', db.vehicles, async () => {
                for (const v of vehiclesList) {
                    const code = v.plateNumber;
                    if (stats[code]) {
                        const newHours = stats[code].hours;
                        const newKm = stats[code].km;

                        if (newHours > v.currentHours || newKm > v.currentKm) {
                            await db.vehicles.update(v.id, {
                                currentHours: Math.max(newHours, v.currentHours || 0),
                                currentKm: Math.max(newKm, v.currentKm || 0),
                                lastUpdated: new Date()
                            });
                            updateCount++;
                        }
                    }
                }
            });
            setSyncStatus('success');
            setTimeout(() => setSyncStatus(null), 3000);
            alert(`Đã đồng bộ xong! Cập nhật dữ liệu cho ${updateCount} xe.`);
        } catch (error) {
            console.error("Sync error:", error);
            setSyncStatus('error');
            alert("Lỗi khi đồng bộ: " + error.message);
        }
    };

    // 2. Manual Data Fix
    const handleFixData = async () => {
        if (!vehicles) return;

        const toUpdate = vehicles.filter(v =>
            !v.plateNumber &&
            getValue(v, ['Mã tài sản', 'Biển số', 'BienSo', 'Mã quản lý'])
        );

        if (toUpdate.length === 0) {
            alert('Dữ liệu đã chuẩn, không tìm thấy lỗi hiển thị nào!');
            return;
        }

        if (window.confirm(`Tìm thấy ${toUpdate.length} tài sản bị lỗi hiển thị. Bạn có muốn sửa ngay không?`)) {
            try {
                await db.transaction('rw', db.vehicles, async () => {
                    let count = 0;
                    for (const v of toUpdate) {
                        const assetCode = getValue(v, ['Mã tài sản', 'Biển số', 'BienSo', 'Mã quản lý']);
                        if (assetCode) {
                            await db.vehicles.update(v.id, {
                                plateNumber: assetCode,
                                model: getValue(v, ['Model', 'Loại xe', 'Khối thi công']) || '',
                                currentHours: parseFloat(getValue(v, ['ODO Giờ hiện tại', 'GioMay', 'currentHours', 'Giờ']) || 0),
                                currentKm: parseFloat(getValue(v, ['ODO Km hiện tại', 'OdoKm', 'currentKm', 'Km']) || 0),
                                status: getValue(v, ['Tình trạng', 'TrangThai', 'Status']) || 'Active',
                                nextMaintenanceHours: parseFloat(getValue(v, ['Định mức bảo dưỡng', 'NextMaintenance', 'Bảo dưỡng lần tới']) || 0)
                            });
                            count++;
                        }
                    }
                    alert(`Đã sửa thành công ${count} tài sản!`);
                });
            } catch (error) {
                console.error("Fix data error:", error);
                alert("Có lỗi khi sửa dữ liệu!");
            }
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input to allow re-uploading same file if needed
        e.target.value = '';

        setSyncStatus('loading'); // Use sync status to show loading state

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    alert("File không có dữ liệu!");
                    setSyncStatus(null);
                    return;
                }

                // Prepare data for Bulk Upsert (Tối ưu hiệu năng: Xử lý 1 lần, ghi 1 lần)
                const vehiclesToUpsert = [];
                const currentTimestamp = new Date();

                // Project/Dept context for non-admins
                const defaultProjectId = !isSuper && myProjects.length > 0 ? myProjects[0] : undefined;
                const defaultDeptName = !isSuper && myProjects.length > 0 ? (allProjects?.find(p => p.id === myProjects[0])?.name || myProjects[0]) : '';

                for (const row of jsonData) {
                    const assetCode = getValue(row, ['Mã tài sản', 'MaTaiSan', 'Mã quản lý', 'Biển số', 'BienSo', 'plateNumber', 'AssetCode', 'Code']);

                    if (!assetCode) continue; // Skip invalid rows without crashing

                    // Robust parsing with defaults
                    const currentHours = parseFloat(getValue(row, ['ODO Giờ hiện tại', 'GioMay', 'currentHours', 'Giờ', 'Gio', 'Giờ máy', 'HM', 'Hours']) || 0);
                    const currentKm = parseFloat(getValue(row, ['ODO Km hiện tại', 'OdoKm', 'currentKm', 'Km', 'Kilomet', 'Odo']) || 0);
                    const nextMaintenanceHours = parseFloat(getValue(row, ['Định mức bảo dưỡng', 'NextMaintenance', 'Bảo dưỡng lần tới', 'NextService', 'GoiBaoDuong']) || 0);
                    const model = String(getValue(row, ['Model', 'Khối thi công', 'model', 'Loại xe']) || '').trim();
                    const status = String(getValue(row, ['Tình trạng', 'TrangThai', 'Status']) || 'Active').trim();
                    const rowDept = String(getValue(row, ['Bộ phận', 'BoPhan', 'PhongBan', 'Department', 'department']) || '').trim();

                    // Security & Data Integrity Logic
                    const finalProjectId = defaultProjectId || (row.projectId ? row.projectId : undefined);
                    const finalDepartment = defaultProjectId ? defaultDeptName : rowDept;

                    // Check if exists to preserve ID (Dexie won't auto-merge without ID on numeric keys, but for string keys using put is fine if keyPath is unique. 
                    // However, here 'id' is ++id. We need to find ID to update, or add new.
                    // BulkPut performance trick: We query ALL existing plateNumbers map first to avoid N queries.
                }

                // OPTIMIZATION: Get Map of Existing Vehicles to handle Upsert correctly with ++id schema
                const existingVehicles = await db.vehicles.toArray();
                const vehicleMap = new Map(existingVehicles.map(v => [v.plateNumber, v]));

                const batchData = jsonData.map(row => {
                    const assetCode = getValue(row, ['Mã tài sản', 'MaTaiSan', 'Mã quản lý', 'Biển số', 'BienSo', 'plateNumber', 'AssetCode', 'Code']);
                    if (!assetCode) return null;

                    const existing = vehicleMap.get(assetCode);

                    const currentHours = parseFloat(getValue(row, ['ODO Giờ hiện tại', 'GioMay', 'currentHours', 'Giờ', 'Gio', 'Giờ máy', 'HM', 'Hours']) || 0);
                    const currentKm = parseFloat(getValue(row, ['ODO Km hiện tại', 'OdoKm', 'currentKm', 'Km', 'Kilomet', 'Odo']) || 0);
                    const nextMaintenanceHours = parseFloat(getValue(row, ['Định mức bảo dưỡng', 'NextMaintenance', 'Bảo dưỡng lần tới', 'NextService', 'GoiBaoDuong']) || 0);
                    const model = String(getValue(row, ['Model', 'Khối thi công', 'model', 'Loại xe']) || '').trim();
                    const status = String(getValue(row, ['Tình trạng', 'TrangThai', 'Status']) || 'Active').trim();
                    const rowDept = String(getValue(row, ['Bộ phận', 'BoPhan', 'PhongBan', 'Department', 'department']) || '').trim();

                    const finalProjectId = defaultProjectId || (row.projectId ? row.projectId : undefined);
                    const finalDepartment = defaultProjectId ? defaultDeptName : rowDept;

                    return {
                        id: existing ? existing.id : undefined, // Keep ID if exists to Update, undefined to Add
                        plateNumber: assetCode,
                        model: model || (existing ? existing.model : ''),
                        currentHours: currentHours || (existing ? existing.currentHours : 0),
                        currentKm: currentKm || (existing ? existing.currentKm : 0),
                        nextMaintenanceHours: nextMaintenanceHours || (existing ? existing.nextMaintenanceHours : 0),
                        status: status || (existing ? existing.status : 'Active'),
                        department: finalDepartment || (existing ? existing.department : ''),
                        projectId: finalProjectId || (existing ? existing.projectId : undefined),
                        lastUpdated: currentTimestamp,
                        createdAt: existing ? existing.createdAt : currentTimestamp
                    };
                }).filter(item => item !== null);

                if (batchData.length > 0) {
                    await db.vehicles.bulkPut(batchData);
                    alert(`🚀 Đã xử lý siêu tốc ${batchData.length} dòng dữ liệu!`);
                } else {
                    alert("Không tìm thấy dữ liệu hợp lệ để nhập.");
                }
            } catch (error) {
                console.error("Import error CRITICAL:", error);
                alert("Lỗi nghiêm trọng khi xử lý file: " + error.message);
            } finally {
                setSyncStatus(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { "Mã tài sản": "PC200-01", "Model": "Komatsu PC200", "Giờ máy": 1200, "Km": 0, "Định mức bảo dưỡng": 1500, "Tình trạng": "Active" },
            { "Mã tài sản": "XETAI-05", "Model": "Howo 3 Chân", "Giờ máy": 0, "Km": 54000, "Định mức bảo dưỡng": 5000, "Tình trạng": "Maintenance" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
        XLSX.writeFile(wb, "mau_nhap_lieu_chuan.xlsx");
    };

    // Helper to calculate status color
    const getStatusColor = (v) => {
        if (v.status === 'Maintenance') return 'bg-yellow-100 text-yellow-700';
        if (v.nextMaintenanceHours && v.currentHours >= v.nextMaintenanceHours) return 'bg-red-100 text-red-700';
        return 'bg-green-100 text-green-700';
    };

    const getStatusText = (v) => {
        if (v.nextMaintenanceHours && v.currentHours >= v.nextMaintenanceHours) return 'Quá hạn bảo dưỡng';
        return v.status === 'Active' ? 'Hoạt động' : v.status;
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header controls */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900">Quản lý Xe</h1>
                        <p className="text-slate-500">Quản lý tài sản và định mức bảo dưỡng.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                            <Plus className="w-5 h-5 mr-2" /> {showAddForm ? 'Đóng form' : 'Thêm mới'}
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-2 rounded-xl shadow-sm border border-slate-100">
                    {/* Left side - Filters and controls */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        {/* Filter Status */}
                        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                            <button onClick={() => setFilterType('all')} className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm rounded-md transition-all font-medium ${filterType === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
                            <button onClick={() => setFilterType('overdue')} className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm rounded-md transition-all font-medium ${filterType === 'overdue' ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Quá hạn</button>
                            <button onClick={() => setFilterType('safe')} className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm rounded-md transition-all font-medium ${filterType === 'safe' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}>Chưa đến giờ</button>
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={sortType}
                                onChange={(e) => setSortType(e.target.value)}
                                className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-0"
                            >
                                <option value="plateNumber">Sắp xếp: Mã (A-Z)</option>
                                <option value="hours_desc">Giờ máy: Cao - Thấp</option>
                                <option value="hours_asc">Giờ máy: Thấp - Cao</option>
                            </select>
                        </div>

                        {/* View Mode */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setViewMode('grid')} className={`p-2.5 sm:p-1.5 rounded-md transition-all touch-manipulation ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Dạng lưới" aria-label="Grid view">
                                <LayoutGrid className="w-6 h-6 sm:w-4 sm:h-4" strokeWidth={2} />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`p-2.5 sm:p-1.5 rounded-md transition-all touch-manipulation ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`} title="Chi tiết" aria-label="List view">
                                <List className="w-6 h-6 sm:w-4 sm:h-4" strokeWidth={2} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-48">
                            <input
                                type="text"
                                placeholder="Tìm kiếm xe..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    {/* Right side - Action buttons */}
                    <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
                        <button onClick={handleSyncWithLogs} disabled={syncStatus === 'loading'} className={`p-3 sm:p-2 rounded-xl sm:rounded-lg border shadow-sm transition-colors touch-manipulation ${syncStatus === 'loading' ? 'bg-slate-100 text-slate-400' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`} title="Đồng bộ" aria-label="Đồng bộ">
                            <RefreshCw className={`w-6 h-6 sm:w-4 sm:h-4 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} strokeWidth={2} />
                        </button>
                        <button onClick={handleFixData} className="p-3 sm:p-2 bg-white text-amber-600 border border-amber-100 rounded-xl sm:rounded-lg hover:bg-amber-50 shadow-sm touch-manipulation" title="Sửa lỗi hiển thị" aria-label="Sửa lỗi">
                            <AlertTriangle className="w-6 h-6 sm:w-4 sm:h-4" strokeWidth={2} />
                        </button>
                        <button onClick={handleDownloadTemplate} className="p-3 sm:p-2 bg-white text-slate-600 border border-slate-200 rounded-xl sm:rounded-lg hover:bg-slate-50 shadow-sm touch-manipulation" title="Tải mẫu Excel" aria-label="Tải mẫu">
                            <Download className="w-6 h-6 sm:w-4 sm:h-4" strokeWidth={2} />
                        </button>
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current.click()} className="p-3 sm:p-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl sm:rounded-lg hover:bg-emerald-100 shadow-sm touch-manipulation" title="Nhập Excel" aria-label="Nhập Excel">
                            <Upload className="w-6 h-6 sm:w-4 sm:h-4" strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input className="border p-2 rounded" placeholder="Mã tài sản" value={newVehicle.plateNumber} onChange={e => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })} />
                        <input
                            className={`border p-2 rounded ${!isSuper ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            placeholder="Bộ phận"
                            disabled={!isSuper}
                            value={!isSuper && myProjects.length > 0 ? (allProjects?.find(p => p.id === myProjects[0])?.name || myProjects[0]) : newVehicle.department}
                            onChange={e => setNewVehicle({ ...newVehicle, department: e.target.value })}
                        />
                        <input type="number" className="border p-2 rounded" placeholder="Giờ máy hiện tại" value={newVehicle.currentHours} onChange={e => setNewVehicle({ ...newVehicle, currentHours: e.target.value })} />
                        <button className="bg-blue-600 text-white p-2 rounded">Lưu</button>
                    </form>
                </div>
            )}

            {/* Pagination Logic */}
            {(() => {
                const pageSize = 12; // 12 items per page for good grid alignment (2x6, 3x4, 4x3)
                const totalPages = Math.ceil((sortedVehicles?.length || 0) / pageSize);
                const paginatedVehicles = sortedVehicles?.slice(page * pageSize, (page + 1) * pageSize);

                // Helper for pagination controls
                const PaginationControls = () => {
                    if (totalPages <= 1) return null;
                    return (
                        <div className="flex justify-center items-center gap-2 mt-8 pb-8">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                            >
                                Trước
                            </button>
                            <span className="text-sm text-slate-600 font-medium px-2">
                                Trang {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                            >
                                Sau
                            </button>
                        </div>
                    );
                };

                return (
                    <>
                        {/* Grid View */}
                        {viewMode === 'grid' && (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {!paginatedVehicles ? <div className="col-span-full text-center">Đang tải...</div> : paginatedVehicles.length === 0 ? (
                                        <div className="col-span-full text-center py-12 bg-white rounded border border-dashed text-slate-500">Chưa có dữ liệu.</div>
                                    ) : (
                                        paginatedVehicles.map(vehicle => {
                                            const remaining = vehicle.nextMaintenanceHours ? (vehicle.nextMaintenanceHours - (vehicle.currentHours || 0)) : null;
                                            const isOverdue = remaining !== null && remaining <= 0;

                                            return (
                                                <Link to={`/vehicles/${vehicle.id}`} key={vehicle.id} className="block group">
                                                    <div className={`bg-white p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md ${isOverdue ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100 hover:border-blue-200'}`}>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="p-4 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl shadow-sm ring-1 ring-blue-100/50">
                                                                <Truck className="w-8 h-8 sm:w-6 sm:h-6" strokeWidth={2} />
                                                            </div>
                                                            <span className={`px-3 py-1.5 sm:px-2 sm:py-1 text-xs font-bold rounded-full ${getStatusColor(vehicle)}`}>
                                                                {getStatusText(vehicle)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                    {vehicle.plateNumber}
                                                                </h3>
                                                                <p className="text-slate-500 text-sm mb-4 truncate max-w-[150px]" title={vehicle.department}>{vehicle.department}</p>
                                                            </div>
                                                            {vehicle.nextMaintenanceHours && (
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-400 uppercase">Còn lại</p>
                                                                    <p className={`font-mono font-bold ${remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                        {remaining}h
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                                                            <div>
                                                                <p className="text-xs text-slate-400 font-medium uppercase">Giờ máy</p>
                                                                <p className="font-mono font-semibold text-slate-700">{vehicle.currentHours}h</p>
                                                            </div>
                                                            {vehicle.nextMaintenanceHours ? (
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-400 font-medium uppercase flex items-center justify-end">
                                                                        <Wrench className="w-3 h-3 mr-1" /> Bảo dưỡng
                                                                    </p>
                                                                    <p className="font-mono font-semibold text-slate-500">{vehicle.nextMaintenanceHours}h</p>
                                                                </div>
                                                            ) : (
                                                                <div className="text-right">
                                                                    <p className="text-xs text-slate-400 font-medium uppercase">Km</p>
                                                                    <p className="font-mono font-semibold text-slate-700">{vehicle.currentKm || 0} km</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })
                                    )}
                                </div>
                                <PaginationControls />
                            </div>
                        )}

                        {/* List View */}
                        {viewMode === 'list' && (
                            <>
                                {/* Mobile: Card View */}
                                <div className="block md:hidden space-y-3">
                                    {!paginatedVehicles || paginatedVehicles.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">Không có dữ liệu.</div>
                                    ) : (
                                        paginatedVehicles.map(vehicle => {
                                            const remaining = vehicle.nextMaintenanceHours ? (vehicle.nextMaintenanceHours - (vehicle.currentHours || 0)) : null;
                                            const isOverdue = remaining !== null && remaining <= 0;

                                            return (
                                                <Link to={`/vehicles/${vehicle.id}`} key={vehicle.id} className="block">
                                                    <div className={`bg-white p-4 rounded-xl shadow-sm border transition-all hover:shadow-md ${isOverdue ? 'border-red-200' : 'border-slate-200'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                                    <Truck className="w-5 h-5" strokeWidth={2} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-slate-900">{vehicle.plateNumber}</h3>
                                                                    <p className="text-xs text-slate-500">{vehicle.department}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(vehicle)}`}>
                                                                {getStatusText(vehicle)}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                            <div>
                                                                <p className="text-xs text-slate-400 uppercase">Giờ máy</p>
                                                                <p className="font-mono font-semibold text-slate-700">{vehicle.currentHours}h</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400 uppercase">Định mức BD</p>
                                                                <p className="font-mono font-semibold text-slate-500">{vehicle.nextMaintenanceHours ? `${vehicle.nextMaintenanceHours}h` : '-'}</p>
                                                            </div>
                                                            {vehicle.nextMaintenanceHours && (
                                                                <div className="col-span-2">
                                                                    <p className="text-xs text-slate-400 uppercase">Còn lại</p>
                                                                    <p className={`font-mono font-bold text-lg ${remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                        {remaining}h
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })
                                    )}
                                    <PaginationControls />
                                </div>

                                {/* Desktop: Table View */}
                                <div className="hidden md:block">
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-3 whitespace-nowrap">Mã tài sản</th>
                                                    <th className="px-6 py-3 whitespace-nowrap">Bộ phận sử dụng</th>
                                                    <th className="px-6 py-3 text-right whitespace-nowrap">Giờ máy hiện tại</th>
                                                    <th className="px-6 py-3 text-right whitespace-nowrap">Định mức BD</th>
                                                    <th className="px-6 py-3 text-center whitespace-nowrap">Trạng thái</th>
                                                    <th className="px-6 py-3 text-right whitespace-nowrap">Còn lại</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {!paginatedVehicles || paginatedVehicles.length === 0 ? (
                                                    <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400">Không có dữ liệu.</td></tr>
                                                ) : (
                                                    paginatedVehicles.map(vehicle => {
                                                        const remaining = vehicle.nextMaintenanceHours ? (vehicle.nextMaintenanceHours - (vehicle.currentHours || 0)) : null;
                                                        return (
                                                            <tr key={vehicle.id} className="hover:bg-slate-50 group transition-colors">
                                                                <td className="px-6 py-3 font-medium text-slate-900">
                                                                    <Link to={`/vehicles/${vehicle.id}`} className="hover:text-blue-600 flex items-center gap-2">
                                                                        <Truck className="w-4 h-4 text-slate-400" />
                                                                        {vehicle.plateNumber}
                                                                    </Link>
                                                                </td>
                                                                <td className="px-6 py-3 text-slate-500">{vehicle.department}</td>
                                                                <td className="px-6 py-3 text-right font-mono text-slate-700">{vehicle.currentHours}h</td>
                                                                <td className="px-6 py-3 text-right font-mono text-slate-500">{vehicle.nextMaintenanceHours ? `${vehicle.nextMaintenanceHours}h` : '-'}</td>
                                                                <td className="px-6 py-3 text-center">
                                                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(vehicle)}`}>
                                                                        {getStatusText(vehicle)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3 text-right">
                                                                    {vehicle.nextMaintenanceHours ? (
                                                                        <span className={`font-mono font-bold ${remaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                            {remaining}h
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">-</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <PaginationControls />
                                </div>
                            </>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

export default Vehicles;
