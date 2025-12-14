import React, { useState, useRef } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Upload, Trash2, CheckCircle, RefreshCw, Wrench, Truck, Users, ClipboardList, AlertTriangle, Search, Package, Database, History, UserPlus } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import ProjectManagement from '../components/ProjectManagement';
import * as XLSX from 'xlsx';

// Column Header Mapping
const COLUMN_LABELS = {
    id: 'ID',
    plateNumber: 'Mã tài sản',
    department: 'Bộ phận',
    currentHours: 'Giờ máy',
    currentKm: 'Km',
    nextMaintenanceHours: 'Định Mức bảo dưỡng',
    maintenanceInterval: 'Chu kỳ BD',
    projectId: 'Dự án',
    hours: 'Giờ máy',
    km: 'Km',
    date: 'Ngày',
    type: 'Loại',
    cost: 'Chi phí',
    description: 'Nội dung',
    maintenanceLevel: 'Cấp bảo dưỡng',
    fixSteps: 'Biện pháp khắc phục',
    assetCode: 'Mã tài sản',
    odoHours: 'Odo Giờ',
    odoKm: 'Odo Km',
    name: 'Tên',
    group: 'Nhóm',
    code: 'Mã',
    donaldsonCode: 'Mã Donaldson',
    quantity: 'Số lượng',
    unit: 'ĐVT'
};

// Configuration for Data Views
const VIEWS = [
    {
        id: 'vehicles',
        label: 'Mã tài sản',
        table: 'vehicles',
        icon: <Truck className="w-4 h-4" />,
        columns: ['plateNumber', 'department']
    },
    {
        id: 'maintenance',
        label: 'Lịch sử Bảo dưỡng',
        table: 'maintenanceLogs',
        icon: <ClipboardList className="w-4 h-4" />,
        filter: (row) => row.type === 'Bảo dưỡng định kỳ',
        columns: ['date', 'vehicleId', 'hours', 'km', 'maintenanceLevel']
    },
    {
        id: 'repairs',
        label: 'Lịch sử Sửa chữa',
        table: 'maintenanceLogs',
        icon: <Wrench className="w-4 h-4" />,
        filter: (row) => row.type !== 'Bảo dưỡng định kỳ',
        columns: ['date', 'vehicleId', 'description', 'fixSteps']
    },
    {
        id: 'quota',
        label: 'Định mức Bảo dưỡng',
        table: 'vehicles',
        icon: <RefreshCw className="w-4 h-4" />,
        columns: ['plateNumber', 'maintenanceInterval']
    },
    {
        id: 'supplies', // NEW: Supplies View
        label: 'Vật tư & Phụ tùng',
        table: 'maintenanceSupplies',
        icon: <Package className="w-4 h-4" />,
        columns: ['assetCode', 'name', 'code', 'donaldsonCode', 'maintenanceInterval']
    },
    {
        id: 'logs',
        label: 'Nhật ký Hoạt động (Driver)',
        table: 'logs',
        icon: <ClipboardList className="w-4 h-4" />,
        columns: ['date', 'assetCode', 'odoHours', 'odoKm']
    },
    {
        id: 'errorCodes',
        label: 'Mã lỗi',
        table: 'errorCodes',
        icon: <AlertTriangle className="w-4 h-4" />,
        columns: ['code', 'description', 'fixSteps']
    },
];

const Settings = () => {
    const [activeTab, setActiveTab] = useState('backup');
    const [editingUser, setEditingUser] = useState(null);
    const [selectedViewId, setSelectedViewId] = useState('vehicles');
    const [importStatus, setImportStatus] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [progress, setProgress] = useState(0);
    const pageSize = 50;

    React.useEffect(() => {
        setPage(0);
    }, [activeTab, selectedViewId, searchTerm, departmentFilter]);

    // Raw tables for Backup/Restore
    const rawTables = ['vehicles', 'maintenanceLogs', 'logs', 'parts', 'errorCodes', 'settings', 'maintenanceSupplies', 'projects', 'users', 'chatHistory', 'reportSnapshots'];

    // Get current view config
    const currentView = VIEWS.find(v => v.id === selectedViewId);

    // Live Query for the selected view
    const viewData = useLiveQuery(async () => {
        if (activeTab !== 'data' || !currentView) return [];

        let data = await db.table(currentView.table).toArray();

        if (currentView.isDerived) {
            data = currentView.derive(data);
        }

        if (currentView.filter) {
            data = data.filter(currentView.filter);
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(item => {
                return Object.values(item).some(val =>
                    String(val).toLowerCase().includes(term)
                );
            });
        }

        // Apply department filter (only for vehicles table)
        if (currentView.table === 'vehicles' && departmentFilter !== 'all') {
            data = data.filter(item => item.department === departmentFilter);
        }

        return data;
    }, [activeTab, selectedViewId, searchTerm, departmentFilter]);

    // Get unique departments from vehicles
    const departments = useLiveQuery(async () => {
        const vehicles = await db.vehicles.toArray();
        const uniqueDepts = [...new Set(vehicles.map(v => v.department).filter(d => d))];
        return uniqueDepts.sort();
    }, []);

    const handleExport = async () => {
        try {
            const exportData = {};
            for (const table of rawTables) {
                exportData[table] = await db.table(table).toArray();
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tro-ly-ky-thuat-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Có lỗi khi xuất dữ liệu!');
        }
    };

    // --- IMPORT ENGINE ---

    // Helper: Normalize keys for fuzzy matching
    const normalizeKey = (key) => key ? key.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    // Helper: Parse Date robustly
    const parseExcelDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'number') {
            // Excel Serial Date
            if (value < 1000) return null; // Too small to be a modern date
            return new Date(Math.round((value - 25569) * 86400 * 1000));
        }
        if (typeof value === 'string') {
            // Try parsing DD/MM/YYYY
            const parts = value.split(/[\/\-\.]/);
            if (parts.length === 3) {
                const d = parseInt(parts[0]);
                const m = parseInt(parts[1]);
                const y = parseInt(parts[2]);
                if (y > 100 && y < 2000) return new Date(y + 2000, m - 1, d); // Handle '23 -> 2023
                if (y > 1900) return new Date(y, m - 1, d);
            }
            const d = new Date(value);
            if (!isNaN(d)) return d;
        }
        return null;
    };

    // Helper: Get value from row using multiple possible headers
    const getCell = (row, headers, validKeys) => {
        for (const validKey of validKeys) {
            const normalizedValid = normalizeKey(validKey);
            // Find index in headers where normalized header contains our valid key
            const index = headers.findIndex(h => normalizeKey(h).includes(normalizedValid));
            if (index !== -1 && row[index] !== undefined) return row[index];
        }
        return undefined;
    };

    // MAIN SMART IMPORT HANDLER
    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Determine mode based on file extension
        const isJson = file.name.match(/\.json$/i);

        const reader = new FileReader();

        if (isJson) {
            // JSON BACKUP RESTORE
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!window.confirm('CẢNH BÁO: Khôi phục từ file Backup này sẽ XÓA và GHI ĐÈ toàn bộ dữ liệu hiện tại?\n\nBạn có chắc chắn không?')) return;

                    await db.transaction('rw', rawTables, async () => {
                        for (const table of rawTables) {
                            if (data[table]) {
                                await db.table(table).clear();
                                await db.table(table).bulkAdd(data[table]);
                            }
                        }
                    });
                    alert('Khôi phục hệ thống thành công!');
                    window.location.reload();
                } catch (err) {
                    alert('Lỗi file Backup: ' + err.message);
                }
            };
            reader.readAsText(file);
            return;
        }

        // SMART EXCEL ANALYSIS
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 1. ANALYZE PHASE
                const analysisRef = {
                    vehicles: { sheetName: null, count: 0, headers: [], data: [] },
                    logs: { sheetName: null, count: 0, headers: [], data: [] },
                    supplies: { sheetName: null, count: 0, headers: [], data: [] },
                    errors: { sheetName: null, count: 0, headers: [], data: [] },
                    master: { sheetName: null, count: 0, headers: [], data: [] } // New Master Type
                };

                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    if (rows.length < 2) return;

                    // Locate Header Row (scan first 10 rows)
                    let headerIndex = -1;
                    let bestScore = 0;
                    let detectedType = null;

                    for (let i = 0; i < Math.min(rows.length, 10); i++) {
                        const rowStr = rows[i].join(' ').toLowerCase();

                        // Scoring Rules
                        let vScore = 0;
                        if (rowStr.includes('biển số') || rowStr.includes('mã tài sản')) vScore += 3;
                        if (rowStr.includes('giờ máy') || rowStr.includes('định mức')) vScore += 2;

                        let lScore = 0;
                        if (rowStr.includes('ngày') && (rowStr.includes('odo') || rowStr.includes('giờ hoạt động'))) lScore += 4;
                        if (rowStr.includes('nội dung công việc')) lScore += 2;

                        let sScore = 0;
                        if (rowStr.includes('tên vật tư') || rowStr.includes('mã danh điểm')) sScore += 4;

                        let eScore = 0;
                        if (rowStr.includes('mã lỗi') || rowStr.includes('khắc phục')) eScore += 4;

                        // Master File Detection (User's specific request)
                        let mScore = 0;
                        if (rowStr.includes('khối thi công') || rowStr.includes('mức bd')) mScore += 5;
                        if (rowStr.includes('odo giờ thực hiện') || rowStr.includes('định mức bảo dưỡng')) mScore += 3;

                        // Winner takes all for this row
                        const max = Math.max(vScore, lScore, sScore, eScore, mScore);
                        if (max > 2 && max > bestScore) {
                            bestScore = max;
                            headerIndex = i;
                            if (max === vScore) detectedType = 'vehicles';
                            if (max === lScore) detectedType = 'logs';
                            if (max === sScore) detectedType = 'supplies';
                            if (max === eScore) detectedType = 'errors';
                            if (max === mScore) detectedType = 'master';
                        }
                    }

                    if (detectedType && headerIndex !== -1) {
                        const headers = rows[headerIndex].map(h => h ? h.toString() : '');
                        const rawData = rows.slice(headerIndex + 1);
                        analysisRef[detectedType] = { sheetName, count: rawData.length, headers, data: rawData };
                    }
                });

                // 2. CONFIRMATION PHASE
                const report = [];
                if (analysisRef.vehicles.count > 0) report.push(`- ${analysisRef.vehicles.count} Xe/Máy (Sheet: ${analysisRef.vehicles.sheetName})`);
                if (analysisRef.master.count > 0) report.push(`- ${analysisRef.master.count} Dữ liệu Tổng hợp Master (Sheet: ${analysisRef.master.sheetName})`);
                if (analysisRef.logs.count > 0) report.push(`- ${analysisRef.logs.count} Nhật ký (Sheet: ${analysisRef.logs.sheetName})`);
                if (analysisRef.supplies.count > 0) report.push(`- ${analysisRef.supplies.count} Vật tư (Sheet: ${analysisRef.supplies.sheetName})`);
                if (analysisRef.errors.count > 0) report.push(`- ${analysisRef.errors.count} Mã lỗi (Sheet: ${analysisRef.errors.sheetName})`);

                if (report.length === 0) {
                    alert('Không nhận diện được dữ liệu nào hợp lệ!\nVui lòng kiểm tra tên cột trong file Excel.');
                    return;
                }

                if (!window.confirm(`Hệ thống đã phân tích file và tìm thấy:\n\n${report.join('\n')}\n\nBạn có muốn nhập dữ liệu này không?`)) return;

                // 3. EXECUTION PHASE (CHUNKING PIPELINE)
                setImportStatus('processing');
                setProgress(0);

                // PRE-PROCESS DATA IN MEMORY
                const campaigns = [];

                // --- PREPARE VEHICLES ---
                if (analysisRef.vehicles.count > 0) {
                    const { headers, data } = analysisRef.vehicles;
                    const cleanData = data.map(row => {
                        const plate = getCell(row, headers, ['biển số', 'mã tài sản', 'plateNumber']);
                        if (!plate) return null;
                        return {
                            plateNumber: plate.toString().trim().toUpperCase(),
                            department: getCell(row, headers, ['bộ phận', 'đơn vị']) || '',
                            currentHours: parseFloat(getCell(row, headers, ['giờ máy', 'currenthours']) || 0),
                            nextMaintenanceHours: parseFloat(getCell(row, headers, ['định mức', 'bảo dưỡng']) || 0),
                            lastUpdated: new Date()
                        };
                    }).filter(x => x);
                    if (cleanData.length > 0) campaigns.push({ table: 'vehicles', data: cleanData, key: 'plateNumber' });
                }

                // --- PREPARE MASTER TYPE (Complex Sync) ---
                if (analysisRef.master.count > 0) {
                    const { headers, data } = analysisRef.master;
                    const cleanVehicles = [];
                    const cleanLogs = [];

                    data.forEach(row => {
                        const plate = getCell(row, headers, ['mã quản lý', 'mã tài sản', 'biển số']);
                        if (!plate) return;
                        const plateNum = normalizeKey(plate).toUpperCase();

                        // 1. Vehicle Data
                        cleanVehicles.push({
                            plateNumber: plateNum,
                            department: getCell(row, headers, ['khối thi công', 'bộ phận']) || '',
                            currentHours: parseFloat(getCell(row, headers, ['odo giờ hiên tại', 'giờ hiện tại']) || 0),
                            currentKm: parseFloat(getCell(row, headers, ['odo km hiên tại', 'km hiện tại']) || 0),
                            maintenanceInterval: parseFloat(getCell(row, headers, ['định mức bảo dưỡng', 'chu kỳ']) || 0),
                            nextMaintenanceHours: parseFloat(getCell(row, headers, ['odo giờ bd kế tiếp', 'kế tiếp']) || 0),
                            updatedAt: new Date()
                        });

                        // 2. Log Data (if exists)
                        const dateVal = getCell(row, headers, ['ngày thực hiện', 'ngày cập nhật']);
                        const typeVal = getCell(row, headers, ['mức bd', 'loại bảo dưỡng']);

                        if (dateVal && typeVal) {
                            // Only add log if valid date and type found
                            cleanLogs.push({
                                date: parseExcelDate(dateVal),
                                vehicleId: 'PENDING_LOOKUP', // Will resolve in batch
                                plateNumber: plateNum,       // Temp key for lookup
                                type: typeVal.toString(),
                                hours: parseFloat(getCell(row, headers, ['odo giờ thực hiện bd']) || 0),
                                km: parseFloat(getCell(row, headers, ['odo km thực hiện bd']) || 0),
                                description: getCell(row, headers, ['ghi chú', 'nội dung']) || 'Cập nhật từ Master Excel'
                            });
                        }
                    });

                    if (cleanVehicles.length > 0) campaigns.push({ table: 'vehicles', data: cleanVehicles, key: 'plateNumber' });
                    if (cleanLogs.length > 0) campaigns.push({ table: 'maintenanceLogs', data: cleanLogs, special: 'master_sync' });
                }

                // --- PREPARE LOGS ---
                if (analysisRef.logs.count > 0) {
                    const { headers, data } = analysisRef.logs;
                    const cleanData = data.map(row => {
                        const dateVal = getCell(row, headers, ['ngày', 'date']);
                        const plate = getCell(row, headers, ['thiết bị', 'xe', 'biển số']);
                        if (!dateVal || !plate) return null;
                        return {
                            date: parseExcelDate(dateVal),
                            assetCode: plate.toString().trim().toUpperCase(),
                            odoHours: parseFloat(getCell(row, headers, ['giờ', 'odo hours']) || 0),
                            description: getCell(row, headers, ['nội dung', 'công việc']) || ''
                        };
                    }).filter(x => x);
                    if (cleanData.length > 0) campaigns.push({ table: 'logs', data: cleanData });
                }

                // --- PREPARE SUPPLIES ---
                if (analysisRef.supplies.count > 0) {
                    const { headers, data } = analysisRef.supplies;
                    const cleanData = data.map(row => {
                        const name = getCell(row, headers, ['tên vật tư', 'tên phụ tùng']);
                        if (!name) return null;
                        return {
                            assetCode: (getCell(row, headers, ['mã tài sản', 'mã xe']) || 'CHUNG').toString().toUpperCase().trim(),
                            group: (getCell(row, headers, ['nhóm']) || '').toString(),
                            name: name.toString().trim(),
                            code: (getCell(row, headers, ['mã danh điểm', 'part no', 'mã gốc']) || '').toString().trim(),
                            unit: (getCell(row, headers, ['đơn vị', 'đvt']) || '').toString(),
                            quantity: Number(getCell(row, headers, ['số lượng', 'sl'])) || 1,
                            donaldsonCode: (getCell(row, headers, ['donaldson', 'mã lọc', 'quy đổi']) || '').toString().trim(),
                            maintenanceInterval: Number(getCell(row, headers, ['định mức', 'chu kỳ'])) || null
                        };
                    }).filter(x => x);
                    if (cleanData.length > 0) campaigns.push({ table: 'maintenanceSupplies', data: cleanData });
                }

                // --- PREPARE ERRORS ---
                if (analysisRef.errors.count > 0) {
                    const { headers, data } = analysisRef.errors;
                    const cleanData = data.map(row => {
                        const code = getCell(row, headers, ['mã lỗi', 'code', 'error']);
                        if (!code) return null;
                        return {
                            code: code.toString().trim(),
                            description: (getCell(row, headers, ['mô tả', 'nội dung', 'desc']) || '').toString().trim(),
                            fixSteps: (getCell(row, headers, ['khắc phục', 'sửa chữa', 'fix']) || '').toString().trim()
                        };
                    }).filter(x => x);
                    if (cleanData.length > 0) campaigns.push({ table: 'errorCodes', data: cleanData, key: 'code' });
                }

                // EXECUTE BATCHES (Heavy Lifting)
                const CHUNK_SIZE = 2000;
                let totalProcessed = 0;
                const grandTotal = campaigns.reduce((acc, c) => acc + c.data.length, 0);

                for (const campaign of campaigns) {
                    const { table, data, key, special } = campaign;

                    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                        const chunk = data.slice(i, i + CHUNK_SIZE);

                        await db.transaction('rw', db.vehicles, db.logs, db.maintenanceSupplies, db.errorCodes, db.maintenanceLogs, async () => {
                            // Specialized handler for master logs which require vehicle ID lookup
                            if (special === 'master_sync' && table === 'maintenanceLogs') {
                                for (const logItem of chunk) {
                                    // Lookup vehicle ID
                                    const vehicle = await db.vehicles.where('plateNumber').equals(logItem.plateNumber).first();
                                    if (vehicle) {
                                        // Check existence to prevent dupes
                                        const existing = await db.maintenanceLogs
                                            .where({ vehicleId: vehicle.id })
                                            .filter(l => l.date === logItem.date.toISOString().split('T')[0] && l.type === logItem.type)
                                            .first();

                                        if (!existing) {
                                            await db.maintenanceLogs.add({
                                                vehicleId: vehicle.id,
                                                date: logItem.date.toISOString().split('T')[0],
                                                type: logItem.type,
                                                hours: logItem.hours,
                                                km: logItem.km,
                                                description: logItem.description,
                                                source: 'master_excel_import'
                                            });
                                        }
                                    }
                                }
                            }
                            else if (key && (table === 'vehicles' || table === 'errorCodes')) {
                                const codes = chunk.map(c => c[key]);
                                const existing = await db.table(table).where(key).anyOf(codes).toArray();
                                const mapId = new Map(existing.map(e => [e[key], e.id]));
                                const mapCreated = new Map(existing.map(e => [e[key], e.createdAt]));
                                // Preserve existing data if not in update
                                const mapExisting = new Map(existing.map(e => [e[key], e]));

                                const finalChunk = chunk.map(item => {
                                    const exist = mapExisting.get(item[key]);
                                    return {
                                        ...exist, // Keep existing fields
                                        ...item,  // Overwrite with new
                                        id: mapId.get(item[key]),
                                        createdAt: mapCreated.get(item[key]) || new Date()
                                    };
                                });

                                await db.table(table).bulkPut(finalChunk);
                            } else {
                                await db.table(table).bulkAdd(chunk);
                            }
                        });

                        totalProcessed += chunk.length;
                        setProgress(Math.round((totalProcessed / grandTotal) * 100));
                        await new Promise(resolve => setTimeout(resolve, 10)); // UI Breath
                    }
                }

                alert(`Đã nhập thành công tổng cộng ${grandTotal} dòng dữ liệu!`);

            } catch (err) {
                console.error(err);
                alert('Lỗi xử lý Excel: ' + err.message);
            } finally {
                setImportStatus(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setImporting(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Inline Edit Logic ---
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const handleEditClick = (row) => {
        setEditingId(row.id);
        setEditForm({ ...row });
    };

    const handleSaveEdit = async () => {
        try {
            await db.table(currentView.table).update(editingId, editForm);
            setEditingId(null);
            setEditForm({});
            alert('Cập nhật thành công!');
        } catch (error) {
            alert('Lỗi cập nhật: ' + error.message);
        }
    };

    const handleDeleteRow = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa?')) {
            try {
                await db.table(currentView.table).delete(id);
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        }
    };

    // Bulk Delete
    const [selectedIds, setSelectedIds] = useState(new Set());
    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(new Set(viewData.map(d => d.id)));
        else setSelectedIds(new Set());
    };
    const handleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Xóa ${selectedIds.size} mục?`)) {
            await db.table(currentView.table).bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const renderCell = (key, value) => {
        if (editingId === editForm.id && key in editForm) {
            return <input value={editForm[key] || ''} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} className="border rounded px-1 w-full" />;
        }
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
    };

    const safeViewData = viewData || [];
    const totalPages = Math.ceil(safeViewData.length / pageSize);
    const paginatedData = safeViewData.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Quản lý Dữ liệu</h1>
                <p className="text-slate-500 mt-2">Sao lưu, phục hồi và đồng bộ dữ liệu hệ thống.</p>
            </div>

            {/* Hidden generic file input for JSON restore */}
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .json" />

            {/* Import Actions - NEW LAYOUT */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-600" />
                    Nhập dữ liệu từ Excel
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Import Vehicles */}
                    <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                <Truck className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900">Dữ liệu Xe máy</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 h-10">Nhập danh sách xe, giờ máy hoạt động và định mức bảo dưỡng.</p>
                        <label className={`block w-full text-center py-2.5 rounded-lg border-2 border-dashed border-blue-300 bg-white text-blue-600 font-medium cursor-pointer hover:bg-blue-50 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
                            {importing ? 'Đang xử lý...' : 'Chọn file Excel Xe'}
                        </label>
                    </div>

                    {/* Import Supplies */}
                    <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:border-green-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                                <Package className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900">Vật tư & Phụ tùng</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 h-10">Nhập danh mục vật tư, mã quy đổi Donaldson và định mức theo xe.</p>
                        <label className={`block w-full text-center py-2.5 rounded-lg border-2 border-dashed border-green-300 bg-white text-green-600 font-medium cursor-pointer hover:bg-green-50 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
                            {importing ? 'Đang xử lý...' : 'Chọn file Excel Vật tư'}
                        </label>
                    </div>

                    {/* Import Logs */}
                    <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:border-orange-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600">
                                <History className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900">Lịch sử Bảo dưỡng</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 h-10">Nhập nhật ký bảo dưỡng quá khứ để theo dõi lịch sử.</p>
                        <label className={`block w-full text-center py-2.5 rounded-lg border-2 border-dashed border-orange-300 bg-white text-orange-600 font-medium cursor-pointer hover:bg-orange-50 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
                            {importing ? 'Đang xử lý...' : 'Chọn file Excel Lịch sử'}
                        </label>
                    </div>

                    {/* Import Error Codes */}
                    <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 hover:border-red-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900">Mã lỗi Kỹ thuật</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 h-10">Nhập danh sách mã lỗi, mô tả và biện pháp khắc phục.</p>
                        <label className={`block w-full text-center py-2.5 rounded-lg border-2 border-dashed border-red-300 bg-white text-red-600 font-medium cursor-pointer hover:bg-red-50 transition-colors ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
                            {importing ? 'Đang xử lý...' : 'Chọn file Excel Mã lỗi'}
                        </label>
                    </div>
                </div>
            </div>

            {/* Tabs for Data View & Others */}
            <div className="flex flex-col sm:flex-row gap-2 border-b border-slate-200">
                <button onClick={() => setActiveTab('data')} className={`px-4 py-2 ${activeTab === 'data' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Xem Dữ liệu</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Danh sách Người dùng</button>
                <button
                    onClick={() => { setEditingUser(null); setActiveTab('user_form'); }}
                    className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'user_form' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
                >
                    <UserPlus className="w-4 h-4" /> Thêm người dùng
                </button>
                <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 ${activeTab === 'projects' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Dự án</button>
                <button onClick={() => setActiveTab('backup')} className={`px-4 py-2 ${activeTab === 'backup' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Backup/Restore JSON</button>
            </div>

            {activeTab === 'users' && (
                <UserManagement
                    viewMode="list"
                    onSwitchMode={(mode, user) => {
                        if (mode === 'form') {
                            setEditingUser(user);
                            setActiveTab('user_form');
                        }
                    }}
                />
            )}

            {activeTab === 'user_form' && (
                <UserManagement
                    viewMode="form"
                    initialUser={editingUser}
                    onSwitchMode={(mode) => {
                        if (mode === 'list') {
                            setEditingUser(null);
                            setActiveTab('users');
                        }
                    }}
                />
            )}
            {activeTab === 'projects' && <ProjectManagement />}
            {activeTab === 'backup' && (
                <div className="space-y-6">
                    {/* Cloud Sync Section */}
                    <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Đồng bộ Dữ liệu Đám mây (Supabase)</h3>
                                <p className="text-sm text-slate-600">Đồng bộ dữ liệu hiện tại lên Cloud Database để các tài khoản khác cùng nhận được.</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-indigo-100 mb-4 text-sm text-slate-600">
                            <p className="mb-2"><strong>Lưu ý:</strong> Chức năng này yêu cầu bạn đã cấu hình <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> trong file <code>.env</code>.</p>
                            <p>Dữ liệu sẽ được đẩy lên Cloud. Nếu ID trùng nhau, dữ liệu trên Cloud sẽ được cập nhật theo dữ liệu ở máy này.</p>
                        </div>

                        {importStatus === 'sync_cloud' && (
                            <div className="mb-4">
                                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="text-xs text-center text-slate-500">{progress}%</p>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                if (!window.confirm('Bạn có chắc muốn đồng bộ dữ liệu lên Đám mây?')) return;
                                try {
                                    setImportStatus('sync_cloud');
                                    setProgress(0);
                                    const { syncLocalToCloud } = await import('../utils/syncToSupabase');
                                    const res = await syncLocalToCloud((msg, pct) => {
                                        // Simple toast or log could go here, for now using progress bar state if we added message state
                                        console.log(msg);
                                        setProgress(pct);
                                    });
                                    if (res.success) {
                                        alert('Đồng bộ thành công!');
                                    } else {
                                        alert('Lỗi: ' + res.error);
                                    }
                                } catch (e) {
                                    alert('Lỗi: ' + e.message);
                                } finally {
                                    setImportStatus(null);
                                    setProgress(0);
                                }
                            }}
                            disabled={importStatus === 'sync_cloud'}
                            className="flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {importStatus === 'sync_cloud' ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {importStatus === 'sync_cloud' ? 'Đang đồng bộ...' : 'Bắt đầu Đồng bộ lên Cloud'}
                        </button>
                    </div>

                    {/* Local Backup Section */}
                    <div className="p-4 bg-white rounded-xl shadow-sm space-y-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-slate-800">Sao lưu Cục bộ (JSON)</h3>
                        </div>
                        <p className="text-sm text-slate-500">Dùng chức năng này để sao lưu toàn bộ hệ thống hoặc chuyển dữ liệu sang máy khác thông qua file.</p>
                        <div className="flex gap-4">
                            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                                <Download className="w-4 h-4 mr-2" /> Xuất JSON
                            </button>
                            <button onClick={() => fileInputRef.current.click()} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                <Upload className="w-4 h-4 mr-2" /> Nhập JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="space-y-4">
                    {/* View Selectors */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {VIEWS.map(v => (
                            <button key={v.id} onClick={() => setSelectedViewId(v.id)} className={`px-3 py-1.5 rounded-lg text-sm border whitespace-nowrap ${selectedViewId === v.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                                {v.label}
                            </button>
                        ))}
                    </div>
                    {/* Filter & Actions */}
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="text-sm outline-none w-48" />
                        </div>
                        <div>
                            {selectedIds.size > 0 && (
                                <button onClick={handleBulkDelete} className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg">
                                    Xóa ({selectedIds.size})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left relative">
                            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0">
                                <tr>
                                    <th className="p-3 w-10"><input type="checkbox" onChange={handleSelectAll} checked={safeViewData.length > 0 && selectedIds.size === safeViewData.length} /></th>
                                    {currentView.columns.map(col => <th key={col} className="p-3 whitespace-nowrap">{COLUMN_LABELS[col] || col}</th>)}
                                    <th className="p-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedData.map(row => (
                                    <tr key={row.id}>
                                        <td className="p-3"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => handleSelectRow(row.id)} /></td>
                                        {currentView.columns.map(col => (
                                            <td key={col} className="p-3 whitespace-nowrap">{renderCell(col, row[col])}</td>
                                        ))}
                                        <td className="p-3 text-right flex justify-end gap-2">
                                            {editingId === row.id ? (
                                                <button onClick={handleSaveEdit} className="text-green-600"><CheckCircle className="w-4 h-4" /></button>
                                            ) : (
                                                <button onClick={() => handleEditClick(row)} className="text-blue-600"><Wrench className="w-4 h-4" /></button>
                                            )}
                                            <button onClick={() => handleDeleteRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedData.length === 0 && (
                                    <tr>
                                        <td colSpan={currentView.columns.length + 2} className="p-8 text-center text-slate-500">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {safeViewData.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <div className="text-sm text-slate-500">
                                Hiển thị {page * pageSize + 1}-{Math.min((page + 1) * pageSize, safeViewData.length)} trong tổng số {safeViewData.length} dòng
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Trước
                                </button>
                                <span className="flex items-center px-2 text-sm text-slate-600">
                                    Trang {page + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Progress Overlay */}
            {importStatus === 'processing' && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Đang xử lý dữ liệu lớn...</h3>
                        <p className="text-slate-500 mb-6">Đang tối ưu hóa và nhập liệu. Vui lòng không tắt trình duyệt.</p>

                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 font-mono text-blue-600 font-bold">{progress}%</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
