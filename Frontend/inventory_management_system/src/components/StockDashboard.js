import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './StockDashboard.css';

const StockDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        unreadAlerts: 0,
        locations: 0,
        recentMovements: []
    });
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchAlerts();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch('http://localhost:3001/dashboard/stats', {
                method: 'GET',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch('http://localhost:3001/alerts?unread=true', {
                method: 'GET',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAlerts(data.slice(0, 5)); // Show only top 5 alerts
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const markAlertAsRead = async (alertId) => {
        try {
            const token = localStorage.getItem('auth-token');
            await fetch(`http://localhost:3001/alerts/${alertId}/read`, {
                method: 'PUT',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });
            
            // Remove the alert from the list or mark it as read
            setAlerts(alerts.filter(alert => alert._id !== alertId));
        } catch (error) {
            console.error('Error marking alert as read:', error);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#dc3545';
            case 'high': return '#fd7e14';
            case 'medium': return '#ffc107';
            case 'low': return '#20c997';
            default: return '#6c757d';
        }
    };

    const getMovementIcon = (type) => {
        switch (type) {
            case 'inbound': return '📈';
            case 'outbound': return '📉';
            case 'transfer': return '🔄';
            case 'damaged': return '⚠️';
            case 'returned': return '↩️';
            case 'adjustment': return '⚖️';
            default: return '📦';
        }
    };

    if (loading) {
        return (
            <div className="stock-dashboard">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="stock-dashboard">
            <div className="dashboard-header">
                <h1>Stock Management Dashboard</h1>
                <p>Real-time inventory overview and alerts</p>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card total-products">
                    <div className="stat-info">
                        <p>Total Products</p>
                        <h3>{stats.totalProducts}</h3>
                    </div>
                </div>

                <div className="stat-card low-stock">
                    <div className="stat-info">
                        <p>Low Stock Items</p>
                        <h3>{stats.lowStockProducts}</h3>
                    </div>
                </div>

                <div className="stat-card out-of-stock">
                    <div className="stat-info">
                        <p>Out of Stock</p>
                        <h3>{stats.outOfStockProducts}</h3>
                    </div>
                </div>

                <div className="stat-card alerts">
                    <div className="stat-info">
                        <p>Unread Alerts</p>
                        <h3>{stats.unreadAlerts}</h3>
                    </div>
                </div>

                <div className="stat-card locations">
                    <div className="stat-info">
                        <p>Active Locations</p>
                        <h3>{stats.locations}</h3>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="alerts-section">
                    <h2>Recent Alerts</h2>
                    <div className="alerts-list">
                        {alerts.map(alert => (
                            <div key={alert._id} className={`alert-item severity-${alert.severity}`}>
                                <div className="alert-content">
                                    <div className="alert-header">
                                        <span className={`alert-type alert-type-${alert.alertType.replace(/_/g, '-')}`}>{alert.alertType.replace(/_/g, ' ').toUpperCase()}</span>
                                    </div>
                                    <p className="alert-message">{alert.message}</p>
                                    <div className="alert-details">
                                        <span><strong>Location:</strong> {alert.location}</span>
                                        <span><strong>Current:</strong> {alert.currentQuantity}</span>
                                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="alert-actions">
                                    <button 
                                        className="mark-read-btn"
                                        onClick={() => markAlertAsRead(alert._id)}
                                    >
                                        <span style={{ color: 'black', fontWeight: 'bold', fontSize: '18px' }}>✔</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Movements */}
            <div className="movements-section" style={{ 
                boxShadow: '0 0 0 3px black', /* This creates a persistent 3px perimeter border */
                borderRadius: '20px', 
                padding: '8.5rem 2rem 2.5rem 2rem', 
                marginBottom: '40px', 
                overflow: 'visible',
                display: 'block'
            }}>
                <h2 style={{ paddingTop: '60px', textAlign: 'center', marginBottom: '2.5rem' }}>Recent Stock Movements</h2>
                <div className="movements-list">
                    {stats.recentMovements.map((movement, index) => (
                        <div key={index} className="movement-item" style={{ justifyContent: 'center' }}>
                            <div className="movement-details" style={{ textAlign: 'center', padding: '0', color: '#1a1a1a' }}>
                                <div className="movement-header" style={{ flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <strong style={{ fontSize: '1.25rem', color: '#000000', fontWeight: '800' }}>{movement.ProductName}</strong>
                                    <span className={`movement-type ${movement.movement.type}`} style={{ display: 'inline-block' }}>
                                        {movement.movement.type.toUpperCase()}
                                    </span>
                                </div>
                                <div className="movement-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontWeight: '600' }}>
                                    <span>Quantity: {movement.movement.quantity}</span>
                                    <span>Location: {movement.movement.location}</span>
                                    <span>By: {movement.user}</span>
                                    <span style={{ opacity: 0.9 }}>{new Date(movement.movement.date).toLocaleDateString()}</span>
                                </div>
                                {movement.movement.reason && (
                                    <p className="movement-reason" style={{ textAlign: 'center', marginTop: '0.5rem', color: '#000000', fontWeight: '600', fontStyle: 'italic' }}>Reason: {movement.movement.reason}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StockDashboard;