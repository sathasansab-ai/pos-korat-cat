// src/components/LoginLockScreen.tsx
import React, { useState } from 'react';
import { KeyRound, Shield, CheckCircle2, AlertTriangle, Delete } from 'lucide-react';
import type { UserAccount } from '../types';
import { AuthService } from '../services/auth';
import { SoundEffects } from '../services/soundEffects';

interface LoginLockScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  storeName?: string;
  subTitle?: string;
  hasActiveShift?: boolean;
}

export const LoginLockScreen: React.FC<LoginLockScreenProps> = ({
  onLoginSuccess,
  storeName = 'KORAT CAT BOUTIQUE',
  subTitle = 'เรือนโคราชเฉลิมวัฒนา',
  hasActiveShift = false
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleKeyPress = (num: string) => {
    if (pin.length < 12) {
      setPin(prev => prev + num);
      SoundEffects.playBeep();
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin.trim()) return;

    const user = await AuthService.loginWithPin(pin.trim());
    if (user) {
      SoundEffects.playSuccess();
      onLoginSuccess(user);
    } else {
      SoundEffects.playWarning();
      setError(true);
      setErrorMessage('รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#130f0a] to-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-md text-white flex flex-col items-center animate-in zoom-in-95">
        
        {/* Brand Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-700 flex items-center justify-center font-black text-xl text-slate-950 shadow-xl border border-amber-300 mb-3 tracking-wider">
          KC
        </div>
        <h1 className="text-base font-extrabold tracking-wider uppercase text-white text-center">
          {storeName}
        </h1>
        <p className="text-[11px] text-amber-400/80 mb-4 text-center">
          {subTitle}
        </p>

        {hasActiveShift ? (
          <div className="mb-4 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center">
            <div className="text-[11px] text-emerald-300 font-bold flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>กะของร้านเปิดอยู่ (พร้อมขายต่อเนื่อง)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              ระบบเครื่องนี้ปลอดภัย ไม่มีการล็อกอินค้างจากภายนอก
            </p>
          </div>
        ) : (
          <div className="mb-4 px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[11px] text-slate-400 text-center">
            🔒 ยังไม่มีการเปิดกะ (เข้าสู่ระบบเพื่อเริ่มเปิดกะขาย)
          </div>
        )}

        <div className="w-full mb-4 text-center">
          <p className="text-xs text-slate-400 mb-2">ใส่รหัส PIN แคชเชียร์หรือแอดมิน เพื่อเข้าสู่ระบบ</p>
          
          {/* PIN Dots Preview - Dynamically adjusts to any PIN length */}
          <div className="flex justify-center items-center gap-2 py-2 flex-wrap max-w-xs mx-auto">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, idx) => (
              <div 
                key={idx} 
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  pin.length > idx 
                    ? 'bg-amber-400 border-amber-300 scale-110 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
                    : 'border-slate-600 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mt-2 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeyPress(n)}
              className="py-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-mono font-bold text-xl rounded-2xl border border-slate-700/60 shadow transition"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-400 text-xs font-bold rounded-2xl border border-slate-800 transition"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-white font-mono font-bold text-xl rounded-2xl border border-slate-700/60 shadow transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 bg-slate-800/40 hover:bg-slate-800 active:scale-95 text-slate-400 flex items-center justify-center rounded-2xl border border-slate-800 transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Enter Keyboard Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="หรือพิมพ์ PIN ผ่านคีย์บอร์ด..."
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono tracking-widest text-amber-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
          />
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>เข้าสู่ระบบ (Enter)</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-4">
          ระบบความปลอดภัยร้านค้า KORAT CAT • สิทธิ์แอดมิน / แคชเชียร์
        </p>
      </div>
    </div>
  );
};
