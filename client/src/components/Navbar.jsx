import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar({ tabs }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Modernized color palette with softer gradients
    const roleColors = {
        student: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
        teacher: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
        admin: 'from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30'
    };

    const activeGlow = {
        student: 'bg-blue-500',
        teacher: 'bg-emerald-500',
        admin: 'bg-orange-500'
    };

    const roleIcons = {
        student: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
        teacher: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
        admin: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        )
    };

    return (
        <nav className="glass-card border-b border-primary-500/10 rounded-none backdrop-blur-xl bg-dark-900/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo & Brand */}
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[user?.role]} border flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                            {roleIcons[user?.role] || roleIcons.student}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight text-white leading-none">SmartAttendance</span>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-1 h-1 rounded-full ${activeGlow[user?.role] || 'bg-primary-500'} animate-pulse`}></span>
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-dark-400">{user?.role}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Tabs: Floating Pill Style */}
                    {tabs && (
                        <div className="hidden lg:flex items-center bg-dark-800/40 p-1.5 rounded-2xl border border-white/5">
                            {tabs.map((tab) => {
                                const isActive = location.pathname === tab.path ||
                                    (tab.path !== `/${user?.role}` && location.pathname.startsWith(tab.path));
                                return (
                                    <button
                                        key={tab.path}
                                        onClick={() => navigate(tab.path)}
                                        className={`relative px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                                            ? 'text-white'
                                            : 'text-dark-400 hover:text-dark-100 hover:bg-white/5'
                                            }`}
                                    >
                                        {isActive && (
                                            <div className={`absolute inset-0 bg-gradient-to-r ${roleColors[user?.role]} rounded-xl -z-10 opacity-20`}></div>
                                        )}
                                        {tab.label}
                                        {isActive && (
                                            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${activeGlow[user?.role]}`}></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* User Actions */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-dark-800/50 border border-white/5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColors[user?.role]} border flex items-center justify-center text-xs font-black`}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-dark-100 leading-none">{user?.name}</span>
                                <span className="text-[10px] text-dark-500 leading-none mt-1">{user?.email}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/40 transition-all duration-300 group"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>

                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800/50 text-dark-300 border border-white/5"
                        >
                            <div className="relative w-5 h-5">
                                <span className={`absolute block h-0.5 w-5 bg-current transform transition duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'}`}></span>
                                <span className={`absolute block h-0.5 w-5 bg-current transform transition duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                                <span className={`absolute block h-0.5 w-5 bg-current transform transition duration-300 ${mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'}`}></span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu: Slide down effect */}
            <div className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-[500px] border-t border-white/5' : 'max-h-0'}`}>
                <div className="p-4 space-y-2 bg-dark-900/90">
                    {tabs?.map((tab) => {
                        const isActive = location.pathname === tab.path;
                        return (
                            <button
                                key={tab.path}
                                onClick={() => { navigate(tab.path); setMobileMenuOpen(false); }}
                                className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${isActive
                                    ? `bg-gradient-to-r ${roleColors[user?.role]} text-white`
                                    : 'text-dark-400 hover:bg-white/5'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}