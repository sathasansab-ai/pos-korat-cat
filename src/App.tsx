// src/App.tsx
import React, { useState, useEffect } from 'react';
import { db, seedInitialData } from './db';
import type { UserAccount, Shift } from './types';
import { AuthService } from './services/auth';
import { Navbar } from './components/Navbar';
import { LoginLockScreen } from './components/LoginLockScreen';
import { PosPage } from './pages/PosPage';
import { ShiftPage } from './pages/ShiftPage';
import { InventoryPage } from './pages/InventoryPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { MembersPage } from './pages/MembersPage';
import { ReportsPage } from './pages/ReportsPage';
import { GoogleSheetPage } from './pages/GoogleSheetPage';
import { CustomerFacingPage } from './pages/CustomerFacingPage';
import { MobilePassPage } from './pages/MobilePassPage';
import { SettingsPage } from './pages/SettingsPage';
import { CloudSync } from './services/cloudSync';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [settingsVer, setSettingsVer] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Check if current page is the dual screen monitor (/display) or mobile member pass (/pass)
  const isDisplayPath = window.location.pathname === '/display';
  const isPassPath = window.location.pathname === '/pass';

  const refreshShift = async () => {
    const shift = await db.shifts.where({ status: 'OPEN' }).last();
    setActiveShift(shift || null);
  };

  const refreshUser = async () => {
    const user = AuthService.getCurrentUser();
    if (user) {
      const freshUser = await db.users.get(user.id);
      setCurrentUser(freshUser || user);
    }
  };

  useEffect(() => {
    const init = async () => {
      await seedInitialData();

      // ดึงการตั้งค่าล่าสุดรวมถึงรหัส PIN แอดมินและพนักงานจาก Cloud ก่อนแสดงหน้าจอ Login
      if (navigator.onLine) {
        await CloudSync.pullStoreSettings().catch(() => {});
      }

      const settings = await db.settings.get('current_store_settings');
      if (settings) setStoreSettings(settings);

      const shift = await db.shifts.where({ status: 'OPEN' }).last();
      setActiveShift(shift || null);

      // Always enforce PIN login lock screen on every fresh startup/reload for store security
      // The session will resume smoothly once the staff/owner enters their PIN.
      setIsAuthenticated(false);
      setCurrentUser(null);
      AuthService.logout();

      setIsReady(true);
    };

    init();

    const handleOnline = () => {
      CloudSync.pushAllToCloud().catch(() => {});
      CloudSync.pullFromCloud().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (isDisplayPath) {
    return <CustomerFacingPage />;
  }

  if (isPassPath) {
    return <MobilePassPage />;
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-amber-200">
          กำลังเตรียมระบบ KORAT CAT x เรือนโคราชเฉลิมวัฒนา...
        </p>
      </div>
    );
  }

  // Enforce PIN Lock Screen if not authenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginLockScreen
        storeName={storeSettings?.storeName}
        subTitle={storeSettings?.subTitle}
        hasActiveShift={!!activeShift}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          AuthService.setCurrentUser(user);
          setIsAuthenticated(true);
          // หากเป็นเจ้าหน้าที่สต็อก ให้เปิดหน้าระบบคลังสินค้าทันที
          if (user.role === 'INVENTORY') {
            setActiveTab('inventory');
          }
          // Sync latest data from cloud automatically when online
          if (navigator.onLine) {
            CloudSync.pullFromCloud().catch(err => console.warn('Background pull error:', err));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser?.role === 'INVENTORY' ? { ...currentUser, role: 'OWNER' } : currentUser}
        activeShift={activeShift}
        activeTab={activeTab}
        settingsVer={settingsVer}
        onSelectTab={(tab) => {
          if (currentUser?.role === 'INVENTORY' && ['pos', 'shift', 'reports', 'settings', 'promotions', 'members'].includes(tab)) {
            alert(`⚠️ บัญชี "${currentUser.name}" เป็นระดับเจ้าหน้าที่สต็อก (INVENTORY)\nมีสิทธิ์เข้าถึงเฉพาะระบบคลังสินค้า โอนสต็อก และแคตตาล็อกสินค้าเท่านั้นครับ`);
            return;
          }
          setActiveTab(tab);
        }}
        onLockScreen={() => {
          AuthService.logout();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }}
        onUserChanged={(user) => {
          setCurrentUser(user);
          if (user.role === 'INVENTORY') {
            setActiveTab('inventory');
          } else if (user.role === 'CASHIER' && ['inventory', 'promotions', 'members', 'reports', 'sheets', 'settings'].includes(activeTab)) {
            setActiveTab('pos');
          }
        }}
      />

      <main className="flex-1 overflow-auto">
        {currentUser?.role === 'INVENTORY' && activeTab !== 'inventory' ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-sm border border-amber-300">
              📦
            </div>
            <h2 className="text-lg font-bold text-slate-800">พื้นที่สงวนสิทธิ์เฉพาะฝ่ายสต็อกสินค้า</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              บัญชี <strong>{currentUser.name}</strong> เป็นระดับ <strong>เจ้าหน้าที่สต็อก (INVENTORY)</strong> ได้รับสิทธิ์จัดการเฉพาะระบบคลังสินค้าและการจัดสต็อกเท่านั้น
            </p>
            <button
              onClick={() => setActiveTab('inventory')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow"
            >
              กลับสู่หน้าระบบคลังสินค้า
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'pos' && (
              <PosPage
                currentUser={currentUser}
                activeShift={activeShift}
                onOpenShiftRequired={() => setActiveTab('shift')}
                onShiftUpdated={refreshShift}
              />
            )}
            {activeTab === 'shift' && (
              <ShiftPage
                currentUser={currentUser}
                activeShift={activeShift}
                onShiftUpdated={refreshShift}
              />
            )}
            {activeTab === 'inventory' && <InventoryPage currentUser={currentUser} />}
            {activeTab === 'promotions' && <PromotionsPage />}
            {activeTab === 'members' && <MembersPage />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'sheets' && <GoogleSheetPage />}
            {activeTab === 'settings' && (
              <SettingsPage
                currentUser={currentUser}
                onSettingsUpdated={() => {
                  refreshUser();
                  setSettingsVer(v => v + 1);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
