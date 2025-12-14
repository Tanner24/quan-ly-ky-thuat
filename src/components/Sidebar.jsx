import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { features } from '../data/features';
import {
    LayoutDashboard,
    ChevronLeft,
    ChevronRight,
    Settings
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();

    // Group features (optional, but requested for V2)
    // For now, we'll list them flat but styled nicely, or grouped if we want
    // Let's do a simple grouping based on common sense categories

    const categories = [
        {
            name: 'Tổng quan',
            items: [
                { id: 'dashboard', title: 'Bảng điều khiển', icon: LayoutDashboard, link: '/' }
            ]
        },
        {
            name: 'Quản lý',
            items: features.filter(f => ['vehicles', 'driver-logs', 'settings'].includes(f.id))
        },
        {
            name: 'Kỹ thuật & Tra cứu',
            items: features.filter(f => !['vehicles', 'driver-logs', 'settings'].includes(f.id))
        }
    ];

    return (
        <aside
            className={`fixed top-0 left-0 z-40 h-screen transition-transform bg-slate-900 text-white border-r border-slate-800
            ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-20'} 
            duration-300 ease-in-out`}
        >
            <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
                <div className={`flex items-center gap-2 truncate ${!isOpen && 'lg:hidden'}`}>
                    <span className="text-lg font-bold text-white tracking-wide">
                        Quản lý xe
                    </span>
                </div>

                {/* Collapsed Logo */}
                <div className={`hidden ${!isOpen && 'lg:flex justify-center w-full'}`}>
                    <span className="text-xl font-bold text-blue-500">Xe</span>
                </div>

                <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className="overflow-y-auto h-[calc(100vh-64px)] py-4 scrollbar-thin scrollbar-thumb-slate-700">
                {categories.map((category, idx) => (
                    <div key={idx} className="mb-6">
                        {isOpen && (
                            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                {category.name}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {category.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.link;

                                return (
                                    <NavLink
                                        key={item.id}
                                        to={item.link}
                                        className={({ isActive }) => `
                                            flex items-center px-4 py-3 text-sm transition-colors relative
                                            ${isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                                        `}
                                        title={!isOpen ? item.title : ''}
                                    >
                                        <Icon className={`w-5 h-5 flex-shrink-0 ${isOpen ? 'mr-3' : 'mx-auto'}`} />
                                        {isOpen && <span>{item.title}</span>}

                                        {isActive && !isOpen && (
                                            <div className="absolute right-0 w-1 h-full bg-blue-400 rounded-l"></div>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Toggle Button for Desktop */}
            {/* <button 
                onClick={toggleSidebar}
                className="hidden lg:flex absolute -right-3 top-20 bg-slate-800 text-slate-400 rounded-full p-1 border border-slate-700 shadow-lg hover:text-white"
            >
                {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button> */}
        </aside>
    );
};

export default Sidebar;
