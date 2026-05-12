import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import './Analytics.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Professional SVG Icons
const Icons = {
    Location: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
        </svg>
    ),
    Trend: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
    ),
    Category: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
            <path d="M5 3v4"></path>
            <path d="M19 17v4"></path>
            <path d="M3 5h4"></path>
            <path d="M17 19h4"></path>
        </svg>
    ),
    Trophy: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
        </svg>
    ),
    Health: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
    ),
    PDF: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="8" y1="13" x2="16" y2="13"></line>
            <line x1="8" y1="17" x2="16" y2="17"></line>
        </svg>
    ),
    Excel: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <rect x="8" y="11" width="8" height="8" rx="1"></rect>
            <line x1="8" y1="15" x2="16" y2="15"></line>
            <line x1="12" y1="11" x2="12" y2="19"></line>
        </svg>
    ),
    Alert: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
    )
};

// Light theme color palette
const COLORS = ['#f1c40f', '#2979ff', '#00e676', '#7c4dff', '#ff9100', '#00bcd4', '#ff1744'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}>
                {label && <p style={{ color: '#1f2937', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 6px 0' }}>{label}</p>}
                {payload.map((entry, i) => (
                    <p key={i} style={{ color: entry.color, fontSize: '0.82rem', margin: '2px 0', fontWeight: 600 }}>
                        {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const NoData = () => (
    <div className="no-data">
        <div className="no-data-icon"><Icons.Alert /></div>
        <p>No data available yet</p>
    </div>
);

const Analytics = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch('http://localhost:3001/analytics/data', {
                headers: { 'auth-token': token, 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError('Could not load analytics data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllProductsForExport = async () => {
        const token = localStorage.getItem('auth-token');
        const res = await fetch('http://localhost:3001/products', {
            headers: { 'auth-token': token }
        });
        if (!res.ok) throw new Error('Failed to fetch products');
        return await res.json();
    };

    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            const products = await fetchAllProductsForExport();
            const doc = new jsPDF();
            
            doc.setFontSize(22);
            doc.setTextColor(241, 196, 15); // IMS Yellow
            doc.text('Inventory Management System', 14, 22);
            
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Inventory Status Report - Generated on ${new Date().toLocaleString()}`, 14, 30);
            doc.text(`Manager: ${user.name}`, 14, 36);

            const health = data.stockHealth;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Summary: ${health.total} Products | ${health.healthy} Healthy | ${health.low} Low Stock | ${health.out} Out of Stock`, 14, 48);

            const tableColumn = ["#", "Product Name", "Category", "Price", "Barcode", "Stock", "Status"];
            const tableRows = [];

            products.forEach((p, index) => {
                const rowData = [
                    index + 1,
                    p.ProductName,
                    p.ProductCategory || 'General',
                    `INR ${p.ProductPrice}`,
                    p.ProductBarcode,
                    `${p.totalStock} units`,
                    p.totalStock === 0 ? "OUT OF STOCK" : p.isLowStock ? "LOW STOCK" : "IN STOCK"
                ];
                tableRows.push(rowData);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 55,
                theme: 'striped',
                headStyles: { fillColor: [241, 196, 15], textColor: [0, 0, 0], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 250, 250] },
            });

            doc.save(`IMS_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF Export failed:', err);
            alert('Failed to generate PDF report.');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const products = await fetchAllProductsForExport();
            const worksheetData = products.map((p, index) => ({
                "S.No": index + 1,
                "Product Name": p.ProductName,
                "Category": p.ProductCategory || 'General',
                "Price (INR)": p.ProductPrice,
                "Barcode": p.ProductBarcode,
                "Total Stock": p.totalStock,
                "Stock Status": p.totalStock === 0 ? "Out of Stock" : p.isLowStock ? "Low Stock" : "In Stock",
                "Last Updated": new Date(p.updatedAt).toLocaleDateString()
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

            const max_width = worksheetData.reduce((w, r) => Math.max(w, r["Product Name"].length), 10);
            worksheet["!cols"] = [ { wch: 5 }, { wch: max_width + 5 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 } ];

            XLSX.writeFile(workbook, `IMS_Inventory_Sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error('Excel Export failed:', err);
            alert('Failed to generate Excel report.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-page">
                <div className="analytics-loading">
                    <div className="analytics-spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-page">
                <div className="analytics-loading">
                    <div className="no-data-icon" style={{ marginBottom: '1rem' }}>
                        <Icons.Alert />
                    </div>
                    <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
                </div>
            </div>
        );
    }

    const { categoryData, locationData, dailyMovements, movementTypeData, topProducts, stockHealth } = data;

    return (
        <div className="analytics-page">
            <div className="analytics-container">
                <div className="analytics-header">
                    <div className="header-text">
                        <h1>Analytics Dashboard</h1>
                        <p>System insights and reports — {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="header-export-actions">
                        <button className="export-btn pdf" onClick={exportToPDF} disabled={isExporting}>
                            <span className="btn-icon"><Icons.PDF /></span> 
                            {isExporting ? 'Generating...' : 'Export PDF'}
                        </button>
                        <button className="export-btn excel" onClick={exportToExcel} disabled={isExporting}>
                            <span className="btn-icon"><Icons.Excel /></span> 
                            {isExporting ? 'Generating...' : 'Export Excel'}
                        </button>
                    </div>
                </div>

                <div className="charts-grid">

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon location"><Icons.Location /></div>
                            <h3>Stock by Location</h3>
                        </div>
                        <div className="chart-container">
                            {locationData && locationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="stock" name="Stock" fill="#f1c40f" radius={[8, 8, 0, 0]}>
                                            {locationData.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon trend"><Icons.Trend /></div>
                            <h3>7-Day Stock Movements</h3>
                        </div>
                        <div className="chart-container">
                            {dailyMovements && dailyMovements.some(d => d.inbound > 0 || d.outbound > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyMovements} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" />
                                        <Line type="monotone" dataKey="inbound" name="Inbound" stroke="#00e676" strokeWidth={3} dot={{ r: 5, fill: '#00e676' }} activeDot={{ r: 7 }} />
                                        <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#ff1744" strokeWidth={3} dot={{ r: 5, fill: '#ff1744' }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon category"><Icons.Category /></div>
                            <h3>Category Distribution</h3>
                        </div>
                        <div className="chart-container">
                            {categoryData && categoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            innerRadius={60}
                                            dataKey="products"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {categoryData.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon trophy"><Icons.Trophy /></div>
                            <h3>Top Stocked Products</h3>
                        </div>
                        <div className="chart-container">
                            {topProducts && topProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} width={100} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="stock" name="Units" fill="#f1c40f" radius={[0, 8, 8, 0]} barSize={25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon health"><Icons.Health /></div>
                            <h3>Inventory Health</h3>
                        </div>
                        {stockHealth ? (
                            <div>
                                <div className="health-grid">
                                    <div className="health-tile healthy">
                                        <div className="health-count">{stockHealth.healthy}</div>
                                        <div className="health-label">Healthy</div>
                                    </div>
                                    <div className="health-tile low">
                                        <div className="health-count">{stockHealth.low}</div>
                                        <div className="health-label">Low Stock</div>
                                    </div>
                                    <div className="health-tile out">
                                        <div className="health-count">{stockHealth.out}</div>
                                        <div className="health-label">Out Stock</div>
                                    </div>
                                </div>
                                <div className="health-total">
                                    <span>Total Products: <strong>{stockHealth.total}</strong></span>
                                </div>
                            </div>
                        ) : <NoData />}
                    </div>
                </div>
            </div>
        </div>
    );
;
};

export default Analytics;
