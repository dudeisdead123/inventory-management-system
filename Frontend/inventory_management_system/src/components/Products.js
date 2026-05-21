import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import './Products.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Icons } from './Icons';
import { apiUrl } from '../config/api';

const ExcelIcon = () => <Icons.FeatureBox size={16} style={{ marginRight: '6px' }} />;
const PdfIcon = () => <Icons.Receipt size={16} style={{ marginRight: '6px' }} />;
const SetupIcon = () => <Icons.Wizard size={16} style={{ marginRight: '6px' }} />;
const SearchIcon = () => <Icons.Search size={18} />;
const AlertIcon = () => <Icons.Alert size={14} style={{ display: 'inline-block', verticalAlign: 'middle', color: 'var(--warning-color)' }} />;
const BoxIcon = () => <Icons.FeatureBox size={14} style={{ marginRight: '4px' }} />;
const EditIcon = () => <Icons.Edit size={14} style={{ marginRight: '4px' }} />;
const TrashIcon = () => <Icons.Delete size={14} style={{ marginRight: '4px' }} />;
const EmptyBoxIcon = () => <Icons.FeatureBox size={48} style={{ opacity: 0.4, marginBottom: '16px' }} className="icon-float" />;

export default function Products() {
    const [productData, setProductData] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // QR Label Modal States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        getProducts();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth-token');
        return {
            "Content-Type": "application/json",
            "auth-token": token
        };
    };

    const getProducts = async () => {
        try {
            const res = await fetch(apiUrl('/products'), {
                method: "GET",
                headers: getAuthHeaders()
            });

            const data = await res.json();

            if (res.status === 201) {
                console.log("Data Retrieved.");
                setProductData(data);
            } else {
                console.log("Something went wrong. Please try again.");
            }
        } catch (err) {
            console.log(err);
        }
    };

    const filteredProducts = productData.filter(product => {
        const matchesSearch = !searchQuery ||
            (product.ProductName && String(product.ProductName).toLowerCase().includes(searchQuery.toLowerCase())) ||
            (product.ProductBarcode && String(product.ProductBarcode).toLowerCase().includes(searchQuery.toLowerCase()));
            
        const category = product.ProductCategory || 'General';
        const matchesCategory = categoryFilter === 'all' || category.toLowerCase() === categoryFilter.toLowerCase();
        
        let matchesStatus = true;
        const totalStock = product.totalStock || 0;
        if (statusFilter === 'in') {
            matchesStatus = totalStock > 0 && !product.isLowStock;
        } else if (statusFilter === 'low') {
            matchesStatus = product.isLowStock && totalStock > 0;
        } else if (statusFilter === 'out') {
            matchesStatus = totalStock === 0;
        }
        
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const categories = ['all', ...new Set(productData.map(p => p.ProductCategory || 'General').filter(Boolean))];

    const exportToPDF = () => {
        setIsExporting(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text("IMS - Products Inventory Report", 14, 22);
            doc.setFontSize(11);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Filters applied - Category: ${categoryFilter}, Status: ${statusFilter}`, 14, 36);

            const tableColumn = ["#", "Product Name", "Category", "Price", "Barcode", "Stock", "Status"];
            const tableRows = [];

            filteredProducts.forEach((p, index) => {
                const rowData = [
                    index + 1,
                    p.ProductName,
                    p.ProductCategory || 'General',
                    `INR ${p.ProductPrice}`,
                    p.ProductBarcode,
                    p.totalStock,
                    p.totalStock === 0 ? "Out of Stock" : p.isLowStock ? "Low Stock" : "In Stock"
                ];
                tableRows.push(rowData);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 44,
                theme: 'grid',
                headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] }
            });

            doc.save("Inventory_Report.pdf");
            showToast("Inventory report PDF exported successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to export PDF report.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const exportToExcel = () => {
        setIsExporting(true);
        try {
            const worksheetData = filteredProducts.map((p, index) => ({
                "S.No": index + 1,
                "Product Name": p.ProductName,
                "Category": p.ProductCategory || 'General',
                "Price": p.ProductPrice,
                "Barcode": p.ProductBarcode,
                "Stock": p.totalStock,
                "Status": p.totalStock === 0 ? "Out of Stock" : p.isLowStock ? "Low Stock" : "In Stock"
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
            XLSX.writeFile(workbook, "Inventory_Data.xlsx");
            showToast("Inventory data Excel exported successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to export Excel data.", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        
        const response = await fetch(apiUrl(`/deleteproduct/${id}`), {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        const deletedata = await response.json();
        console.log(deletedata);

        if (response.status === 422 || !deletedata) {
            console.log("Error");
            showToast("Failed to delete product.", "error");
        } else {
            console.log("Product deleted");
            showToast("Product deleted successfully!", "success");
            getProducts();
        }
    };

    const initializeLocations = async () => {
        try {
            const response = await fetch(apiUrl('/initialize-locations'), {
                method: "POST",
                headers: getAuthHeaders()
            });

            const data = await response.json();
            
            if (response.status === 200) {
                console.log("Locations initialized:", data);
                showToast(data.message || "Locations initialized successfully!", "success");
            } else {
                console.log("Failed to initialize locations");
                showToast("Failed to initialize locations. Please try again.", "error");
            }
        } catch (err) {
            console.log(err);
            showToast("Error initializing locations. Please try again.", "error");
        }
    };

    const handleDownloadQR = async () => {
        if (!selectedProduct) return;
        try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                JSON.stringify({
                    id: selectedProduct._id,
                    name: selectedProduct.ProductName,
                    barcode: selectedProduct.ProductBarcode,
                    price: selectedProduct.ProductPrice,
                    category: selectedProduct.ProductCategory
                })
            )}`;
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${selectedProduct.ProductName.replace(/\s+/g, '_')}_QR_Label.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            showToast("QR Code downloaded successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to download QR code.", "error");
        }
    };

    const handlePrintQR = () => {
        window.print();
    };

    const getStockStatusBadge = (product) => {
        const totalStock = product.totalStock || 0;
        if (totalStock === 0) {
            return <span className="status-badge out-of-stock">Out of Stock</span>;
        } else if (product.isLowStock) {
            return <span className="status-badge low-stock">Low Stock</span>;
        } else {
            return <span className="status-badge in-stock">In Stock</span>;
        }
    };

    return (
        <div className='products-container'>
            <div className="products-header">
                <div className="header-info">
                    <h1>Products Inventory</h1>
                    <p className="subtitle">View, search, and manage products and stock distribution across locations.</p>
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-secondary" 
                        onClick={exportToExcel}
                        disabled={isExporting}
                    >
                        <ExcelIcon /> Excel Export
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={exportToPDF}
                        disabled={isExporting}
                    >
                        <PdfIcon /> PDF Export
                    </button>
                    <button 
                        onClick={initializeLocations} 
                        className='btn btn-secondary'
                        title="Initialize default locations (warehouse, store, outlet)"
                    >
                        <SetupIcon /> Setup Locations
                    </button>
                    <NavLink to="/stock-dashboard" className='btn btn-secondary'>
                        <BoxIcon /> Stock Dashboard
                    </NavLink>
                    <NavLink to="/insertproduct" className='btn btn-primary'>
                        + Add Product
                    </NavLink>
                </div>
            </div>

            <div className="filter-controls-container">
                <div className="search-wrapper">
                    <span className="search-icon"><SearchIcon /></span>
                    <input 
                        type="text" 
                        placeholder="Search products by name or barcode..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="dropdowns-wrapper">
                    <div className="filter-select-group">
                        <label htmlFor="categoryFilter">Category</label>
                        <select 
                            id="categoryFilter"
                            value={categoryFilter} 
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            {categories.map((cat, idx) => (
                                <option key={idx} value={cat}>{cat.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-select-group">
                        <label htmlFor="statusFilter">Status</label>
                        <select 
                            id="statusFilter"
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">ALL STATUSES</option>
                            <option value="in">IN STOCK</option>
                            <option value="low">LOW STOCK</option>
                            <option value="out">OUT OF STOCK</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="products-table-wrapper">
                {filteredProducts.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Barcode</th>
                                <th>Stock Status</th>
                                <th>Total Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((element, id) => (
                                <tr key={element._id}>
                                    <td>{id + 1}</td>
                                    <td className="product-name">{element.ProductName}</td>
                                    <td><span className="category-tag">{element.ProductCategory || 'General'}</span></td>
                                    <td className="product-price-cell">₹{element.ProductPrice.toLocaleString()}</td>
                                    <td><code>{element.ProductBarcode}</code></td>
                                    <td>{getStockStatusBadge(element)}</td>
                                    <td>
                                        <div className="stock-count-cell">
                                            <span className="stock-units">{element.totalStock || 0} units</span>
                                            {element.isLowStock && (
                                                <span className="low-stock-icon-warning" title="Restocking needed!">
                                                    <AlertIcon />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct(element);
                                                    setShowQRModal(true);
                                                }}
                                                className="btn-action-sm btn-action-stock"
                                                title="QR Code Label"
                                                style={{ background: 'var(--primary-light)', color: 'var(--white)', borderColor: 'var(--glass-border)' }}
                                            >
                                                <Icons.Wizard size={14} style={{ marginRight: '4px' }} /> Label
                                            </button>
                                            <NavLink 
                                                to={`/stock-management/${element._id}`} 
                                                className="btn-action-sm btn-action-stock"
                                                title="Manage Stock"
                                            >
                                                <BoxIcon /> Stock
                                            </NavLink>
                                            <NavLink 
                                                to={`/updateproduct/${element._id}`} 
                                                className="btn-action-sm btn-action-edit"
                                                title="Edit Product"
                                            >
                                                <EditIcon /> Edit
                                            </NavLink>
                                            <button 
                                                className="btn-action-sm btn-action-delete" 
                                                onClick={() => deleteProduct(element._id)}
                                                title="Delete Product"
                                            >
                                                <TrashIcon /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-products-found">
                        <EmptyBoxIcon />
                        <h3>No Products Found</h3>
                        <p>We couldn't find any products matching your search query or filter selection.</p>
                    </div>
                )}
            </div>

            {showQRModal && selectedProduct && (
                <div className="qr-modal-overlay">
                    <div className="qr-modal-card">
                        <div className="qr-modal-header">
                            <h3>Warehouse QR Label</h3>
                            <button className="qr-modal-close-btn" onClick={() => { setShowQRModal(false); setSelectedProduct(null); }}>&times;</button>
                        </div>
                        
                        <div className="warehouse-label-container" id="warehouse-label">
                            <div className="label-title-brand">IMS Warehouse Label</div>
                            <h4 className="label-product-name">{selectedProduct.ProductName}</h4>
                            <div className="label-qr-wrapper">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                        JSON.stringify({
                                            id: selectedProduct._id,
                                            name: selectedProduct.ProductName,
                                            barcode: selectedProduct.ProductBarcode,
                                            price: selectedProduct.ProductPrice,
                                            category: selectedProduct.ProductCategory
                                        })
                                    )}`}
                                    alt="QR Code" 
                                    className="label-qr-image"
                                />
                            </div>
                            <div className="label-details-row">
                                <div className="label-detail-item">
                                    <span className="label-detail-lbl">Category</span>
                                    <span className="label-detail-val">{selectedProduct.ProductCategory || 'General'}</span>
                                </div>
                                <div className="label-detail-item right">
                                    <span className="label-detail-lbl">Price</span>
                                    <span className="label-detail-val">₹{selectedProduct.ProductPrice.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="label-details-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <div className="label-detail-item" style={{ width: '100%', alignItems: 'center' }}>
                                    <span className="label-detail-lbl">SKU / Barcode</span>
                                    <span className="label-detail-val">{selectedProduct.ProductBarcode}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="qr-modal-actions">
                            <button className="btn btn-secondary" onClick={handleDownloadQR}>
                                Download
                            </button>
                            <button className="btn btn-primary" onClick={handlePrintQR}>
                                Print Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
