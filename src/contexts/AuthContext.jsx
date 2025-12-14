import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/db';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // Query database for user
            const users = await db.users.toArray();
            const foundUser = users.find(u => u.username === username && u.password === password);

            if (foundUser) {
                const userInfo = { ...foundUser };
                delete userInfo.password; // Don't store password
                setUser(userInfo);
                localStorage.setItem('user', JSON.stringify(userInfo));
                return { success: true, user: userInfo };
            }

            return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Lỗi đăng nhập' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAdmin: ['admin', 'super_admin', 'project_admin'].includes(user?.role),
        isSuperAdmin: ['admin', 'super_admin'].includes(user?.role),
        isTechnician: ['technician', 'site_manager'].includes(user?.role)
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
