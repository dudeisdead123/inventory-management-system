import React, { useState, useEffect, useMemo } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import './StockManagement.css';
import { Icons } from './Icons';
import { API_BASE_URL, apiUrl } from '../config/api';

const normalizeLocationRow = (row) => {
    if (!row) return null;
    const locationId = row.locationId || row.locationid || row.location;
    const locationName =
        row.locationName ||
        row.locationname ||
        (locationId
            ? String(locationId).charAt(0).toUpperCase() + String(locationId).slice(1)
            : 'Location');
    return {
        id: row.id || row._id || locationId,
        locationId,
        locationName,
    };
};

const StockManagement = () => {
    const { productId } = useParams();
    const { showToast } = useToast();
    const [product, setProduct] = useState(null);
    const [locations, setLocations] = useState([]);
    const [movements, setMovements] = useState([]);
    const [activeTab, setActiveTab] = useState('current');
    const [loading, setLoading] = useState(true);

    // Form states
    const [operationType, setOperationType] = useState('add');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    
    // Stock limits management
    const [stockLimits, setStockLimits] = useState([]);
    const [editingLimits, setEditingLimits] = useState({});
    const [showLimitsForm, setShowLimitsForm] = useState(false);
    const [newLimits, setNewLimits] = useState({
        location: '',
        minStockLevel: 0,
        maxStockLevel: 1000
    });
    
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [newLocation, setNewLocation] = useState({
        locationId: '',
        locationName: '',
        locationType: 'store',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        },
        contactInfo: {
            phone: '',
            email: '',
            manager: ''
        }
    });

    const locationOptions = useMemo(() => {
        if (locations.length > 0) {
            return locations;
        }
        if (!product?.locationStock?.length) {
            return [];
        }
        return product.locationStock
            .map((ls) => normalizeLocationRow({ location: ls.location, locationId: ls.location }))
            .filter((loc) => loc?.locationId);
    }, [locations, product]);

    useEffect(() => {
        if (productId) {
            fetchProduct();
            fetchMovements();
            fetchStockLimits();
        }
        fetchLocations();

        // Add real-time update handling
        const currentToken = localStorage.getItem('auth-token');
        if (currentToken) {
            import('socket.io-client').then(({ io }) => {
                const socket = io(API_BASE_URL);
                socket.on('stockUpdated', (data) => {
                    if (data.productId === productId) {
                        fetchProduct();
                        fetchMovements();
                    }
                });
                return () => socket.disconnect();
            });
        }
    }, [productId]);

    useEffect(() => {
        if (locationOptions.length > 0) {
            applyLocationDefaults(locationOptions);
        }
    }, [locationOptions]);

    const fetchProduct = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl(`/products/${productId}`), {
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProduct(data);
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyLocationDefaults = (normalized) => {
        if (!normalized.length) return;
        setSelectedLocation((prev) => prev || normalized[0].locationId);
        setFromLocation((prev) => prev || normalized[0].locationId);
        setToLocation((prev) => prev || (normalized[1]?.locationId || normalized[0].locationId));
    };

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const headers = {
                'auth-token': token,
                'Content-Type': 'application/json',
            };

            let response = await fetch(apiUrl('/locations'), { headers });

            if (!response.ok) {
                await fetch(apiUrl('/initialize-locations'), { method: 'POST', headers });
                response = await fetch(apiUrl('/locations'), { headers });
            }

            if (response.ok) {
                const data = await response.json();
                let normalized = (Array.isArray(data) ? data : [])
                    .map(normalizeLocationRow)
                    .filter((loc) => loc?.locationId);

                if (normalized.length === 0) {
                    await fetch(apiUrl('/initialize-locations'), { method: 'POST', headers });
                    const retry = await fetch(apiUrl('/locations'), { headers });
                    if (retry.ok) {
                        const retryData = await retry.json();
                        normalized = (Array.isArray(retryData) ? retryData : [])
                            .map(normalizeLocationRow)
                            .filter((loc) => loc?.locationId);
                    }
                }

                setLocations(normalized);
                applyLocationDefaults(normalized);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            showToast('Could not load locations. Check backend connection.', 'error');
        }
    };

    const fetchMovements = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl(`/stock/movements/${productId}`), {
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMovements(data.movements);
            }
        } catch (error) {
            console.error('Error fetching movements:', error);
        }
    };

    // Fetch stock limits for the product
    const fetchStockLimits = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl(`/products/${productId}/stock-limits`), {
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStockLimits(data.stockLimits);
            }
        } catch (error) {
            console.error('Error fetching stock limits:', error);
        }
    };

    // Add new stock limits for a location
    const handleAddStockLimits = async (e) => {
        e.preventDefault();
        
        if (!newLimits.location || newLimits.minStockLevel < 0 || newLimits.maxStockLevel <= 0 || 
            parseInt(newLimits.minStockLevel) >= parseInt(newLimits.maxStockLevel)) {
            showToast('Please provide valid limits: Min should be >= 0, Max should be > Min', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl(`/products/${productId}/stock-limits`), {
                method: 'PUT',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: newLimits.location,
                    minStockLevel: parseInt(newLimits.minStockLevel),
                    maxStockLevel: parseInt(newLimits.maxStockLevel)
                })
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message || 'Stock limits updated successfully!', 'success');
                setNewLimits({ location: '', minStockLevel: 0, maxStockLevel: 1000 });
                setShowLimitsForm(false);
                fetchStockLimits();
                fetchProduct(); // Refresh product data
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to add stock limits', 'error');
            }
        } catch (error) {
            console.error('Error adding stock limits:', error);
            showToast('Network error occurred', 'error');
        }
    };

    // Update existing stock limits
    const handleUpdateStockLimits = async (location, minStockLevel, maxStockLevel) => {
        if (minStockLevel < 0 || maxStockLevel <= 0 || parseInt(minStockLevel) >= parseInt(maxStockLevel)) {
            showToast('Please provide valid limits: Min should be >= 0, Max should be > Min', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl(`/products/${productId}/stock-limits`), {
                method: 'PUT',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location: location,
                    minStockLevel: parseInt(minStockLevel),
                    maxStockLevel: parseInt(maxStockLevel)
                })
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message || 'Stock limits updated successfully!', 'success');
                setEditingLimits({
                    ...editingLimits,
                    [location]: undefined
                });
                fetchStockLimits();
                fetchProduct(); // Refresh product data
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to update stock limits', 'error');
            }
        } catch (error) {
            console.error('Error updating stock limits:', error);
            showToast('Network error occurred', 'error');
        }
    };

    const handleStockOperation = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!quantity || quantity <= 0) {
            showToast('Please enter a valid quantity', 'warning');
            return;
        }
        
        if (operationType === 'transfer') {
            if (!fromLocation || !toLocation) {
                showToast('Please select both from and to locations for transfer', 'warning');
                return;
            }
            if (fromLocation === toLocation) {
                showToast('From and To locations cannot be the same', 'warning');
                return;
            }
        } else {
            if (!selectedLocation) {
                showToast('Please select a location', 'warning');
                return;
            }
        }

        try {
            const token = localStorage.getItem('auth-token');
            let url = apiUrl(`/stock/${operationType}/${productId}`);
            let body = { 
                location: selectedLocation || 'main-warehouse', 
                quantity: parseInt(quantity), 
                reason: reason || 'Manual stock adjustment', 
                reference 
            };

            if (operationType === 'transfer') {
                body = { 
                    fromLocation, 
                    toLocation, 
                    quantity: parseInt(quantity), 
                    reason: reason || 'Stock transfer' 
                };
            }
            
            console.log('Sending stock operation request:', { url, body });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                showToast(data.message || 'Stock operation completed successfully!', 'success');
                setQuantity('');
                setReason('');
                setReference('');
                fetchProduct();
                fetchMovements();
            } else {
                const error = await response.json();
                
                // Handle validation errors with detailed messages
                if (error.type === 'validation_error') {
                    const message = `${error.error}. Current Stock: ${error.currentStock}, Max Capacity: ${error.maxStock}, Requested: ${error.requestedQuantity}`;
                    showToast(message, 'error');
                } else {
                    showToast(error.error || 'Operation failed', 'error');
                }
            }
        } catch (error) {
            console.error('Error performing stock operation:', error);
            showToast('Network error occurred', 'error');
        }
    };

    const handleAddLocation = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(apiUrl('/locations'), {
                method: 'POST',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newLocation)
            });

            if (response.ok) {
                showToast('Location added successfully!', 'success');
                setShowLocationForm(false);
                setNewLocation({
                    locationId: '',
                    locationName: '',
                    locationType: 'store',
                    address: { street: '', city: '', state: '', zipCode: '', country: '' },
                    contactInfo: { phone: '', email: '', manager: '' }
                });
                fetchLocations();
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to add location', 'error');
            }
        } catch (error) {
            console.error('Error adding location:', error);
            showToast('Network error occurred', 'error');
        }
    };

    const getStockLevelClass = (current, min) => {
        if (current === 0) return 'out-of-stock';
        if (current < min) return 'low-stock';
        if (current <= min * 2) return 'medium-stock';
        return 'good-stock';
    };

    const getMovementIcon = (type) => {
        const icons = {
            'inbound': '📈',
            'outbound': '📉',
            'transfer': '🔄',
            'damaged': '⚠️',
            'returned': '↩️',
            'adjustment': '⚖️'
        };
        return icons[type] || '📦';
    };

    if (loading) {
        return <div className="stock-management loading"></div>;
    }

    if (!product) {
        return <div className="stock-management error">Product not found</div>;
    }

    return (
        <div className="stock-management">
            <div className="stock-header">
                <div className="header-info">
                    <h1>{product.ProductName}</h1>
                    <p>Barcode: {product.ProductBarcode} | Price: ₹{product.ProductPrice}</p>
                    <div className="total-stock">
                        <span className={`stock-badge ${product.isLowStock ? 'low' : 'normal'}`}>
                            Total Stock: {product.totalStock || 0}
                        </span>
                        {product.isLowStock && (
                            <span className="low-stock-warning">
                                Low Stock Alert!
                            </span>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    <NavLink to="/products" className="btn btn-secondary">
                        <span className="btn-arrow">
                            <Icons.ArrowLeft size={20} strokeWidth={3} />
                        </span> Back to Products
                    </NavLink>
                </div>
            </div>

            <div className="stock-tabs">
                <button 
                    className={activeTab === 'current' ? 'active' : ''}
                    onClick={() => setActiveTab('current')}
                >
                    Current Stock
                </button>
                <button 
                    className={activeTab === 'operations' ? 'active' : ''}
                    onClick={() => setActiveTab('operations')}
                >
                    Stock Operations
                </button>
                <button 
                    className={activeTab === 'movements' ? 'active' : ''}
                    onClick={() => setActiveTab('movements')}
                >
                    Movement History
                </button>

            </div>

            <div className="tab-content">
                {activeTab === 'current' && (
                    <div className="current-stock-tab">
                        <h3>Stock by Location</h3>
                        {product.locationStock && product.locationStock.length > 0 ? (
                            <div className="location-stock-grid">
                                {product.locationStock.map((location, index) => {
                                    const utilizationPercent = Math.min(100, Math.max(0, (location.quantity / (location.maxStockLevel || 1000)) * 100));
                                    return (
                                        <div key={index} className="location-card">
                                            <div className="location-header">
                                                <h4>{location.location.toUpperCase()}</h4>
                                                <span className={`stock-level-badge ${getStockLevelClass(location.quantity, location.minStockLevel)}`}>
                                                    {location.quantity} units
                                                </span>
                                            </div>
                                            
                                            <div className="capacity-bar-wrapper">
                                                <div className="capacity-bar-track">
                                                    <div 
                                                        className={`capacity-bar-fill ${getStockLevelClass(location.quantity, location.minStockLevel)}`}
                                                        style={{ width: `${utilizationPercent}%` }}
                                                    ></div>
                                                </div>
                                                <div className="capacity-bar-text">
                                                    <span>Utilization:</span>
                                                    <span>{utilizationPercent.toFixed(0)}%</span>
                                                </div>
                                            </div>

                                            <div className="location-details">
                                                <div className="detail-row">
                                                    <span>Available:</span>
                                                    <strong>{location.quantity}</strong>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Reserved:</span>
                                                    <span>{location.reservedQuantity || 0}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span>Damaged:</span>
                                                    <span>{location.damagedQuantity || 0}</span>
                                                </div>
                                                <div className="detail-row flex-highlight">
                                                    <span>Min Alert Level:</span>
                                                    <span>{location.minStockLevel}</span>
                                                </div>
                                                <div className="detail-row flex-highlight">
                                                    <span>Max Cap Level:</span>
                                                    <span>{location.maxStockLevel}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="no-stock-message">
                                <p>No stock available at any location</p>
                                <p>Use the Stock Operations tab to add inventory</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="operations-tab">
                        <h3>Stock Operations</h3>
                        <form onSubmit={handleStockOperation} className="stock-operation-form">
                            <div className="operation-type-selector">
                                <label className="operation-type-option">
                                    <input
                                        type="radio"
                                        value="add"
                                        checked={operationType === 'add'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    <span className="operation-type-text">Add Stock</span>
                                </label>
                                <label className="operation-type-option">
                                    <input
                                        type="radio"
                                        value="remove"
                                        checked={operationType === 'remove'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    <span className="operation-type-text">Remove Stock</span>
                                </label>
                                <label className="operation-type-option">
                                    <input
                                        type="radio"
                                        value="transfer"
                                        checked={operationType === 'transfer'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    <span className="operation-type-text">Transfer Stock</span>
                                </label>
                            </div>

                            <div className="form-grid">
                                {operationType === 'transfer' ? (
                                    <>
                                        <div className="form-group">
                                            <label>From Location:</label>
                                            <select 
                                                value={fromLocation}
                                                onChange={(e) => setFromLocation(e.target.value)}
                                                required
                                            >
                                                <option value="">Select location</option>
                                                {locationOptions.map((loc) => (
                                                    <option key={loc.id} value={loc.locationId}>
                                                        {loc.locationName} ({loc.locationId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>To Location:</label>
                                            <select 
                                                value={toLocation}
                                                onChange={(e) => setToLocation(e.target.value)}
                                                required
                                            >
                                                <option value="">Select location</option>
                                                {locationOptions.map((loc) => (
                                                    <option key={`to-${loc.id}`} value={loc.locationId}>
                                                        {loc.locationName} ({loc.locationId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="form-group">
                                        <label>Location:</label>
                                        <select 
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            required
                                        >
                                            <option value="">Select location</option>
                                            {locationOptions.map((loc) => (
                                                <option key={loc.id} value={loc.locationId}>
                                                    {loc.locationName} ({loc.locationId})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {locationOptions.length === 0 && (
                                    <p className="location-hint">
                                        No locations loaded. Refresh the page or run Setup Locations from Products.
                                    </p>
                                )}

                                <div className="form-group">
                                    <label>Quantity:</label>
                                    <input 
                                        type="number" 
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Reason:</label>
                                    <input 
                                        type="text" 
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Optional reason for this operation"
                                    />
                                </div>

                                {(operationType === 'add' || operationType === 'remove') && (
                                    <div className="form-group">
                                        <label>Reference:</label>
                                        <input 
                                            type="text" 
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="Order ID, PO Number, etc."
                                        />
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn btn-primary operation-btn">
                                {operationType === 'add' && 'Add Stock'}
                                {operationType === 'remove' && 'Remove Stock'}
                                {operationType === 'transfer' && 'Transfer Stock'}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'movements' && (
                    <div className="movements-tab">
                        <h3>Movement History</h3>
                        {movements.length > 0 ? (
                            <div className="movements-list">
                                {movements.map((movement, index) => (
                                    <div key={index} className="movement-card">
                                        <div className="movement-header">
                                            <div className="movement-title">
                                                <h4>{movement.type.toUpperCase()}</h4>
                                                <span className="movement-date">
                                                    {new Date(movement.date).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="movement-quantity">
                                                <span className={`quantity-badge ${movement.type}`}>
                                                    {movement.type === 'outbound' || movement.type === 'damaged' ? '-' : '+'}
                                                    {movement.quantity}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="movement-details">
                                            <div className="detail">
                                                <strong>Location:</strong> {movement.location}
                                            </div>
                                            {movement.reason && (
                                                <div className="detail">
                                                    <strong>Reason:</strong> {movement.reason}
                                                </div>
                                            )}
                                            {movement.reference && (
                                                <div className="detail">
                                                    <strong>Reference:</strong> {movement.reference}
                                                </div>
                                            )}
                                            <div className="detail">
                                                <strong>Performed by:</strong> {movement.performedBy?.name || 'System'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-movements">
                                <p>No stock movements recorded yet</p>
                            </div>
                        )}
                    </div>
                )}


            </div>
        </div>
    );
};

export default StockManagement;