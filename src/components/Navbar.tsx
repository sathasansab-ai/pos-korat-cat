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
  KeyRound,
  Settings
} from 'lucide-react';
import type { UserAccount, Shift, StoreSettings } from '../types';
import { AuthService } from '../services/auth';
import { PinModal } from './PinModal';
import { db } from '../db';

interface NavbarProps {
  currentUser: UserAccount | null;
  activeShift: Shift | null;
  activeTab: string;
  settingsVer?: number;
  onSelectTab: (tab: string) => void;
  onUserChanged: (user: UserAccount) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeShift,
  activeTab,
  settingsVer = 0,
  onSelectTab,
  onUserChanged
}) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetRole, setPinTargetRole] = useState<'OWNER' | 'CASHIER'>('OWNER');

  useEffect(() => {
    setLogoError(false);
    db.settings.get('current_store_settings').then(s => {
      if (s) setSettings(s);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeTab, settingsVer]);

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
      alert('รหัส PIN ไม่ถูกต้อง');
    }
  };

  const openCustomerDisplay = () => {
    window.open('/display', 'CustomerDisplay', 'width=1024,height=768');
  };

  const isOwner = currentUser?.role === 'OWNER';

  return (
    <>
      <header className="bg-slate-950 text-white shadow-md select-none sticky top-0 z-40 border-b border-slate-800">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            {settings?.logoUrl && !logoError ? (
              <img
                src={settings.logoUrl}
                alt="Store Logo"
                onError={() => setLogoError(true)}
                className="w-10 h-10 rounded-xl object-cover shadow-md border border-amber-400/40 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-xl shadow-md border border-amber-400/30">
                🐱
              </div>
            )}
            <div>
              <div className="font-extrabold text-sm tracking-wide flex items-center gap-1.5 uppercase">
                <span className="text-white">{settings?.storeName || 'KORAT CAT x เรือนโคราช'}</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  BOUTIQUE
                </span>
              </div>
              <p className="text-[10px] text-amber-400/80 font-sans truncate max-w-[280px]">
                {settings?.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา'}
              </p>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('pos')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'pos' 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>หน้าร้าน (POS)</span>
            </button>

            <button
              onClick={() => onSelectTab('shift')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'shift' 
                  ? 'bg-amber-600 text-white shadow' 
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'inventory' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>คลัง & บาร์โค้ด</span>
                </button>

                <button
                  onClick={() => onSelectTab('promotions')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'promotions' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>โปรโมชั่น</span>
                </button>

                <button
                  onClick={() => onSelectTab('reports')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'reports' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>รายงาน & กำไร</span>
                </button>

                <button
                  onClick={() => onSelectTab('sheets')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'sheets' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Google Sheets</span>
                </button>

                <button
                  onClick={() => onSelectTab('settings')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                    activeTab === 'settings' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>ตั้งค่าร้าน & พนักงาน</span>
                </button>
              </>
            ) : (
              <div className="px-2 py-1 text-xs text-slate-500 italic flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> เมนูเจ้าของร้านถูกล็อค
              </div>
            )}
          </nav>

          {/* Right Tools: Customer Screen, Network, User Badge */}
          <div className="flex items-center space-x-2">
            <button
              onClick={openCustomerDisplay}
              title="เปิดหน้าจอที่สองสำหรับลูกค้า (Dual Monitor with PromptPay QR)"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition border border-slate-700"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จอฝั่งลูกค้า (มี QR)</span>
            </button>

            {/* Offline-First Badge */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isOnline ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-amber-950/60 text-amber-400 border border-amber-800 animate-pulse'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Role & User Switcher */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  {isOwner ? (
                    <span className="text-amber-400 flex items-center gap-0.5">👑 เจ้าของร้าน</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-0.5"><UserCheck className="w-3 h-3" /> แคชเชียร์</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 max-w-[130px] truncate">
                  {currentUser?.name || 'พนักงาน'}
                </div>
              </div>

              <button
                onClick={() => handleOpenPin(isOwner ? 'CASHIER' : 'OWNER')}
                title="สลับสิทธิ์ผู้ใช้งาน (ใส่ PIN)"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500 transition"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <PinModal
        isOpen={isPinModalOpen}
        title={pinTargetRole === 'OWNER' ? '👑 ปลดล็อคสิทธิ์เจ้าของร้าน' : '👤 สลับเข้าสู่กะแคชเชียร์'}
        subtitle={pinTargetRole === 'OWNER' ? 'กรุณากรอกรหัส PIN เจ้าของร้าน' : 'กรุณากรอกรหัส PIN แคชเชียร์'}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinModalOpen(false)}
      />
    </>
  );
};
