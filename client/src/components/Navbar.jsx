import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ tabs }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const roleColors = {
        student: 'from-primary-500 to-blue-500',
        teacher: 'from-accent-500 to-emerald-500',
        admin: 'from-amber-500 to-orange-500'
    };

    return (
        <nav className="glass-card border-b border-primary-500/10 rounded-none sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 bg-gradient-to-br ${roleColors[user?.role] || 'from-primary-500 to-accent-500'} rounded-xl flex items-center justify-center shadow-lg`}>
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div>
                            <span className="font-bold text-sm text-dark-100">Smart Attendance</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${roleColors[user?.role] || ''} text-white font-medium capitalize`}>
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    {tabs && (
                        <div className="hidden md:flex items-center gap-1">
                            {tabs.map((tab) => {
                                const isActive = location.pathname === tab.path ||
                                    (tab.path !== `/${user?.role}` && location.pathname.startsWith(tab.path));
                                return (
                                    <button
                                        key={tab.path}
                                        id={`nav-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                                        onClick={() => navigate(tab.path)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? 'bg-primary-500/15 text-primary-300'
                                                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* User menu */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-medium text-dark-200">{user?.name}</p>
                            <p className="text-xs text-dark-500">{user?.email}</p>
                        </div>
                        <button
                            id="logout-button"
                            onClick={handleLogout}
                            className="btn btn-outline text-xs py-2 px-3"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile tabs */}
                {tabs && (
                    <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
                        {tabs.map((tab) => {
                            const isActive = location.pathname === tab.path;
                            return (
                                <button
                                    key={tab.path}
                                    onClick={() => navigate(tab.path)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive
                                            ? 'bg-primary-500/15 text-primary-300'
                                            : 'text-dark-400 hover:text-dark-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </nav>
    );
}
