import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import './StockManagement.css';

const StockManagement = () => {
    const { productId } = useParams();
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
                const socket = io('http://localhost:3001');
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

    const fetchProduct = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/products/${productId}`, {
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

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch('http://localhost:3001/locations', {
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched locations:', data);
                setLocations(data);
                if (data.length > 0 && !selectedLocation) {
                    setSelectedLocation(data[0].locationId);
                    setFromLocation(data[0].locationId);
                }
            } else {
                console.log('No locations found - may need to initialize');
                // Try to initialize locations if none found
                const initResponse = await fetch('http://localhost:3001/initialize-locations', {
                    method: 'POST',
                    headers: {
                        'auth-token': token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (initResponse.ok) {
                    console.log('Locations initialized, fetching again...');
                    // Recursively call to fetch the newly created locations
                    setTimeout(() => fetchLocations(), 1000);
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const fetchMovements = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/stock/movements/${productId}`, {
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
            const response = await fetch(`http://localhost:3001/products/${productId}/stock-limits`, {
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
            alert('Please provide valid limits: Min should be >= 0, Max should be > Min');
            return;
        }

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/products/${productId}/stock-limits`, {
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
                alert(data.message);
                setNewLimits({ location: '', minStockLevel: 0, maxStockLevel: 1000 });
                setShowLimitsForm(false);
                fetchStockLimits();
                fetchProduct(); // Refresh product data
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to add stock limits');
            }
        } catch (error) {
            console.error('Error adding stock limits:', error);
            alert('Network error occurred');
        }
    };

    // Update existing stock limits
    const handleUpdateStockLimits = async (location, minStockLevel, maxStockLevel) => {
        if (minStockLevel < 0 || maxStockLevel <= 0 || parseInt(minStockLevel) >= parseInt(maxStockLevel)) {
            alert('Please provide valid limits: Min should be >= 0, Max should be > Min');
            return;
        }

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/products/${productId}/stock-limits`, {
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
                alert(data.message);
                setEditingLimits({
                    ...editingLimits,
                    [location]: undefined
                });
                fetchStockLimits();
                fetchProduct(); // Refresh product data
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update stock limits');
            }
        } catch (error) {
            console.error('Error updating stock limits:', error);
            alert('Network error occurred');
        }
    };

    const handleStockOperation = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!quantity || quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        if (operationType === 'transfer') {
            if (!fromLocation || !toLocation) {
                alert('Please select both from and to locations for transfer');
                return;
            }
            if (fromLocation === toLocation) {
                alert('From and To locations cannot be the same');
                return;
            }
        } else {
            if (!selectedLocation) {
                alert('Please select a location');
                return;
            }
        }

        try {
            const token = localStorage.getItem('auth-token');
            let url = `http://localhost:3001/stock/${operationType}/${productId}`;
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
                alert(data.message);
                setQuantity('');
                setReason('');
                setReference('');
                fetchProduct();
                fetchMovements();
            } else {
                const error = await response.json();
                
                // Handle validation errors with detailed messages
                if (error.type === 'validation_error') {
                    const message = `${error.error}\n\nDetails:\n` +
                        `• Current Stock: ${error.currentStock}\n` +
                        `• Maximum Allowed: ${error.maxStock}\n` +
                        `• Requested Quantity: ${error.requestedQuantity}`;
                    alert(message);
                } else {
                    alert(error.error || 'Operation failed');
                }
            }
        } catch (error) {
            console.error('Error performing stock operation:', error);
            alert('Network error occurred');
        }
    };

    const handleAddLocation = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch('http://localhost:3001/locations', {
                method: 'POST',
                headers: {
                    'auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newLocation)
            });

            if (response.ok) {
                alert('Location added successfully');
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
                alert(error.error || 'Failed to add location');
            }
        } catch (error) {
            console.error('Error adding location:', error);
            alert('Network error occurred');
        }
    };

    const getStockLevelClass = (current, min) => {
        if (current === 0) return 'out-of-stock';
        if (current <= min) return 'low-stock';
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
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
                                {product.locationStock.map((location, index) => (
                                    <div key={index} className="location-card">
                                        <div className="location-header">
                                            <h4>{location.location}</h4>
                                            <span className={`stock-level ${getStockLevelClass(location.quantity, location.minStockLevel)}`}>
                                                {location.quantity} units
                                            </span>
                                        </div>
                                        <div className="location-details">
                                            <div className="detail-row">
                                                <span>Available:</span>
                                                <span>{location.quantity}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Reserved:</span>
                                                <span>{location.reservedQuantity || 0}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Damaged:</span>
                                                <span>{location.damagedQuantity || 0}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Min Level:</span>
                                                <span>{location.minStockLevel}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span>Max Level:</span>
                                                <span>{location.maxStockLevel}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                <label>
                                    <input 
                                        type="radio" 
                                        value="add" 
                                        checked={operationType === 'add'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    Add Stock
                                </label>
                                <label>
                                    <input 
                                        type="radio" 
                                        value="remove" 
                                        checked={operationType === 'remove'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    Remove Stock
                                </label>
                                <label>
                                    <input 
                                        type="radio" 
                                        value="transfer" 
                                        checked={operationType === 'transfer'}
                                        onChange={(e) => setOperationType(e.target.value)}
                                    />
                                    Transfer Stock
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
                                                {locations.map(loc => (
                                                    <option key={loc._id} value={loc.locationId}>
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
                                                {locations.map(loc => (
                                                    <option key={loc._id} value={loc.locationId}>
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
                                            {locations.map(loc => (
                                                <option key={loc._id} value={loc.locationId}>
                                                    {loc.locationName} ({loc.locationId})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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