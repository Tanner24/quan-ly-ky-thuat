import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ErrorCodeAnalysis = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newError, setNewError] = useState({ code: '', description: '', fixSteps: '' });

    // Live Query from Dexie
    const errorCodes = useLiveQuery(
        () => db.errorCodes
            .filter(error =>
                error.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                error.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .toArray(),
        [searchTerm]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newError.code || !newError.description) return;

        await db.errorCodes.add({
            code: newError.code,
            description: newError.description,
            fixSteps: newError.fixSteps
        });

        setNewError({ code: '', description: '', fixSteps: '' });
        setShowAddForm(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa mã lỗi này?')) {
            await db.errorCodes.delete(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors mb-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">Phân tích Mã lỗi</h1>
                    <p className="text-slate-500">Tra cứu và quản lý cơ sở dữ liệu lỗi kỹ thuật.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    {showAddForm ? 'Đóng biểu mẫu' : 'Thêm mã lỗi mới'}
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Thêm Mã lỗi Mới</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mã lỗi (Code)</label>
                                <input
                                    type="text"
                                    value={newError.code}
                                    onChange={e => setNewError({ ...newError, code: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: E-123"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả Lỗi</label>
                                <input
                                    type="text"
                                    value={newError.description}
                                    onChange={e => setNewError({ ...newError, description: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mô tả ngắn gọn về lỗi..."
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Các bước khắc phục</label>
                            <textarea
                                value={newError.fixSteps}
                                onChange={e => setNewError({ ...newError, fixSteps: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                placeholder="Nhập các bước xử lý..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                                Lưu vào Database
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Tìm kiếm mã lỗi hoặc mô tả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
            </div>

            {/* Results List */}
            <div className="grid gap-4">
                {!errorCodes ? (
                    <div className="text-center py-12 text-slate-500">Đang tải dữ liệu...</div>
                ) : errorCodes.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                        Không tìm thấy mã lỗi nào phù hợp. Hãy thử thêm mới!
                    </div>
                ) : (
                    errorCodes.map((error) => (
                        <div key={error.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-bold text-lg">
                                            {error.code}
                                        </span>
                                        <h3 className="text-lg font-semibold text-slate-900">{error.description}</h3>
                                    </div>
                                    <div className="pl-4 border-l-2 border-slate-100 mt-3">
                                        <p className="text-sm font-medium text-slate-500 mb-1">Khắc phục:</p>
                                        <p className="text-slate-700 whitespace-pre-line">{error.fixSteps || 'Chưa có thông tin khắc phục.'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(error.id)}
                                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Xóa mã lỗi"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ErrorCodeAnalysis;
