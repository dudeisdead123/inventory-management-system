import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Navbar.css'

export default function Navbar(props) {
  const { user, logout } = useAuth();
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
              </>
            )}
          </ul>

          {user && (
            <div className="navbar-user">
              <div className="user-info">
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
