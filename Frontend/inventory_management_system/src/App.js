import './App.css';
import Home from './components/Home';
import Navbar from './components/Navbar';
import Products from './components/Products';
import InsertProduct from './components/InsertProduct'
import UpdateProduct from './components/UpdateProduct';
import StockDashboard from './components/StockDashboard';
import StockManagement from './components/StockManagement';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerDashboard from './components/CustomerDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <div className="App">
        <Router>
          <Navbar title="IMS" about="About"></Navbar>
          <Routes>
            {user?.role === 'customer' ? (
              <>
                <Route path="/" element={<CustomerDashboard />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route exact path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/insertproduct" element={<InsertProduct />} />
                <Route path="/updateproduct/:id" element={<UpdateProduct />} />
                <Route path="/stock-dashboard" element={<StockDashboard />} />
                <Route path="/stock-management/:productId" element={<StockManagement />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </Router>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
