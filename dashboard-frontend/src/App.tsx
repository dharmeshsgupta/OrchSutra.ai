import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ApiKeysPage from './pages/ApiKeysPage';
import ModelDetailPage from './pages/ModelDetailPage';
import ModelsPage from './pages/ModelsPage';
import PaymentsPage from './pages/PaymentsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import EditProfilePage from './pages/EditProfilePage';
import RankingsPage from './pages/RankingsPage';
import AppsPage from './pages/AppsPage.tsx';
import AppDetailPage from './pages/AppDetailPage';
import AgentBuilderPage from './pages/AgentBuilderPage';
import OtpVerificationPage from './pages/OtpVerificationPage';
import ChatPage from './pages/ChatPage';
import PricingPage from './pages/PricingPage';
import Navbar from './components/Navbar';
import Logo from './components/Logo';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithGitHub,
  setupRecaptcha,
  sendPhoneOtp,
  resetPassword,
} from './services/firebaseAuth';
import type { ConfirmationResult } from 'firebase/auth';
import './App.css';
import './styles/Sidebar.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Login Page Component
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [slideDirection, setSlideDirection] = React.useState<'left' | 'right'>('left');

  // Email / Password fields
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [username, setUsername] = React.useState('');

  // Forgot Password
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');

  // Phone OTP fields
  const [showPhoneOtp, setShowPhoneOtp] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);



  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Real-time password validation
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const getPasswordStrength = (pw: string): { label: string; level: number; color: string } => {
    if (pw.length === 0) return { label: '', level: 0, color: 'transparent' };
    if (pw.length < 6) return { label: 'Too short', level: 1, color: '#EA4335' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    if (score <= 1) return { label: 'Weak', level: 2, color: '#EA4335' };
    if (score <= 2) return { label: 'Fair', level: 3, color: '#FBBC05' };
    if (score <= 3) return { label: 'Good', level: 4, color: '#34A853' };
    return { label: 'Strong', level: 5, color: '#34A853' };
  };

  const strength = getPasswordStrength(password);

  const switchMode = (toSignUp: boolean) => {
    if (isTransitioning) return;
    setSlideDirection(toSignUp ? 'left' : 'right');
    setIsTransitioning(true);
    setError('');
    setSuccess('');
    setShowPhoneOtp(false);
    setShowForgotPassword(false);
    setTimeout(() => {
      setIsSignUp(toSignUp);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUsername('');
      setPhoneNumber('');
      setOtpCode('');
      setConfirmationResult(null);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 350);
  };

  /* ─── Forgot Password ─── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      if (!resetEmail.trim()) { setError('Please enter your email address.'); return; }
      await resetPassword(resetEmail);
      setSuccess('Password reset email sent! Check your inbox (and spam folder).');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') setError('No account found with that email.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email address.');
      else if (code === 'auth/too-many-requests') setError('Too many requests. Please try again later.');
      else setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── OTP helper ─── */
  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  /* ─── Email / Password Login ─── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await signInWithEmail(email, password);
      // Redirect to OTP verification page
      const otp = generateOtp();
      console.log(`[Login OTP]: ${otp}`);
      navigate('/verify-otp', { state: { email, otp, type: 'login' } });
      return;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') setError('No account with that email. Please sign up first.');
      else if (code === 'auth/wrong-password') setError('Incorrect password. Try "Forgot password?" to reset it.');
      else if (code === 'auth/invalid-credential') setError('Invalid credentials. If you signed up with Google or GitHub, use that method instead — or click "Forgot password?" to set a password.');
      else if (code === 'auth/too-many-requests') setError('Too many failed attempts. Please try again later or reset your password.');
      else setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };



  /* ─── Email / Password Sign-Up (step 1 — create account & send OTP) ─── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (!email.trim()) { setError('Email is required'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }

      await signUpWithEmail(email, password);

      // Redirect to OTP verification page
      const otp = generateOtp();
      console.log(`[Sign-Up OTP]: ${otp}`);
      navigate('/verify-otp', { state: { email, otp, type: 'signup' } });
      return;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('Email already registered.');
      else if (code === 'auth/weak-password') setError('Password too weak (min 6 chars).');
      else setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Google Sign-In ─── */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithGoogle();
      const userEmail = result.user.email || 'your account';
      const otp = generateOtp();
      console.log(`[Google Login OTP]: ${otp}`);
      navigate('/verify-otp', { state: { email: userEmail, otp, type: 'login' } });
      return;
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── GitHub Sign-In ─── */
  const handleGitHubSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithGitHub();
      const userEmail = result.user.email || 'your account';
      const otp = generateOtp();
      console.log(`[GitHub Login OTP]: ${otp}`);
      navigate('/verify-otp', { state: { email: userEmail, otp, type: 'login' } });
      return;
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'GitHub sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── Phone OTP — Step 1: send code ─── */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      const result = await sendPhoneOtp(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setSuccess('OTP sent! Check your phone.');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Phone OTP — Step 2: verify code ─── */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    try {
      setLoading(true);
      setError('');
      await confirmationResult.confirm(otpCode);
      navigate('/');
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formAnimClass = isTransitioning
    ? `auth-form-exit auth-form-exit-${slideDirection}`
    : `auth-form-enter auth-form-enter-${slideDirection}`;

  return (
    <div className="login-page">
      <Navbar showAuthTabs isSignUp={isSignUp} onSwitchMode={switchMode} />

      {/* Background decorations */}
      <div className="login-container">
        <div className="login-orb login-orb-blue"></div>
        <div className="login-orb login-orb-red"></div>
        <div className="login-orb login-orb-yellow"></div>
        <div className="login-orb login-orb-green"></div>
        <div className="login-bg-ring login-bg-ring-1"></div>
        <div className="login-bg-ring login-bg-ring-2"></div>
        <div className="login-bg-ring login-bg-ring-3"></div>

        <div className="login-card">
          <div className="login-header">
            <Logo linkTo="" size="lg" />
            <p className="login-subtitle">
              {isSignUp ? '✨ Create your account' : '👋 Welcome back'}
            </p>
          </div>

          {/* Invisible reCAPTCHA container for Phone OTP */}
          <div id="recaptcha-container"></div>

          {/* Animated form wrapper */}
          <div className="auth-form-wrapper">
            <div className={formAnimClass} key={isSignUp ? 'signup' : 'login'}>

              {/* ─── FORGOT PASSWORD VIEW ─── */}
              {showForgotPassword ? (
                <div className="login-form forgot-password-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  <div className="forgot-pw-header">
                    <div className="forgot-pw-icon">🔑</div>
                    <h3 className="forgot-pw-title">Reset your password</h3>
                    <p className="forgot-pw-desc">
                      Enter the email address associated with your account and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword}>
                    <div className="form-group">
                      <label htmlFor="reset-email">Email Address</label>
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="btn btn-google" disabled={loading} style={{ width: '100%' }}>
                      {loading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </form>

                  <p className="login-footer">
                    <button type="button" onClick={() => { setShowForgotPassword(false); setError(''); setSuccess(''); }} className="link-button">
                      ← Back to Login
                    </button>
                  </p>
                </div>
              ) : showPhoneOtp ? (
                <div className="login-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  {!confirmationResult ? (
                    <form onSubmit={handleSendOtp}>
                      <div className="form-group">
                        <label htmlFor="phone-otp">Phone Number</label>
                        <input
                          id="phone-otp"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1 234 567 8900"
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-google" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Sending…' : 'Send OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp}>
                      <div className="form-group">
                        <label htmlFor="otp-code">Enter OTP</label>
                        <input
                          id="otp-code"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          required
                          maxLength={6}
                        />
                      </div>
                      <button type="submit" className="btn btn-google" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Verifying…' : 'Verify OTP'}
                      </button>
                    </form>
                  )}

                  <p className="login-footer">
                    <button type="button" onClick={() => { setShowPhoneOtp(false); setError(''); setSuccess(''); }} className="link-button">
                      ← Back to email {isSignUp ? 'sign up' : 'login'}
                    </button>
                  </p>
                </div>
              ) : (
                /* ─── EMAIL / PASSWORD FORM ─── */
                <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="login-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  {isSignUp ? (
                    <>
                      <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Pick a username" />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password-signup">Password</label>
                        <input
                          id="password-signup"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          minLength={6}
                          className={password.length > 0 && password.length < 6 ? 'input-error' : ''}
                        />
                        {password.length > 0 && (
                          <div className="password-strength">
                            <div className="strength-bar">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className={`strength-segment ${i <= strength.level ? 'active' : ''}`}
                                  style={{ background: i <= strength.level ? strength.color : undefined }}
                                />
                              ))}
                            </div>
                            <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          required
                          className={passwordsMismatch ? 'input-error' : passwordsMatch ? 'input-success' : ''}
                        />
                        {passwordsMismatch && <span className="field-hint field-hint-error">Passwords do not match</span>}
                        {passwordsMatch && <span className="field-hint field-hint-success">✓ Passwords match</span>}
                      </div>
                      <button type="submit" className="btn btn-google" disabled={loading || passwordsMismatch || password.length < 6} style={{ width: '100%' }}>
                        {loading ? 'Creating account…' : 'Create Account'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                      </div>
                      <div className="forgot-password-link-row">
                        <button type="button" className="link-button forgot-pw-link" onClick={() => { setShowForgotPassword(true); setResetEmail(email); setError(''); setSuccess(''); }}>
                          Forgot password?
                        </button>
                      </div>
                      <button type="submit" className="btn btn-google" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Logging in…' : 'Login'}
                      </button>
                    </>
                  )}

                  {/* Divider */}
                  <div className="auth-divider">
                    <span>or</span>
                  </div>

                  {/* Google Sign-In */}
                  <button type="button" className="btn btn-google-provider" onClick={handleGoogleSignIn} disabled={loading} style={{ width: '100%' }}>
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continue with Google
                  </button>

                  {/* GitHub Sign-In */}
                  <button type="button" className="btn btn-github-provider" onClick={handleGitHubSignIn} disabled={loading} style={{ width: '100%' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                    Continue with GitHub
                  </button>

                  {/* Phone OTP */}
                  <button type="button" className="btn btn-phone-otp" onClick={() => { setShowPhoneOtp(true); setError(''); setSuccess(''); }} disabled={loading} style={{ width: '100%' }}>
                    📱 Sign in with Phone
                  </button>

                  <p className="login-footer">
                    {isSignUp ? (
                      <>Already have an account?{' '}<button type="button" onClick={() => switchMode(false)} className="link-button">Login here</button></>
                    ) : (
                      <>Don&apos;t have an account?{' '}<button type="button" onClick={() => switchMode(true)} className="link-button">Sign up here</button></>
                    )}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <>
      <main className={isAuthenticated ? "app-main" : ""}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/apps/:appId" element={<AppDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-otp" element={<OtpVerificationPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/api-keys"
            element={
              <ProtectedRoute>
                <ApiKeysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/models"
            element={
              <ProtectedRoute>
                <ModelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/models/:id"
            element={
              <ProtectedRoute>
                <ModelDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/build"
            element={
              <ProtectedRoute>
                <AgentBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute>
                <EditProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
