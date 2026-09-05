import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

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

    // Auto-redirect to Home if user is already logged in or logs in via Google OAuth
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && !isUpdatePassword) {
                navigate('/', { replace: true });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsUpdatePassword(true);
                setIsForgotPassword(false);
                setIsLogin(false);
            } else if (session && !isUpdatePassword) {
                navigate('/', { replace: true });
            }
        });

        let appStateListener;
        if (Capacitor.isNativePlatform()) {
            CapacitorApp.addListener('appStateChange', async (state) => {
                if (state.isActive) {
                    const { data: { session: resumedSession } } = await supabase.auth.getSession();
                    if (resumedSession && !isUpdatePassword) {
                        navigate('/', { replace: true });
                    }
                }
            }).then(handle => {
                appStateListener = handle;
            });
        }

        return () => {
            subscription.unsubscribe();
            if (appStateListener) appStateListener.remove();
        };
    }, [navigate, isUpdatePassword]);



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
        }
    };

    const handleGoogleAuth = async () => {
        try {
            setLoading(true);
            setError("");
            setMessage("");

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

            const redirectTo = Capacitor.isNativePlatform()
                ? 'biblequiz://auth'
                : window.location.origin;

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account'
                    }
                }
            });

            if (error) throw error;
        } catch (err) {
            setError(err.message || "Failed to sign in with Google.");
        } finally {
            setLoading(false);
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

                {/* GOOGLE SIGN IN (Only show on Login / Sign Up, not on Forgot/Update Password) */}
                {!isForgotPassword && !isUpdatePassword && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: '10px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
                            <span style={{ color: '#aaa', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '500' }}>or</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.2)' }} />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleAuth}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: '#ffffff',
                                color: '#3c4043',
                                fontSize: '15px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                            </svg>
                            Continue with Google
                        </button>
                    </>
                )}

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
        padding: '12px 10px',
        width: '100%'
    },
    // bgCircle removed
    card: {
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        padding: '2rem 1.5rem',
        borderRadius: '24px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        width: '95%',
        maxWidth: '480px',
        zIndex: 1,
        transition: 'height 0.3s ease',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        margin: '0 auto'
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
