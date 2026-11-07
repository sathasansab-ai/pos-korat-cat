// src/components/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Boxes, 
  Tag, 
  Users,
  BarChart3, 
  FileSpreadsheet, 
  Clock, 
  Monitor, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  UserCheck, 
  Settings,
  Lock,
  Cloud,
  Truck,
  PackageCheck
} from 'lucide-react';
import type { UserAccount, Shift, StoreSettings } from '../types';
import { AuthService } from '../services/auth';
import { db } from '../db';
import { CloudSync } from '../services/cloudSync';
import { CloudSyncModal } from './CloudSyncModal';
import { StockTransferModal } from './StockTransferModal';

interface NavbarProps {
  currentUser: UserAccount | null;
  activeShift: Shift | null;
  activeTab: string;
  settingsVer?: number;
  onSelectTab: (tab: string) => void;
  onUserChanged: (user: UserAccount) => void;
  onLockScreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeShift,
  activeTab,
  settingsVer = 0,
  onSelectTab,
  onUserChanged,
  onLockScreen
}) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);

  const checkPendingTransfers = async () => {
    try {
      if (navigator.onLine) {
        await CloudSync.syncTransfersOnly().catch(() => {});
      }
      const allTransfers = await db.transfers.toArray();
      const count = allTransfers.filter(t => t.status === 'PENDING_RECEIPT').length;
      setPendingTransfersCount(count);
    } catch {
      setPendingTransfersCount(0);
    }
  };

  useEffect(() => {
    checkPendingTransfers();
    const interval = setInterval(checkPendingTransfers, 5000);
    return () => clearInterval(interval);
  }, []);

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center font-extrabold text-sm text-slate-950 shadow-md border border-amber-400/30">
                KC
              </div>
            )}
            <div>
              <div className="font-extrabold text-sm tracking-wide flex items-center gap-1.5 uppercase">
                <span className="text-white whitespace-nowrap">{settings?.storeName || 'KORAT CAT x เรือนโคราช'}</span>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold hidden sm:inline">
                  BOUTIQUE
                </span>
              </div>
              <p className="text-[10px] text-amber-400/80 font-sans truncate max-w-[200px] xl:max-w-[280px] hidden md:block">
                {settings?.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา'}
              </p>
            </div>
          </div>

          {/* Navigation Menus (Auto scrollable on small laptops) */}
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => onSelectTab('pos')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
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
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'shift' 
                  ? 'bg-amber-600 text-white shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>กะพนักงาน</span>
              <span className={`w-2 h-2 rounded-full ml-1 ${activeShift ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </button>

            {/* Owner Only Menus */}
            {isOwner ? (
              <>
                <button
                  onClick={() => onSelectTab('inventory')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    activeTab === 'promotions' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>โปรโมชั่น</span>
                </button>

                <button
                  onClick={() => onSelectTab('members')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    activeTab === 'members' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-300" />
                  <span>จัดการสมาชิก</span>
                </button>

                <button
                  onClick={() => onSelectTab('reports')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
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
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    activeTab === 'settings' 
                      ? 'bg-amber-600 text-white shadow' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>ตั้งค่าร้าน</span>
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

            {/* Cloud Sync Button */}
            <button
              type="button"
              onClick={() => setIsCloudSyncOpen(true)}
              title="ซิงค์ข้อมูล Cloud (Supabase) เชื่อมต่อหน้าร้าน • โกดัง • ที่บ้าน"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 text-xs font-bold transition border border-sky-800/80 shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">ซิงค์ Cloud</span>
            </button>

            {/* Stock Transfer Button (Available to both Owner & Cashier) */}
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border shadow-xs ${
                pendingTransfersCount > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse border-2 border-amber-300 shadow-lg'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800/80'
              }`}
              title={pendingTransfersCount > 0 ? 'มีสินค้าส่งมาจากโกดัง รอหน้าร้านกดตรวจรับเข้าสต็อก' : 'โอนย้ายสต็อกระหว่างโกดัง/โรงงาน และ หน้าร้าน'}
            >
              <Truck className={`w-3.5 h-3.5 ${pendingTransfersCount > 0 ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span className="hidden sm:inline">
                {pendingTransfersCount > 0 ? `รอตรวจรับของ (${pendingTransfersCount})` : 'โอนสต็อก 2 คลัง'}
              </span>
            </button>

            {/* Role & User Switcher */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  {isOwner ? (
                    <span className="text-amber-400 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> เจ้าของร้าน
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-0.5"><UserCheck className="w-3 h-3" /> แคชเชียร์</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 max-w-[130px] truncate">
                  {currentUser?.name || 'พนักงาน'}
                </div>
              </div>

              {/* Logout & Switch Shift Lock Button (No X to bypass) */}
              {onLockScreen && (
                <button
                  type="button"
                  onClick={onLockScreen}
                  title="สลับกะ / ออกจากระบบ (ต้องใส่รหัส PIN ใหม่เพื่อเข้าใช้งาน ป้องกันการกดปิดแล้วใช้กะเดิม)"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-200 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">สลับกะ/ล็อค</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Prominent Stock Transfer Arrival Alert Banner for Recipient */}
      {pendingTransfersCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2 font-bold flex flex-wrap items-center justify-between gap-2 shadow-xl border-b-2 border-amber-300 sticky top-[61px] z-30 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-950 text-amber-400 rounded-xl shadow-xs">
              <Truck className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-950">
                🚚 แจ้งเตือน: มีสินค้าโอนย้ายข้ามคลังส่งมาถึงแล้ว รอตรวจรับเข้าสต็อก!
              </span>
              <span className="ml-2 text-xs bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-black border border-amber-400/50">
                {pendingTransfersCount} รายการรอตรวจรับ
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 border border-amber-400 active:scale-95 transition flex-shrink-0"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>กดเปิดตรวจรับสินค้าเข้าสต็อกทันที</span>
          </button>
        </div>
      )}

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onSyncComplete={() => {
          checkPendingTransfers();
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        initialTab="RECEIVE_IN"
        onClose={() => {
          setIsTransferModalOpen(false);
          checkPendingTransfers();
        }}
        onTransferComplete={checkPendingTransfers}
      />
    </>
  );
};
