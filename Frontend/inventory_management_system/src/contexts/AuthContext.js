import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('auth-token');
        if (token) {
            fetchUser(token);
        } else {
            setLoading(false);
        }
        
        return () => {
            if (socket) socket.disconnect();
        };
    }, []);
    
    useEffect(() => {
        if (user && !socket) {
            const newSocket = io('http://localhost:3001');
            setSocket(newSocket);
        } else if (!user && socket) {
            socket.disconnect();
            setSocket(null);
        }
    }, [user]);

    const fetchUser = async (token) => {
        try {
            const response = await fetch('http://localhost:3001/getuser', {
                method: 'POST',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                localStorage.removeItem('auth-token');
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            localStorage.removeItem('auth-token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await fetch('http://localhost:3001/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('auth-token', data.authtoken);
                await fetchUser(data.authtoken);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const register = async (name, email, password, role, location) => {
        try {
            const response = await fetch('http://localhost:3001/createuser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, role, location })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('auth-token', data.authtoken);
                await fetchUser(data.authtoken);
                return { success: true };
            } else {
                return { success: false, error: data.error || data.errors?.[0]?.msg };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('auth-token');
        setUser(null);
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        socket
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};