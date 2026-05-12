import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'
import './Navbar.css'

export default function Navbar(props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar-modern">
      <div className="navbar-container">


        <button 
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          <ul className="navbar-links">
            <li>
              <a href="/" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                {location.pathname !== '/' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="nav-icon-arrow" style={{ marginRight: '8px' }}>
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                )}
                Dashboard
              </a>
            </li>
            {user?.role !== 'customer' && (
              <>
                <li>
                  <a href="/products" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>

                    Products
                  </a>
                </li>
                <li>
                  <a href="/stock-dashboard" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    Stock Dashboard
                  </a>
                </li>
                <li>
                  <a href="/analytics" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    Analytics
                  </a>
                </li>
              </>
            )}
          </ul>

          {user && (
            <div className="navbar-user">
              <div className="user-info">
                <span className="user-icon">
                  {user.role === 'customer' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  )}
                </span>
                <span className="user-name">{user.name}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
