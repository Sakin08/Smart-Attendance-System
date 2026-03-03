import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import MapPicker from '../components/MapPicker';
import Toast from '../components/Toast';
import QRCode from 'qrcode';

const tabs = [
    { label: 'Courses', path: '/teacher' },
    { label: 'Sessions', path: '/teacher/sessions' },
    { label: 'Create Course', path: '/teacher/create-course' },
    { label: 'Create Session', path: '/teacher/create-session' },
];

/* ─── Courses List ─────────────────────────────── */
function CoursesList() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [studentInput, setStudentInput] = useState('');
    const [toast, setToast] = useState(null);

    const fetchCourses = useCallback(() => {
        api.get('/courses')
            .then(res => setCourses(res.data.courses))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const handleAddStudents = async (courseId) => {
        const emails = studentInput.split(/[\n,]/).map(e => e.trim().toLowerCase()).filter(Boolean);
        if (emails.length === 0) return;

        const course = courses.find(c => c._id === courseId);
        const merged = [...new Set([...(course.students || []), ...emails])];

        try {
            await api.put(`/courses/${courseId}/students`, { students: merged });
            setToast({ message: `Added ${emails.length} student(s)`, type: 'success' });
            setStudentInput('');
            fetchCourses();
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed', type: 'error' });
        }
    };

    const handleRemoveStudent = async (courseId, email) => {
        const course = courses.find(c => c._id === courseId);
        const updated = course.students.filter(s => s !== email);
        try {
            await api.put(`/courses/${courseId}/students`, { students: updated });
            fetchCourses();
        } catch { }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <h3 className="text-lg font-semibold text-dark-100">My Courses</h3>

            {courses.length === 0 ? (
                <div className="glass-card p-8 text-center text-dark-500">
                    No courses yet. Create your first course to get started.
                </div>
            ) : (
                courses.map(course => (
                    <div key={course._id} className="glass-card p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="font-semibold text-dark-100 text-lg">{course.courseName}</h4>
                                <p className="text-sm text-dark-400 mt-1">
                                    {course.courseCode} · {course.department} · Season: {course.season}
                                </p>
                                <p className="text-xs text-dark-500 mt-1">{course.students?.length || 0} students enrolled</p>
                            </div>
                            <button
                                onClick={() => setSelectedCourse(selectedCourse === course._id ? null : course._id)}
                                className="btn btn-outline text-xs"
                            >
                                {selectedCourse === course._id ? 'Close' : 'Manage Students'}
                            </button>
                        </div>

                        {selectedCourse === course._id && (
                            <div className="mt-4 pt-4 border-t border-dark-700 space-y-3">
                                {/* Add students */}
                                <div>
                                    <label className="text-sm text-dark-300 mb-1 block">Add students (one email per line or comma-separated)</label>
                                    <textarea
                                        value={studentInput}
                                        onChange={(e) => setStudentInput(e.target.value)}
                                        placeholder="2021331001@student.sust.edu&#10;2021331002@student.sust.edu"
                                        rows={3}
                                        className="text-xs"
                                    />
                                    <button
                                        onClick={() => handleAddStudents(course._id)}
                                        className="btn btn-accent text-xs mt-2"
                                    >
                                        Add Students
                                    </button>
                                </div>

                                {/* Current students */}
                                {course.students?.length > 0 && (
                                    <div>
                                        <p className="text-sm text-dark-300 mb-2">Enrolled Students:</p>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {course.students.map(email => (
                                                <div key={email} className="flex items-center justify-between bg-dark-800/50 rounded-lg px-3 py-2">
                                                    <span className="text-sm text-dark-200">{email}</span>
                                                    <button
                                                        onClick={() => handleRemoveStudent(course._id, email)}
                                                        className="text-red-400 hover:text-red-300 text-xs"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

/* ─── Sessions List ────────────────────────────── */
function SessionsList() {
    const [courses, setCourses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);
    const [sheet, setSheet] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/courses').then(res => {
            setCourses(res.data.courses);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            api.get(`/attendance-sessions/teacher?courseId=${selectedCourse}`)
                .then(res => setSessions(res.data.sessions))
                .catch(() => { });
        }
    }, [selectedCourse]);

    const viewSession = async (id) => {
        try {
            const res = await api.get(`/attendance-sessions/${id}`);
            setSelectedSession(res.data.session);
            setSheet(res.data.sheet);

            // Generate QR code
            const qrData = JSON.stringify({
                sessionId: res.data.session._id,
                qrToken: res.data.session.qrToken
            });
            const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } });
            setQrDataUrl(url);
        } catch { }
    };

    const handleExport = (sessionId, format) => {
        const token = localStorage.getItem('token');
        window.open(`/api/attendance-sessions/${sessionId}/export?format=${format}&token=${token}`, '_blank');
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-dark-100">Attendance Sessions</h3>

            <div>
                <label className="text-sm text-dark-300 mb-1 block">Select Course</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSession(null); setSheet(null); }}
                >
                    <option value="">Choose a course</option>
                    {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>
                    ))}
                </select>
            </div>

            {selectedCourse && sessions.length === 0 && (
                <p className="text-dark-500 text-center py-4">No sessions for this course yet.</p>
            )}

            {sessions.length > 0 && !selectedSession && (
                <div className="space-y-3">
                    {sessions.map(session => {
                        const now = new Date();
                        const isActive = new Date(session.startTime) <= now && new Date(session.endTime) >= now;
                        return (
                            <div
                                key={session._id}
                                className="bg-dark-800/50 rounded-xl p-4 border border-primary-500/10 cursor-pointer hover:border-primary-500/30 transition-all"
                                onClick={() => viewSession(session._id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-dark-200">
                                            {new Date(session.startTime).toLocaleDateString()} · {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs text-dark-400 mt-1">
                                            {session.attendances?.length || 0} students attended
                                        </p>
                                    </div>
                                    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                                        {isActive ? '● Active' : 'Ended'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedSession && sheet && (
                <div className="glass-card p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-dark-100">Session Details</h4>
                            <p className="text-sm text-dark-400">
                                {new Date(selectedSession.startTime).toLocaleString()} - {new Date(selectedSession.endTime).toLocaleTimeString()}
                            </p>
                        </div>
                        <button onClick={() => { setSelectedSession(null); setSheet(null); }} className="btn btn-outline text-xs">
                            ← Back
                        </button>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="bg-white rounded-xl p-4 flex-shrink-0 self-start">
                            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />}
                        </div>
                        <div className="flex-1 space-y-2 text-sm">
                            <InfoRow label="QR Token" value={selectedSession.qrToken} mono />
                            <InfoRow label="Location" value={`${selectedSession.location.lat}, ${selectedSession.location.lng}`} />
                            <InfoRow label="Radius" value={`${selectedSession.radiusMeters}m`} />
                            <InfoRow label="Attended" value={`${sheet.filter(s => s.status === 'Present').length} / ${sheet.length}`} />
                        </div>
                    </div>

                    {/* Export buttons */}
                    <div className="flex gap-3">
                        <button onClick={() => handleExport(selectedSession._id, 'csv')} className="btn btn-outline text-xs">
                            📄 Export CSV
                        </button>
                        <button onClick={() => handleExport(selectedSession._id, 'excel')} className="btn btn-outline text-xs">
                            📊 Export Excel
                        </button>
                    </div>

                    {/* Attendance table */}
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>SL</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Marked At</th>
                                    <th>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sheet.map((row, idx) => (
                                    <tr key={row.email}>
                                        <td>{idx + 1}</td>
                                        <td className="font-mono text-xs">{row.email}</td>
                                        <td>
                                            <span className={`badge ${row.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="text-xs text-dark-400">{row.markedAt ? new Date(row.markedAt).toLocaleString() : '-'}</td>
                                        <td className="text-xs text-dark-400">
                                            {row.lat && row.lng ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Create Course ────────────────────────────── */
function CreateCourse() {
    const [form, setForm] = useState({ department: '', season: '', courseName: '', courseCode: '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // All SUST departments organized by faculty
    const departmentsByFaculty = {
        'Engineering': [
            'CSE',
            'EEE',
            'Mechanical Engineering',
            'Civil Engineering',
            'Chemical Engineering',
            'IPE',
            'PME',
            'Food Engineering',
            'Architecture',
            'Software Engineering'
        ],
        'Physical Sciences': [
            'Physics',
            'Chemistry',
            'Statistics',
            'Oceanography',
            'Geography and Environmental Studies'
        ],
        'Life Sciences': [
            'Bio-Chemistry and Molecular Biology',
            'Genetic Engineering and Biotechnology',
            'Forestry and Environmental Science'
        ],
        'Business & Social Sciences': [
            'Business Administration',
            'Economics',
            'Anthropology',
            'Political Studies',
            'Public Administration',
            'Social Work',
            'Sociology'
        ],
        'Arts & Humanities': [
            'English',
            'Bangla'
        ],
        'Mathematical Sciences': [
            'Mathematics'
        ]
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/courses', form);
            setToast({ message: 'Course created successfully!', type: 'success' });
            setForm({ department: '', season: '', courseName: '', courseCode: '' });
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">Create New Course</h3>
                <p className="text-sm text-dark-400 mb-4">
                    Select from all SUST departments organized by faculty
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Department</label>
                        <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                            <option value="">Select department</option>
                            {Object.entries(departmentsByFaculty).map(([faculty, depts]) => (
                                <optgroup key={faculty} label={faculty}>
                                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                                </optgroup>
                            ))}
                        </select>
                        <p className="text-xs text-dark-500 mt-1">
                            {Object.values(departmentsByFaculty).flat().length} departments across {Object.keys(departmentsByFaculty).length} faculties
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Season (Batch)</label>
                        <input
                            value={form.season}
                            onChange={(e) => setForm({ ...form, season: e.target.value })}
                            placeholder="e.g., 2021"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Course Name</label>
                        <input
                            value={form.courseName}
                            onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                            placeholder="e.g., Software Engineering"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Course Code</label>
                        <input
                            value={form.courseCode}
                            onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                            placeholder="e.g., CSE-331"
                            required
                        />
                    </div>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? 'Creating...' : 'Create Course'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* ─── Create Session ───────────────────────────── */
function CreateSession() {
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({
        courseId: '',
        startTime: '',
        endTime: '',
        lat: 24.9128,
        lng: 91.8315,
        radiusMeters: 100
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [createdSession, setCreatedSession] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        api.get('/courses').then(res => setCourses(res.data.courses)).catch(() => { });
    }, []);

    const handleLocationChange = ({ lat, lng }) => {
        setForm(f => ({ ...f, lat, lng }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.post('/attendance-sessions', form);
            setCreatedSession(res.data.session);

            // Generate QR
            const qrData = JSON.stringify({
                sessionId: res.data.session._id,
                qrToken: res.data.session.qrToken
            });
            const url = await QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } });
            setQrDataUrl(url);

            setToast({ message: 'Session created! Show the QR code to students.', type: 'success' });
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Default times: now and +1 hour
    useEffect(() => {
        const now = new Date();
        const later = new Date(now.getTime() + 60 * 60 * 1000);
        const toLocal = (d) => {
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
        };
        setForm(f => ({ ...f, startTime: toLocal(now), endTime: toLocal(later) }));
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {!createdSession ? (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-dark-100 mb-4">Create Attendance Session</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1">Course</label>
                            <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
                                <option value="">Select course</option>
                                {courses.map(c => <option key={c._id} value={c._id}>{c.courseName} ({c.courseCode})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Start Time</label>
                                <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">End Time</label>
                                <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-1">Radius (meters)</label>
                            <input
                                type="number"
                                value={form.radiusMeters}
                                onChange={(e) => setForm({ ...form, radiusMeters: parseInt(e.target.value) || 100 })}
                                min="10"
                                max="5000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Session Location (click on map)</label>
                            <MapPicker
                                lat={form.lat}
                                lng={form.lng}
                                radius={form.radiusMeters}
                                onLocationChange={handleLocationChange}
                            />
                        </div>

                        <button type="submit" disabled={saving} className="btn btn-primary">
                            {saving ? 'Creating...' : 'Create Session & Generate QR'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="glass-card p-6 text-center space-y-6">
                    <div>
                        <h3 className="text-xl font-bold gradient-text mb-2">Session Created!</h3>
                        <p className="text-dark-400">Show this QR code to your students for attendance</p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 inline-block shadow-2xl shadow-primary-500/20">
                        {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-72 h-72" />}
                    </div>

                    <div className="text-sm text-dark-400 space-y-1">
                        <p>Session: {new Date(createdSession.startTime).toLocaleString()} - {new Date(createdSession.endTime).toLocaleTimeString()}</p>
                        <p className="font-mono text-xs">Token: {createdSession.qrToken}</p>
                    </div>

                    <button onClick={() => { setCreatedSession(null); setQrDataUrl(''); }} className="btn btn-outline">
                        Create Another Session
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Helpers ──────────────────────────────────── */
function InfoRow({ label, value, mono }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-dark-500 w-20 flex-shrink-0">{label}:</span>
            <span className={`text-dark-200 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        </div>
    );
}

function Loader() {
    return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

/* ─── Main Dashboard ───────────────────────────── */
export default function TeacherDashboard() {
    return (
        <div className="min-h-screen bg-dark-900">
            <Navbar tabs={tabs} />
            <main className="max-w-6xl mx-auto px-4 py-6">
                <Routes>
                    <Route index element={<CoursesList />} />
                    <Route path="sessions" element={<SessionsList />} />
                    <Route path="create-course" element={<CreateCourse />} />
                    <Route path="create-session" element={<CreateSession />} />
                </Routes>
            </main>
        </div>
    );
}
