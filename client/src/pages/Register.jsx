import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseStudentEmail } from '../utils/registrationParser';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'student'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Parse student email when email changes and role is student
        if (name === 'email' && formData.role === 'student' && value) {
            const parsed = parseStudentEmail(value);
            if (parsed.isValid) {
                setStudentInfo(parsed);
                setError('');
            } else {
                setStudentInfo(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const user = await register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                role: formData.role
            });
            navigate(`/${user.role}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const emailHint = formData.role === 'student'
        ? 'Use your university email (e.g., 2021331008@student.sust.edu)'
        : 'Use any valid email address';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-950 via-dark-900 to-primary-950">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="glass-card p-8 w-full max-w-md animate-fade-in relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Create Account</h1>
                    <p className="text-dark-400 mt-1">Join Smart Attendance System</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Role selector */}
                    <div className="flex rounded-lg overflow-hidden border border-primary-500/20">
                        {['student', 'teacher'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({ ...formData, role, email: '' })}
                                className={`flex-1 py-2.5 text-sm font-semibold transition-all capitalize ${formData.role === role
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
                        <input
                            id="register-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={formData.role === 'student' ? '2019331008@student.sust.edu' : 'dr.name@sust.edu'}
                            required
                        />
                        <p className="text-xs text-dark-500 mt-1">{emailHint}</p>
                        {studentInfo && formData.role === 'student' && (
                            <div className="mt-2 p-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                                <p className="text-xs text-primary-300">
                                    <span className="font-semibold">Department:</span> {studentInfo.department}
                                </p>
                                <p className="text-xs text-primary-300">
                                    <span className="font-semibold">Batch:</span> {studentInfo.batch} | <span className="font-semibold">Roll:</span> {studentInfo.rollNumber}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Phone (optional)</label>
                        <input
                            id="register-phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+880 1XXX-XXXXXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Password</label>
                        <input
                            id="register-password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1">Confirm Password</label>
                        <input
                            id="register-confirm-password"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        id="register-submit"
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Create Account'}
                    </button>
                </form>

                <p className="text-center mt-6 text-dark-400 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
