import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();

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
      toast.success(`Welcome ${data.user.role}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Login Failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-overlay"></div>

      {showFakeToast && (
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
        </div>
      </div>

      <div className="login-footer">
        © 2024 Rural Development Department, Govt. of Maharashtra
      </div>
    </div>
  );
}
