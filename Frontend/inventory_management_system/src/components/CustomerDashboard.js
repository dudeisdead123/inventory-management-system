import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { generateInvoice } from '../utils/invoiceGenerator';
import './CustomerDashboard.css';
import { Icons } from './Icons';
import { apiUrl } from '../config/api';

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};
const EmptyBoxIcon = () => <Icons.FeatureBox size={48} style={{ opacity: 0.4, marginBottom: '16px', display: 'inline-block' }} className="icon-float" />;

const CustomerDashboard = () => {
    const { user, socket } = useAuth();
    const { showToast } = useToast();
    const [products, setProducts] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quantities, setQuantities] = useState({}); // { productId: quantity }
    const [liveActivities, setLiveActivities] = useState([]);
    const [showSandboxModal, setShowSandboxModal] = useState(false);
    const [sandboxOrderDetails, setSandboxOrderDetails] = useState(null);

    useEffect(() => {
        loadDashboardData();
        
        const pollInterval = setInterval(() => {
            fetchProducts(true);
        }, 3000);

        if (socket) {
            socket.on('stockUpdated', (data) => {
                if (data.location && typeof data.newQuantity !== 'undefined') {
                    setProducts(prevProducts => prevProducts.map(p => {
                        if (p._id === data.productId) {
                            return {
                                ...p,
                                locationStock: p.locationStock?.map(loc => 
                                    loc.location === data.location ? { ...loc, quantity: data.newQuantity } : loc
                                )
                            };
                        }
                        return p;
                    }));
                }
                fetchProducts(true);
            });

            socket.on('liveActivity', (activity) => {
                setLiveActivities(prev => [activity, ...prev].slice(0, 10));
            });
        }
        
        return () => {
            clearInterval(pollInterval);
            if (socket) {
                socket.off('stockUpdated');
                socket.off('liveActivity');
            }
        };
    }, [socket]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth-token');
        return {
            'Content-Type': 'application/json',
            'auth-token': token
        };
    };

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchProducts(false),
                fetchPurchases()
            ]);
        } catch (error) {
            console.error('Error loading customer dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async (isSilent = false) => {
        try {
            const response = await fetch(apiUrl(`/products?timestamp=${Date.now()}`), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchPurchases = async () => {
        try {
            const response = await fetch(apiUrl('/customer/purchases'), {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setPurchases(data);
            }
        } catch (error) {
            console.error('Error fetching purchases:', error);
        }
    };

    const handleQuantityChange = (productId, delta, maxStock) => {
        setQuantities(prev => {
            const currentQty = prev[productId] || 1;
            const newQty = Math.max(1, Math.min(maxStock, currentQty + delta));
            return { ...prev, [productId]: newQty };
        });
    };

    const handleBuy = async (productId) => {
        const qtyToBuy = quantities[productId] || 1;
        const product = products.find(p => p._id === productId);
        if (!product) return;

        try {
            // 1. Create order on the backend
            const orderResponse = await fetch(apiUrl('/payment/order'), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    productId,
                    quantity: qtyToBuy,
                    location: user.location
                })
            });

            const orderData = await orderResponse.json();
            if (!orderResponse.ok) {
                showToast(orderData.error || 'Failed to create payment order', 'error');
                return;
            }

            const { orderId, amount, currency, keyId, isSandbox } = orderData;

            // 2. Load Razorpay script
            const scriptLoaded = await loadRazorpayScript();

            if (scriptLoaded && !isSandbox) {
                // Real Razorpay Checkout flow (using official Test key or User key)
                const options = {
                    key: keyId,
                    amount: amount,
                    currency: currency,
                    name: "Inventory Hub",
                    description: `Purchase: ${product.ProductName} (Qty: ${qtyToBuy})`,
                    order_id: orderId,
                    handler: async function (response) {
                        // Send verification payload to backend
                        const verifyRes = await fetch(apiUrl('/payment/verify'), {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                productId,
                                quantity: qtyToBuy,
                                location: user.location,
                                isSandbox: false
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok) {
                            showToast('Payment successful and stock updated!', 'success');
                            setQuantities(prev => ({ ...prev, [productId]: 1 }));
                            fetchProducts(true);
                            fetchPurchases();
                        } else {
                            showToast(verifyData.error || 'Payment verification failed', 'error');
                        }
                    },
                    prefill: {
                        name: user.name || '',
                        email: user.email || ''
                    },
                    theme: {
                        color: "#000000"
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    showToast(`Payment failed: ${response.error.description}`, 'error');
                });
                rzp.open();
            } else {
                // Sandbox Mode (or Razorpay Script failed to load)
                // Show our gorgeous inline sandbox simulation modal!
                setSandboxOrderDetails({
                    orderId,
                    amount,
                    currency,
                    productName: product.ProductName,
                    quantity: qtyToBuy,
                    productId
                });
                setShowSandboxModal(true);
            }

        } catch (error) {
            console.error('Error during purchase flow:', error);
            showToast('An error occurred during the transaction flow.', 'error');
        }
    };

    const handleSandboxPaymentSuccess = async () => {
        const details = sandboxOrderDetails;
        setShowSandboxModal(false);
        try {
            const verifyRes = await fetch(apiUrl('/payment/verify'), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    razorpay_payment_id: `pay_sandbox_${Math.random().toString(36).substring(2, 10)}`,
                    razorpay_order_id: details.orderId,
                    razorpay_signature: 'sandbox_signature_success',
                    productId: details.productId,
                    quantity: details.quantity,
                    location: user.location,
                    isSandbox: true
                })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
                showToast('Sandbox payment successful!', 'success');
                setQuantities(prev => ({ ...prev, [details.productId]: 1 }));
                fetchProducts(true);
                fetchPurchases();
            } else {
                showToast(verifyData.error || 'Payment verification failed', 'error');
            }
        } catch (error) {
            console.error('Error verifying sandbox payment:', error);
            showToast('Failed to process purchase verification.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="customer-dashboard">
                <div className="loading-spinner">
                    <div className="spinner-bar"></div>
                    <p>Syncing Marketplace Catalog...</p>
                </div>
            </div>
        );
    }

    const userCity = user?.location?.toLowerCase() || '';

    return (
        <div className="customer-dashboard">
            <header className="customer-header">
                <div className="customer-welcome">
                    <h1>Welcome back, {user?.name}</h1>
                    <p>Exclusive deals in your location: <strong className="city-badge-tag">{user?.location?.toUpperCase()}</strong></p>
                </div>
            </header>

            <div className="customer-layout">
                <div className="catalog-section">
                    <h2 className="section-title">Marketplace Catalog</h2>
                    <div className="customer-product-grid">
                        {products.length > 0 ? (
                            products.map(product => {
                                const localStockInfo = product.locationStock?.find(
                                    loc => loc.location.toLowerCase() === userCity
                                );
                                const localStock = localStockInfo ? localStockInfo.quantity : 0;
                                const currentQty = quantities[product._id] || 1;
                                
                                return (
                                    <div key={product._id} className="customer-product-card">
                                        <div className="card-top">
                                            <span className="category-pill">{product.ProductCategory || 'General'}</span>
                                            <span className={`stock-status-tag ${localStock > 0 ? 'instock' : 'outofstock'}`}>
                                                {localStock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                                            </span>
                                        </div>
                                        <h3 className="prod-name">{product.ProductName}</h3>
                                        <div className="price-row">
                                            <span className="price-label">Price</span>
                                            <span className="price-val">₹{product.ProductPrice.toLocaleString()}</span>
                                        </div>
                                        
                                        <p className="stock-info">
                                            {localStock > 0 
                                                ? `Available units in ${user?.location}: ${localStock}`
                                                : `Currently unavailable in ${user?.location}`
                                            }
                                        </p>
                                        
                                        {localStock > 0 && (
                                            <div className="quantity-selector">
                                                <button 
                                                    className="qty-btn"
                                                    onClick={() => handleQuantityChange(product._id, -1, localStock)}
                                                    disabled={currentQty <= 1}
                                                >
                                                    -
                                                </button>
                                                <span className="qty-display">{currentQty}</span>
                                                <button 
                                                    className="qty-btn"
                                                    onClick={() => handleQuantityChange(product._id, 1, localStock)}
                                                    disabled={currentQty >= localStock}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}

                                        <button 
                                            className={`buy-button ${localStock === 0 ? 'disabled' : ''}`}
                                            onClick={() => handleBuy(product._id)}
                                            disabled={localStock === 0}
                                        >
                                            {localStock === 0 ? 'Out of Stock' : `Order ${currentQty} Unit${currentQty > 1 ? 's' : ''}`}
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-products">
                                <p>No products are currently available in the marketplace catalog.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="history-section">
                    {/* Feature 1: Live System Activity Feed */}
                    <div className="card" style={{ marginBottom: '24px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="ai-icon-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)' }}></span>
                                Live Sales & Stock Feed
                            </h3>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realtime</span>
                        </div>
                        <div className="activity-feed-card">
                            {liveActivities.length > 0 ? (
                                liveActivities.map((act, idx) => (
                                    <div key={idx} className="activity-item">
                                        <div className={`activity-icon-wrapper activity-${act.type}`}>
                                            {act.type === 'purchase' && <Icons.Receipt size={14} strokeWidth={2.5} />}
                                            {act.type === 'add' && <Icons.Add size={14} strokeWidth={2.5} />}
                                            {act.type === 'remove' && <Icons.Delete size={14} strokeWidth={2.5} />}
                                            {act.type === 'transfer' && <Icons.Refresh size={14} strokeWidth={2.5} />}
                                        </div>
                                        <div className="activity-details">
                                            <div className="activity-msg">
                                                {act.type === 'purchase' && (
                                                    <span><strong>{act.user}</strong> bought {act.quantity}x {act.productName} (₹{act.amount})</span>
                                                )}
                                                {act.type === 'add' && (
                                                    <span>Added {act.quantity} units of {act.productName} in <strong>{act.location.toUpperCase()}</strong></span>
                                                )}
                                                {act.type === 'remove' && (
                                                    <span>Removed {act.quantity} units of {act.productName} in <strong>{act.location.toUpperCase()}</strong></span>
                                                )}
                                                {act.type === 'transfer' && (
                                                    <span>Transferred {act.quantity} units of {act.productName} to <strong>{act.toLocation.toUpperCase()}</strong></span>
                                                )}
                                            </div>
                                            <div className="activity-meta">
                                                <span className="mono" style={{ textTransform: 'uppercase' }}>{act.type}</span>
                                                <span>{new Date(act.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>Listening for live inventory transactions...</p>
                            )}
                        </div>
                    </div>

                    <h2 className="section-title">Your Purchase History</h2>
                    {purchases.length > 0 ? (
                        <div className="purchases-list">
                            {purchases.map((item, idx) => (
                                <div key={idx} className="purchase-history-card">
                                    <div className="purchase-card-header">
                                        <span className="purchase-date">
                                            {new Date(item.date).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        <span className="purchase-status">Ordered</span>
                                    </div>
                                    <h4 className="purchase-prod-name">{item.productName}</h4>
                                    <div className="purchase-details-grid">
                                        <div className="detail-field">
                                            <span className="lbl">Qty</span>
                                            <span className="val">{item.quantity}</span>
                                        </div>
                                        <div className="detail-field">
                                            <span className="lbl">Price</span>
                                            <span className="val">₹{item.productPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="detail-field total-cost-field">
                                            <span className="lbl">Total</span>
                                            <span className="val">₹{(item.productPrice * item.quantity).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="purchase-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Delivered to: <strong>{item.location.toUpperCase()}</strong></span>
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}
                                            onClick={() => generateInvoice(item, user)}
                                        >
                                            <Icons.Export size={12} style={{ marginRight: '4px' }} />
                                            Invoice
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-purchases">
                            <EmptyBoxIcon />
                            <p>No orders placed yet.</p>
                            <small>Order products from the catalog to see your order history here.</small>
                        </div>
                    )}
                </div>
            </div>

            {/* Sandbox Modal Overlay */}
            {showSandboxModal && sandboxOrderDetails && (
                <div className="sandbox-modal-overlay">
                    <div className="sandbox-modal card">
                        <div className="sandbox-modal-header">
                            <span className="sandbox-badge">Simulated Checkout</span>
                            <h3 style={{ margin: 0 }}>Razorpay Sandbox Gateway</h3>
                        </div>
                        
                        <div className="sandbox-modal-body">
                            <div className="sandbox-item-row">
                                <span className="lbl">Product</span>
                                <span className="val">{sandboxOrderDetails.productName}</span>
                            </div>
                            <div className="sandbox-item-row">
                                <span className="lbl">Quantity</span>
                                <span className="val">{sandboxOrderDetails.quantity} Units</span>
                            </div>
                            <div className="sandbox-item-row">
                                <span className="lbl">Total Price</span>
                                <span className="val font-mono">₹{(sandboxOrderDetails.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="sandbox-item-row">
                                <span className="lbl">Order ID</span>
                                <span className="val font-mono" style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>{sandboxOrderDetails.orderId}</span>
                            </div>

                            <div className="sandbox-alert">
                                <Icons.Alert size={18} style={{ marginRight: '8px', flexShrink: 0, color: 'var(--warning-color)' }} />
                                <span>Razorpay credentials are not configured. Running mock payment sequence.</span>
                            </div>
                        </div>

                        <div className="sandbox-modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSandboxModal(false)}>
                                Cancel Transaction
                            </button>
                            <button className="btn btn-primary" onClick={handleSandboxPaymentSuccess}>
                                Complete Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
