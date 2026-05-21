import React, { createContext, useContext, useState, useCallback } from 'react';
import './Toast.css';
import { Icons } from '../components/Icons';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        
        setToasts((prevToasts) => [
            ...prevToasts,
            { id, message, type, duration }
        ]);

        // Auto remove toast after duration
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <Icons.Receipt size={18} className="toast-icon success" style={{ color: 'var(--success-color)' }} />;
            case 'error':
                return <Icons.Delete size={18} className="toast-icon error" style={{ color: 'var(--danger-color)' }} />;
            case 'warning':
                return <Icons.Alert size={18} className="toast-icon warning" style={{ color: 'var(--warning-color)' }} />;
            case 'info':
            default:
                return <Icons.FeatureBox size={18} className="toast-icon info" style={{ color: 'var(--info-color)' }} />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div 
                        key={toast.id} 
                        className={`toast-card toast-${toast.type}`}
                        style={{ '--duration': `${toast.duration}ms` }}
                    >
                        <div className="toast-content">
                            <span className="toast-icon-wrapper">
                                {getIcon(toast.type)}
                            </span>
                            <p className="toast-message">{toast.message}</p>
                            <button className="toast-close-btn" onClick={() => removeToast(toast.id)}>
                                &times;
                            </button>
                        </div>
                        <div className="toast-progress-bar"></div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
