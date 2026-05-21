import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './StockDashboard.css';
import { apiUrl } from '../config/api';

import { Icons } from './Icons';

const WizardIcon = () => <Icons.Wizard size={18} style={{ marginRight: '6px' }} />;
const SuccessCheckIcon = () => <Icons.Success size={36} style={{ marginBottom: '12px', color: 'var(--success-color)' }} />;
const DismissIcon = () => <Icons.Check size={14} strokeWidth={3} />;

const StockDashboard = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        unreadAlerts: 0,
        locations: 0,
        recentMovements: []
    });
    const [alerts, setAlerts] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wizardRecommendations, setWizardRecommendations] = useState([]);
    const [wizardProcessing, setWizardProcessing] = useState(null); // stores productId during operation
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    useEffect(() => {
        loadAllDashboardData();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth-token');
        return {
            'Content-Type': 'application/json',
            'auth-token': token
        };
    };

    const loadAllDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchDashboardData(),
                fetchAlerts(),
                fetchProductsAndComputeRecommendations()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const response = await fetch(apiUrl('/dashboard/stats'), {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await fetch(apiUrl('/alerts?unread=true'), {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setAlerts(data.slice(0, 5)); // Show top 5 alerts
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const fetchProductsAndComputeRecommendations = async () => {
        try {
            const res = await fetch(apiUrl('/products'), {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const productsList = await res.json();
                setProducts(productsList);
                computeRestockingWizard(productsList);
            }
        } catch (error) {
            console.error('Error fetching products for wizard:', error);
        }
    };

    const computeRestockingWizard = (productsList) => {
        const recommendations = [];

        productsList.forEach(product => {
            // Check if product is low stock overall, or has specific location stock deficits
            const totalStock = product.totalStock || 0;
            const isLowGlobal = totalStock <= (product.globalMinStock || 10);
            
            // Find locations that are low (current qty < min level)
            const lowLocations = product.locationStock.filter(loc => loc.quantity < loc.minStockLevel || loc.quantity === 0);
            // Find locations that have surplus (current qty > min level)
            const surplusLocations = product.locationStock.filter(loc => loc.quantity > loc.minStockLevel);

            lowLocations.forEach(dest => {
                const deficit = dest.minStockLevel - dest.quantity;
                
                // Search for best candidate to transfer from (highest quantity surplus)
                if (surplusLocations.length > 0) {
                    // Sort surplus locations by available surplus descending
                    const sortedSurplus = [...surplusLocations].sort((a, b) => {
                        const surplusA = a.quantity - a.minStockLevel;
                        const surplusB = b.quantity - b.minStockLevel;
                        return surplusB - surplusA;
                    });

                    const bestSource = sortedSurplus[0];
                    const availableSurplus = bestSource.quantity - bestSource.minStockLevel;

                    if (availableSurplus > 0) {
                        const transferQty = Math.min(deficit, availableSurplus);
                        recommendations.push({
                            productId: product._id,
                            productName: product.ProductName,
                            fromLocation: bestSource.location,
                            toLocation: dest.location,
                            suggestedQuantity: transferQty,
                            reason: `Low stock at ${dest.location} (${dest.quantity}/${dest.minStockLevel}). Surplus available at ${bestSource.location} (${bestSource.quantity}).`
                        });
                    }
                }
            });
        });

        setWizardRecommendations(recommendations);
    };

    const executeWizardTransfer = async (rec) => {
        setWizardProcessing(rec.productId);
        try {
            const response = await fetch(apiUrl(`/stock/transfer/${rec.productId}`), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    fromLocation: rec.fromLocation.toLowerCase(),
                    toLocation: rec.toLocation.toLowerCase(),
                    quantity: rec.suggestedQuantity,
                    reason: 'Wizard Rebalancing'
                })
            });

            if (response.ok) {
                showToast('Wizard transfer executed successfully!', 'success');
                // Refresh data
                await Promise.all([
                    fetchDashboardData(),
                    fetchAlerts(),
                    fetchProductsAndComputeRecommendations()
                ]);
            } else {
                const errData = await response.json();
                showToast(`Transfer failed: ${errData.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error executing wizard transfer:', error);
            showToast('An unexpected error occurred during transfer.', 'error');
        } finally {
            setWizardProcessing(null);
        }
    };

    const executeAllWizardTransfers = async () => {
        if (wizardRecommendations.length === 0) return;
        setIsBulkProcessing(true);
        try {
            const promises = wizardRecommendations.map(rec => 
                fetch(apiUrl(`/stock/transfer/${rec.productId}`), {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        fromLocation: rec.fromLocation.toLowerCase(),
                        toLocation: rec.toLocation.toLowerCase(),
                        quantity: rec.suggestedQuantity,
                        reason: 'One-Click AI Rebalancing'
                    })
                })
            );
            
            const responses = await Promise.all(promises);
            const failedCount = responses.filter(r => !r.ok).length;
            
            if (failedCount > 0) {
                showToast(`AI Smart Rebalancing completed with ${failedCount} failures.`, 'warning');
            } else {
                showToast(`AI Optimizer: Successfully rebalanced all ${wizardRecommendations.length} location deficits!`, 'success');
            }
            
            await loadAllDashboardData();
        } catch (error) {
            console.error('Error during bulk wizard transfer:', error);
            showToast('Bulk rebalancing encountered network errors.', 'error');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const markAlertAsRead = async (alertId) => {
        try {
            const response = await fetch(apiUrl(`/alerts/${alertId}/read`), {
                method: 'PUT',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                setAlerts(alerts.filter(alert => alert._id !== alertId));
                fetchDashboardData();
            }
        } catch (error) {
            console.error('Error marking alert as read:', error);
        }
    };

    if (loading) {
        return (
            <div className="stock-dashboard">
                <div className="loading-spinner">
                    <div className="spinner-bar"></div>
                    <p>Loading Dashboard Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-dashboard">
            <div className="dashboard-header">
                <h1>Stock Management Dashboard</h1>
                <p>Real-time inventory overview, auto-alerts, and rebalancing recommendations</p>
            </div>

            {/* Statistics Cards Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-badge total-products-badge">
                        <Icons.Products size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-info">
                        <p>Total Products</p>
                        <h3>{stats.totalProducts}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-badge low-stock-badge">
                        <Icons.Alert size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-info">
                        <p>Low Stock Items</p>
                        <h3>{stats.lowStockProducts}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-badge out-of-stock-badge">
                        <Icons.Delete size={24} strokeWidth={2.5} />
                    </div>
                    <div className="stat-info">
                        <p>Out of Stock</p>
                        <h3>{stats.outOfStockProducts}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-badge alerts-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <p>Unread Alerts</p>
                        <h3>{stats.unreadAlerts}</h3>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon-badge locations-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div className="stat-info">
                        <p>Active Locations</p>
                        <h3>{stats.locations}</h3>
                    </div>
                </div>
            </div>

            {/* Restocking Wizard & Recommendations Panel */}
            <div className="wizard-section card">
                <div className="wizard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <span className="wizard-badge"><WizardIcon /> AUTO-BALANCER</span>
                        <h2 style={{ margin: '4px 0 0 0' }}>Restocking & Allocation Wizard</h2>
                        <p style={{ margin: '4px 0 0 0' }}>Dynamic transfer recommendations based on real-time location stock allocations.</p>
                    </div>
                    {wizardRecommendations.length > 0 && (
                        <button 
                            className="btn btn-primary" 
                            style={{ 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                border: 'none',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.6rem 1.25rem',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                            onClick={executeAllWizardTransfers}
                            disabled={isBulkProcessing || wizardProcessing !== null}
                        >
                            <Icons.Action size={16} strokeWidth={2.5} />
                            {isBulkProcessing ? 'Optimizing Inventory...' : 'One-Click AI Rebalance'}
                        </button>
                    )}
                </div>

                {wizardRecommendations.length > 0 ? (
                    <div className="wizard-list">
                        {wizardRecommendations.map((rec, index) => (
                            <div key={index} className="wizard-card-item">
                                <div className="wizard-meta">
                                    <span className="product-title">{rec.productName}</span>
                                    <div className="route-indicator">
                                        <span className="loc-name">{rec.fromLocation.toUpperCase()}</span>
                                        <span className="route-arrow">➔</span>
                                        <span className="loc-name dest-name">{rec.toLocation.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="wizard-explanation">
                                    <p>{rec.reason}</p>
                                    <span className="recommendation-badge">
                                        Transfer Recommended: <strong>{rec.suggestedQuantity} units</strong>
                                    </span>
                                </div>
                                <div className="wizard-actions">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => executeWizardTransfer(rec)}
                                        disabled={wizardProcessing === rec.productId}
                                    >
                                        {wizardProcessing === rec.productId ? 'Transferring...' : 'Execute Quick Transfer'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="wizard-empty">
                        <SuccessCheckIcon />
                        <h4>All Locations Balanced</h4>
                        <p>No stock deficits or pending rebalancing operations found at this time.</p>
                    </div>
                )}
            </div>

            {/* Alerts & Movements Row Layout */}
            <div className="dashboard-columns">
                {/* Alerts Section */}
                <div className="column-section card">
                    <h2 className="section-title">Critical Notifications</h2>
                    {alerts.length > 0 ? (
                        <div className="alerts-list">
                            {alerts.map(alert => (
                                <div key={alert._id} className={`alert-item severity-${alert.severity}`}>
                                    <div className="alert-content-wrapper">
                                        <div className="alert-head">
                                            <span className="alert-type">{alert.alertType.replace(/_/g, ' ')}</span>
                                            <span className={`severity-tag ${alert.severity}`}>{alert.severity}</span>
                                        </div>
                                        <p className="alert-msg-txt">{alert.message}</p>
                                        <div className="alert-footer">
                                            <span><strong>Location:</strong> {alert.location.toUpperCase()}</span>
                                            <span><strong>Qty:</strong> {alert.currentQuantity}</span>
                                            <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-mark-read"
                                        onClick={() => markAlertAsRead(alert._id)}
                                        title="Dismiss Alert"
                                    >
                                        <DismissIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-alerts">
                            <p>No active unread alerts. Inventory operations are running smoothly.</p>
                        </div>
                    )}
                </div>

                {/* Recent Movements Section */}
                <div className="column-section card scroll-column">
                    <h2 className="section-title">Recent Stock Log</h2>
                    {stats.recentMovements.length > 0 ? (
                        <div className="timeline-movements">
                            {stats.recentMovements.map((item, index) => (
                                <div key={index} className="timeline-item">
                                    <div className={`timeline-marker marker-${item.type}`}></div>
                                    <div className="timeline-content">
                                        <div className="timeline-head">
                                            <strong>{item.ProductName}</strong>
                                            <span className={`type-badge badge-${item.type}`}>
                                                {item.type}
                                            </span>
                                        </div>
                                        <p className="timeline-info">
                                            Quantity: <strong>{item.quantity}</strong> | Location: <strong>{item.location.toUpperCase()}</strong>
                                        </p>
                                        <p className="timeline-user">
                                            Performed by {item.user_name || 'System'} on {new Date(item.date).toLocaleDateString()}
                                        </p>
                                        {item.reason && (
                                            <p className="timeline-reason">"{item.reason}"</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-alerts">
                            <p>No recent stock movement logs found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockDashboard;