import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, Edit2, Trash2, X, Save, FolderPlus, Circle, CheckCircle, Upload, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';

const ProjectManagement = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        startDate: '',
        endDate: '',
        status: 'active'
    });
    const fileInputRef = useRef(null);

    // Fetch all projects
    const projects = useLiveQuery(() => db.projects.toArray()) || [];

    // Fetch vehicles to count assignments
    const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];

    const getVehicleCount = (projectId, projectName) => {
        // Try to match by projectId first, then by project name in vehicle data
        const byId = vehicles.filter(v => v.projectId === projectId).length;
        if (byId > 0) {
            console.log(`Project ${projectName} (ID: ${projectId}): ${byId} vehicles by ID`);
            return byId;
        }

        // Fallback: count from all vehicles that might have this project in data
        // This is a workaround - in production, vehicles should have projectId set
        console.log(`Project ${projectName}: 0 vehicles (no projectId linkage)`);
        return 0;
    };

    const getVehicleList = (projectId, projectName) => {
        const byId = vehicles.filter(v => v.projectId === projectId);
        if (byId.length > 0) return byId;

        // Fallback: empty for now
        return [];
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Count vehicles per project
            const projectVehicleCount = new Map();

            for (const row of jsonData) {
                const projectName = row['Dự Án'] || row['Dự án'] || row['Project'];
                const vehicleCode = row['Mã Tài sản'] || row['Mã tài sản'] || row['plateNumber'];

                if (projectName && projectName.trim() && vehicleCode) {
                    const trimmedName = projectName.trim();
                    if (!projectVehicleCount.has(trimmedName)) {
                        projectVehicleCount.set(trimmedName, []);
                    }
                    projectVehicleCount.get(trimmedName).push(vehicleCode);
                }
            }

            let importedCount = 0;
            let existingCount = 0;

            // Get existing projects
            const existingProjects = await db.projects.toArray();
            const existingProjectNames = new Map(existingProjects.map(p => [p.name, p]));

            // Create projects with vehicle count
            const projectStats = [];

            for (const [projectName, vehicles] of projectVehicleCount.entries()) {
                const vehicleCount = vehicles.length;
                const existingProject = existingProjectNames.get(projectName);

                if (existingProject) {
                    existingCount++;
                    projectStats.push(`${projectName}: ${vehicleCount} mã (đã tồn tại)`);
                } else {
                    // Add new project
                    const projectCode = `DA-${projectName.substring(0, 2).toUpperCase()}-${String(existingProjects.length + importedCount + 1).padStart(3, '0')}`;
                    await db.projects.add({
                        name: projectName,
                        code: projectCode,
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'active'
                    });
                    importedCount++;
                    projectStats.push(`${projectName}: ${vehicleCount} mã (mới tạo)`);
                }
            }

            // Show detailed statistics
            const statsMessage = `📊 Thống kê Import:\n\n${projectStats.join('\n')}\n\n✅ Dự án mới: ${importedCount}\n📦 Đã tồn tại: ${existingCount}\n🚛 Tổng mã tài sản: ${jsonData.length}`;

            alert(statsMessage);

            e.target.value = null; // Reset input
        } catch (error) {
            alert('Lỗi import: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingProject) {
                await db.projects.update(editingProject.id, formData);
                alert('Cập nhật dự án thành công!');
            } else {
                await db.projects.add(formData);
                alert('Thêm dự án thành công!');
            }

            resetForm();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        }
    };

    const handleEdit = (project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            code: project.code,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status
        });
        setShowAddForm(true);
    };

    const handleDelete = async (id) => {
        const vehicleCount = getVehicleCount(id);
        if (vehicleCount > 0) {
            alert(`Không thể xóa! Có ${vehicleCount} mã tài sản đang gán cho dự án này.`);
            return;
        }

        if (window.confirm('Bạn có chắc muốn xóa dự án này?')) {
            try {
                await db.projects.delete(id);
                alert('Xóa dự án thành công!');
            } catch (error) {
                alert('Lỗi: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            startDate: '',
            endDate: '',
            status: 'active'
        });
        setEditingProject(null);
        setShowAddForm(false);
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { color: 'bg-green-100 text-green-700', icon: Circle, label: 'Đang thực hiện' },
            completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Hoàn thành' },
            paused: { color: 'bg-yellow-100 text-yellow-700', icon: Circle, label: 'Tạm dừng' }
        };
        const badge = badges[status] || badges.active;
        const Icon = badge.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
            />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Quản lý Dự án</h2>
                    <p className="text-slate-500 mt-1">Theo dõi và quản lý các dự án</p>
                    {/* Debug info */}
                    <div className="text-xs text-slate-400 mt-1">
                        Tổng xe: {vehicles.length} | Xe có dự án: {vehicles.filter(v => v.projectId).length} | Dự án: {projects.length}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Upload className="w-5 h-5" />
                        Tải lên Excel
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <FolderPlus className="w-5 h-5" />
                        Thêm dự án
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
                        </h3>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên dự án *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                placeholder="Ví dụ: Dự án Cổ Loa"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Mã dự án *
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                placeholder="Ví dụ: DA-CL-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Ngày bắt đầu *
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Ngày kết thúc *
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Trạng thái *
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="active">Đang thực hiện</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="paused">Tạm dừng</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4" />
                                {editingProject ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(project => (
                    <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{project.code}</p>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(project)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Thời gian:</span>
                                <span className="font-medium text-slate-900">
                                    {new Date(project.startDate).toLocaleDateString('vi-VN')} - {new Date(project.endDate).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Trạng thái:</span>
                                {getStatusBadge(project.status)}
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-100">
                                <span className="text-slate-500">Số mã tài sản:</span>
                                <span className="font-bold text-blue-600">{getVehicleCount(project.id, project.name)} mã</span>
                            </div>

                            {/* Vehicle List */}
                            {getVehicleCount(project.id, project.name) > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-500 mb-2">Chi tiết mã tài sản:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {getVehicleList(project.id, project.name).map(vehicle => (
                                            <span key={vehicle.id} className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                                                <Truck className="w-3 h-3 mr-1" />
                                                {vehicle.plateNumber}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {projects.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <FolderPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">Chưa có dự án nào</p>
                </div>
            )}
        </div>
    );
};

export default ProjectManagement;
