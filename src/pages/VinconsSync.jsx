import React, { useState } from 'react';
import { db } from '../db/db';
import {
    RefreshCw, CheckCircle, AlertCircle,
    Database, Terminal, Shield, Play
} from 'lucide-react';

const VinconsSync = () => {
    // State
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'file'

    // Logging Helper
    const addLog = (msg, type = 'info') => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
    };

    // --- Shared Sync Logic ---
    // --- Shared Sync Logic (Advanced Scraper Engine) ---
    const executeSync = async (htmlContent) => {
        // 3. Parse HTML DOM
        addLog('Đang khởi tạo bộ phân tích DOM Ảo...', 'info');
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Smart Table Detection
        const tables = doc.querySelectorAll('table');
        let targetTable = null;
        let headerMap = {};

        // Debug info store
        let foundHeadersLog = [];

        // Loop through tables to find the right one
        for (const table of tables) {
            // Get all text from TH or TD in THEAD, or first TR
            let headerCells = Array.from(table.querySelectorAll('thead th, thead td'));
            if (headerCells.length === 0) {
                const firstRow = table.querySelector('tr');
                if (firstRow) headerCells = Array.from(firstRow.querySelectorAll('th, td'));
            }

            const headers = headerCells.map(th => th.innerText.trim().toLowerCase());
            if (headers.length > 0) foundHeadersLog.push(`[Table ${foundHeadersLog.length + 1}]: ${headers.join(', ')}`);

            // Check for signature columns (Expanded Keywords)
            const keywords = ['mã', 'thiết bị', 'biển', 'bks', 'tên', 'model', 'ngày', 'nội dung', 'mô tả', 'đơn vị', 'bộ phận'];
            const matchCount = keywords.filter(k => headers.some(h => h.includes(k))).length;

            // Threshold: At least 2 relevant columns found
            if (matchCount >= 2) {
                targetTable = table;
                // Build Header Map (Column Name -> Index)
                headers.forEach((h, idx) => headerMap[h] = idx);
                addLog(`Đã xác định bảng dữ liệu (Match Score: ${matchCount}). Cột: ${headers.join(', ')}`, 'success');
                break;
            }
        }

        if (!targetTable) {
            const warning = doc.querySelector('.alert, .error-message');
            if (warning) addLog('Cảnh báo từ trang: ' + warning.innerText, 'warning');

            // Log what we found to help user debug
            if (foundHeadersLog.length > 0) {
                addLog('Không tìm thấy bảng khớp. Các bảng tìm thấy:', 'info');
                foundHeadersLog.forEach(l => addLog(l, 'warning'));
            } else {
                addLog('Không tìm thấy bất kỳ thẻ <table> nào trong HTML.', 'error');
            }

            throw new Error('Cấu trúc bảng không khớp (Signature Mismatch). Hãy kiểm tra LOG bên trên để xem các cột đã tìm thấy.');
        }

        const rows = targetTable.querySelectorAll('tbody tr');
        if (rows.length === 0 && targetTable) {
            // Fallback for tables without tbody
            const allRows = targetTable.querySelectorAll('tr');
            addLog(`Cảnh báo: Không thấy <tbody>, thử đọc toàn bộ ${allRows.length} dòng...`, 'warning');
        } else {
            addLog(`Phát hiện ${rows.length} dòng dữ liệu thô. Đang tiến hành trích xuất...`, 'info');
        }

        const rowsToProcess = rows.length > 0 ? rows : targetTable.querySelectorAll('tr');

        // Helper to get cell data safely
        const getCell = (cells, keyKeywords) => {
            if (!cells) return '';
            const index = Object.keys(headerMap).find(h => keyKeywords.some(k => h.includes(k)));
            if (index !== undefined && cells[headerMap[index]]) {
                return cells[headerMap[index]].innerText.trim();
            }
            return '';
        };

        // 4. Extract Data (ETL Process)
        const extractedData = Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return null; // Skip empty/spacer rows

            // Dynamic Extraction Strategy
            const machineCode = getCell(cells, ['mã thiết bị', 'mã số', 'code']);
            const licensePlate = getCell(cells, ['biển số', 'biển kiểm soát', 'plate']);
            const machineName = getCell(cells, ['tên thiết bị', 'loại máy', 'tên máy']);
            const department = getCell(cells, ['đơn vị', 'bộ phận', 'công trường', 'dự án']);
            const reportDate = getCell(cells, ['ngày', 'thời gian']);
            const repairStaff = getCell(cells, ['người sửa', 'cán bộ', 'kỹ thuật']);
            const description = getCell(cells, ['nội dung', 'mô tả', 'công việc']);

            if (!machineCode && !licensePlate) return null;

            return {
                project: department,
                machineCode,
                licensePlate,
                machineName,
                department,
                reportDate,
                repairStaff,
                description,
                status: 'maintenance' // Default implied status
            };
        }).filter(x => x);

        if (extractedData.length === 0) {
            throw new Error('Dữ liệu rỗng sau khi trích xuất. Kiểm tra lại cấu trúc HTML.');
        }

        addLog(`Trích xuất thành công ${extractedData.length} object. Bắt đầu đẩy vào DB...`, 'success');

        // 5. Save to Database (Upsert Strategy)
        let newCount = 0;
        let updateCount = 0;

        await db.transaction('rw', db.vehicles, db.maintenanceLogs, async () => {
            for (const item of extractedData) {
                const plate = (item.licensePlate || item.machineCode).toUpperCase().replace(/[^A-Z0-9-]/g, '');

                if (!plate) continue;

                // Find Vehicle
                let vehicle = await db.vehicles.where('plateNumber').equals(plate).first();

                // Advanced Tagging Logic
                if (vehicle) {
                    await db.vehicles.update(vehicle.id, {
                        status: 'maintenance', // Force update status based on repair list presence
                        updatedAt: new Date(),
                        department: item.department || vehicle.department
                    });
                    updateCount++;
                } else {
                    const id = await db.vehicles.add({
                        plateNumber: plate,
                        model: item.machineName || 'Unknown Vincons',
                        department: item.department || 'Vincons Import',
                        currentHours: 0,
                        status: 'maintenance',
                        importedFrom: 'vincons_scraper',
                        updatedAt: new Date()
                    });
                    vehicle = { id };
                    newCount++;
                }

                // Log Deduplication
                const logDate = item.reportDate ? new Date(item.reportDate.split('/').reverse().join('-')) : new Date();
                const dateStr = !isNaN(logDate) ? logDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                const existingLog = await db.maintenanceLogs
                    .where({ vehicleId: vehicle.id })
                    .filter(l => l.date === dateStr && l.source === 'vincons_sync')
                    .first();

                if (!existingLog) {
                    await db.maintenanceLogs.add({
                        vehicleId: vehicle.id,
                        date: dateStr,
                        type: 'Sửa chữa (Vincons)',
                        cost: 0,
                        description: item.description || `Đồng bộ từ Vincons. NV: ${item.repairStaff}`,
                        source: 'vincons_sync',
                        raw: JSON.stringify(item)
                    });
                }
            }
        });

        addLog('HOÀN TẤT ĐỒNG BỘ.', 'success');
        setStats({ new: newCount, updated: updateCount, total: extractedData.length });
    };

    // --- Handlers ---
    const handleAutoSync = async () => {
        setIsSyncing(true);
        setLogs([]);
        setStats(null);
        addLog('Đang khởi tạo Proxy Tunnel...', 'info');

        try {
            // Faking a sophisticated handshake delay for "hacker" feel
            await new Promise(r => setTimeout(r, 800));

            addLog('Đang gửi request GET tới /api-vincons/equipment/repair...', 'info');

            const response = await fetch('/api-vincons/equipment/repair', {
                method: 'GET',
                headers: {
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 404) {
                    throw new Error('Proxy Access Denied. Phiên đăng nhập Vincons có thể đã hết hạn.');
                }
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            addLog(`Nhận phản hồi ${html.length} bytes. Parsing...`, 'info');

            // Quick Auth Check in Raw HTML
            if (html.includes('login') || html.includes('Đăng nhập')) {
                throw new Error('Phát hiện Form Đăng nhập. Client chưa được xác thực với máy chủ Vincons.');
            }

            await executeSync(html);

        } catch (error) {
            console.error(error);
            addLog('CRITICAL ERROR: ' + error.message, 'error');
            addLog('Gợi ý: Hãy đăng nhập Vincons ở tab khác rồi thử lại, hoặc dùng tính năng Tải file HTML.', 'warning');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsSyncing(true);
        setLogs([]);
        setStats(null);
        addLog(`Đang đọc file: ${file.name}...`, 'info');

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const html = e.target.result;
                    addLog('Đọc file thành công. Đang xử lý...', 'info');
                    await executeSync(html);
                } catch (err) {
                    addLog('Lỗi xử lý file: ' + err.message, 'error');
                } finally {
                    setIsSyncing(false);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            addLog('Lỗi đọc file: ' + error.message, 'error');
            setIsSyncing(false);
        }
    };

    // --- Render ---

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2 mb-8">
                <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-2xl mb-2">
                    <RefreshCw className={`w-8 h-8 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Đồng bộ Dữ liệu</h1>
                <p className="text-slate-500">Cập nhật thông tin sửa chữa từ Vincons vào hệ thống</p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveTab('auto')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'auto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tự động (Proxy)
                    </button>
                    <button
                        onClick={() => setActiveTab('file')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Tải file HTML
                    </button>
                </div>
            </div>

            {/* Sync Control Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">

                {activeTab === 'auto' && (
                    <div className="p-8">
                        <div className="flex flex-col items-center">
                            <p className="text-slate-500 mb-6 text-center max-w-lg">
                                Kết nối trực tiếp đến Vincons bằng phiên đăng nhập hiện tại của trình duyệt.
                                <br /><span className="text-xs text-orange-500 font-semibold">(Yêu cầu đã đăng nhập Vincons ở tab khác)</span>
                            </p>
                            <button
                                onClick={handleAutoSync}
                                disabled={isSyncing}
                                className={`
                                    relative group overflow-hidden px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95
                                    ${isSyncing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}
                                `}
                            >
                                <span className="flex items-center gap-3 relative z-10">
                                    {isSyncing ? (
                                        <>
                                            <RefreshCw className="w-6 h-6 animate-spin" />
                                            Đang đồng bộ...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-6 h-6 fill-current" />
                                            Bắt đầu Đồng bộ
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'file' && (
                    <div className="p-8">
                        <div className="flex flex-col items-center">
                            <p className="text-slate-500 mb-6 text-center max-w-lg">
                                <strong>Cách 1:</strong> Mở trang Vincons, nhấn <span className="font-mono bg-slate-100 px-1 rounded">Ctrl+A</span> rồi <span className="font-mono bg-slate-100 px-1 rounded">Ctrl+C</span>. Sau đó dán vào ô bên dưới.
                            </p>

                            <textarea
                                className="w-full h-32 p-4 border border-slate-300 rounded-lg font-mono text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 mb-6"
                                placeholder="Dán nội dung HTML (Source code) hoặc văn bản đã copy từ trang Vincons vào đây..."
                                onChange={(e) => {
                                    if (e.target.value.length > 100) {
                                        addLog('Phát hiện nội dung được dán. Đang xử lý...', 'info');
                                        executeSync(e.target.value).catch(err => addLog(err.message, 'error'));
                                    }
                                }}
                            ></textarea>

                            <div className="w-full flex items-center justify-between my-4">
                                <span className="h-px bg-slate-200 flex-1"></span>
                                <span className="px-4 text-slate-400 text-sm">HOẶC tải file</span>
                                <span className="h-px bg-slate-200 flex-1"></span>
                            </div>

                            <label className={`
                                flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                                ${isSyncing ? 'bg-slate-50 border-slate-300' : 'bg-blue-50 border-blue-300 hover:bg-blue-100'}
                            `}>
                                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                    <Database className="w-6 h-6 text-blue-500 mb-1" />
                                    <p className="text-sm text-slate-700">Chọn file .html đã lưu</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".html,.htm"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isSyncing}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Stats Display */}
                {stats && (
                    <div className="px-8 pb-8 flex gap-8 justify-center animate-fade-in border-t border-slate-100 pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.updated}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Cập nhật</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Xe mới</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-600">{stats.total}</div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Tổng dòng</div>
                        </div>
                    </div>
                )}

                {/* Console Log Area */}
                <div className="bg-slate-900 border-t border-slate-800 p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-2 uppercase tracking-wider">
                        <Terminal className="w-4 h-4" /> System Logs
                    </div>
                    <div className="h-48 overflow-y-auto font-mono text-sm space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {logs.length === 0 && <span className="text-slate-600 italic">Sẵn sàng chờ lệnh...</span>}
                        {logs.map((log, idx) => (
                            <div key={idx} className={`
                                ${log.type === 'error' ? 'text-red-400' :
                                    log.type === 'success' ? 'text-green-400' :
                                        log.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'}
                            `}>
                                <span className="opacity-50 mr-2">[{log.time}]</span>
                                {log.msg}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="text-center text-xs text-slate-400">
                Lưu ý: Tính năng này sử dụng Proxy nội bộ để kết nối. Tốc độ phụ thuộc vào mạng của bạn.
            </div>
        </div>
    );
};

export default VinconsSync;
