import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import LocationCapture from '../components/LocationCapture';
import QRCode from 'qrcode';
import { toBDTime, toBDDate, toBDTimeOnly, getBDDateTimeLocal, bdDateTimeLocalToISO } from '../utils/timeUtils';

const tabs = [
    { label: 'Courses', path: '/teacher' },
    { label: 'Sessions', path: '/teacher/sessions' },
    { label: 'Attendance Report', path: '/teacher/attendance-report' },
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

    const handleDeleteCourse = async (courseId, courseName) => {
        if (!window.confirm(`Are you sure you want to delete "${courseName}"? This will also delete all associated attendance sessions.`)) {
            return;
        }

        try {
            await api.delete(`/courses/${courseId}`);
            setToast({ message: 'Course deleted successfully', type: 'success' });
            fetchCourses();
            setSelectedCourse(null);
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed to delete course', type: 'error' });
        }
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
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedCourse(selectedCourse === course._id ? null : course._id)}
                                    className="btn btn-outline text-xs"
                                >
                                    {selectedCourse === course._id ? 'Close' : 'Manage Students'}
                                </button>
                                <button
                                    onClick={() => handleDeleteCourse(course._id, course.courseName)}
                                    className="btn btn-outline text-xs text-red-400 hover:text-red-300 hover:border-red-400"
                                >
                                    Delete
                                </button>
                            </div>
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
    const [toast, setToast] = useState(null);

    useEffect(() => {
        api.get('/courses').then(res => {
            setCourses(res.data.courses);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const fetchSessions = useCallback(() => {
        if (selectedCourse) {
            api.get(`/attendance-sessions/teacher?courseId=${selectedCourse}`)
                .then(res => setSessions(res.data.sessions))
                .catch(() => { });
        }
    }, [selectedCourse]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

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

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/attendance-sessions/${sessionId}`);
            setToast({ message: 'Session deleted successfully', type: 'success' });
            fetchSessions();
            setSelectedSession(null);
            setSheet(null);
        } catch (err) {
            setToast({ message: err.response?.data?.message || 'Failed to delete session', type: 'error' });
        }
    };

    const handleExport = async (sessionId, format) => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const url = `${apiUrl}/attendance-sessions/${sessionId}/export?format=${format}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Export failed with status ${response.status}`);
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `attendance_${sessionId}.${format === 'excel' ? 'xlsx' : 'csv'}`;

            // Create blob and download
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export error:', error);
            alert(`Failed to export: ${error.message}`);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <h3 className="text-lg font-semibold text-dark-100">Attendance Sessions</h3>

            <div>
                <label className="text-sm text-dark-300 mb-1 block">Select Course</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSession(null); setSheet(null); }}
                >
                    <option value="">Choose a course</option>
                    {courses.map(c => (
                        <option key={c._id} value={c._id}>
                            {c.courseName} ({c.courseCode}) - {c.department} - {c.season}
                        </option>
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
                                            {toBDDate(session.startTime)} · {toBDTimeOnly(session.startTime)} - {toBDTimeOnly(session.endTime)}
                                            {session.batch && (
                                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">
                                                    Batch {session.batch}
                                                </span>
                                            )}
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
                                {toBDTime(selectedSession.startTime)} - {toBDTimeOnly(selectedSession.endTime)}
                                {selectedSession.batch && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">
                                        Batch {selectedSession.batch}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleDeleteSession(selectedSession._id)} className="btn btn-outline text-xs text-red-400 hover:text-red-300 hover:border-red-400">
                                Delete
                            </button>
                            <button onClick={() => { setSelectedSession(null); setSheet(null); }} className="btn btn-outline text-xs">
                                ← Back
                            </button>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="bg-white rounded-xl p-4 flex-shrink-0 self-start">
                            {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />}
                        </div>
                        <div className="flex-1 space-y-2 text-sm">
                            <InfoRow label="QR Token" value={selectedSession.qrToken} mono />
                            <InfoRow label="Attended" value={`${sheet.filter(s => s.status === 'Present').length} / ${sheet.length}`} />
                            <div className="text-xs text-dark-500 mt-2">
                                📍 Location verification is disabled
                            </div>
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
                                        <td className="text-xs text-dark-400">{row.markedAt ? toBDTime(row.markedAt) : '-'}</td>
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
        lat: null,
        lng: null,
        radiusMeters: 100
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [createdSession, setCreatedSession] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        api.get('/courses').then(res => setCourses(res.data.courses)).catch(() => { });
    }, []);

    const handleLocationChange = useCallback((location) => {
        setForm(f => ({
            ...f,
            lat: location?.lat || null,
            lng: location?.lng || null
        }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.lat || !form.lng) {
            setToast({ message: 'Location is required to create an attendance session', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const sessionData = {
                courseId: form.courseId,
                batch: '',
                startTime: bdDateTimeLocalToISO(form.startTime),
                endTime: bdDateTimeLocalToISO(form.endTime),
                lat: form.lat,
                lng: form.lng,
                radiusMeters: form.radiusMeters
            };

            const res = await api.post('/attendance-sessions', sessionData);
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

    // Default times: now and +1 hour in BD timezone
    useEffect(() => {
        const now = new Date();
        const later = new Date(now.getTime() + 8 * 60 * 1000); // 8 minutes
        setForm(f => ({
            ...f,
            startTime: getBDDateTimeLocal(now),
            endTime: getBDDateTimeLocal(later)
        }));
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
                            <select
                                value={form.courseId}
                                onChange={(e) => setForm({ ...form, courseId: e.target.value, batch: '' })}
                                required
                            >
                                <option value="">Select course</option>
                                {courses.map(c => (
                                    <option key={c._id} value={c._id}>
                                        {c.courseName} ({c.courseCode}) - {c.department} - {c.season}
                                    </option>
                                ))}
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

                        {/* Location Capture */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Classroom Location</label>
                            <LocationCapture onLocationChange={handleLocationChange} required={true} />
                        </div>

                        {/* Radius Selector */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">Attendance Zone Radius</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {[50, 100, 200, 500].map((radius) => (
                                    <button
                                        key={radius}
                                        type="button"
                                        onClick={() => setForm({ ...form, radiusMeters: radius })}
                                        className={`p-2 text-sm rounded-lg border transition-colors ${form.radiusMeters === radius
                                            ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                            : 'bg-dark-800/50 border-dark-600 text-dark-400 hover:border-dark-500'
                                            }`}
                                    >
                                        {radius}m
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-dark-500">
                                Students must be within {form.radiusMeters}m of your current location to mark attendance
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !form.lat || !form.lng}
                            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Creating...' :
                                !form.lat || !form.lng ? '⚠️ Location Required' :
                                    'Create Session & Generate QR'}
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
                        <p>Session: {toBDTime(createdSession.startTime)} - {toBDTimeOnly(createdSession.endTime)}</p>
                        <p>📍 Attendance zone: {createdSession.radiusMeters}m radius</p>
                        <p className="font-mono text-xs">Token: {createdSession.qrToken}</p>
                    </div>

                    <button onClick={() => {
                        setCreatedSession(null);
                        setQrDataUrl('');
                    }} className="btn btn-outline">
                        Create Another Session
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Comprehensive Attendance Report ─────────────────────────────────── */
function CourseAttendanceReport() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        api.get('/courses')
            .then(res => {
                setCourses(res.data.courses);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            setLoading(true);
            api.get(`/courses/${selectedCourse}/attendance-report`)
                .then(res => {
                    setReport(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            setReport(null);
        }
    }, [selectedCourse]);

    const handleExport = async (format) => {
        if (!selectedCourse) return;
        setExporting(true);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const url = `${apiUrl}/courses/${selectedCourse}/attendance-report/export?format=${format}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Export failed with status ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `course_attendance_report.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export error:', error);
            alert(`Failed to export report: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    if (loading && courses.length === 0) return <Loader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark-100">Course Attendance Report</h3>
                {selectedCourse && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                            className="btn btn-outline text-xs"
                        >
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                        <button
                            onClick={() => handleExport('excel')}
                            disabled={exporting}
                            className="btn btn-primary text-xs"
                        >
                            {exporting ? 'Exporting...' : 'Export Excel'}
                        </button>
                    </div>
                )}
            </div>

            {/* Course Selection */}
            <div className="glass-card p-4">
                <label className="block text-sm text-dark-300 mb-2">Select Course</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full"
                >
                    <option value="">Choose a course</option>
                    {courses.map(c => (
                        <option key={c._id} value={c._id}>
                            {c.courseName} ({c.courseCode}) - {c.department} - {c.season}
                        </option>
                    ))}
                </select>
            </div>

            {/* Report */}
            {!selectedCourse ? (
                <div className="glass-card p-8 text-center text-dark-500">
                    Select a course to view attendance report
                </div>
            ) : loading ? (
                <Loader />
            ) : !report || report.report.length === 0 ? (
                <div className="glass-card p-8 text-center text-dark-500">
                    No students enrolled in this course
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Course Info */}
                    <div className="glass-card p-4">
                        <h4 className="font-semibold text-dark-100 text-lg">{report.course.courseName}</h4>
                        <p className="text-sm text-dark-400 mt-1">
                            {report.course.courseCode} · {report.course.department} · {report.course.season}
                        </p>
                        <p className="text-xs text-dark-500 mt-2">
                            Total Sessions: {report.sessions.length} · Total Students: {report.report.length}
                        </p>
                    </div>

                    {/* Student Cards */}
                    {report.report.map((student) => (
                        <div key={student.email} className="glass-card p-6">
                            {/* Student Info */}
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-dark-700">
                                <div>
                                    <h4 className="font-semibold text-dark-100 text-lg">{student.name}</h4>
                                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-dark-400">
                                        <span>📝 {student.registrationNumber}</span>
                                        <span>🏢 {student.department}</span>
                                        <span>📅 Batch: {student.batch}</span>
                                        <span>📧 {student.email}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold gradient-text">{student.percentage}%</p>
                                    <p className="text-xs text-dark-400 mt-1">Attendance</p>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-dark-800/50 rounded-lg p-3">
                                    <p className="text-xs text-dark-500">Total Sessions</p>
                                    <p className="text-xl font-bold text-dark-200">{student.totalSessions}</p>
                                </div>
                                <div className="bg-dark-800/50 rounded-lg p-3">
                                    <p className="text-xs text-dark-500">Present</p>
                                    <p className="text-xl font-bold text-accent-400">{student.presentCount}</p>
                                </div>
                                <div className="bg-dark-800/50 rounded-lg p-3">
                                    <p className="text-xs text-dark-500">Absent</p>
                                    <p className="text-xl font-bold text-red-400">{student.totalSessions - student.presentCount}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                                <div className="w-full h-3 bg-dark-800 rounded-full">
                                    <div
                                        className={`h-full rounded-full transition-all ${student.percentage >= 75 ? 'bg-accent-500' :
                                            student.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${student.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
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
            <main className="max-w-6xl mx-auto px-4 py-8">
                <Routes>
                    <Route index element={<CoursesList />} />
                    <Route path="sessions" element={<SessionsList />} />
                    <Route path="attendance-report" element={<CourseAttendanceReport />} />
                    <Route path="create-course" element={<CreateCourse />} />
                    <Route path="create-session" element={<CreateSession />} />
                </Routes>
            </main>
        </div>
    );
}
