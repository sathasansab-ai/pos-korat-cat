// src/components/PinModal.tsx
import React, { useState } from 'react';
import { Lock, Delete, X } from 'lucide-react';

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
  subtitle = 'กรุณากรอกรหัส PIN 4 หลัก',
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length >= 4) {
        // Auto trigger or wait
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onSuccess(pin);
      setPin('');
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-sm text-slate-500 mb-4 text-center">{subtitle}</p>

          {/* PIN Dots */}
          <div className="flex space-x-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx 
                    ? 'bg-emerald-500 border-emerald-500 scale-110' 
                    : 'border-slate-300 bg-slate-100'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-xs mb-3 animate-pulse">
              รหัสผ่านไม่ถูกต้อง หรือสั้นเกินไป
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                className="h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-xl font-bold text-slate-700 transition"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="h-14 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-semibold transition"
            >
              ล้าง
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-xl font-bold text-slate-700 transition"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl flex items-center justify-center text-slate-700 transition"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg transition"
          >
            ยืนยันรหัส
          </button>
        </div>
      </div>
    </div>
  );
};
