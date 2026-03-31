import React from 'react'

export default function Home() {
  return (
    <div className='container-fluid p-5'>
      <div className="hero-section text-center">
        <h1 className="display-4">Welcome to <br /> our Inventory <br /> Management System</h1>
        <p className="lead">Manage your products, track stock levels, and monitor inventory across multiple locations.</p>
      </div>
      
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm feature-card">
            <div className="card-body text-center">
              <h5 className="card-title">Manage products</h5>
              <p className="card-text">Add, update, and delete products <br /> in your inventory.</p>
              <a href="/products" className="home-action-btn">View products</a>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card h-100 shadow-sm feature-card">
            <div className="card-body text-center">
              <h5 className="card-title">Stock dashboard</h5>
              <p className="card-text">Monitor stock levels, alerts, and inventory movements in real-time.</p>
              <a href="/stock-dashboard" className="home-action-btn">View dashboard</a>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card h-100 shadow-sm feature-card">
            <div className="card-body text-center">
              <h5 className="card-title">Add new product</h5>
              <p className="card-text">Quickly add new products to your <br /> inventory system.</p>
              <a href="/insertproduct" className="home-action-btn">Add product</a>
            </div>
          </div>
        </div>
      </div>
      

    </div>
  )
}
