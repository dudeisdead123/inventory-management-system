import React from 'react';
import './Home.css';

import { Icons as GlobalIcons } from './Icons';

// SVG Icons
const Icons = {
  Products: () => <GlobalIcons.FeatureBox />,
  Dashboard: () => <GlobalIcons.FeatureChart />,
  AddProduct: () => <GlobalIcons.Add size={28} className="icon-float" />
};

export default function Home() {
  return (
    <div className='home-container'>
      <div className="hero-section">
        <h1 className="hero-title">Welcome to <br /> Inventory Management System</h1>
        <p className="hero-subtitle">Manage products, track real-time stock levels, optimize distributions, and monitor inventory movements across multiple locations.</p>
      </div>
      
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <Icons.Products />
          </div>
          <h3 className="feature-title">Manage Products</h3>
          <p className="feature-description">Add, update, and delete catalog products. View warehouse levels, filter categories, and export records instantly.</p>
          <a href="/products" className="feature-action-btn">View Products</a>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <Icons.Dashboard />
          </div>
          <h3 className="feature-title">Stock Dashboard</h3>
          <p className="feature-description">Monitor real-time levels, critical low-stock alerts, and perform interactive balancing adjustments between locations.</p>
          <a href="/stock-dashboard" className="feature-action-btn">View Dashboard</a>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <Icons.AddProduct />
          </div>
          <h3 className="feature-title">Add New Product</h3>
          <p className="feature-description">Quickly register brand new products into the system database with barcode details and pricing limits.</p>
          <a href="/insertproduct" className="feature-action-btn">Add Product</a>
        </div>
      </div>
    </div>
  );
}
