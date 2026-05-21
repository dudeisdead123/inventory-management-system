import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-dark)',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    Verifying session...
                </div>
            </div>
        );
    }
    
    return user ? children : <Login />;
};

export default ProtectedRoute;