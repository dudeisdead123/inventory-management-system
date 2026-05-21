import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import './InsertProduct.css';
import { apiUrl } from '../config/api';

export default function InsertProduct() {
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState("");
    const [productBarcode, setProductBarcode] = useState("");
    const [globalMinStock, setGlobalMinStock] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate("");

    const { showToast } = useToast();

    const setName = (e) => {
        setProductName(e.target.value);
    }

    const setPrice = (e) => {
        setProductPrice(e.target.value);
    }

    const setBarcode = (e) => {
        const value = e.target.value.slice(0, 12);
        setProductBarcode(value);
    };

    const addProduct = async (e) => {
        e.preventDefault();

        if (!productName || !productPrice || !productBarcode) {
            setError("*Please fill in all the required fields.");
            showToast("Please fill in all the required fields.", "warning");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch(apiUrl('/insertproduct'), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": token
                },
                body: JSON.stringify({ 
                    "ProductName": productName, 
                    "ProductPrice": productPrice, 
                    "ProductBarcode": productBarcode,
                    "globalMinStock": globalMinStock
                })
            });

            await res.json();

            if (res.status === 201) {
                showToast("Product inserted successfully!", "success");
                setProductName("");
                setProductPrice("");
                setProductBarcode("");
                navigate('/products');
            }
            else if (res.status === 422) {
                showToast("Product with this barcode already exists.", "error");
            }
            else {
                showToast("Something went wrong. Please try again.", "error");
                setError("Something went wrong. Please try again.");
            }
        } catch (err) {
            showToast("An error occurred. Please try again later.", "error");
            setError("An error occurred. Please try again later.");
            console.log(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='product-page-wrapper'>
            <div className='product-form-container'>
                <div className='product-form-card'>
                    {/* Header Section */}
                    <div className='form-header-section'>
                        <h1 className='form-main-title'>Add new product</h1>
                        <p className='form-subtitle'>Fill in the product details below</p>
                    </div>

                    {/* Error Message */}
                    {error && <div className="error-message-box">
                        <span>{error}</span>
                    </div>}

                    {/* Form Content */}
                    <form className='product-form' onSubmit={addProduct}>
                        <div className="form-field-group">
                            <label htmlFor="product_name" className="field-label">
                                Product Name
                                <span className="required-star">*</span>
                            </label>
                            <input 
                                type="text" 
                                onChange={setName} 
                                value={productName} 
                                className="field-input" 
                                id="product_name" 
                                placeholder="e.g., Laptop Pro" 
                                required 
                            />
                        </div>

                        <div className="form-field-group">
                            <label htmlFor="product_price" className="field-label">
                                Product Price
                                <span className="required-star">*</span>
                            </label>
                            <div className='price-input-wrapper'>
                                <span className='currency-symbol'>₹</span>
                                <input 
                                    type="number" 
                                    onChange={setPrice} 
                                    value={productPrice} 
                                    className="field-input price-input" 
                                    id="product_price" 
                                    placeholder="0.00" 
                                    step="0.01"
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-field-group">
                            <label htmlFor="product_barcode" className="field-label">
                                Product Barcode
                                <span className="required-star">*</span>
                            </label>
                            <input 
                                type="number" 
                                onChange={setBarcode} 
                                value={productBarcode} 
                                maxLength={12} 
                                className="field-input" 
                                id="product_barcode" 
                                placeholder="Enter 12-digit barcode" 
                                required 
                            />
                            <p className='helper-text'>Max 12 digits. Must be unique.</p>
                        </div>

                        <div className="form-field-group">
                            <label htmlFor="global_min_stock" className="field-label">
                                Global Minimum Stock Alert
                                <span className="required-star">*</span>
                            </label>
                            <input 
                                type="number" 
                                onChange={(e) => setGlobalMinStock(e.target.value)} 
                                value={globalMinStock} 
                                className="field-input" 
                                id="global_min_stock" 
                                placeholder="e.g., 10" 
                                required 
                            />
                            <p className='helper-text'>Receive an alert when total stock falls below this level.</p>
                        </div>

                        {/* Button Group */}
                        <div className='form-button-group'>
                            <NavLink to="/products" className='btn-cancel'>
                                Cancel
                            </NavLink>
                            <button type="submit" onClick={addProduct} className="btn-primary" disabled={loading}>
                                {loading ? 'Inserting...' : 'Add product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

