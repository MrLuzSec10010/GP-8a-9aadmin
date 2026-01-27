import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { Phone, Shield, ArrowRight, Globe } from 'lucide-react';

const EMBLEM_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png";

export default function LoginPage() {
  const { t, language, toggleLanguage } = useLanguage();
  const { sendOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error(language === 'mr' ? 'कृपया वैध मोबाईल क्रमांक टाका' : 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await sendOtp(phone);
      setDemoMode(response.demo_mode || false);
      setStep(2);
      toast.success(t('otpSent'));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error(language === 'mr' ? 'कृपया 6 अंकी OTP टाका' : 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(phone, otp);
      toast.success(t('loginSuccess'));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      {/* Language Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLanguage}
        className="fixed top-4 right-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
        data-testid="login-language-toggle"
      >
        <Globe size={16} className="mr-2" />
        {language === 'en' ? 'मराठी' : 'English'}
      </Button>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full p-2 shadow-xl emblem-pulse">
              <img 
                src={EMBLEM_URL} 
                alt="Emblem of India" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {language === 'mr' ? 'डिजिटल ग्राम पंचायत' : 'Digital Gram Panchayat'}
          </h1>
          <p className="text-white/80 text-sm">
            {language === 'mr' ? 'मालमत्ता व कर व्यवस्थापन प्रणाली' : 'Property & Tax Management System'}
          </p>
          <p className="text-[#D4AF37] text-sm font-medium mt-1">
            {language === 'mr' ? 'महाराष्ट्र शासन' : 'Government of Maharashtra'}
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0" data-testid="login-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-center text-slate-800">
              {t('login')}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1 
                ? (language === 'mr' ? 'OTP साठी मोबाईल क्रमांक टाका' : 'Enter phone number to receive OTP')
                : (language === 'mr' ? 'OTP पडताळणी करा' : 'Verify your OTP')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700">
                    {t('phoneNumber')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={language === 'mr' ? '९८७६५४३२१०' : '9876543210'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-10 h-12"
                      data-testid="phone-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#003366] hover:bg-[#002244] text-white"
                  disabled={loading}
                  data-testid="send-otp-btn"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner" />
                      {language === 'mr' ? 'पाठवत आहे...' : 'Sending...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t('sendOtp')}
                      <ArrowRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('enterOtp')}</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      data-testid="otp-input"
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
                  {demoMode && (
                    <p className="text-center text-sm text-amber-600 bg-amber-50 py-2 rounded-md mt-2">
                      {t('demoHint')}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#003366] hover:bg-[#002244] text-white"
                  disabled={loading}
                  data-testid="verify-otp-btn"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner" />
                      {language === 'mr' ? 'पडताळणी...' : 'Verifying...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield size={18} />
                      {t('verifyOtp')}
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setStep(1); setOtp(''); }}
                  data-testid="back-btn"
                >
                  {language === 'mr' ? '← मागे जा' : '← Go Back'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          {language === 'mr' 
            ? '© २०२४ ग्राम विकास विभाग, महाराष्ट्र शासन'
            : '© 2024 Rural Development Department, Govt. of Maharashtra'
          }
        </p>
      </div>
    </div>
  );
}
