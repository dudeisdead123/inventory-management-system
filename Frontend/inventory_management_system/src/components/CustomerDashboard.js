import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './CustomerDashboard.css';

const CustomerDashboard = () => {
    const { user, socket } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
        // Fallback polling mechanism: guarantees data sync every 3 seconds
        // in case the local browser is aggressively blocking WebSocket connections or experiencing latency
        const pollInterval = setInterval(() => {
            fetchProducts(true); // silent fetch
        }, 3000);

        if (socket) {
            socket.on('stockUpdated', (data) => {
                // Optimistically update the exact product and location stock
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
        }
        
        return () => {
            clearInterval(pollInterval);
            if (socket) {
                socket.off('stockUpdated');
            }
        };
    }, [socket]);

    const fetchProducts = async (isSilent = false) => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/products?timestamp=${Date.now()}`, {
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const handleBuy = async (productId) => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/buy/${productId}`, {
                method: 'POST',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: user.location,
                    quantity: 1 // Default to buying 1 for now
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Purchase successful!');
                fetchProducts(); // Refresh local stock
            } else {
                alert(data.error || 'Purchase failed');
            }
        } catch (error) {
            console.error('Error making purchase:', error);
            alert('Network error occurred');
        }
    };

    if (loading) return <div className="loading"></div>;

    const userCity = user?.location?.toLowerCase() || '';

    // Filter products logically for the customer:
    // Some products might not even have stock array yet.
    // We only care about stock matching their location.
    return (
        <div className="customer-dashboard">
            <header className="dashboard-header">
                <h1>Welcome, {user?.name}</h1>
                <p>Showing products available in <strong>{user?.location}</strong></p>
            </header>
            
            <div className="product-grid">
                {products.length > 0 ? products.map(product => {
                    const localStockInfo = product.locationStock?.find(
                        loc => loc.location.toLowerCase() === userCity
                    );
                    const localStock = localStockInfo ? localStockInfo.quantity : 0;
                    
                    return (
                        <div key={product._id} className="product-card">
                            <h3>{product.ProductName}</h3>
                            <p className="price">₹{product.ProductPrice}</p>
                            <p className="stock-info">
                                {localStock > 0 
                                    ? <span className="in-stock">In Stock: {localStock}</span>
                                    : <span className="out-of-stock">Out of Stock</span>
                                }
                            </p>
                            <button 
                                className={`buy-button ${localStock === 0 ? 'disabled' : ''}`}
                                onClick={() => handleBuy(product._id)}
                            >
                                Buy 1 Item
                            </button>
                        </div>
                    );
                }) : (
                    <p>No products available to show.</p>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;
