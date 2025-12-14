import Dexie from 'dexie';

export const db = new Dexie('TechnicalAssistantDB');

// Version 1
db.version(1).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, driverName, hours',
    settings: 'key, value'
});

// Version 2: Update logs table for Asset Code and ODO
db.version(2).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm', // Changed schema
    vehicles: '++id, plateNumber, model, currentHours, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    settings: 'key, value'
});

// Version 3: Add currentKm to vehicles
db.version(3).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, status', // Added department
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    settings: 'key, value'
});

// Version 4: Add maintenanceInterval to vehicles
db.version(4).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    settings: 'key, value'
});

// Version 5: Add users table for authentication and maintenanceSupplies table
db.version(5).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, name, department',
    settings: 'key, value'
});

// Version 6: Add projects table
db.version(6).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, projectId, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, role, name, department, assignedProjects',
    projects: '++id, name, code, startDate, endDate, status',
    settings: 'key, value'
});

// Version 7: Add maintenanceSupplies for parts management
db.version(7).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, projectId, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, name, department, assignedProjects',
    projects: '++id, name, code, startDate, endDate, status',
    maintenanceSupplies: '++id, assetCode, group, name, code, donaldsonCode, maintenanceInterval',
    settings: 'key, value'
});

// Version 8: Add reportSnapshots for historical data
db.version(8).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, projectId, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, name, department, assignedProjects',
    projects: '++id, name, code, startDate, endDate, status',
    maintenanceSupplies: '++id, assetCode, group, name, code, donaldsonCode, maintenanceInterval',
    reportSnapshots: '++id, date, stats', // date usually 'YYYY-MM-DD'
    settings: 'key, value'
});

// Version 9: Add chatHistory for AI Assistant
db.version(9).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, projectId, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, name, department, assignedProjects',
    projects: '++id, name, code, startDate, endDate, status',
    maintenanceSupplies: '++id, assetCode, group, name, code, donaldsonCode, maintenanceInterval',
    reportSnapshots: '++id, date, stats',
    chatHistory: '++id, sessionId, role, content, timestamp',
    chatHistory: '++id, sessionId, role, content, timestamp',
    settings: 'key, value'
});

// Version 10: Migrate admin user data for demo purposes (Show Assigned Projects)
db.version(10).stores({
    errorCodes: '++id, code, description',
    parts: '++id, partNumber, name',
    logs: '++id, date, assetCode, odoHours, odoKm',
    vehicles: '++id, plateNumber, model, department, currentHours, currentKm, nextMaintenanceHours, nextMaintenanceKm, maintenanceInterval, projectId, status',
    maintenanceLogs: '++id, vehicleId, date, type, cost',
    users: '++id, username, role, name, department, assignedProjects',
    projects: '++id, name, code, startDate, endDate, status',
    maintenanceSupplies: '++id, assetCode, group, name, code, donaldsonCode, maintenanceInterval',
    reportSnapshots: '++id, date, stats',
    chatHistory: '++id, sessionId, role, content, timestamp',
    settings: 'key, value'
}).upgrade(async tx => {
    // Add sample projects to admin user to demonstrate the UI
    const admin = await tx.table('users').where('username').equals('admin').first();
    if (admin) {
        await tx.table('users').update(admin.id, {
            assignedProjects: ['Dự án 11', 'Dự án 12', 'Dự án 13', 'Dự án 14', 'Dự án 15'],
            name: 'Đỗ Thái Sơn' // Update name to match user screenshot preference if generic
        });
    }
});

// Seed initial data if empty
db.on('populate', async () => {
    await db.errorCodes.bulkAdd([
        { code: 'E001', description: 'Cảm biến nhiệt độ nước làm mát quá cao. Kiểm tra két nước và quạt làm mát.', fixSteps: '1. Kiểm tra mức nước làm mát.\n2. Kiểm tra quạt gió.\n3. Thay thế cảm biến nếu cần.' },
        { code: 'P0300', description: 'Phát hiện bỏ máy ngẫu nhiên. Kiểm tra bugi, mobin đánh lửa.', fixSteps: '1. Tháo và kiểm tra bugi.\n2. Kiểm tra áp suất nén.' },
        { code: 'C1201', description: 'Lỗi hệ thống kiểm soát phanh. Kiểm tra cảm biến ABS.', fixSteps: '1. Kiểm tra dây dẫn cảm biến ABS.\n2. Vệ sinh mắt đọc.' }
    ]);

    await db.parts.bulkAdd([
        { partNumber: 'LF9009', name: 'Lọc nhớt Fleetguard', equivalents: 'B7085, P553000' },
        { partNumber: 'FF5488', name: 'Lọc nhiên liệu', equivalents: 'P550881' },
        { partNumber: 'AH1103', name: 'Lọc gió động cơ', equivalents: 'SAKURA A-5503' }
    ]);

    // Add default users
    await db.users.bulkAdd([
        { username: 'admin', password: 'admin123', role: 'admin', name: 'Quản trị viên', department: null },
        { username: 'nvkt1', password: '123456', role: 'technician', name: 'Nguyễn Văn A', department: 'Thi công xây dựng-Cổ Loa' },
        { username: 'nvkt2', password: '123456', role: 'technician', name: 'Trần Văn B', department: 'Vận chuyển' },
    ]);

    // Add sample projects
    await db.projects.bulkAdd([
        { name: 'Dự án Cổ Loa', code: 'DA-CL-001', startDate: '2024-01-01', endDate: '2024-12-31', status: 'active' },
        { name: 'Dự án Hà Đông', code: 'DA-HD-002', startDate: '2024-06-01', endDate: '2025-05-31', status: 'active' },
        { name: 'Dự án Hoàn Kiếm', code: 'DA-HK-003', startDate: '2023-12-01', endDate: '2024-11-30', status: 'completed' },
    ]);
});
