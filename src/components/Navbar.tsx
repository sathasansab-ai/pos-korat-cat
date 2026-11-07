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
  PackageCheck,
  ChevronDown,
  Layers
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const checkPendingTransfers = async () => {
    try {
      if (navigator.onLine) {
        await CloudSync.syncTransfersOnly().catch(() => {});
      }
      const allTransfers = await db.transfers.toArray();
      const completedNos = new Set(
        allTransfers.filter(t => t.status === 'COMPLETED').map(t => t.transferNo)
      );
      // กวาดล้างสถานะตกค้างหาก transferNo นั้นได้รับการตรวจรับแล้ว
      for (const t of allTransfers) {
        if (t.status === 'PENDING_RECEIPT' && completedNos.has(t.transferNo)) {
          await db.transfers.update(t.id, { status: 'COMPLETED' });
        }
      }
      const count = allTransfers.filter(t => t.status === 'PENDING_RECEIPT' && !completedNos.has(t.transferNo)).length;
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
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#more-menu-container')) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMoreMenuOpen]);

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
  const isSecondaryActive = ['promotions', 'members', 'sheets', 'settings'].includes(activeTab);

  const getSecondaryTabName = () => {
    switch (activeTab) {
      case 'promotions': return '🏷️ โปรโมชั่น';
      case 'members': return '👥 สมาชิก';
      case 'sheets': return '📑 Google Sheets';
      case 'settings': return '⚙️ ตั้งค่าร้าน';
      default: return 'เมนูเพิ่มเติม';
    }
  };

  return (
    <>
      <header className="bg-slate-950 text-white shadow-xl select-none sticky top-0 z-40 border-b border-slate-800">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 xl:gap-4">
          {/* Logo & Brand (Enlarged, Luxury Boutique Gold Ring) */}
          <div className="flex items-center space-x-3.5 flex-shrink-0">
            {settings?.logoUrl && !logoError ? (
              <img
                src={settings.logoUrl}
                alt="Store Logo"
                onError={() => setLogoError(true)}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-2xl border-2 border-amber-400 bg-slate-900 p-0.5 transition-transform hover:scale-105"
              />
            ) : (
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center font-black text-base md:text-lg text-slate-950 shadow-2xl border-2 border-amber-300">
                KC
              </div>
            )}
            <div>
              <div className="font-black text-base md:text-lg tracking-wide flex items-center gap-2 uppercase">
                <span className="text-white whitespace-nowrap drop-shadow-md">{settings?.storeName || 'KORAT CAT x เรือนโคราช'}</span>
                <span className="text-xs bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 px-2 py-0.5 rounded-lg font-mono font-black hidden sm:inline shadow-sm">
                  BOUTIQUE
                </span>
              </div>
              <p className="text-xs text-amber-400 font-sans truncate max-w-[240px] hidden 2xl:block mt-0.5">
                {settings?.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา'}
              </p>
            </div>
          </div>

          {/* Navigation Menus (Expanded to Fill Center Expanse Comfortably & Perfectly) */}
          <nav className="flex-1 flex items-center justify-center gap-2 xl:gap-3 px-2 max-w-6xl mx-auto overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => onSelectTab('pos')}
              className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                activeTab === 'pos' 
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <ShoppingCart className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'pos' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>หน้าร้าน (POS)</span>
            </button>

            <button
              onClick={() => onSelectTab('shift')}
              className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                activeTab === 'shift' 
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <Clock className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'shift' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>กะ</span>
              <span className={`w-2.5 h-2.5 rounded-full ml-0.5 ${activeShift ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-slate-500'}`} />
            </button>

            {/* Owner Only Menus */}
            {isOwner ? (
              <>
                <button
                  onClick={() => onSelectTab('inventory')}
                  className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                    activeTab === 'inventory' 
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <Boxes className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'inventory' ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>คลังสินค้า</span>
                </button>

                <button
                  onClick={() => onSelectTab('reports')}
                  className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                    activeTab === 'reports' 
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'reports' ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>รายงาน</span>
                </button>

                {/* On XL & 2XL screens: show all 4 extra tabs directly */}
                <div className="hidden xl:flex items-center space-x-2 xl:space-x-3">
                  <button
                    onClick={() => onSelectTab('promotions')}
                    className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                      activeTab === 'promotions' 
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <Tag className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'promotions' ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>โปรโมชั่น</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('members')}
                    className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                      activeTab === 'members' 
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <Users className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'members' ? 'text-slate-950' : 'text-sky-400'}`} />
                    <span>สมาชิก</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('sheets')}
                    className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                      activeTab === 'sheets' 
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'sheets' ? 'text-slate-950' : 'text-emerald-400'}`} />
                    <span>Sheets</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('settings')}
                    className={`flex items-center space-x-2 px-4 xl:px-5 py-2.5 rounded-2xl text-xs xl:text-sm font-black transition-all shadow-sm flex-shrink-0 ${
                      activeTab === 'settings' 
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 border-2 border-amber-300 scale-[1.03]' 
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <Settings className={`w-4 h-4 xl:w-5 xl:h-5 ${activeTab === 'settings' ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span>ตั้งค่า</span>
                  </button>
                </div>

                {/* On Standard Laptops & Tablets (< XL): Clean Dropdown Menu */}
                <div id="more-menu-container" className="relative xl:hidden">
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen(prev => !prev)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm flex-shrink-0 ${
                      isSecondaryActive
                        ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 shadow-lg border-2 border-amber-300'
                        : 'text-slate-200 hover:bg-slate-800 bg-slate-900/90 border border-slate-800'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>{getSecondaryTabName()}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMoreMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95">
                      <div className="py-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => { onSelectTab('promotions'); setIsMoreMenuOpen(false); }}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                            activeTab === 'promotions' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Tag className="w-4 h-4 text-amber-400" />
                          <span>โปรโมชั่นอัจฉริยะ (Promotions)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { onSelectTab('members'); setIsMoreMenuOpen(false); }}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                            activeTab === 'members' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Users className="w-4 h-4 text-sky-400" />
                          <span>จัดการสมาชิก & บัตรดิจิทัล</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { onSelectTab('sheets'); setIsMoreMenuOpen(false); }}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                            activeTab === 'sheets' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          <span>เชื่อมต่อ Google Sheets</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { onSelectTab('settings'); setIsMoreMenuOpen(false); }}
                          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                            activeTab === 'settings' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Settings className="w-4 h-4 text-amber-400" />
                          <span>ตั้งค่าร้าน & รหัสพนักงาน</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="px-4 py-2 text-xs text-slate-300 font-bold flex items-center gap-2 bg-slate-900/90 rounded-2xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> แคชเชียร์
              </div>
            )}
          </nav>

          {/* Right Tools: Customer Screen, Network/Cloud, Transfer, User & Lock */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Customer Facing Dual Screen */}
            <button
              onClick={openCustomerDisplay}
              title="เปิดหน้าจอที่สองสำหรับลูกค้า (Dual Monitor with PromptPay QR)"
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black transition border border-slate-700/80 shadow-xs"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden xl:inline">จอฝั่งลูกค้า (QR)</span>
            </button>

            {/* Unified Cloud Sync + Online Status Pill */}
            <button
              type="button"
              onClick={() => setIsCloudSyncOpen(true)}
              title={isOnline ? 'เชื่อมต่อออนไลน์ และ Supabase Cloud สำเร็จ' : 'ออฟไลน์ (กำลังทำงานแบบ Offline-First)'}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl text-xs font-black transition border shadow-xs ${
                isOnline 
                  ? 'bg-sky-950/70 hover:bg-sky-900 text-sky-300 border-sky-700/80' 
                  : 'bg-amber-950/70 text-amber-400 border-amber-800 animate-pulse'
              }`}
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span className="hidden xl:inline">Cloud</span>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-amber-400 animate-ping'}`} />
            </button>

            {/* Stock Transfer Button with Badge */}
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl text-xs font-black transition border shadow-xs ${
                pendingTransfersCount > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse border-2 border-amber-300 shadow-lg'
                  : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border-emerald-700/80'
              }`}
              title={pendingTransfersCount > 0 ? `มีสินค้าส่งมาจากโกดัง รอตรวจรับ ${pendingTransfersCount} รายการ` : 'โอนย้ายสต็อก 2 คลัง'}
            >
              <Truck className={`w-4 h-4 ${pendingTransfersCount > 0 ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span className="hidden xl:inline">โอนสต็อก</span>
              {pendingTransfersCount > 0 && (
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
                  {pendingTransfersCount}
                </span>
              )}
            </button>

            {/* User Profile & Lock */}
            <div className="flex items-center space-x-2.5 pl-2.5 border-l border-slate-800">
              <div className="hidden sm:block text-right">
                <div className="text-[11px] font-bold text-white flex items-center justify-end gap-1">
                  {isOwner ? (
                    <span className="text-amber-400 flex items-center gap-1 font-black">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> เจ้าของร้าน
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold"><UserCheck className="w-3.5 h-3.5" /> แคชเชียร์</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 max-w-[90px] truncate">
                  {currentUser?.name || 'พนักงาน'}
                </div>
              </div>

              {onLockScreen && (
                <button
                  type="button"
                  onClick={onLockScreen}
                  title="สลับกะ / ออกจากระบบ (ล็อคหน้าจอเพื่อความปลอดภัย)"
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-rose-950/60 text-slate-200 border border-slate-700 hover:border-rose-500/50 text-xs font-black transition shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline">ล็อค</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prominent Stock Transfer Arrival Alert Banner for Recipient */}
        {pendingTransfersCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2 font-bold flex flex-wrap items-center justify-between gap-2 shadow-xl border-t border-amber-300 animate-pulse">
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
      </header>

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
