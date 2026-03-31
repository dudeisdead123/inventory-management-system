import React, { useEffect, useState } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import './InsertProduct.css'; 

export default function UpdateProduct() {
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState();
    const [productBarcode, setProductBarcode] = useState();
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

    const {id} = useParams("");

    useEffect(() => {
        const getProduct = async () => {
          try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch(`http://localhost:3001/products/${id}`, {
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
            } else {
              console.log("Something went wrong. Please try again.");
            }
          } catch (err) {
            console.log(err);
          }
        };
      
        getProduct();
    }, [id]);

    const updateProduct = async (e) => {
        e.preventDefault();

        if (!productName || !productPrice || !productBarcode) {
            setError("*Please fill in all the required fields.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem('auth-token');
            const response = await fetch(`http://localhost:3001/updateproduct/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": token
                },
                body: JSON.stringify({ "ProductName": productName, "ProductPrice": productPrice, "ProductBarcode": productBarcode })
            });

            await response.json();

            if (response.status === 201) {
                alert("Data Updated");
                navigate('/products');
            }
            else {
                setError("Something went wrong. Please try again.");
            }
        } catch (err) {
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
