import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const FeatureCard = ({ title, description, icon: Icon, link, color }) => {
    return (
        <Link
            to={link}
            className="group relative flex flex-col p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300"
        >
            <div className={`p-3 rounded-xl bg-slate-50 w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-8 h-8 ${color}`} />
            </div>

            <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                {title}
            </h3>

            <p className="text-sm text-slate-500 mb-4 flex-grow">
                {description}
            </p>

            <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-blue-600 transition-colors mt-auto">
                Truy cập <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
        </Link>
    );
};

export default FeatureCard;
