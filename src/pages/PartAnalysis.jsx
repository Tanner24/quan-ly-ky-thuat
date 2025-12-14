import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Search, Plus, Trash2, ArrowLeft, Package, History, Filter, Clock, CheckCircle, Share2, Download } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toPng, toBlob } from 'html-to-image';

const MaintenanceSuppliesManager = () => {
    const tableRef = useRef(null);
    const [searchParams] = useSearchParams();
    const initialAssetCode = searchParams.get('assetCode');

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        assetCode: initialAssetCode || '',
        group: '',
        name: '',
        code: '', // Mã danh điểm
        unit: 'Cái',
        quantity: 1,
        donaldsonCode: '', // Mã lọc Donaldson quy đổi
        maintenanceInterval: '' // Định mức bảo dưỡng
    });

    const [selectedAssetCode, setSelectedAssetCode] = useState(initialAssetCode || null);
    const [selectedIntervals, setSelectedIntervals] = useState([]); // Array for multi-select

    // Get unique Asset Codes for the filter bar
    const assetCodes = useLiveQuery(async () => {
        const allItems = await db.maintenanceSupplies.toArray();
        const codes = new Set(allItems.map(i => i.assetCode).filter(Boolean));
        return Array.from(codes).sort();
    }, []);

    // Get unique Intervals
    const intervals = useLiveQuery(async () => {
        const allItems = await db.maintenanceSupplies.toArray();
        const ints = new Set();
        let hasNull = false;

        allItems.forEach(i => {
            if (i.maintenanceInterval && i.maintenanceInterval > 0) {
                ints.add(i.maintenanceInterval);
            } else {
                hasNull = true; // Flag if there are items with no interval
            }
        });

        const sorted = Array.from(ints).sort((a, b) => a - b);
        // Add -1 to represent "No Interval" at the beginning if exists
        return hasNull ? [-1, ...sorted] : sorted;
    }, []);

    const [page, setPage] = useState(0);
    const pageSize = 50;
    const [totalItems, setTotalItems] = useState(0);

    // Live Query from Dexie with Pagination & Optimization & Filters
    const supplies = useLiveQuery(async () => {
        let collection = db.maintenanceSupplies.toCollection();

        // 1. Apply Asset Code Filter (Exact match)
        if (selectedAssetCode) {
            collection = db.maintenanceSupplies.where('assetCode').equals(selectedAssetCode);
        }

        let result = await collection.toArray();

        // 2. Apply Interval Filter (Multi-select)
        if (selectedIntervals.length > 0) {
            result = result.filter(item => {
                const interval = item.maintenanceInterval;
                // If checking for "No Interval" (-1)
                if (selectedIntervals.includes(-1) && (!interval || interval <= 0)) return true;
                // Normal check
                if (interval && selectedIntervals.includes(interval)) return true;
                return false;
            });
        }

        // 3. Apply Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.assetCode && item.assetCode.toLowerCase().includes(term)) ||
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.code && item.code.toLowerCase().includes(term)) ||
                (item.donaldsonCode && item.donaldsonCode.toLowerCase().includes(term))
            );
        }

        // Update Total count based on filtered result
        setTotalItems(result.length);

        // 4. Pagination
        return result
            .slice(page * pageSize, (page + 1) * pageSize);

    }, [page, searchTerm, selectedAssetCode, selectedIntervals]);

    // Reset page when filters change
    React.useEffect(() => {
        setPage(0);
    }, [searchTerm, selectedAssetCode, selectedIntervals]);

    const toggleInterval = (int) => {
        if (selectedIntervals.includes(int)) {
            setSelectedIntervals(selectedIntervals.filter(i => i !== int));
        } else {
            setSelectedIntervals([...selectedIntervals, int]);
        }
    };

    // Helper to format interval unit
    const formatInterval = (val) => {
        if (val === -1) return '-'; // Display for "No Interval" option
        if (!val) return '-';
        // Chỉ định dạng km cho 40000 và 60000, còn lại là giờ
        if (val === 40000 || val === 60000) {
            return `${val} km`;
        }
        return `${val}h`;
    };

    // ... (handleSubmit and handleDelete unchanged)
    const handleSubmit = async (e) => {
        e.preventDefault();

        await db.maintenanceSupplies.add({
            assetCode: newItem.assetCode,
            group: newItem.group,
            name: newItem.name,
            code: newItem.code,
            unit: newItem.unit,
            quantity: Number(newItem.quantity),
            donaldsonCode: newItem.donaldsonCode,
            maintenanceInterval: newItem.maintenanceInterval ? Number(newItem.maintenanceInterval) : null
        });

        // Reset form but keep assetCode and group for convenience
        setNewItem(prev => ({
            ...prev,
            name: '',
            code: '',
            quantity: 1,
            donaldsonCode: '',
            maintenanceInterval: ''
        }));

        alert("Đã thêm vật tư thành công!");
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa vật tư này?')) {
            await db.maintenanceSupplies.delete(id);
        }
    };

    const getFileName = () => {
        let fileName = 'DanhSachVatTu';
        if (selectedAssetCode) fileName += `_${selectedAssetCode}`;
        if (selectedIntervals.length > 0) fileName += `_${selectedIntervals.map(formatInterval).join('-')}`;
        fileName += '.png';
        return fileName;
    }

    const prepareTableForCapture = () => {
        if (!tableRef.current) return null;
        const deleteButtons = tableRef.current.querySelectorAll('button');
        deleteButtons.forEach(btn => btn.style.display = 'none');
        return deleteButtons;
    }

    const restoreTableAfterCapture = (deleteButtons) => {
        if (deleteButtons) deleteButtons.forEach(btn => btn.style.display = '');
    }

    const handleDownload = async () => {
        if (!tableRef.current) return;
        try {
            const deleteButtons = prepareTableForCapture();
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(tableRef.current, { backgroundColor: '#ffffff', cacheBust: true });

            restoreTableAfterCapture(deleteButtons);

            const link = document.createElement('a');
            link.download = getFileName();
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Download error:', error);
            restoreTableAfterCapture(tableRef.current?.querySelectorAll('button'));
            alert('Lỗi lưu ảnh.');
        }
    };

    const handleSystemShare = async () => {
        if (!tableRef.current) return;
        try {
            const deleteButtons = prepareTableForCapture();
            await new Promise(resolve => setTimeout(resolve, 100));

            const blob = await toBlob(tableRef.current, { backgroundColor: '#ffffff', cacheBust: true });

            restoreTableAfterCapture(deleteButtons);

            if (!blob) throw new Error('Không thể tạo ảnh.');

            const file = new File([blob], getFileName(), { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Danh sách vật tư',
                    text: `Danh sách vật tư xe ${selectedAssetCode || 'chung'}`,
                    files: [file]
                });
            } else {
                alert('Trình duyệt này chưa hỗ trợ chia sẻ ảnh trực tiếp. Vui lòng dùng nút "Lưu ảnh".');
            }
        } catch (error) {
            console.error('Share error:', error);
            restoreTableAfterCapture(tableRef.current?.querySelectorAll('button'));
            alert('Lỗi chia sẻ: ' + (error.message || error));
        }
    };

    const [showFilter, setShowFilter] = useState(false);
    const [showIntervalFilter, setShowIntervalFilter] = useState(false);

    return (
        <div className="space-y-6 pb-20">
            {/* Header and Add Form unchanged ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Vật tư & Phụ tùng</h1>
                    <p className="text-slate-500 text-sm">Quản lý danh mục vật tư, mã quy đổi và định mức bảo dưỡng theo xe.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {showAddForm ? 'Đóng' : 'Thêm mới'}
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Thêm Vật tư mới
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã Tài Sản</label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.assetCode}
                                    onChange={e => setNewItem({ ...newItem, assetCode: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: XU01"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhóm vật tư</label>
                                <input
                                    type="text"
                                    list="groups"
                                    value={newItem.group}
                                    onChange={e => setNewItem({ ...newItem, group: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: Lọc, Dầu..."
                                />
                                <datalist id="groups">
                                    <option value="Lọc động cơ" />
                                    <option value="Lọc thủy lực" />
                                    <option value="Dầu mỡ" />
                                    <option value="Phụ tùng gầm" />
                                </datalist>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên vật tư</label>
                                <input
                                    type="text"
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: Lọc nhớt động cơ"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã danh điểm</label>
                                <input
                                    type="text"
                                    value={newItem.code}
                                    onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    placeholder="Part No..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã Donaldson</label>
                                <input
                                    type="text"
                                    value={newItem.donaldsonCode}
                                    onChange={e => setNewItem({ ...newItem, donaldsonCode: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                    placeholder="Mã tương đương..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị</label>
                                <select
                                    value={newItem.unit}
                                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option>Cái</option>
                                    <option>Bộ</option>
                                    <option>Lít</option>
                                    <option>Hộp</option>
                                    <option>Kg</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số lượng</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newItem.quantity}
                                    onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Định mức</label>
                                <input
                                    type="number"
                                    value={newItem.maintenanceInterval}
                                    onChange={e => setNewItem({ ...newItem, maintenanceInterval: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Giờ hoặc Km"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md">
                                Lưu Vật tư
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter & Search Section */}
            <div className="relative z-10 space-y-2">
                <div className="flex gap-2">
                    {/* Search Bar */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 flex-1">
                        <Search className="text-slate-400 w-5 h-5 ml-2" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên vật tư, mã phụ tùng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 py-2 px-2 outline-none text-slate-700 placeholder:text-slate-400"
                        />
                    </div>

                    {/* Interval Filter Button (Clock) */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowIntervalFilter(!showIntervalFilter); setShowFilter(false); }}
                            className={`p-3 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${selectedIntervals.length > 0 || showIntervalFilter
                                ? 'bg-orange-100 text-orange-600 border-orange-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Lọc theo Định mức BD"
                        >
                            <Clock className="w-6 h-6" />
                            {selectedIntervals.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                                    {selectedIntervals.length}
                                </span>
                            )}
                        </button>

                        {/* Interval Dropdown Multi-select */}
                        {showIntervalFilter && intervals && intervals.length > 0 && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 origin-top-right z-20">
                                <div className="text-xs font-bold text-slate-400 uppercase px-2 py-1 mb-1">Định mức (Giờ / Km)</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    <button
                                        onClick={() => { setSelectedIntervals([]); setShowIntervalFilter(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${selectedIntervals.length === 0 ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                    {intervals.map(int => (
                                        <button
                                            key={int}
                                            onClick={() => toggleInterval(int)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center ${selectedIntervals.includes(int) ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIntervals.includes(int) ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                                                    {selectedIntervals.includes(int) && <CheckCircle className="w-3 h-3 text-white" />}
                                                </div>
                                                <span>{formatInterval(int)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Asset Filter Button (Filter) kept same ... */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowFilter(!showFilter); setShowIntervalFilter(false); }}
                            className={`p-3 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${selectedAssetCode || showFilter
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Lọc theo Mã xe"
                        >
                            <Filter className="w-6 h-6" />
                        </button>

                        {/* Asset Dropdown */}
                        {showFilter && assetCodes && assetCodes.length > 0 && (
                            <div className="absolute right-0 top-full mt-2 w-full md:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 animate-in fade-in zoom-in-95 origin-top-right z-20">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-semibold text-slate-700">Chọn Mã xe</span>
                                    <button onClick={() => { setSelectedAssetCode(null); setShowFilter(false); }} className="text-xs text-blue-600 hover:underline">Đặt lại</button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    <button
                                        onClick={() => { setSelectedAssetCode(null); setShowFilter(false); }}
                                        className={`px-2 py-2 rounded-lg text-sm font-medium border truncate ${selectedAssetCode === null
                                            ? 'bg-slate-100 text-slate-900 border-slate-300'
                                            : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                                            }`}
                                    >
                                        Tất cả
                                    </button>
                                    {assetCodes.map(code => (
                                        <button
                                            key={code}
                                            onClick={() => { setSelectedAssetCode(code); setShowFilter(false); }}
                                            className={`px-2 py-2 rounded-lg text-sm font-medium border truncate ${selectedAssetCode === code
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                                                }`}
                                        >
                                            {code}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Filters Badges & Share Button */}
                {(selectedAssetCode || selectedIntervals.length > 0) && (
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-slate-500 py-1">Đang lọc:</span>
                            {selectedAssetCode && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    Xe: {selectedAssetCode}
                                    <button onClick={() => setSelectedAssetCode(null)} className="hover:text-blue-900 rounded-full p-0.5">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {selectedIntervals.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                    Mốc: {selectedIntervals.map(formatInterval).join(', ')}
                                    <button onClick={() => setSelectedIntervals([])} className="hover:text-orange-900 rounded-full p-0.5">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                                title="Tải ảnh về máy"
                            >
                                <Download className="w-4 h-4" />
                                Lưu ảnh
                            </button>
                            <button
                                onClick={handleSystemShare}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
                                title="Chia sẻ qua Zalo, Messenger..."
                            >
                                <Share2 className="w-4 h-4" />
                                Chia sẻ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table and Pagination kept same ... */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" ref={tableRef}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Mã Tài Sản</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Tên vật tư</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Mã danh điểm</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Mã Donaldson</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-center whitespace-nowrap">ĐVT / SL</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right whitespace-nowrap">Định mức</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right w-10">#</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!supplies || supplies.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                        {searchTerm || selectedAssetCode || selectedIntervals.length > 0
                                            ? 'Không tìm thấy vật tư nào phù hợp với bộ lọc.'
                                            : 'Chưa có dữ liệu vật tư.'}
                                    </td>
                                </tr>
                            ) : (
                                supplies.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">{item.assetCode}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.group}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-600">{item.code || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-slate-600">{item.donaldsonCode || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.quantity} <span className="text-xs text-slate-400">{item.unit}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                                            {formatInterval(item.maintenanceInterval) || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                title="Xóa"
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
            {/* Pagination Controls */}
            {totalItems > 0 && (
                <div className="flex items-center justify-between bg-white p-4 border-t border-slate-100 rounded-b-2xl">
                    <p className="text-sm text-slate-500">
                        Hiển thị <span className="font-medium">{page * pageSize + 1}</span> - <span className="font-medium">{Math.min((page + 1) * pageSize, totalItems)}</span> trong số <span className="font-medium">{totalItems}</span> vật tư
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Trước
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={(page + 1) * pageSize >= totalItems}
                            className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceSuppliesManager;
