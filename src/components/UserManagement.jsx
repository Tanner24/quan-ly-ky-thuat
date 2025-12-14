import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '../contexts/AuthContext';
import { Save, Trash2, Edit2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ROLES = [
    { id: 'super_admin', label: 'Admin Tổng', levels: 3 },
    { id: 'project_admin', label: 'Admin Dự án', levels: 2 },
    { id: 'site_manager', label: 'Ban chỉ huy', levels: 1 },
    { id: 'technician', label: 'Kỹ thuật viên', levels: 0 }
];

const UserManagement = ({ viewMode = 'list', onSwitchMode, initialUser }) => {
    const { user: currentUser } = useAuth();

    // Fallback loading UI
    if (!currentUser) return <div className="p-8 text-center text-slate-400 italic">Đang tải thông tin...</div>;

    // Permissions
    const isSuper = ['admin', 'super_admin'].includes(currentUser.role);
    const myProjects = currentUser.assignedProjects || [];

    // Data Queries
    const allUsers = useLiveQuery(() => db.users.toArray()) || [];
    const allProjects = useLiveQuery(() => db.projects.toArray()) || [];

    // Filter Data
    const availableProjects = isSuper ? allProjects : allProjects.filter(p => myProjects.includes(p.id));

    const availableRoles = ROLES.filter(r => {
        if (isSuper) return true;
        if (currentUser.role === 'project_admin') return ['site_manager', 'technician'].includes(r.id);
        return false;
    });

    const visibleUsers = allUsers.filter(u => {
        if (isSuper) return true;
        if (currentUser.role === 'project_admin') {
            const isLower = ['site_manager', 'technician'].includes(u.role);
            const userProjects = u.assignedProjects || [];
            const common = userProjects.some(pid => myProjects.includes(pid));
            return isLower && (common || userProjects.length === 0);
        }
        return false;
    });

    // --- FORM COMPONENT ---
    const UserForm = () => {
        const [showPassword, setShowPassword] = useState(false);
        const [formData, setFormData] = useState({
            username: initialUser?.username || '',
            password: initialUser?.password || '',
            name: initialUser?.name || '',
            role: initialUser?.role || 'technician',
            department: initialUser?.department || '',
            assignedProjects: initialUser?.assignedProjects || []
        });

        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                const userToSave = { ...formData };

                // Security: Ensure non-super admins strictly manage only their projects
                if (!isSuper) {
                    userToSave.assignedProjects = userToSave.assignedProjects.filter(pid => myProjects.includes(pid));
                }

                if (initialUser) {
                    await db.users.update(initialUser.id, userToSave);
                    alert('Cập nhật thành công!');
                } else {
                    const exist = await db.users.where('username').equals(userToSave.username).first();
                    if (exist) return alert('Tên đăng nhập đã tồn tại!');
                    await db.users.add(userToSave);
                    alert('Thêm mới thành công!');
                }

                if (onSwitchMode) onSwitchMode('list');
            } catch (err) {
                alert('Lỗi: ' + err.message);
            }
        };

        const toggleProject = (pid) => {
            const current = formData.assignedProjects;
            const newProjects = current.includes(pid)
                ? current.filter(id => id !== pid)
                : [...current, pid];
            setFormData({ ...formData, assignedProjects: newProjects });
        };

        return (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200 anime-fade-in">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialUser ? 'Cập nhật Người dùng' : 'Tạo Người dùng Mới'}
                    </h3>
                    {onSwitchMode && (
                        <button onClick={() => onSwitchMode('list')} className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm bg-slate-50 px-3 py-1.5 rounded-full transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Quay lại
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                                <input
                                    required disabled={!!initialUser}
                                    className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Viết liền không dấu"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Vai trò</label>
                                <select
                                    className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value, assignedProjects: [] })}
                                >
                                    {availableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Phân quyền Dự án</label>
                        <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white p-2 border border-slate-200 rounded">
                            {availableProjects.length === 0 && <span className="text-slate-400 italic p-2 block text-center col-span-full">Không có dự án khả dụng</span>}
                            {availableProjects.map(p => (
                                <label key={p.id} className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-100">
                                    <input
                                        type="checkbox"
                                        checked={formData.assignedProjects.includes(p.id)}
                                        onChange={() => toggleProject(p.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm text-slate-700">{p.name}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic">Chọn các dự án mà người dùng này được phép truy cập.</p>
                    </div>

                    {formData.role === 'technician' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Bộ phận / Tổ đội (Tùy chọn)</label>
                            <input
                                className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-blue-500"
                                value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                                placeholder="VD: Đội xe số 1..."
                            />
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                        {onSwitchMode && (
                            <button type="button" onClick={() => onSwitchMode('list')} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                                Hủy bỏ
                            </button>
                        )}
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all active:scale-95">
                            <Save className="w-4 h-4" />
                            {initialUser ? 'Lưu thay đổi' : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // --- LIST COMPONENT ---
    const UserList = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-slate-800 text-lg">Danh sách nhân sự</h2>
                    <p className="text-xs text-slate-500 mt-1">Quản lý quyền truy cập hệ thống</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">
                    {visibleUsers.length} tài khoản
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-4">Username</th>
                            <th className="p-4">Họ và tên</th>
                            <th className="p-4">Vai trò</th>
                            <th className="p-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {visibleUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 font-medium text-slate-900">{u.username}</td>
                                <td className="p-4">
                                    <div className="text-slate-800">{u.name}</div>
                                    {u.department && <div className="text-xs text-slate-400 mt-0.5">{u.department}</div>}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${u.role.includes('admin') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        u.role === 'site_manager' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {ROLES.find(r => r.id === u.role)?.label || u.role}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onSwitchMode && onSwitchMode('form', u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Sửa">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {u.username !== 'admin' && u.id !== currentUser.id && (
                                        <button onClick={async () => {
                                            if (window.confirm('Bạn có chắc chắn muốn xóa?')) await db.users.delete(u.id);
                                        }} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Xóa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {visibleUsers.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Không tìm thấy người dùng nào</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return viewMode === 'form' ? <UserForm /> : <UserList />;
};

export default UserManagement;
