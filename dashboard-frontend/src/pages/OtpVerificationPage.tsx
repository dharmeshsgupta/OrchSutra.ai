import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import Navbar from '../components/Navbar';
import '../styles/OtpVerification.css';

interface OtpLocationState {
  email: string;
  otp: string;
  type: 'login' | 'signup';
}

const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as OtpLocationState | null;

  const [otpCode, setOtpCode] = React.useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = React.useState(state?.otp || '');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [verified, setVerified] = React.useState(false);
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const email = state?.email || '';
  const type = state?.type || 'login';

  // Redirect if no state (direct URL access)
  React.useEffect(() => {
    if (!state?.email || !state?.otp) {
      navigate('/login', { replace: true });
    }
  }, [state, navigate]);

  const maskEmail = (em: string) => {
    const [user, domain] = em.split('@');
    if (!user || !domain) return em;
    const v = user.length <= 2 ? user : user[0] + '•'.repeat(user.length - 2) + user[user.length - 1];
    return `${v}@${domain}`;
  };

  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  /* ─── OTP Input Handlers ─── */
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    for (let i = 0; i < paste.length; i++) newOtp[i] = paste[i];
    setOtpCode(newOtp);
    otpRefs.current[Math.min(paste.length, 5)]?.focus();
  };

  /* ─── Verify OTP ─── */
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const entered = otpCode.join('');
    if (entered.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    if (entered !== generatedOtp) {
      setError('Invalid verification code. Please try again.');
      return;
    }
    setVerified(true);
    setSuccess(type === 'signup' ? 'Email verified! Redirecting to dashboard…' : 'Verified! Redirecting to dashboard…');
    setTimeout(() => navigate('/', { replace: true }), 1200);
  };

  /* ─── Resend OTP ─── */
  const handleResend = () => {
    const newOtp = generateOtp();
    setGeneratedOtp(newOtp);
    setOtpCode(['', '', '', '', '', '']);
    console.log(`[Resend OTP]: ${newOtp}`);
    setError('');
    setSuccess(`New code sent to ${maskEmail(email)}.`);
    otpRefs.current[0]?.focus();
  };

  if (!state) return null;

  return (
    <div className="login-page">
      <Navbar showAuthTabs={false} isSignUp={false} onSwitchMode={() => {}} />

      {/* Background decorations — same as login */}
      <div className="login-container">
        <div className="login-orb login-orb-blue"></div>
        <div className="login-orb login-orb-red"></div>
        <div className="login-orb login-orb-yellow"></div>
        <div className="login-orb login-orb-green"></div>
        <div className="login-bg-ring login-bg-ring-1"></div>
        <div className="login-bg-ring login-bg-ring-2"></div>
        <div className="login-bg-ring login-bg-ring-3"></div>

        <div className="otp-page-card">
          {/* Header */}
          <div className="otp-page-header">
            <Logo linkTo="" size="lg" />
            <div className="otp-page-icon">🔐</div>
            <h2 className="otp-page-title">
              {type === 'signup' ? 'Verify your email' : 'Verify your identity'}
            </h2>
            <p className="otp-page-subtitle">
              We sent a 6-digit verification code to<br />
              <strong>{maskEmail(email)}</strong>
            </p>
          </div>

          {/* Alerts */}
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* OTP Form */}
          <form onSubmit={handleVerify} className="otp-page-form">
            <div className="otp-page-input-group" onPaste={handleOtpPaste}>
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-page-input ${digit ? 'otp-page-input-filled' : ''} ${verified ? 'otp-page-input-success' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  disabled={verified}
                />
              ))}
            </div>

            <button
              type="submit"
              className="otp-page-verify-btn"
              disabled={otpCode.join('').length !== 6 || verified}
            >
              {verified ? '✓ Verified' : 'Verify & Continue'}
            </button>
          </form>

          {/* Footer actions */}
          <div className="otp-page-footer">
            <p className="otp-page-resend">
              Didn't receive the code?{' '}
              <button type="button" className="otp-page-link" onClick={handleResend} disabled={verified}>
                Resend Code
              </button>
            </p>
            <button
              type="button"
              className="otp-page-link otp-page-back"
              onClick={() => navigate('/login', { replace: true })}
              disabled={verified}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationPage;
