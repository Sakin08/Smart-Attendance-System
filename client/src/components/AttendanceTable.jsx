import { useState } from 'react';

export default function AttendanceTable({ sheet = [], title = 'Attendance Sheet', showLocation = false }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, Present, Absent

    const filtered = sheet.filter(entry => {
        const matchSearch = entry.email.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || entry.status === filter;
        return matchSearch && matchFilter;
    });

    const presentCount = sheet.filter(s => s.status === 'Present').length;
    const absentCount = sheet.filter(s => s.status === 'Absent').length;

    return (
        <div className="space-y-4">
            {/* Header with stats */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
                <div className="flex gap-2 text-xs">
                    <span className="badge badge-present">Present: {presentCount}</span>
                    <span className="badge badge-absent">Absent: {absentCount}</span>
                    <span className="badge badge-active">Total: {sheet.length}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px] text-sm"
                />
                <div className="flex rounded-lg overflow-hidden border border-primary-500/20">
                    {['all', 'Present', 'Absent'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 text-xs font-medium transition-all capitalize ${filter === f
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-primary-500/10">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>SL</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Marked At</th>
                            {showLocation && <th>Location</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={showLocation ? 5 : 4} className="text-center text-dark-500 py-8">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((entry, idx) => (
                                <tr key={entry.email}>
                                    <td className="text-dark-400">{idx + 1}</td>
                                    <td className="font-mono text-sm">{entry.email}</td>
                                    <td>
                                        <span className={`badge ${entry.status === 'Present' ? 'badge-present' : 'badge-absent'}`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="text-dark-400 text-sm">
                                        {entry.markedAt ? new Date(entry.markedAt).toLocaleString() : '—'}
                                    </td>
                                    {showLocation && (
                                        <td className="text-dark-400 text-xs font-mono">
                                            {entry.lat && entry.lng
                                                ? `${entry.lat.toFixed(4)}, ${entry.lng.toFixed(4)}`
                                                : '—'}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
