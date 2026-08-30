import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';


const Auth = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isUpdatePassword, setIsUpdatePassword] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");




    // Detect Password Recovery Event (Link Clicked)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsUpdatePassword(true);
                setIsForgotPassword(false);
                setIsLogin(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);



    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(""); // Clear errors on type
        setMessage("");
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match!");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: formData.password });
            if (error) throw error;
            setMessage("Password updated successfully! Please login with new password.");
            setIsUpdatePassword(false);
            setIsLogin(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        const { email, password, confirmPassword } = formData;

        try {
            if (isLogin) {
                // Clear any prior user's local cached data
                localStorage.removeItem('bibleQuiz_userId');
                localStorage.removeItem('bibleQuiz_sessionToken');
                localStorage.removeItem('bibleQuiz_lives');
                localStorage.removeItem('bibleQuiz_restoreTime');
                localStorage.removeItem('bibleQuiz_userName');
                localStorage.removeItem('bibleQuiz_userPhoto');
                localStorage.removeItem('bibleQuiz_nameLocked');
                localStorage.removeItem('bibleQuiz_hints');
                localStorage.removeItem('bibleQuiz_infiniteLivesUntil');
                localStorage.removeItem('bibleQuizProgress');

                // --- LOGIN FLOW ---
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // --- SILENT TAKEOVER (Last Login Wins) ---
                navigate('/');
            } else {
                // --- SIGN UP FLOW ---
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match!");
                }
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            display_name: email.split('@')[0], // Default User Name
                            avatar_url: ""
                        }
                    }
                });
                if (error) {
                    // Check for existing user error
                    if (error.message.includes("already registered") || error.status === 422) {
                        throw new Error("You have already registered. Please Login.");
                    }
                    throw error;
                }

                // Check for existing user (when Enumeration Protection is ON)
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    throw new Error("You have already registered. Please Login.");
                }

                // Check if session is created immediately (Auto-confirm enabled)
                if (data.session) {
                    navigate('/');
                } else {
                    // Confirmation required
                    setMessage("Sign up successful! Please check your email to verify.");
                    setIsLogin(true);
                    setFormData({ email, password: '', confirmPassword: '' });
                }
            }
        } catch (err) {
            let errorMsg = err.message;
            if (errorMsg.includes("Email not confirmed")) {
                errorMsg = "Please confirm your email address before logging in. Check your inbox/spam.";
            } else if (errorMsg.includes("Invalid login credentials")) {
                errorMsg = "Invalid email or password.";
            }

            setError(errorMsg);

            // If it's the specific "Already registered" error, we can auto-switch specific UI if needed
            if (err.message.includes("already registered")) {
                setIsLogin(true);
            }
        } finally {
            setLoading(false);
            // (Actually logic above requires specific handling, safe to set false if returning early? yes done above)
        }
    };

    // Auto-clear messages after 3 seconds
    useEffect(() => {
        if (message || error) {
            const timer = setTimeout(() => {
                setMessage("");
                setError("");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message, error]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        const { email } = formData;
        if (!email) {
            setError("Please enter your email address.");
            setLoading(false);
            return;
        }

        try {
            // Send OTP Code
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            setMessage("Code sent to your email! Enter it below.");
            setShowOtpInput(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: otp,
                type: 'email'
            });
            if (error) throw error;

            setMessage("Verified! Set your new password.");
            setShowOtpInput(false);
            setIsForgotPassword(false);
            setIsUpdatePassword(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src="/images/Icon.png" alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                    <h2 style={styles.title}>
                        {isUpdatePassword ? 'Set New Password' : (isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account'))}
                    </h2>
                </div>

                {message && <div style={styles.successMessage}>{message}</div>}
                {error && <div style={styles.errorMessage}>{error}</div>}

                {/* UPDATE PASSWORD FORM */}
                {isUpdatePassword ? (
                    <form onSubmit={handleUpdatePassword} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="New Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                style={styles.input}
                            />
                            <button type="button" onClick={togglePasswordVisibility} style={styles.eyeButton}>
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                        <div style={styles.inputGroup}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Confirm New Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                style={styles.input}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={styles.button}>
                            {loading ? 'Update Password' : 'Update Password'}
                        </button>
                    </form>
                ) : (
                    /* FORGOT PASSWORD FORM */
                    isForgotPassword ? (
                        <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} style={styles.form}>
                            {showOtpInput ? (
                                <div style={styles.inputGroup}>
                                    <input
                                        type="text"
                                        placeholder="Enter Code from Email"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        style={styles.input}
                                    />
                                </div>
                            ) : (
                                <div style={styles.inputGroup}>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        style={styles.input}
                                    />
                                </div>
                            )}

                            <button type="submit" disabled={loading} style={styles.button}>
                                {loading ? 'Processing...' : (showOtpInput ? 'Verify Code' : 'Send Code')}
                            </button>
                            <p style={{ ...styles.link, textAlign: 'center', marginTop: '10px' }} onClick={() => setIsForgotPassword(false)}>
                                Back to Login
                            </p>
                        </form>
                    ) : (
                        /* LOGIN / SIGNUP FORM */
                        <form onSubmit={handleAuth} style={styles.form}>
                            <div style={styles.inputGroup}>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email Address"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    style={styles.input}
                                />
                                <button type="button" onClick={togglePasswordVisibility} style={styles.eyeButton}>
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </button>
                            </div>

                            {!isLogin && (
                                <div style={{ ...styles.inputGroup, animation: 'slideDown 0.3s ease-out' }}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        style={styles.input}
                                    />
                                </div>
                            )}

                            <button type="submit" disabled={loading} style={styles.button}>
                                {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                            </button>
                        </form>
                    ))}

                {/* FOOTER LINKS (Only show if not in Forgot Password or Update Password mode) */}
                {!isForgotPassword && !isUpdatePassword && (
                    <div style={styles.footer}>
                        {isLogin ? (
                            <>
                                <p style={styles.link} onClick={() => setIsForgotPassword(true)}>Forgot Password?</p>
                                <p>Don't have an account? <span style={styles.boldLink} onClick={() => setIsLogin(false)}>Sign Up</span></p>
                            </>
                        ) : (
                            <p>Already have an account? <span style={styles.boldLink} onClick={() => setIsLogin(true)}>Login</span></p>
                        )}
                    </div>
                )}

                {/* NEW GO BACK BUTTON */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            color: 'white',
                            padding: '8px 20px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Go Back
                    </button>
                </div>
            </div>



            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px'
    },
    // bgCircle removed
    card: {
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        padding: '2rem',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: '400px',
        zIndex: 1,
        transition: 'height 0.3s ease',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    title: {
        color: 'white',
        margin: '10px 0 0 0',
        fontSize: '1.8rem'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    inputGroup: {
        position: 'relative'
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.1)',
        fontSize: '16px',
        outline: 'none',
        transition: 'border-color 0.3s',
        color: 'white'
    },
    button: {
        padding: '12px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '10px',
        transition: 'transform 0.2s',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)'
    },
    footer: {
        marginTop: '20px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#ccc'
    },
    link: {
        cursor: 'pointer',
        color: '#64b5f6',
        marginBottom: '10px',
        display: 'block'
    },
    boldLink: {
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        textDecoration: 'underline'
    },
    errorMessage: {
        background: 'rgba(198, 40, 40, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '15px',
        textAlign: 'center'
    },
    successMessage: {
        background: 'rgba(46, 125, 50, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '15px',
        textAlign: 'center'
    },
    eyeButton: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'white',
        padding: '5px',
        display: 'flex',
        alignItems: 'center'
    }
};

export default Auth;
