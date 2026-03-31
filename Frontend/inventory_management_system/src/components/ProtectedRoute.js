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
                background: '#ffffff'
            }}>
                <div style={{
                    background: '#fffdd0',
                    color: '#000000',
                    padding: '20px 40px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '1rem'
                }}>
                </div>
            </div>
        );
    }
    
    return user ? children : <Login />;
};

export default ProtectedRoute;