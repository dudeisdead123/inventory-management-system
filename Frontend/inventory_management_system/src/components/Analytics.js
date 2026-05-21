import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area, ReferenceLine
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import './Analytics.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Icons } from './Icons';
import { apiUrl } from '../config/api';
// Theme‑aware vibrant gradient palette
const THEME_COLORS = {
  dark: [
    '#94a3b8', // Muted Slate
    '#818cf8', // Soft Indigo
    '#38bdf8', // Soft Sky
    '#2dd4bf', // Soft Teal
    '#a78bfa', // Soft Violet
    '#fbbf24', // Soft Amber (for contrast)
    '#f472b6', // Soft Pink
  ],
  light: [
    '#64748b', // Professional Slate
    '#4f46e5', // Professional Indigo
    '#0284c7', // Professional Sky
    '#0d9488', // Professional Teal
    '#7c3aed', // Professional Violet
    '#d97706', // Professional Amber
    '#db2777', // Professional Pink
  ],
  barDark: [
    '#3b82f6', // Bright Blue
    '#8b5cf6', // Vivid Purple
    '#f43f5e', // Rose/Pink
    '#f59e0b', // Amber/Orange
    '#10b981', // Emerald Green
  ],
  barLight: [
    '#1d4ed8', // Deep Blue
    '#6d28d9', // Deep Purple
    '#be123c', // Deep Rose
    '#b45309', // Deep Amber
    '#047857', // Deep Emerald
  ]
};
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
            }}>
                {label && <p style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.85rem', margin: '0 0 6px 0' }}>{label}</p>}
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

    // Email Settings State
    const [emailSettings, setEmailSettings] = useState({
        adminEmail: '',
        appPassword: '',
        configured: false,
        currentEmail: ''
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [testEmailSending, setTestEmailSending] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Stock Forecasting State
    const [forecastData, setForecastData] = useState([]);
    const [forecastLoading, setForecastLoading] = useState(true);
    const [forecastSearch, setForecastSearch] = useState('');
    const [forecastSort, setForecastSort] = useState({ key: 'daysRemaining', dir: 'asc' });
    const [forecastChartProduct, setForecastChartProduct] = useState(null);

    useEffect(() => {
        fetchAnalytics();
        fetchEmailSettings();
        fetchForecast();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth-token');
        return {
            'Content-Type': 'application/json',
            'auth-token': token
        };
    };

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch(apiUrl('/analytics/data'), {
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

    const fetchForecast = async () => {
        setForecastLoading(true);
        try {
            const token = localStorage.getItem('auth-token');
            const res = await fetch(apiUrl('/analytics/forecast'), {
                headers: { 'auth-token': token, 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to fetch forecast');
            const json = await res.json();
            setForecastData(json);
            if (json.length > 0) setForecastChartProduct(json[0]);
        } catch (err) {
            console.error('Forecast fetch error:', err);
        } finally {
            setForecastLoading(false);
        }
    };

    const fetchEmailSettings = async () => {
        try {
            const res = await fetch(apiUrl('/email-settings'), {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const config = await res.json();
                setEmailSettings(prev => ({
                    ...prev,
                    configured: config.isConfigured || false,
                    currentEmail: config.adminEmail || ''
                }));
            }
        } catch (error) {
            console.error('Error loading email settings:', error);
        }
    };

    const handleSaveEmailSettings = async (e) => {
        e.preventDefault();
        setFeedbackMessage({ text: '', type: '' });

        if (!emailSettings.adminEmail || !emailSettings.appPassword) {
            setFeedbackMessage({ text: 'Email and App Password are required.', type: 'error' });
            return;
        }

        setSettingsLoading(true);
        try {
            const res = await fetch(apiUrl('/email-settings'), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    adminEmail: emailSettings.adminEmail,
                    appPassword: emailSettings.appPassword
                })
            });

            if (res.ok) {
                const result = await res.json();
                setFeedbackMessage({ text: 'SMTP Email Settings saved and configured!', type: 'success' });
                setEmailSettings(prev => ({
                    ...prev,
                    configured: result.status?.isConfigured || true,
                    currentEmail: emailSettings.adminEmail,
                    adminEmail: '',
                    appPassword: ''
                }));
            } else {
                setFeedbackMessage({ text: 'Failed to configure email settings.', type: 'error' });
            }
        } catch (error) {
            console.error('Error saving email settings:', error);
            setFeedbackMessage({ text: 'Error connecting to email service endpoint.', type: 'error' });
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSendTestEmail = async () => {
        setTestEmailSending(true);
        setFeedbackMessage({ text: '', type: '' });
        try {
            const res = await fetch(apiUrl('/email-settings/test'), {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (res.ok) {
                setFeedbackMessage({ text: 'Test alert email sent successfully! Check your inbox.', type: 'success' });
            } else {
                const errData = await res.json();
                setFeedbackMessage({ text: `Failed: ${errData.error || 'Check details'}`, type: 'error' });
            }
        } catch (error) {
            console.error('Error sending test email:', error);
            setFeedbackMessage({ text: 'Could not trigger test alert email.', type: 'error' });
        } finally {
            setTestEmailSending(false);
        }
    };

    const fetchAllProductsForExport = async () => {
        const token = localStorage.getItem('auth-token');
        const res = await fetch(apiUrl('/products'), {
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
            doc.setTextColor(99, 102, 241); 
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

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 55,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 250, 250] },
            });

            doc.save(`IMS_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF Export failed:', err);
            console.error('PDF Export failed:', err);
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
            console.error('Excel Export failed:', err);
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
                        <p>System insights, reports, and SMTP alerts configuration</p>
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
                    {/* Stock by Location */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon location"><Icons.Location /></div>
                            <h3>Stock by Location</h3>
                        </div>
                        <div className="chart-container">
                            {locationData && locationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="stock" name="Stock" fill="var(--text-main)" radius={[4, 4, 0, 0]}>
                                            {locationData.map((_, i) => (
                                                <Cell 
                                                    key={i} 
                                                    fill={document.body.classList.contains('light-theme') ? THEME_COLORS.barLight[i % THEME_COLORS.barLight.length] : THEME_COLORS.barDark[i % THEME_COLORS.barDark.length]} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    {/* 7-Day Movements */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon trend"><Icons.Trend /></div>
                            <h3>7-Day Stock Movements</h3>
                        </div>
                        <div className="chart-container">
                            {dailyMovements && dailyMovements.some(d => d.inbound > 0 || d.outbound > 0) ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyMovements} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Inter' }} />
                                        <Line type="monotone" dataKey="inbound" name="Inbound" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                                        <Line type="monotone" dataKey="outbound" name="Outbound" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon category"><Icons.Category /></div>
                            <h3>Category Distribution</h3>
                        </div>
                        <div className="chart-container relative-container">
                            {categoryData && categoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={95}
                                            innerRadius={65}
                                            dataKey="products"
                                            nameKey="name"
                                            paddingAngle={4}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 }}
                                            style={{ outline: 'none', fontFamily: 'Inter', fontSize: '11px', fontWeight: 600, fill: 'var(--text-main)' }}
                                            className="pie-chart-pie"
                                        >
                                            {categoryData.map((entry, i) => (
                                                <Cell 
                                                    key={i} 
                                                    fill={document.body.classList.contains('light-theme') ? THEME_COLORS.barLight[i % THEME_COLORS.barLight.length] : THEME_COLORS.barDark[i % THEME_COLORS.barDark.length]} 
                                                    stroke="rgba(0,0,0,0.1)"
                                                    strokeWidth={2}
                                                    className="pie-cell-hover"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                            {categoryData && categoryData.length > 0 && (
                                <div className="pie-center-label">
                                    <span className="pie-center-value">{categoryData.length}</span>
                                    <span className="pie-center-text">Categories</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Stocked Products */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon trophy"><Icons.Trophy /></div>
                            <h3>Top Stocked Products</h3>
                        </div>
                        <div className="chart-container">
                            {topProducts && topProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} width={80} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="stock" name="Units" fill="var(--text-main)" radius={[0, 4, 4, 0]} barSize={14}>
                                            {topProducts.map((_, i) => (
                                                <Cell 
                                                    key={i} 
                                                    fill={document.body.classList.contains('light-theme') ? THEME_COLORS.barLight[i % THEME_COLORS.barLight.length] : THEME_COLORS.barDark[i % THEME_COLORS.barDark.length]} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <NoData />}
                        </div>
                    </div>

                    {/* Inventory Health */}
                    <div className="chart-card">
                        <div className="chart-card-header">
                            <div className="chart-icon health"><Icons.Health /></div>
                            <h3>Inventory Health</h3>
                        </div>
                        {stockHealth ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

                    {/* Nodemailer SMTP Settings Control Panel */}
                    {/* Nodemailer SMTP Settings Control Panel */}
                    {!emailSettings.configured ? (
                    <div className="chart-card smtp-config-card">
                        <div className="smtp-header-pro">
                            <div>
                                <h3>Email Configuration</h3>
                                <p>Set up SMTP credentials to enable automated stock alerts.</p>
                            </div>
                            <span className="status-badge-pro inactive"><Icons.Alert size={14} /> Not Configured</span>
                        </div>
                        <div className="smtp-content-pro">
                            <form className="smtp-form-pro" onSubmit={handleSaveEmailSettings}>
                                <div className="form-group-pro">
                                    <label htmlFor="adminEmailInput">Sender Email Address</label>
                                    <input 
                                        type="email" 
                                        id="adminEmailInput"
                                        placeholder="your_email@gmail.com" 
                                        value={emailSettings.adminEmail}
                                        onChange={(e) => setEmailSettings({...emailSettings, adminEmail: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group-pro">
                                    <label htmlFor="appPasswordInput">App Password</label>
                                    <div className="password-input-pro">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            id="appPasswordInput"
                                            placeholder="16-character Google app password" 
                                            value={emailSettings.appPassword}
                                            onChange={(e) => setEmailSettings({...emailSettings, appPassword: e.target.value})}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            className="toggle-pwd-pro"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <Icons.EyeHide size={16} /> : <Icons.EyeShow size={16} />}
                                        </button>
                                    </div>
                                    <small className="help-text-pro">
                                        Generate an App Password in your Google Account Security settings.
                                    </small>
                                </div>

                                {feedbackMessage.text && (
                                    <div className={`feedback-banner-pro ${feedbackMessage.type}`}>
                                        {feedbackMessage.type === 'success' ? <Icons.Success size={16} /> : <Icons.Alert size={16} />}
                                        <span>{feedbackMessage.text}</span>
                                    </div>
                                )}

                                <div className="smtp-actions-pro">
                                    <button 
                                        type="submit" 
                                        className="btn-pro primary"
                                        disabled={settingsLoading}
                                    >
                                        {settingsLoading ? 'Saving Changes...' : 'Save Configuration'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    ) : (
                    <div className="chart-card smtp-config-card smtp-configured-banner">
                        <div className="smtp-configured-inner">
                            <div className="smtp-configured-icon">
                                <Icons.Success size={22} />
                            </div>
                            <div>
                                <p className="smtp-configured-title">Email Alerts Active</p>
                                <p className="smtp-configured-sub">Automated stock alerts are configured and sending from <strong>{emailSettings.currentEmail || 'your Gmail account'}</strong>.</p>
                            </div>
                            <button
                                className="btn-pro secondary smtp-reconfigure-btn"
                                onClick={() => setEmailSettings(prev => ({ ...prev, configured: false }))}
                            >
                                Reconfigure
                            </button>
                        </div>
                        {feedbackMessage.text && (
                            <div className={`feedback-banner-pro ${feedbackMessage.type}`} style={{marginTop: '1rem'}}>
                                {feedbackMessage.type === 'success' ? <Icons.Success size={16} /> : <Icons.Alert size={16} />}
                                <span>{feedbackMessage.text}</span>
                            </div>
                        )}
                    </div>
                    )}

                </div>

                {/* ── Stock Forecasting Section ── */}
                <ForecastSection
                    forecastData={forecastData}
                    forecastLoading={forecastLoading}
                    forecastSearch={forecastSearch}
                    setForecastSearch={setForecastSearch}
                    forecastSort={forecastSort}
                    setForecastSort={setForecastSort}
                    forecastChartProduct={forecastChartProduct}
                    setForecastChartProduct={setForecastChartProduct}
                    onRefresh={fetchForecast}
                />

            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Forecasting Sub-Component
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
    critical: { label: 'Critical',  color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)' },
    warning:  { label: 'Warning',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
    healthy:  { label: 'Healthy',   color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' },
    stable:   { label: 'Stable',    color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
};

const ForecastSection = ({
    forecastData, forecastLoading, forecastSearch, setForecastSearch,
    forecastSort, setForecastSort, forecastChartProduct, setForecastChartProduct, onRefresh
}) => {
    const [chartBtnPulseId, setChartBtnPulseId] = useState(null);

    const handleChartSelect = (row) => {
        setForecastChartProduct(row);
        setChartBtnPulseId(row.productId);
        window.setTimeout(() => setChartBtnPulseId(null), 420);
    };

    // Build 30-day projected decay points for selected product
    const decayPoints = useMemo(() => {
        if (!forecastChartProduct) return [];
        const { currentStock, salesVelocity } = forecastChartProduct;
        const pts = [];
        for (let d = 0; d <= 30; d++) {
            const projected = Math.max(0, currentStock - salesVelocity * d);
            pts.push({ day: `Day ${d}`, stock: Math.round(projected) });
        }
        return pts;
    }, [forecastChartProduct]);

    // Filtered + sorted table rows
    const tableRows = useMemo(() => {
        let rows = forecastData.filter(r =>
            r.productName.toLowerCase().includes(forecastSearch.toLowerCase())
        );
        rows = [...rows].sort((a, b) => {
            let va = a[forecastSort.key], vb = b[forecastSort.key];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return forecastSort.dir === 'asc' ? -1 : 1;
            if (va > vb) return forecastSort.dir === 'asc' ? 1 : -1;
            return 0;
        });
        return rows;
    }, [forecastData, forecastSearch, forecastSort]);

    const kpi = useMemo(() => ({
        critical: forecastData.filter(r => r.status === 'critical').length,
        warning:  forecastData.filter(r => r.status === 'warning').length,
        healthy:  forecastData.filter(r => r.status === 'healthy').length,
        stable:   forecastData.filter(r => r.status === 'stable').length,
        avgDays:  forecastData.length
            ? Math.round(forecastData.filter(r => r.status !== 'stable').reduce((s, r) => s + (r.daysRemaining || 0), 0)
                / (forecastData.filter(r => r.status !== 'stable').length || 1))
            : 0,
    }), [forecastData]);

    const handleSort = (key) => {
        setForecastSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const SortArrow = ({ col }) => (
        <span style={{ marginLeft: '4px', opacity: forecastSort.key === col ? 1 : 0.3, fontSize: '0.7rem' }}>
            {forecastSort.key === col ? (forecastSort.dir === 'asc' ? '▲' : '▼') : '▲'}
        </span>
    );

    const runoutDay = forecastChartProduct
        ? (forecastChartProduct.salesVelocity > 0
            ? Math.min(30, Math.ceil(forecastChartProduct.daysRemaining))
            : null)
        : null;

    return (
        <div className="forecast-section">
            {/* Section header */}
            <div className="forecast-header">
                <div className="forecast-header-text">
                    <div className="forecast-header-icon"><Icons.Trend size={22}/></div>
                    <div>
                        <h2>Stock Forecasting</h2>
                        <p>Projected runout dates based on 30-day sales velocity</p>
                    </div>
                </div>
                <button className="forecast-refresh-btn" onClick={onRefresh} disabled={forecastLoading}>
                    <Icons.Refresh size={15} />
                    {forecastLoading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {forecastLoading ? (
                <div className="forecast-loading">
                    <div className="analytics-spinner" />
                    <p>Calculating stock velocity...</p>
                </div>
            ) : forecastData.length === 0 ? (
                <div className="forecast-loading">
                    <div className="no-data-icon"><Icons.Alert /></div>
                    <p>No forecasting data available. Add stock movements to generate velocity data.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="forecast-kpi-grid">
                        <div className="forecast-kpi-card critical">
                            <div className="forecast-kpi-value">{kpi.critical}</div>
                            <div className="forecast-kpi-label">Critical (&lt;7 days)</div>
                            <div className="forecast-kpi-sub">Restock immediately</div>
                        </div>
                        <div className="forecast-kpi-card warning">
                            <div className="forecast-kpi-value">{kpi.warning}</div>
                            <div className="forecast-kpi-label">Warning (&lt;15 days)</div>
                            <div className="forecast-kpi-sub">Plan reorder soon</div>
                        </div>
                        <div className="forecast-kpi-card healthy">
                            <div className="forecast-kpi-value">{kpi.healthy}</div>
                            <div className="forecast-kpi-label">Healthy (≥15 days)</div>
                            <div className="forecast-kpi-sub">Stock level is fine</div>
                        </div>
                        <div className="forecast-kpi-card stable">
                            <div className="forecast-kpi-value">{kpi.stable}</div>
                            <div className="forecast-kpi-label">Stable (no outbound)</div>
                            <div className="forecast-kpi-sub">No outbound movement</div>
                        </div>
                        <div className="forecast-kpi-card avg">
                            <div className="forecast-kpi-value">{kpi.avgDays}<span className="forecast-kpi-unit">d</span></div>
                            <div className="forecast-kpi-label">Avg Days Remaining</div>
                            <div className="forecast-kpi-sub">Across active products</div>
                        </div>
                        <div className="forecast-kpi-card total">
                            <div className="forecast-kpi-value">{forecastData.length}</div>
                            <div className="forecast-kpi-label">Total Products</div>
                            <div className="forecast-kpi-sub">In forecast analysis</div>
                        </div>
                    </div>

                    {/* Interactive Decay Chart */}
                    <div className="forecast-chart-card">
                        <div className="forecast-chart-header">
                            <div>
                                <h3>30-Day Stock Decay Projection</h3>
                                <p className="forecast-chart-sub">
                                    {forecastChartProduct
                                        ? `${forecastChartProduct.productName} · Velocity: ${forecastChartProduct.salesVelocity.toFixed(2)} units/day`
                                        : 'Select a product'}
                                </p>
                            </div>
                            <select
                                className="forecast-product-select"
                                value={forecastChartProduct?.productId || ''}
                                onChange={e => {
                                    const found = forecastData.find(r => String(r.productId) === e.target.value);
                                    if (found) setForecastChartProduct(found);
                                }}
                            >
                                {forecastData.map(r => (
                                    <option key={r.productId} value={r.productId}>{r.productName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="forecast-chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={decayPoints} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false}/>
                                    <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} interval={4}/>
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }}/>
                                    <Tooltip content={<CustomTooltip />}/>
                                    {runoutDay !== null && runoutDay <= 30 && (
                                        <ReferenceLine
                                            x={`Day ${runoutDay}`}
                                            stroke="#f43f5e"
                                            strokeDasharray="6 3"
                                            label={{ value: 'Runout', fill: '#f43f5e', fontSize: 10, fontWeight: 700 }}
                                        />
                                    )}
                                    <Area
                                        type="monotone"
                                        dataKey="stock"
                                        name="Projected Stock"
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        fill="url(#stockGradient)"
                                        dot={false}
                                        activeDot={{ r: 5, fill: '#6366f1' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Forecast Table */}
                    <div className="forecast-table-card">
                        <div className="forecast-table-toolbar">
                            <h3>Forecast Table</h3>
                            <div className="forecast-search-wrapper">
                                <Icons.Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={forecastSearch}
                                    onChange={e => setForecastSearch(e.target.value)}
                                    className="forecast-search-input"
                                />
                            </div>
                        </div>
                        <div className="forecast-table-wrapper">
                            <table className="forecast-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('productName')} className="sortable">
                                            Product <SortArrow col="productName"/>
                                        </th>
                                        <th onClick={() => handleSort('currentStock')} className="sortable">
                                            Current Stock <SortArrow col="currentStock"/>
                                        </th>
                                        <th onClick={() => handleSort('salesVelocity')} className="sortable">
                                            Velocity (u/day) <SortArrow col="salesVelocity"/>
                                        </th>
                                        <th onClick={() => handleSort('daysRemaining')} className="sortable">
                                            Days Remaining <SortArrow col="daysRemaining"/>
                                        </th>
                                        <th onClick={() => handleSort('status')} className="sortable">
                                            Status <SortArrow col="status"/>
                                        </th>
                                        <th>Chart</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No products match your search.</td></tr>
                                    ) : tableRows.map((row) => {
                                        const meta = STATUS_META[row.status] || STATUS_META.stable;
                                        const isSelected = forecastChartProduct?.productId === row.productId;
                                        return (
                                            <tr key={row.productId} className={isSelected ? 'forecast-row-selected' : ''}>
                                                <td className="forecast-product-name">{row.productName}</td>
                                                <td className="forecast-mono">{row.currentStock.toLocaleString()}</td>
                                                <td className="forecast-mono">{row.salesVelocity.toFixed(2)}</td>
                                                <td className="forecast-mono">
                                                    {row.status === 'stable' ? '—' : (
                                                        <span style={{ color: meta.color, fontWeight: 700 }}>
                                                            {row.daysRemaining > 999 ? '999+' : Math.round(row.daysRemaining)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="forecast-badge" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="forecast-chart-cell">
                                                    <button
                                                        type="button"
                                                        className={`forecast-chart-btn${isSelected ? ' is-active' : ''}${chartBtnPulseId === row.productId ? ' is-pulse' : ''}`}
                                                        onClick={() => handleChartSelect(row)}
                                                        aria-label={`View stock decay chart for ${row.productName}`}
                                                        aria-pressed={isSelected}
                                                        title="View decay chart"
                                                    >
                                                        <span className="forecast-chart-btn-icon" aria-hidden="true">
                                                            <Icons.FeatureChart size={15} strokeWidth={2} />
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="forecast-table-footer">
                            Showing {tableRows.length} of {forecastData.length} products
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Analytics;
