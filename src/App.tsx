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
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [settingsVer, setSettingsVer] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Check if current page is the dual screen monitor (/display)
  const isDisplayPath = window.location.pathname === '/display';

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
  }, []);

  if (isDisplayPath) {
    return <CustomerFacingPage />;
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
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        activeShift={activeShift}
        activeTab={activeTab}
        settingsVer={settingsVer}
        onSelectTab={setActiveTab}
        onLockScreen={() => {
          AuthService.logout();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }}
        onUserChanged={(user) => {
          setCurrentUser(user);
          // If switched to Cashier and active tab is an owner-only tab, redirect to POS
          if (user.role === 'CASHIER' && ['inventory', 'promotions', 'members', 'reports', 'sheets', 'settings'].includes(activeTab)) {
            setActiveTab('pos');
          }
        }}
      />

      <main className="flex-1 overflow-auto">
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
        {activeTab === 'inventory' && <InventoryPage />}
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
      </main>
    </div>
  );
}

export default App;
