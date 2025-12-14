$path = "C:\Users\admin\.gemini\antigravity\scratch\clone_app\src\pages\Settings.jsx"
$lines = Get-Content $path
# Take from line 141 (index 140) onwards
# NOTE: View file output showed line 140 was 'const viewData = ...'. So index 139 starts there.
# Let's check: View file 2630 showed line 140 is '    const viewData = useLiveQuery(async () => {'. 
# Array index is 0-based. Line 140 is index 139.
# We want to replace lines 1-139 (Header). Keep 140 onwards.
$bodyStartLine = 139 
$body = $lines[$bodyStartLine..($lines.Count-1)]

$header = @"
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
"@

$finalContent = $header + "`n" + ($body -join "`n")
Set-Content -Path $path -Value $finalContent -Encoding UTF8
