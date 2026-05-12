import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
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
        
        if (!isLogin && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

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
            confirmPassword: '',
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
                            <h2>Sign up</h2>
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
                        
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder={isLogin ? "Enter your password" : "Create a password"}
                                minLength={5}
                            />
                        </div>

                        {!isLogin && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Confirm your password"
                                    minLength={5}
                                />
                            </div>
                        )}
                        
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Loading...' : 'Continue'}
                        </button>
                    </form>

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