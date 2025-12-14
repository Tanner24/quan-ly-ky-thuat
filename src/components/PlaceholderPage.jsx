import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PlaceholderPage = ({ title }) => {
    return (
        <div className="space-y-6">
            <Link to="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại Bảng điều khiển
            </Link>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <p className="text-slate-500">Tính năng này đang được phát triển.</p>
                <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center border border-dashed border-slate-200">
                    <span className="text-slate-400">Nội dung ứng dụng sẽ hiển thị ở đây</span>
                </div>
            </div>
        </div>
    );
};

export default PlaceholderPage;
