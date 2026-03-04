import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data.user);
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    setUser(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (data) => {
        const res = await api.post('/auth/register', data);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const googleSignIn = async (credential) => {
        const res = await api.post('/auth/google', { credential });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (updated) => {
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const res = await api.get('/auth/me');
                setUser(res.data.user);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                return res.data.user;
            } catch (error) {
                console.error('Failed to refresh user:', error);
                throw error;
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, googleSignIn, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
