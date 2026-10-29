// src/components/PinModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onSuccess: (pin: string) => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  title,
  subtitle = 'กรุณากรอกรหัสผ่าน / PIN (กดแป้นพิมพ์ได้โดยตรง)',
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 12) {
      setPin(prev => prev + digit);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length >= 4) {
      onSuccess(pin);
      setPin('');
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-[10px] text-slate-400">Security Access Verification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-3 text-center">{subtitle}</p>

          {/* Physical Keyboard Input Box */}
          <div className="relative w-full mb-3">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              maxLength={12}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="พิมพ์รหัสผ่านผ่านคีย์บอร์ด..."
              className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 px-10 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-amber-500 focus:bg-white outline-none transition"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-rose-500 text-xs mb-3 font-semibold animate-pulse">
              รหัสผ่านไม่ถูกต้อง หรือสั้นเกินไป (อย่างน้อย 4 ตัวอักษร)
            </p>
          )}

          {/* On-screen Keypad for Touch Screen */}
          <div className="grid grid-cols-3 gap-2 w-full mt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => handleDigit(num)}
                className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-amber-100 rounded-xl text-lg font-bold text-slate-800 transition"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="h-12 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition"
            >
              ล้าง
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-amber-100 rounded-xl text-lg font-bold text-slate-800 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 bg-slate-100 hover:bg-slate-200 active:bg-amber-100 rounded-xl flex items-center justify-center text-slate-700 transition"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ยืนยันรหัสผ่าน (Enter)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
