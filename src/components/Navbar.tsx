// src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Boxes, 
  Tag, 
  BarChart3, 
  FileSpreadsheet, 
  Clock, 
  Monitor, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  UserCheck, 
  KeyRound 
} from 'lucide-react';
import type { UserAccount, Shift } from '../types';
import { AuthService } from '../services/auth';
import { PinModal } from './PinModal';

interface NavbarProps {
  currentUser: UserAccount | null;
  activeShift: Shift | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onUserChanged: (user: UserAccount) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeShift,
  activeTab,
  onSelectTab,
  onUserChanged
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetRole, setPinTargetRole] = useState<'OWNER' | 'CASHIER'>('OWNER');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenPin = (targetRole: 'OWNER' | 'CASHIER') => {
    setPinTargetRole(targetRole);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = async (pin: string) => {
    const user = await AuthService.loginWithPin(pin);
    if (user) {
      onUserChanged(user);
      setIsPinModalOpen(false);
    } else {
      alert('รหัส PIN ไม่ถูกต้อง (Owner กด 9999, แคชเชียร์กด 1234)');
    }
  };

  const openCustomerDisplay = () => {
    window.open('/display', 'CustomerDisplay', 'width=1024,height=768');
  };

  const isOwner = currentUser?.role === 'OWNER';

  return (
    <>
      <header className="bg-slate-900 text-white shadow-md select-none sticky top-0 z-40">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xl shadow-md">
              🐱
            </div>
            <div>
              <div className="font-extrabold text-base tracking-wide flex items-center gap-1.5">
                <span>POS Korat Cat</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-normal">v1.0</span>
              </div>
              <p className="text-[11px] text-slate-400">ระบบแคชเชียร์ & คลังแฟชั่น All-in-One</p>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('pos')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === 'pos' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>หน้าร้าน (POS)</span>
            </button>

            <button
              onClick={() => onSelectTab('shift')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === 'shift' 
                  ? 'bg-emerald-600 text-white shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>กะพนักงาน {activeShift ? '🟢' : '🔴'}</span>
            </button>

            {/* Owner Only Menus */}
            {isOwner ? (
              <>
                <button
                  onClick={() => onSelectTab('inventory')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeTab === 'inventory' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>คลังสินค้า & Matrix</span>
                </button>

                <button
                  onClick={() => onSelectTab('promotions')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeTab === 'promotions' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>โปรโมชั่น</span>
                </button>

                <button
                  onClick={() => onSelectTab('reports')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeTab === 'reports' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>รายงาน & กำไร</span>
                </button>

                <button
                  onClick={() => onSelectTab('sheets')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeTab === 'sheets' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Google Sheets</span>
                </button>
              </>
            ) : (
              <div className="px-2 py-1 text-xs text-slate-500 italic flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> เมนูแอดมินถูกล็อค
              </div>
            )}
          </nav>

          {/* Right Action Tools: Dual Screen, Network, User Badge */}
          <div className="flex items-center space-x-2">
            {/* Customer Screen Opener */}
            <button
              onClick={openCustomerDisplay}
              title="เปิดหน้าจอที่สองสำหรับลูกค้า (Dual Monitor)"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">จอแสดงฝั่งลูกค้า</span>
            </button>

            {/* Offline-First Badge */}
            <div className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              isOnline ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800 animate-pulse'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline พร้อมขาย'}</span>
            </div>

            {/* Role & User Switcher */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  {isOwner ? (
                    <span className="text-amber-400 flex items-center gap-0.5">👑 แอดมินหลัก</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-0.5"><UserCheck className="w-3 h-3" /> แคชเชียร์</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 max-w-[120px] truncate">
                  {currentUser?.name || 'พนักงาน'}
                </div>
              </div>

              {/* Quick Switch Button */}
              <button
                onClick={() => handleOpenPin(isOwner ? 'CASHIER' : 'OWNER')}
                title="สลับสิทธิ์ผู้ใช้งาน (ใส่ PIN)"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <PinModal
        isOpen={isPinModalOpen}
        title={pinTargetRole === 'OWNER' ? '👑 ปลดล็อคสิทธิ์เจ้าของร้าน' : '👤 สลับเข้าสู่กะแคชเชียร์'}
        subtitle={pinTargetRole === 'OWNER' ? 'กรุณากรอกรหัส PIN เจ้าของร้าน (ค่าเริ่มต้น: 9999)' : 'กรุณากรอกรหัส PIN แคชเชียร์ (ค่าเริ่มต้น: 1234)'}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinModalOpen(false)}
      />
    </>
  );
};
