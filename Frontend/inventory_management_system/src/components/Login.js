import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'customer',
        location: 'Mumbai'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register } = useAuth();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let result;
            if (isLogin) {
                result = await login(formData.email, formData.password);
            } else {
                result = await register(formData.name, formData.email, formData.password, formData.role, formData.location);
            }

            if (!result.success) {
                setError(result.error);
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again.');
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
            role: 'customer',
            location: 'Mumbai'
        });
    };

    return (
        <div className="login-container">
            <div className="login-wrapper">
                <div className="login-card">
                    {isLogin ? (
                        <>
                            <h2>Log in</h2>
                        </>
                    ) : (
                        <>
                            <h2>Start your free 14-day trial</h2>
                            <p className="login-subtitle">Manage inventory and orders from any device.</p>
                        </>
                    )}
                    
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
                                <div className="form-group">
                                    <label htmlFor="location">Location</label>
                                    <select id="location" name="location" value={formData.location} onChange={handleChange} required>
                                        <option value="Mumbai">Mumbai</option>
                                        <option value="Delhi">Delhi</option>
                                        <option value="Bengaluru">Bengaluru</option>
                                        <option value="Chennai">Chennai</option>
                                        <option value="Kolkata">Kolkata</option>
                                        <option value="Hyderabad">Hyderabad</option>
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <div className="form-group">
                            <label htmlFor="email">{isLogin ? 'Email' : 'Work email'}</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder={isLogin ? "Enter your email" : "person@email.com"}
                            />
                        </div>
                        
                        {isLogin && (
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your password"
                                    minLength={5}
                                />
                            </div>
                        )}
                        
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Loading...' : 'Continue'}
                        </button>
                    </form>

                    <div className="divider">
                        <span className="divider-text">Or continue with:</span>
                    </div>

                    <div className="social-buttons">
                        <button className="social-btn" type="button" onClick={() => alert('Google login coming soon')}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                        <button className="social-btn" type="button" onClick={() => alert('Apple login coming soon')}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.459 2.208 3.09 3.792 3.029 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                            </svg>
                            Apple
                        </button>
                        <button className="social-btn" type="button" onClick={() => alert('Xero login coming soon')}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="12" fill="#13B5EA"/>
                                <text x="12" y="15.5" textAnchor="middle" fill="white" fontSize="6.2" fontFamily="Arial, sans-serif" fontWeight="600" letterSpacing="0.2">xero</text>
                            </svg>
                            Xero
                        </button>
                    </div>
                    
                    <div className="login-toggle">
                        {isLogin ? (
                            <>Don't have an account? <button type="button" onClick={toggleMode}>Sign up</button></>
                        ) : (
                            <>Already have an account? <button type="button" onClick={toggleMode}>Log in</button></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;