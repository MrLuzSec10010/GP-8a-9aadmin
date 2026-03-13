import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ShieldCheck, ArrowLeft, CheckCircle2, User, Lock } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";
import '../styles/login.css';

const EMBLEM_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png";

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(2); // Set directly to 2 to show OTP view matching screenshot for demonstration
  const [showFakeToast, setShowFakeToast] = useState(true);
  const [loginMode, setLoginMode] = useState('otp'); // 'otp' or 'password'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { verifyOtp, loginWithPassword } = useAuth();

  useEffect(() => {
    // Hide fake top-right toast after 5 seconds to simulate real notification feeling
    const t = setTimeout(() => setShowFakeToast(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const requestOtp = (e) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error("Enter a valid 10-digit phone number");
    toast.success("OTP sent successfully");
    setShowFakeToast(true);
    setStep(2);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp !== '123456') return toast.error("Invalid OTP");

    try {
      const data = await verifyOtp(phone || '7498086090', otp); // fallback phone if empty
      toast.success(`Welcome ${data.user.name || data.user.role}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Login Failed");
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return toast.error("Enter username and password");

    try {
      const data = await loginWithPassword(username, password);
      toast.success(`Welcome ${data.user.name || data.user.role}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login Failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay"></div>

      {showFakeToast && loginMode === 'otp' && (
        <div className="toast-success-top-right">
          <CheckCircle2 size={16} className="text-green-600" />
          <span>OTP sent successfully</span>
        </div>
      )}

      <div className="login-content">
        <div className="login-header">
          <div className="login-header-emblem">
            <img src={EMBLEM_URL} alt="Emblem of India" />
          </div>
          <h1 className="login-app-title">Digital Gram Panchayat</h1>
          <p className="login-app-subtitle">Property & Tax Management System</p>
          <p className="login-app-gov">Government of Maharashtra</p>
        </div>

        <div className="login-card">
          <h2 className="login-title">Login</h2>

          {/* Login Mode Toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
            <button
              type="button"
              onClick={() => setLoginMode('otp')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                background: loginMode === 'otp' ? '#003366' : 'transparent',
                color: loginMode === 'otp' ? '#fff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              OTP Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                background: loginMode === 'password' ? '#003366' : 'transparent',
                color: loginMode === 'password' ? '#fff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              Username / Password
            </button>
          </div>

          {loginMode === 'otp' ? (
            <>
              <p className="login-subtitle">
                {step === 1 ? "Enter your phone number" : "Verify your OTP"}
              </p>

              {step === 1 ? (
                <form onSubmit={requestOtp}>
                  <div className="login-form-group">
                    <label className="login-label">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter 10-digit mobile number"
                      required
                    />
                  </div>
                  <button type="submit" className="login-btn login-btn-primary">
                    Send OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="login-form-group">
                    <label className="login-label">Enter OTP</label>
                    <div className="flex justify-center mb-6 mt-2">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <div className="demo-alert">
                    Demo Mode: Use OTP 123456
                  </div>

                  <button type="submit" className="login-btn login-btn-primary mt-2">
                    <ShieldCheck size={18} />
                    Verify OTP
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="login-back-btn"
                  >
                    <ArrowLeft size={16} />
                    Go Back
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="login-subtitle">Enter your Gram Panchayat login credentials</p>
              <form onSubmit={handlePasswordLogin}>
                <div className="login-form-group">
                  <label className="login-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Enter username"
                      required
                    />
                  </div>
                </div>
                <div className="login-form-group">
                  <label className="login-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn login-btn-primary mt-2">
                  <ShieldCheck size={18} />
                  Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="login-footer">
        © 2024 Rural Development Department, Govt. of Maharashtra
      </div>
    </div>
  );
}
