import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, NavLink } from 'react-router-dom';
import './Navbar.css';import { Icons } from './Icons';

const BrandLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <Icons.Brand size={28} style={{ marginRight: '8px', color: 'var(--text-main)' }} strokeWidth={2} />
  </div>
);

const HomeIcon = () => <Icons.Dashboard size={16} style={{ marginRight: '6px' }} />;
const ProductsIcon = () => <Icons.Products size={16} style={{ marginRight: '6px' }} />;
const StockIcon = () => <Icons.Stock size={16} style={{ marginRight: '6px' }} />;
const AnalyticsIcon = () => <Icons.FeatureChart size={16} style={{ marginRight: '6px' }} />;

export default function Navbar(props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isLight, setIsLight] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light';
  });

  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLight]);

  const toggleTheme = () => {
    setIsLight(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'light' : 'dark');
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar-modern">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand" onClick={() => setIsMobileMenuOpen(false)}>
          <BrandLogo />
          <span className="brand-name">Inventory Hub</span>
        </NavLink>

        <button 
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <ul className="navbar-links">
            <li>
              <NavLink 
                to="/" 
                className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <HomeIcon />
                Dashboard
              </NavLink>
            </li>
            {user?.role !== 'customer' && (
              <>
                <li>
                  <NavLink 
                    to="/products" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <ProductsIcon />
                    Products
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/stock-dashboard" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <StockIcon />
                    Stock Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink 
                    to="/analytics" 
                    className={({ isActive }) => `nav-link ${isActive ? 'active-link' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <AnalyticsIcon />
                    Analytics
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isLight ? (
                <Icons.ThemeLight size={18} />
              ) : (
                <Icons.ThemeDark size={18} />
              )}
            </button>

            {user && (
            <div className="navbar-user">
              <div className="user-info">
                <span className="user-icon">
                  {user.role === 'customer' ? (
                    <Icons.Customers size={18} style={{ verticalAlign: 'middle' }} />
                  ) : (
                    <Icons.Admin size={18} style={{ verticalAlign: 'middle' }} />
                  )}
                </span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <Icons.Logout size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                Log out
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}
