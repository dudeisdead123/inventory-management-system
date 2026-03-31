import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Products.css'

export default function Products() {

    useEffect(() => {
        getProducts();
    }, [])

    const [productData, setProductData] = useState([]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth-token');
        return {
            "Content-Type": "application/json",
            "auth-token": token
        };
    };

    const getProducts = async (e) => {

        try {
            const res = await fetch("http://localhost:3001/products", {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await res.json();

            if (res.status === 201) {
                console.log("Data Retrieved.");
                setProductData(data);
            }
            else {
                console.log("Something went wrong. Please try again.");
            }
        } catch (err) {
            console.log(err);
        }
    }

    const deleteProduct = async (id) => {

        const response = await fetch(`http://localhost:3001/deleteproduct/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        const deletedata = await response.json();
        console.log(deletedata);

        if (response.status === 422 || !deletedata) {
            console.log("Error");
        } else {
            console.log("Product deleted");
            getProducts();
        }

    }

    const initializeLocations = async () => {
        try {
            const response = await fetch("http://localhost:3001/initialize-locations", {
                method: "POST",
                headers: getAuthHeaders()
            });

            const data = await response.json();
            
            if (response.status === 200) {
                console.log("Locations initialized:", data);
                alert(`${data.message}`);
            } else {
                console.log("Failed to initialize locations");
                alert("Failed to initialize locations. Please try again.");
            }
        } catch (err) {
            console.log(err);
            alert("Error initializing locations. Please try again.");
        }
    };

    const getStockStatusBadge = (product) => {
        const totalStock = product.totalStock || 0;
        if (totalStock === 0) {
            return <span className="stock-badge out-of-stock">Out of Stock</span>;
        } else if (product.isLowStock) {
            return <span className="stock-badge low-stock">Low Stock</span>;
        } else {
            return <span className="stock-badge in-stock">In Stock</span>;
        }
    };

    return (
        <>
            <div className='products-container'>
                <div className="products-header">
                    <h1>Products Inventory</h1>
                    <div className="header-actions">
                        <button 
                            onClick={initializeLocations} 
                            className='products-header-btn me-2'
                            title="Initialize default locations (warehouse, store, outlet)"
                        >
                            Setup Locations
                        </button>
                        <NavLink to="/stock-dashboard" className='products-header-btn me-3'>
                            Stock Dashboard
                        </NavLink>
                        <NavLink to="/insertproduct" className='home-action-btn'>
                            + Add new product
                        </NavLink>
                    </div>
                </div>
                
                <div className="products-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Product Name</th>
                                <th scope="col">Price</th>
                                <th scope="col">Barcode</th>
                                <th scope="col">Stock Status</th>
                                <th scope="col">Total Stock</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                productData.map((element, id) => {
                                    return (
                                        <tr key={element._id}>
                                            <td>{id + 1}</td>
                                            <td className="product-name">{element.ProductName}</td>
                                            <td>₹{element.ProductPrice}</td>
                                            <td>{element.ProductBarcode}</td>
                                            <td>{getStockStatusBadge(element)}</td>
                                            <td>
                                                <span className="total-stock">
                                                    {element.totalStock || 0} units
                                                </span>
                                                {element.isLowStock && (
                                                    <div className="low-stock-warning">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                        Needs Restocking
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <NavLink 
                                                        to={`/stock-management/${element._id}`} 
                                                        className="home-action-btn-sm me-2"
                                                        title="Manage Stock"
                                                    >
                                                        <i className="fa-solid fa-box"></i> Stock
                                                    </NavLink>
                                                    <NavLink 
                                                        to={`/updateproduct/${element._id}`} 
                                                        className="home-action-btn-sm me-2"
                                                        title="Edit Product"
                                                    >
                                                        <i className="fa-solid fa-pen-to-square"></i> Edit
                                                    </NavLink>
                                                    <button 
                                                        className="home-action-btn-sm" 
                                                        onClick={() => deleteProduct(element._id)}
                                                        title="Delete Product"
                                                    >
                                                        <i className="fa-solid fa-trash"></i> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
