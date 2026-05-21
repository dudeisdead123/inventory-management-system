import React, { useEffect, useState } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import './InsertProduct.css';
import { apiUrl } from '../config/api';

export default function UpdateProduct() {
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState();
    const [productBarcode, setProductBarcode] = useState();
    const [globalMinStock, setGlobalMinStock] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate("");

    const setName = (e) => {
        setProductName(e.target.value);
      };
    
      const setPrice = (e) => {
        setProductPrice(e.target.value);
      };
    
      const setBarcode = (e) => {
        const value = e.target.value.slice(0, 12);
        setProductBarcode(value);
    };

    const { id } = useParams("");
    const { showToast } = useToast();

    useEffect(() => {
        const getProduct = async () => {
          try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch(apiUrl(`/products/${id}`), {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "auth-token": token
              }
            });
      
            const data = await res.json();
      
            if (res.status === 201) {
              console.log("Data Retrieved.");
              setProductName(data.ProductName);
              setProductPrice(data.ProductPrice);
              setProductBarcode(data.ProductBarcode);
              setGlobalMinStock(data.globalMinStock || 10);
            } else {
              console.log("Something went wrong. Please try again.");
              showToast("Failed to retrieve product details.", "error");
            }
          } catch (err) {
            console.log(err);
            showToast("Failed to retrieve product details.", "error");
          }
        };
      
        getProduct();
    }, [id]);

    const updateProduct = async (e) => {
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
            const response = await fetch(apiUrl(`/updateproduct/${id}`), {
                method: "PUT",
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

            await response.json();

            if (response.status === 201) {
                showToast("Product updated successfully!", "success");
                navigate('/products');
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
                        <h1 className='form-main-title'>Update product information</h1>
                        <p className='form-subtitle'>Modify the details for {productName || 'this product'}</p>
                    </div>

                    {/* Error Message */}
                    {error && <div className="error-message-box">
                        <span>{error}</span>
                    </div>}

                    {/* Form Content */}
                    <form className='product-form' onSubmit={updateProduct}>
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
                            <button type="submit" onClick={updateProduct} className="btn-primary" disabled={loading}>
                                {loading ? 'Updating...' : 'Update Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
