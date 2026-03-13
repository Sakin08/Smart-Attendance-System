import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import QRScanner from '../components/QRScanner';
import Toast from '../components/Toast';
import LocationStatus from '../components/LocationStatus';
import { toBDTime, toBDDate, toBDTimeOnly } from '../utils/timeUtils';

const tabs = [
    { label: 'Dashboard', path: '/student' },
    { label: 'Scan QR', path: '/student/scan' },
    { label: 'Attendance', path: '/student/attendance' },
    { label: 'Profile', path: '/student/profile' },
];

function DashboardHome() {
    const { user, refreshUser } = useAuth();
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        api.get('/attendance-sessions/active')
            .then(res => setActiveSessions(res.data.sessions))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshUser();
        } catch (error) {
            console.error('Refresh failed:', error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold text-dark-100">
                        Welcome back, <span className="gradient-text">{user.name}</span>
                    </h2>
                    {!user.department && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="text-xs px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
                            title="Refresh profile data"
                        >
                            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                    <span>📧 {user.email}</span>
                    {user.registrationNumber && <span>🎓 Reg: {user.registrationNumber}</span>}
                    {user.department && <span>🏢 {user.department}</span>}
                    {user.batch && <span>📅 Batch: {user.batch}</span>}
                    {user.rollNumber && <span>🔢 Roll: {user.rollNumber}</span>}
                </div>
            </div>

            {/* Active Sessions */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft"></div>
                    Active Sessions
                </h3>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : activeSessions.length === 0 ? (
                    <p className="text-dark-500 text-center py-8">No active attendance sessions right now</p>
                ) : (
                    <div className="space-y-3">
                        {activeSessions.map(session => (
                            <div key={session._id} className="bg-dark-800/50 rounded-xl p-4 border border-primary-500/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-dark-100">
                                            {session.course?.courseName} ({session.course?.courseCode})
                                        </p>
                                        <p className="text-xs text-dark-400 mt-1">
                                            {toBDTimeOnly(session.startTime)} - {toBDTimeOnly(session.endTime)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <LocationStatus session={session} compact={true} />
                                        {session.alreadyMarked ? (
                                            <span className="badge badge-present">✓ Marked</span>
                                        ) : (
                                            <span className="badge badge-active">● Active</span>
                                        )}
                                    </div>
                                </div>
                                {session.location && (
                                    <div className="text-xs text-dark-500 bg-dark-900/30 rounded-lg p-2">
                                        📍 Location verification required - be within {session.radiusMeters}m of classroom
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ScanQR() {
    const { user } = useAuth();
    const [toast, setToast] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const handleScan = async (data, studentLocation) => {
        if (submitting) return;
        setSubmitting(true);
        setResult(null);

        try {
            // Parse QR data: expected format is JSON { sessionId, qrToken }
            let parsed;
            try {
                parsed = JSON.parse(data);
            } catch {
                setToast({ message: 'Invalid QR code format', type: 'error' });
                setSubmitting(false);
                return;
            }

            // Submit attendance with location
            const res = await api.post('/attendance/mark', {
                sessionId: parsed.sessionId,
                qrToken: parsed.qrToken,
                lat: studentLocation.lat,
                lng: studentLocation.lng
            });

            setResult({ success: true, message: res.data.message });
            setToast({ message: 'Attendance marked successfully! ✓', type: 'success' });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to mark attendance';
            const distance = err.response?.data?.distance;
            const radiusMeters = err.response?.data?.radiusMeters;

            setResult({
                success: false,
                message: msg,
                distance,
                radiusMeters
            });
            setToast({ message: msg, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Scan QR Code</h3>
                <p className="text-dark-400 text-sm mb-4">
                    Point your camera at the QR code shown by your teacher. Your location will be verified to ensure you're in the classroom.
                </p>
                <QRScanner onScan={handleScan} />
            </div>

            {submitting && (
                <div className="glass-card p-6 text-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-dark-400">Verifying attendance...</p>
                </div>
            )}

            {result && (
                <div className={`glass-card p-6 border ${result.success ? 'border-accent-500/30' : 'border-red-500/30'}`}>
                    <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${result.success ? 'bg-accent-500/15' : 'bg-red-500/15'
                            }`}>
                            {result.success ? (
                                <svg className="w-8 h-8 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <p className={`font-semibold ${result.success ? 'text-accent-400' : 'text-red-400'}`}>
                            {result.message}
                        </p>
                        {result.distance && result.radiusMeters && (
                            <p className="text-sm text-dark-400 mt-2">
                                You are {result.distance}m away (max {result.radiusMeters}m allowed)
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function AttendanceHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/attendance-sessions/history')
            .then(res => setHistory(res.data.history))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-dark-100">My Attendance Records</h3>

            {history.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <p className="text-dark-500">No attendance records found. You may not be enrolled in any courses yet.</p>
                </div>
            ) : (
                history.map(item => (
                    <div key={item.course._id} className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-semibold text-dark-100">{item.course.courseName}</h4>
                                <p className="text-xs text-dark-400">{item.course.courseCode} · {item.course.department} · {item.course.season}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold gradient-text">{item.percentage}%</p>
                                <p className="text-xs text-dark-400">{item.presentCount}/{item.totalSessions} sessions</p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-dark-800 rounded-full mb-4">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                                style={{ width: `${item.percentage}%` }}
                            ></div>
                        </div>

                        {item.sessions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>SL</th>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Marked At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.sessions.map((s, idx) => (
                                            <tr key={s.sessionId}>
                                                <td>{idx + 1}</td>
                                                <td>{toBDDate(s.startTime)}</td>
                                                <td>{toBDTimeOnly(s.startTime)}</td>
                                                <td>
                                                    <span className={`badge ${s.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="text-dark-400 text-xs">
                                                    {s.markedAt ? toBDTime(s.markedAt) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-dark-500 text-sm">No sessions yet</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

function Profile() {
    const { user, updateUser } = useAuth();
    const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/student/profile', form);
            updateUser(res.data.user);
            setToast({ message: 'Profile updated successfully', type: 'success' });
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed to update', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">My Profile</h3>

                {/* Read-only info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-dark-800/50 rounded-xl p-3">
                        <p className="text-xs text-dark-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-dark-200 break-all">{user.email}</p>
                    </div>
                    {user.registrationNumber && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Registration Number</p>
                            <p className="text-sm font-medium text-dark-200">{user.registrationNumber}</p>
                        </div>
                    )}
                    {user.department && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Department</p>
                            <p className="text-sm font-medium text-dark-200">{user.department}</p>
                        </div>
                    )}
                    {user.departmentCode && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Department Code</p>
                            <p className="text-sm font-medium text-dark-200">{user.departmentCode}</p>
                        </div>
                    )}
                    {user.batch && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Batch</p>
                            <p className="text-sm font-medium text-dark-200">{user.batch}</p>
                        </div>
                    )}
                    {user.year && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Admission Year</p>
                            <p className="text-sm font-medium text-dark-200">{user.year}</p>
                        </div>
                    )}
                    {user.rollNumber && (
                        <div className="bg-dark-800/50 rounded-xl p-3">
                            <p className="text-xs text-dark-500 mb-1">Roll Number</p>
                            <p className="text-sm font-medium text-dark-200">{user.rollNumber}</p>
                        </div>
                    )}
                </div>

                {/* Editable fields */}
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Phone Number</label>
                        <input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+880 1XXX-XXXXXX"
                        />
                    </div>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? 'Saving...' : 'Update Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function StudentDashboard() {
    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar tabs={tabs} />
            <main className="max-w-5xl mx-auto px-4 py-8">
                <Routes>
                    <Route index element={<DashboardHome />} />
                    <Route path="scan" element={<ScanQR />} />
                    <Route path="attendance" element={<AttendanceHistory />} />
                    <Route path="profile" element={<Profile />} />
                </Routes>
            </main>
        </div>
    );
}
