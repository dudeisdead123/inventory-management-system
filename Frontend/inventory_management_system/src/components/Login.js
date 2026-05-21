import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './Login.css';

import { Icons } from './Icons';

const BrandLogo = () => (
  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
    <Icons.Brand size={48} className="icon-draw-in" color="var(--primary-color)" strokeWidth={1.5} />
  </div>
);

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'customer',
        location: 'Mumbai',
        adminPasscode: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register } = useAuth();
    const { showToast } = useToast();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!isLogin) {
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                showToast('Passwords do not match', 'warning');
                return;
            }
            if (formData.role === 'admin' && formData.adminPasscode !== 'admin123') {
                setError('Invalid Admin Passcode. Use "admin123" for evaluation.');
                showToast('Invalid Admin Passcode', 'error');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
                if (result.success) {
                    showToast('Logged in successfully! Welcome back.', 'success');
                }
            } else {
                result = await register(
                    formData.name, 
                    formData.email, 
                    formData.password, 
                    formData.role, 
                    formData.role === 'admin' ? 'All' : formData.location
                );
                if (result.success) {
                    showToast('Account created successfully! Welcome aboard.', 'success');
                }
            }

            if (!result.success) {
                setError(result.error);
                showToast(result.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again.');
            showToast('An unexpected error occurred. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            role: 'customer',
            location: 'Mumbai',
            adminPasscode: ''
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="login-card">
                    <div className="login-brand">
                        <BrandLogo />
                        <h3>Inventory Hub</h3>
                    </div>
                    
                    <h2>{isLogin ? 'Log in' : 'Create Account'}</h2>
                    <p className="login-subtitle">
                        {isLogin ? 'Welcome back! Please enter your details.' : 'Get started by creating your account.'}
                    </p>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="login-form">
                        {!isLogin && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="name">Full Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label htmlFor="role">Role</label>
                                        <select 
                                            id="role" 
                                            name="role" 
                                            value={formData.role} 
                                            onChange={handleChange} 
                                            required
                                        >
                                            <option value="customer">Customer</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                    
                                    {formData.role === 'customer' ? (
                                        <div className="form-group">
                                            <label htmlFor="location">Your Location</label>
                                            <select 
                                                id="location" 
                                                name="location" 
                                                value={formData.location} 
                                                onChange={handleChange} 
                                                required
                                            >
                                                <option value="Mumbai">Mumbai</option>
                                                <option value="Delhi">Delhi</option>
                                                <option value="Bengaluru">Bengaluru</option>
                                                <option value="Chennai">Chennai</option>
                                                <option value="Kolkata">Kolkata</option>
                                                <option value="Hyderabad">Hyderabad</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label htmlFor="adminPasscode">Admin Passcode</label>
                                            <input
                                                type="password"
                                                id="adminPasscode"
                                                name="adminPasscode"
                                                value={formData.adminPasscode}
                                                onChange={handleChange}
                                                required
                                                placeholder="Enter admin passcode"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        
                        <div className="form-group">
                            <label htmlFor="email">{isLogin ? 'Email Address' : 'Work Email'}</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="person@example.com"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder={isLogin ? "Enter your password" : "At least 5 characters"}
                                    minLength={5}
                                    className="password-input"
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <Icons.EyeOff size={20} />
                                    ) : (
                                        <Icons.Eye size={20} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        placeholder="Repeat your password"
                                        minLength={5}
                                        className="password-input"
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <Icons.EyeOff size={20} />
                                        ) : (
                                            <Icons.Eye size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <div className="login-toggle">
                        {isLogin ? (
                            <>New to Inventory Hub? <button type="button" onClick={toggleMode}>Create an account</button></>
                        ) : (
                            <>Have an account? <button type="button" onClick={toggleMode}>Sign in instead</button></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;