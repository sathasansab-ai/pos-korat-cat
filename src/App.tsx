// src/App.tsx
import React, { useState, useEffect } from 'react';
import { db, seedInitialData } from './db';
import type { UserAccount, Shift } from './types';
import { AuthService } from './services/auth';
import { Navbar } from './components/Navbar';
import { PosPage } from './pages/PosPage';
import { ShiftPage } from './pages/ShiftPage';
import { InventoryPage } from './pages/InventoryPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { GoogleSheetPage } from './pages/GoogleSheetPage';
import { CustomerFacingPage } from './pages/CustomerFacingPage';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isReady, setIsReady] = useState(false);

  // Check if current page is the dual screen monitor (/display)
  const isDisplayPath = window.location.pathname === '/display';

  const refreshShift = async () => {
    const shift = await db.shifts.where({ status: 'OPEN' }).last();
    setActiveShift(shift || null);
  };

  useEffect(() => {
    const init = async () => {
      await seedInitialData();
      
      // Load current user from session or default to Owner
      let user = AuthService.getCurrentUser();
      if (!user) {
        user = (await db.users.where({ role: 'OWNER' }).first()) || null;
        if (user) AuthService.setCurrentUser(user);
      }
      setCurrentUser(user);

      // Load active shift
      await refreshShift();
      setIsReady(true);
    };

    init();
  }, []);

  if (isDisplayPath) {
    return <CustomerFacingPage />;
  }

  if (!isReady || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">กำลังเตรียมระบบ POS Korat Cat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        activeShift={activeShift}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onUserChanged={(user) => {
          setCurrentUser(user);
          // If switched to Cashier and active tab is an owner-only tab, redirect to POS
          if (user.role === 'CASHIER' && ['inventory', 'promotions', 'reports', 'sheets'].includes(activeTab)) {
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
        {activeTab === 'reports' && <ReportsPage />}
        {activeTab === 'sheets' && <GoogleSheetPage />}
      </main>
    </div>
  );
}

export default App;
