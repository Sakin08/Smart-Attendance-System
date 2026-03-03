import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import api from '../api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

const tabs = [
    { label: 'Overview', path: '/admin' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Courses', path: '/admin/courses' },
    { label: 'Reports', path: '/admin/reports' },
];

/* ─── Overview ─────────────────────────────────── */
function Overview() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/stats')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    const cards = [
        { label: 'Students', value: stats?.totalStudents || 0, icon: '🎓', color: 'from-primary-500 to-blue-500' },
        { label: 'Teachers', value: stats?.totalTeachers || 0, icon: '👨‍🏫', color: 'from-accent-500 to-emerald-500' },
        { label: 'Courses', value: stats?.totalCourses || 0, icon: '📚', color: 'from-amber-500 to-orange-500' },
        { label: 'Sessions', value: stats?.totalSessions || 0, icon: '📋', color: 'from-pink-500 to-rose-500' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-dark-100">Admin Overview</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.label} className="glass-card p-5 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-full`}></div>
                        <p className="text-3xl mb-1">{card.icon}</p>
                        <p className="text-2xl font-bold text-dark-100">{card.value}</p>
                        <p className="text-sm text-dark-400">{card.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Users Management ─────────────────────────── */
function UsersPage() {
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const fetchUsers = () => {
        setLoading(true);
        const url = roleFilter ? `/admin/users?role=${roleFilter}` : '/admin/users';
        api.get(url)
            .then(res => setUsers(res.data.users))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, [roleFilter]);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete user "${name}"?`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setToast({ message: 'User deleted', type: 'success' });
            fetchUsers();
        } catch { setToast({ message: 'Failed to delete', type: 'error' }); }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole });
            setToast({ message: 'Role updated', type: 'success' });
            fetchUsers();
        } catch { setToast({ message: 'Failed to update role', type: 'error' }); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark-100">User Management</h3>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-40"
                >
                    <option value="">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {loading ? <Loader /> : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Batch</th>
                                    <th>Department</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td className="font-medium text-dark-200">{user.name}</td>
                                        <td className="font-mono text-xs">{user.email}</td>
                                        <td>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                className="text-xs py-1 px-2 w-24"
                                            >
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="text-dark-400">{user.batch || '-'}</td>
                                        <td className="text-dark-400 text-xs">{user.department || '-'}</td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(user._id, user.name)}
                                                className="text-red-400 hover:text-red-300 text-xs font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {users.length === 0 && (
                        <p className="text-center text-dark-500 py-8">No users found</p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Courses Management ───────────────────────── */
function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const fetchCourses = () => {
        setLoading(true);
        api.get('/admin/courses')
            .then(res => setCourses(res.data.courses))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchCourses(); }, []);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete course "${name}" and all its sessions?`)) return;
        try {
            await api.delete(`/admin/courses/${id}`);
            setToast({ message: 'Course deleted', type: 'success' });
            fetchCourses();
        } catch { setToast({ message: 'Failed to delete', type: 'error' }); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <h3 className="text-lg font-semibold text-dark-100">Course Management</h3>

            {loading ? <Loader /> : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Code</th>
                                    <th>Department</th>
                                    <th>Season</th>
                                    <th>Teacher</th>
                                    <th>Students</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map(course => (
                                    <tr key={course._id}>
                                        <td className="font-medium text-dark-200">{course.courseName}</td>
                                        <td className="font-mono text-xs">{course.courseCode}</td>
                                        <td className="text-dark-400 text-xs">{course.department}</td>
                                        <td className="text-dark-400">{course.season}</td>
                                        <td className="text-dark-400 text-xs">{course.teacherId?.name || '-'}</td>
                                        <td>{course.students?.length || 0}</td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(course._id, course.courseName)}
                                                className="text-red-400 hover:text-red-300 text-xs font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {courses.length === 0 && (
                        <p className="text-center text-dark-500 py-8">No courses found</p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Reports ──────────────────────────────────── */
function ReportsPage() {
    const [report, setReport] = useState([]);
    const [filters, setFilters] = useState({ department: '', season: '' });
    const [loading, setLoading] = useState(true);

    const fetchReport = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.department) params.append('department', filters.department);
        if (filters.season) params.append('season', filters.season);

        api.get(`/admin/reports?${params}`)
            .then(res => setReport(res.data.report))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchReport(); }, [filters]);

    const handleExport = (format) => {
        const params = new URLSearchParams();
        if (filters.department) params.append('department', filters.department);
        if (filters.season) params.append('season', filters.season);
        params.append('format', format);
        window.open(`/api/admin/reports/export?${params}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-dark-100">Attendance Reports</h3>
                <div className="flex gap-3">
                    <button onClick={() => handleExport('csv')} className="btn btn-outline text-xs">📄 Export CSV</button>
                    <button onClick={() => handleExport('excel')} className="btn btn-outline text-xs">📊 Export Excel</button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <input
                    placeholder="Filter by department"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="w-64"
                />
                <input
                    placeholder="Filter by season"
                    value={filters.season}
                    onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                    className="w-40"
                />
            </div>

            {loading ? <Loader /> : report.length === 0 ? (
                <div className="glass-card p-8 text-center text-dark-500">No report data found</div>
            ) : (
                report.map(item => (
                    <div key={item.course._id} className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-semibold text-dark-100">{item.course.courseName} ({item.course.courseCode})</h4>
                                <p className="text-xs text-dark-400">
                                    {item.course.department} · Season: {item.course.season} · Teacher: {item.course.teacher?.name || '-'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-dark-400">{item.totalSessions} sessions</p>
                                <p className="text-sm text-dark-400">{item.enrolledStudents} students</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>SL</th>
                                        <th>Student Email</th>
                                        <th>Present</th>
                                        <th>Total</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.students.map((s, idx) => (
                                        <tr key={s.email}>
                                            <td>{idx + 1}</td>
                                            <td className="font-mono text-xs">{s.email}</td>
                                            <td>{s.present}</td>
                                            <td>{s.total}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-dark-800 rounded-full">
                                                        <div
                                                            className={`h-full rounded-full ${s.percentage >= 75 ? 'bg-accent-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${s.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-medium">{s.percentage}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

/* ─── Helpers ──────────────────────────────────── */
function Loader() {
    return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

/* ─── Main Dashboard ───────────────────────────── */
export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar tabs={tabs} />
            <main className="max-w-7xl mx-auto px-4 py-6">
                <Routes>
                    <Route index element={<Overview />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="courses" element={<CoursesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Routes>
            </main>
        </div>
    );
}
