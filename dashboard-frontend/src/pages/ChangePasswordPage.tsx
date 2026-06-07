import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/AccountPages.css';

type Step = 'password' | 'otp' | 'newPassword';

const ChangePasswordPage: React.FC = () => {
  const { firebaseUser } = useAuth();

  // Steps
  const [step, setStep] = useState<Step>('password');

  // Step 1 — current password
  const [currentPassword, setCurrentPassword] = useState('');

  // Step 2 — OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3 — new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isPasswordProvider = firebaseUser?.providerData.some(
    (p) => p.providerId === 'password',
  );

  const getPasswordStrength = (pw: string) => {
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

  const strength = getPasswordStrength(newPassword);

  // Generate a random 6-digit OTP
  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Helper: mask email
  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const visible = user.length <= 2 ? user : user[0] + '•'.repeat(user.length - 2) + user[user.length - 1];
    return `${visible}@${domain}`;
  };

  // Handle OTP input change (auto-focus next)
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < paste.length; i++) {
      newOtp[i] = paste[i];
    }
    setOtpCode(newOtp);
    const nextEmpty = paste.length < 6 ? paste.length : 5;
    otpInputRefs.current[nextEmpty]?.focus();
  };

  /* ─── Step 1: Verify current password & send OTP ─── */
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firebaseUser || !firebaseUser.email) {
      setError('Unable to verify identity for this account.');
      return;
    }

    try {
      setLoading(true);
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // Generate and "send" OTP
      const otp = generateOtp();
      setGeneratedOtp(otp);

      // In production, send OTP via backend email API. For now, show via console + success message.
      console.log(`[OTP for password change]: ${otp}`);
      
      setStep('otp');
      setSuccess(`Verification code sent to ${maskEmail(firebaseUser.email)}. Check your console/email.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else {
        setError(err.message || 'Verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step 2: Verify OTP ─── */
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const enteredOtp = otpCode.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    if (enteredOtp !== generatedOtp) {
      setError('Invalid verification code. Please try again.');
      return;
    }

    setStep('newPassword');
    setSuccess('Identity verified! Now set your new password.');
  };

  /* ─── Step 3: Set new password ─── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!firebaseUser) {
      setError('Session expired. Please try again.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(firebaseUser, newPassword);
      setSuccess('Password changed successfully! 🎉');
      // Reset everything
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode(['', '', '', '', '', '']);
      setGeneratedOtp('');
      setStep('password');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/weak-password') {
        setError('New password is too weak (min 6 characters).');
      } else if (code === 'auth/requires-recent-login') {
        setError('Session expired. Please re-enter your current password.');
        setStep('password');
      } else {
        setError(err.message || 'Failed to change password.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ─── Resend OTP ─── */
  const handleResendOtp = () => {
    const otp = generateOtp();
    setGeneratedOtp(otp);
    setOtpCode(['', '', '', '', '', '']);
    console.log(`[OTP re-sent]: ${otp}`);
    setError('');
    setSuccess(`New verification code sent to ${maskEmail(firebaseUser?.email || '')}.`);
  };

  // Step indicator
  const steps = [
    { key: 'password', label: 'Verify Identity' },
    { key: 'otp', label: 'Enter OTP' },
    { key: 'newPassword', label: 'New Password' },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <>
      <Navbar />
      <div className="account-page-container">
        <div className="account-card">
          <div className="account-card-header">
            <h2>🔒 Change Password</h2>
            <p>Secure multi-step password change with OTP verification</p>
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            {steps.map((s, i) => (
              <div key={s.key} className={`step-dot-group ${i <= currentStepIndex ? 'step-active' : ''}`}>
                <div className={`step-dot ${i < currentStepIndex ? 'step-completed' : i === currentStepIndex ? 'step-current' : ''}`}>
                  {i < currentStepIndex ? '✓' : i + 1}
                </div>
                <span className="step-label">{s.label}</span>
                {i < steps.length - 1 && <div className={`step-line ${i < currentStepIndex ? 'step-line-active' : ''}`} />}
              </div>
            ))}
          </div>

          {!isPasswordProvider ? (
            <div className="account-notice">
              <span className="notice-icon">ℹ️</span>
              <div>
                <p className="notice-title">Social login account</p>
                <p className="notice-text">
                  You signed in with {firebaseUser?.providerData[0]?.providerId || 'a social provider'}.
                  Password change is only available for email/password accounts.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Step 1: Current Password ─── */}
              {step === 'password' && (
                <form onSubmit={handleVerifyPassword} className="account-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  <div className="form-group">
                    <label htmlFor="current-password">Current Password</label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="account-btn"
                    disabled={loading || !currentPassword}
                  >
                    {loading ? 'Verifying…' : 'Verify & Send OTP →'}
                  </button>
                </form>
              )}

              {/* ─── Step 2: OTP Verification ─── */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="account-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  <p className="otp-instruction">
                    Enter the 6-digit verification code sent to your email.
                  </p>

                  <div className="otp-input-group" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpInputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`otp-input ${digit ? 'otp-input-filled' : ''}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <div className="otp-actions">
                    <button type="button" className="link-button" onClick={handleResendOtp}>
                      Resend Code
                    </button>
                    <button type="button" className="link-button" onClick={() => { setStep('password'); setError(''); setSuccess(''); }}>
                      ← Back
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="account-btn"
                    disabled={otpCode.join('').length !== 6}
                  >
                    Verify Code →
                  </button>
                </form>
              )}

              {/* ─── Step 3: New Password ─── */}
              {step === 'newPassword' && (
                <form onSubmit={handleChangePassword} className="account-form">
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}

                  <div className="form-group">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                      autoFocus
                    />
                    {newPassword.length > 0 && (
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
                    <label htmlFor="confirm-new-password">Confirm New Password</label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className={
                        confirmPassword.length > 0 && newPassword !== confirmPassword
                          ? 'input-error'
                          : confirmPassword.length > 0 && newPassword === confirmPassword
                            ? 'input-success'
                            : ''
                      }
                    />
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <span className="field-hint field-hint-error">Passwords do not match</span>
                    )}
                    {confirmPassword.length > 0 && newPassword === confirmPassword && (
                      <span className="field-hint field-hint-success">✓ Passwords match</span>
                    )}
                  </div>

                  <div className="otp-actions">
                    <button type="button" className="link-button" onClick={() => { setStep('otp'); setError(''); setSuccess(''); }}>
                      ← Back
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="account-btn"
                    disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  >
                    {loading ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChangePasswordPage;
