// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  UserCheck, 
  Shield, 
  Receipt, 
  Database, 
  Save, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2,
  KeyRound,
  QrCode,
  Image as ImageIcon,
  Tv,
  Percent,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { db } from '../db';
import type { StoreSettings, UserAccount, CustomerScreenTheme } from '../types';
import { AuthService } from '../services/auth';
import { ImageOptimizer } from '../services/imageOptimizer';

interface SettingsPageProps {
  currentUser: UserAccount;
  onSettingsUpdated: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onSettingsUpdated
}) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [showOwnerPin, setShowOwnerPin] = useState(false);

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');

  // Storage Stats
  const [dbStats, setDbStats] = useState({ orders: 0, customers: 0, variants: 0, shifts: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Factory Reset Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetError, setResetError] = useState('');

  const loadData = async () => {
    const s = await db.settings.get('current_store_settings');
    if (s) {
      // Ensure defaults for all optional or newly added fields
      setSettings({
        ...s,
        vatType: s.vatType || 'NONE',
        vatRate: s.vatRate ?? 7,
        taxInvoiceTitle: s.taxInvoiceTitle || 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)',
        customerScreenTheme: s.customerScreenTheme || 'BLACK_GOLD',
        welcomeTitle: s.welcomeTitle || 'ยินดีต้อนรับสู่ KORAT CAT',
        welcomeSubtitle: s.welcomeSubtitle || 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด',
        welcomeImageUrl: s.welcomeImageUrl || '',
        thankYouMessage: s.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา'
      });
    }

    const u = await db.users.toArray();
    setUsers(u);

    const owner = u.find(x => x.role === 'OWNER');
    if (owner) {
      setOwnerName(owner.name);
      setOwnerPin(owner.pin);
    }

    const [ordersCount, custCount, varCount, shiftCount] = await Promise.all([
      db.orders.count(),
      db.customers.count(),
      db.variants.count(),
      db.shifts.count()
    ]);
    setDbStats({ orders: ordersCount, customers: custCount, variants: varCount, shifts: shiftCount });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Upload Logo from local file
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 300, 300, 0.9);
      setSettings(prev => prev ? { ...prev, logoUrl: base64 } : prev);
    } catch {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    }
  };

  // Upload Welcome Graphic / Poster from local file
  const handleWelcomeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 600, 600, 0.88);
      setSettings(prev => prev ? { ...prev, welcomeImageUrl: base64 } : prev);
    } catch {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    await db.settings.put(settings);

    // Update Owner Name and PIN
    const owner = users.find(x => x.role === 'OWNER');
    if (owner) {
      await db.users.update(owner.id, {
        name: ownerName,
        pin: ownerPin
      });
      // Update session if current user is owner
      if (currentUser.role === 'OWNER') {
        AuthService.setCurrentUser({ ...currentUser, name: ownerName, pin: ownerPin });
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onSettingsUpdated();
    loadData();
  };

  // Add Cashier
  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !newStaffPin.trim()) {
      alert('กรุณากรอกชื่อและรหัส PIN ของพนักงาน');
      return;
    }

    const newStaff: UserAccount = {
      id: `usr-cashier-${Date.now()}`,
      name: newStaffName.trim(),
      role: 'CASHIER',
      pin: newStaffPin.trim(),
      isActive: true
    };

    await db.users.add(newStaff);
    setNewStaffName('');
    setNewStaffPin('');
    setIsStaffModalOpen(false);
    loadData();
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบพนักงานคนนี้?')) {
      await db.users.delete(id);
      loadData();
    }
  };

  // Full Database JSON Backup Export
  const handleExportBackup = async () => {
    const [allSettings, allUsers, allProducts, allVariants, allPromos, allCustomers, allOrders, allShifts] = 
      await Promise.all([
        db.settings.toArray(),
        db.users.toArray(),
        db.products.toArray(),
        db.variants.toArray(),
        db.promotions.toArray(),
        db.customers.toArray(),
        db.orders.toArray(),
        db.shifts.toArray()
      ]);

    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      store: allSettings[0]?.storeName,
      data: {
        settings: allSettings,
        users: allUsers,
        products: allProducts,
        variants: allVariants,
        promotions: allPromos,
        customers: allCustomers,
        orders: allOrders,
        shifts: allShifts
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POS_Korat_Cat_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore Database from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.data) throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง');

        if (confirm('คำเตือน: การกู้คืนข้อมูลจะนำเข้าข้อมูลและอัปเดตระบบ ยืนยันหรือไม่?')) {
          if (json.data.settings) await db.settings.bulkPut(json.data.settings);
          if (json.data.users) await db.users.bulkPut(json.data.users);
          if (json.data.products) await db.products.bulkPut(json.data.products);
          if (json.data.variants) await db.variants.bulkPut(json.data.variants);
          if (json.data.promotions) await db.promotions.bulkPut(json.data.promotions);
          if (json.data.customers) await db.customers.bulkPut(json.data.customers);
          if (json.data.orders) await db.orders.bulkPut(json.data.orders);
          if (json.data.shifts) await db.shifts.bulkPut(json.data.shifts);
          alert('กู้คืนข้อมูลสำเร็จเรียบร้อย!');
          loadData();
          onSettingsUpdated();
        }
      } catch (err: any) {
        alert('เกิดข้อผิดพลาดในการกู้คืน: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Factory Reset Action (Clears Orders and Shifts for Grand Opening)
  const handlePerformReset = async () => {
    setResetError('');
    if (resetPin !== ownerPin) {
      setResetError('รหัส PIN แอดมินไม่ถูกต้อง');
      return;
    }
    if (resetConfirmWord.trim().toUpperCase() !== 'RESET') {
      setResetError('กรุณาพิมพ์คำว่า RESET ให้ถูกต้องเพื่อยืนยัน');
      return;
    }

    try {
      await db.orders.clear();
      await db.shifts.clear();
      setIsResetModalOpen(false);
      setResetPin('');
      setResetConfirmWord('');
      alert('✨ ล้างข้อมูลการขายและกะทดสอบเรียบร้อยแล้ว! ระบบพร้อมสำหรับการเปิดร้านจริง');
      loadData();
      onSettingsUpdated();
    } catch (err: any) {
      setResetError('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    }
  };

  if (!settings) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>ตั้งค่าระบบร้าน, สลิปใบเสร็จ, จอฝั่งลูกค้า และภาษี (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ปรับแต่งชื่อร้าน อัตลักษณ์เรือนโคราชเฉลิมวัฒนา ธีมจอฝั่งลูกค้า ระบบภาษี VAT สลิปใบเสร็จ และจัดการพนักงาน
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>บันทึกการตั้งค่าเรียบร้อย!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveStoreSettings} className="space-y-6">
        {/* Section 1: Store Branding & Identity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Store className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">ข้อมูลร้านค้าและอัตลักษณ์ (Store Identity)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อร้านหลัก</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อโครงการ / Subtitle</label>
              <input
                type="text"
                value={settings.subTitle}
                onChange={e => setSettings({ ...settings, subTitle: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">สโลแกน / คำอธิบายร้าน</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">ที่อยู่สาขา / ร้าน</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
              <input
                type="text"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID 13 หลัก)</label>
              <input
                type="text"
                value={settings.taxId}
                onChange={e => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            {/* Store Logo Uploader */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-2">
                🖼️ รูปภาพโลโก้ร้าน (แสดงที่แถบเมนูด้านบน, จอฝั่งลูกค้า และหัวใบเสร็จสลิป)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                {settings.logoUrl ? (
                  <div className="relative group flex-shrink-0">
                    <img
                      src={settings.logoUrl}
                      alt="Store Logo Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-md bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%23f59e0b" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoUrl: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow text-xs font-bold transition"
                      title="ลบโลโก้และใช้ไอคอนเริ่มต้น"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-amber-100/60 border border-amber-300 flex flex-col items-center justify-center text-amber-700 flex-shrink-0 font-bold">
                    <span className="text-2xl">🐱</span>
                    <span className="text-[9px] mt-0.5">ไอคอนเริ่มต้น</span>
                  </div>
                )}

                <div className="space-y-2 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow transition">
                      <Upload className="w-4 h-4" />
                      <span>เลือกไฟล์ภาพโลโก้จากเครื่อง (PNG, JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoUrl: '' })}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        ใช้ไอคอนเริ่มต้น (🐱)
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    💡 แนะนำ: อัปโหลดไฟล์จากเครื่อง รูปภาพจะถูกบันทึกไว้ในเครื่องแบบ Offline 100% ใช้งานได้ตลอดเวลาแม้ไม่มีอินเทอร์เน็ต
                  </div>
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="หรือวางลิงก์รูปภาพโดยตรง เช่น https://..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Customer Facing Display & Themes (แก้ภาพและข้อความที่วงกลมสีแดง) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Tv className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                ปรับแต่งหน้าจอฝั่งลูกค้า 2 จอ (Customer Facing Screen & Themes)
              </h2>
              <p className="text-[11px] text-slate-400">
                ปรับเปลี่ยนรูปภาพต้อนรับกลางจอ ข้อความต้อนรับ และโทนสีธีมระดับ Luxury Boutique สำหรับจัดแสดงที่ร้าน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Theme Selector */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-2">
                🎨 เลือกธีมสีหน้าจอฝั่งลูกค้า (Luxury Boutique Themes)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'BLACK_GOLD' as CustomerScreenTheme,
                    name: 'Black & Gold',
                    desc: 'เรียบหรู คมเข้ม Haute Couture',
                    bg: 'bg-slate-950 border-amber-500/40 text-amber-400'
                  },
                  {
                    id: 'BROWN_GOLD' as CustomerScreenTheme,
                    name: 'เรือนโคราช ไม้สักทอง',
                    desc: 'อัตลักษณ์เรือนโคราชเฉลิมวัฒนา',
                    bg: 'bg-[#24150e] border-amber-600/60 text-amber-300'
                  },
                  {
                    id: 'WHITE_GOLD' as CustomerScreenTheme,
                    name: 'Royal Ivory & Gold',
                    desc: 'ขาวงาช้าง สะอาด สว่าง นุ่มนวล',
                    bg: 'bg-slate-100 border-amber-300 text-amber-800'
                  },
                  {
                    id: 'EMERALD_GOLD' as CustomerScreenTheme,
                    name: 'มรกตทอง มรดกโคราช',
                    desc: 'เขียวมรกตทอง ธรรมชาติและงานคราฟต์',
                    bg: 'bg-[#042017] border-emerald-500/50 text-emerald-300'
                  }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, customerScreenTheme: t.id })}
                    className={`p-3.5 rounded-2xl border-2 text-left transition relative flex flex-col justify-between h-24 ${
                      settings.customerScreenTheme === t.id
                        ? `${t.bg} ring-2 ring-amber-500 shadow-md`
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-xs">{t.name}</div>
                      <div className="text-[10px] opacity-75 mt-0.5 line-clamp-2">{t.desc}</div>
                    </div>
                    {settings.customerScreenTheme === t.id && (
                      <span className="text-[10px] font-bold text-amber-400 self-end">✓ กำลังใช้งาน</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Welcome Poster / Crest Uploader */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-2">
                🖼️ ภาพต้อนรับกลางจอฝั่งลูกค้า (เปลี่ยนแทนไอคอนดาว ✨ ที่วงกลมไว้)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                {settings.welcomeImageUrl ? (
                  <div className="relative group flex-shrink-0">
                    <img
                      src={settings.welcomeImageUrl}
                      alt="Welcome Graphic Preview"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, welcomeImageUrl: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow text-xs font-bold transition"
                      title="ลบภาพและใช้โลโก้ร้านแทน"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-600 flex-shrink-0 text-center p-2">
                    <span className="text-2xl mb-1">🏛️</span>
                    <span className="text-[9px] font-bold">ใช้โลโก้ / ตราสัญลักษณ์</span>
                  </div>
                )}

                <div className="space-y-2 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow transition">
                      <Upload className="w-4 h-4" />
                      <span>อัปโหลดภาพต้อนรับ / โปสเตอร์แบรนด์ (PNG, JPG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWelcomeImageUpload}
                        className="hidden"
                      />
                    </label>

                    {settings.welcomeImageUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, welcomeImageUrl: '' })}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        ใช้โลโก้ร้านแทน
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ภาพนี้จะแสดงเด่นอยู่กลางจอฝั่งลูกค้าในขณะที่ยังไม่ได้เริ่มสแกนสินค้า
                  </div>
                  <input
                    type="text"
                    value={settings.welcomeImageUrl || ''}
                    onChange={e => setSettings({ ...settings, welcomeImageUrl: e.target.value })}
                    placeholder="หรือวางลิงก์รูปภาพโดยตรง เช่น https://..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Welcome Title */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ข้อความหัวข้อต้อนรับ (Welcome Title)
              </label>
              <input
                type="text"
                value={settings.welcomeTitle}
                onChange={e => setSettings({ ...settings, welcomeTitle: e.target.value })}
                placeholder="เช่น ยินดีต้อนรับสู่ KORAT CAT x เรือนโคราชเฉลิมวัฒนา"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            {/* Welcome Subtitle */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ข้อความคำบรรยายต้อนรับ (Welcome Subtitle)
              </label>
              <input
                type="text"
                value={settings.welcomeSubtitle}
                onChange={e => setSettings({ ...settings, welcomeSubtitle: e.target.value })}
                placeholder="เช่น สินค้าแฟชั่นอัตลักษณ์แมวโคราช จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            {/* Thank You Message */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                ข้อความขอบคุณหลังชำระเงินเสร็จ (Thank You Screen Banner)
              </label>
              <input
                type="text"
                value={settings.thankYouMessage}
                onChange={e => setSettings({ ...settings, thankYouMessage: e.target.value })}
                placeholder="เช่น ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา ขอให้มีความสุขในการสวมใส่"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: VAT & Tax Invoices */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Percent className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">
              ระบบภาษีมูลค่าเพิ่ม (VAT 7%) และใบกำกับภาษีเต็มรูป
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">รูปแบบการคิดภาษี VAT</label>
              <select
                value={settings.vatType}
                onChange={e => setSettings({ ...settings, vatType: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                <option value="NONE">ไม่คิดภาษีมูลค่าเพิ่ม (Non-VAT / ยกเว้นภาษี)</option>
                <option value="INCLUSIVE">รวมภาษีในราคาสินค้าแล้ว (Inclusive VAT 7%)</option>
                <option value="EXCLUSIVE">คิดภาษีแยกเพิ่มต่างหาก (Exclusive VAT +7%)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">
                ร้านค้าทั่วไปมักใช้ "รวมในราคาแล้ว" เพื่อให้ราคาป้ายตรงกับที่ลูกค้าจ่ายจริง
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">อัตราภาษีมูลค่าเพิ่ม (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={settings.vatRate}
                onChange={e => setSettings({ ...settings, vatRate: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">หัวเอกสารใบกำกับภาษี</label>
              <input
                type="text"
                value={settings.taxInvoiceTitle}
                onChange={e => setSettings({ ...settings, taxInvoiceTitle: e.target.value })}
                placeholder="เช่น ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 4: PromptPay Settings (For Customer Screen QR) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              การชำระเงิน PromptPay QR (แสดงบนจอฝั่งลูกค้าอัตโนมัติ)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                หมายเลข PromptPay (เบอร์มือถือ หรือ เลขผู้เสียภาษี 13 หลัก)
              </label>
              <input
                type="text"
                value={settings.promptPayId}
                onChange={e => setSettings({ ...settings, promptPayId: e.target.value })}
                placeholder="เช่น 0819998888 หรือ 0305566001234"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ระบบจะนำเลขนี้ไปคำนวณสร้าง QR Code พร้อมราคาสุทธิที่ต้องชำระขึ้นจอฝั่งลูกค้าทันที
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ขนาดกระดาษเครื่องพิมพ์สลิป</label>
              <select
                value={settings.printerPaperWidth}
                onChange={e => setSettings({ ...settings, printerPaperWidth: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="80mm">80 มม. (มาตรฐานเครื่องพิมพ์สลิปความร้อนหน้ากว้าง)</option>
                <option value="58mm">58 มม. (เครื่องพิมพ์สลิปพกพา/ขนาดกะทัดรัด)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Receipt Customization */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">ข้อความหัวและท้ายใบเสร็จรับเงิน</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ข้อความส่วนหัวใบเสร็จ</label>
              <textarea
                rows={3}
                value={settings.receiptHeader}
                onChange={e => setSettings({ ...settings, receiptHeader: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ข้อความส่วนท้ายใบเสร็จ (เงื่อนไขการเปลี่ยนสินค้า/ติดต่อ)</label>
              <textarea
                rows={3}
                value={settings.receiptFooter}
                onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Owner Identity & PIN */}
        <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm space-y-4 bg-gradient-to-br from-white to-amber-50/20">
          <div className="flex items-center space-x-2 border-b border-amber-100 pb-3">
            <Shield className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-amber-900">
              ข้อมูลบัญชีแอดมินเจ้าของร้าน (Owner Account)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ชื่อเจ้าของร้าน (แสดงในระบบ)</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="เช่น คุณนพดล (เจ้าของร้าน)"
                className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">รหัส PIN แอดมินหลัก (4-12 ตัวอักษร/ตัวเลข)</label>
              <div className="relative">
                <input
                  type={showOwnerPin ? 'text' : 'password'}
                  maxLength={12}
                  value={ownerPin}
                  onChange={e => setOwnerPin(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono text-center text-sm font-bold tracking-widest pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPin(!showOwnerPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                รหัสนี้ใช้สลับเข้าสิทธิ์เจ้าของร้าน อนุมัติยกเลิกบิล และยืนยันการตั้งค่าขั้นสูง
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-lg flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่าทั้งหมด</span>
          </button>
        </div>
      </form>

      {/* Section 7: Staff & Cashier Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                รายชื่อพนักงานกะ / แคชเชียร์ (Cashier Staff)
              </h2>
              <p className="text-[11px] text-slate-400">
                เพิ่มพนักงานได้มากกว่า 1 คน พร้อมกำหนดรหัส PIN ประจำตัวสำหรับเปิด-ปิดกะ
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มพนักงาน</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {users
            .filter(u => u.role === 'CASHIER')
            .map(staff => (
              <div
                key={staff.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800">{staff.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">PIN: •••• ({staff.pin})</div>
                </div>
                <button
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="ลบพนักงาน"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Section 8: Data Storage Location & Full Backup */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-white">
            ที่จัดเก็บข้อมูลและการสำรองข้อมูล (Data Storage & Local Backup)
          </h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          ระบบ POS Korat Cat ทำงานแบบ <b>Offline-First</b> โดยบันทึกข้อมูลทั้งหมด (ยอดขาย, สต็อก, ลูกค้าสมาชิก, กะแคชเชียร์) ไว้ใน <b>IndexedDB (Browser Local Storage)</b> บนเครื่องของคุณอย่างปลอดภัย 100% แม้ไม่มีอินเทอร์เน็ตก็ทำงานได้ คุณสามารถสำรองข้อมูล (Backup) ออกมาเป็นไฟล์ JSON ได้ตลอดเวลา
        </p>

        {/* Database Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          <div className="p-3 bg-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase">ยอดขายในระบบ</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{dbStats.orders} บิล</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase">สมาชิกสะสมแต้ม</span>
            <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">{dbStats.customers} คน</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase">ตัวเลือกสินค้าในคลัง</span>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{dbStats.variants} รายการ</div>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 uppercase">บันทึกกะพนักงาน</span>
            <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">{dbStats.shifts} กะ</div>
          </div>
        </div>

        {/* Backup Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมด (Full JSON Backup)</span>
          </button>

          <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>กู้คืนข้อมูลจากไฟล์ JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Section 9: DANGER ZONE - Factory Reset before Grand Opening */}
      <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-rose-200 pb-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <div>
            <h2 className="text-sm font-bold text-rose-900">
              พื้นที่ความปลอดภัยขั้นสูง: ล้างข้อมูลการขายและกะทดสอบ (Factory Reset)
            </h2>
            <p className="text-[11px] text-rose-600">
              ใช้สำหรับล้างยอดขายและประวัติกะที่เกิดจากการทดสอบ ก่อนนำระบบไปเปิดใช้งานจริงหน้าร้าน
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-rose-800 leading-relaxed max-w-xl">
            เมื่อกดล้างข้อมูล ระบบจะลบเฉพาะ <b>ยอดขาย (Orders)</b> และ <b>บันทึกกะ (Shifts)</b> ทั้งหมด<br />
            ✨ <b>สิ่งที่ยังคงอยู่ไม่หาย:</b> สินค้าในคลัง (Products/Variants), ข้อมูลร้านและโลโก้, รายชื่อพนักงาน และรายชื่อสมาชิก
          </div>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ล้างยอดขายและกะเพื่อเปิดร้านจริง</span>
          </button>
        </div>
      </div>

      {/* Modal: Add Staff */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>เพิ่มพนักงานแคชเชียร์ใหม่</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อพนักงาน</label>
              <input
                type="text"
                value={newStaffName}
                onChange={e => setNewStaffName(e.target.value)}
                placeholder="เช่น น้องมุก (แคชเชียร์ 3)"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN ประจำตัว (4-12 ตัวอักษร/ตัวเลข)</label>
              <input
                type="text"
                maxLength={12}
                value={newStaffPin}
                onChange={e => setNewStaffPin(e.target.value)}
                placeholder="เช่น 7788"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold text-sm tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddStaff}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
              >
                บันทึกพนักงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Factory Reset Confirmation */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border-2 border-rose-500">
            <div className="flex items-center space-x-3 text-rose-600 pb-2 border-b border-rose-100">
              <AlertTriangle className="w-7 h-7 flex-shrink-0" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  ยืนยันการล้างข้อมูลทดสอบ (Factory Reset)
                </h3>
                <p className="text-xs text-rose-600">
                  การกระทำนี้จะล้างประวัติการขายและกะทั้งหมดเพื่อเตรียมเปิดร้านจริง
                </p>
              </div>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold">⚠️ รายการที่จะถูกล้าง:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                <li>บิลการขายทั้งหมด ({dbStats.orders} บิล)</li>
                <li>บันทึกเปิด-ปิดกะทั้งหมด ({dbStats.shifts} กะ)</li>
              </ul>
              <p className="pt-1 text-[11px] text-slate-600">
                ข้อมูลสต็อกสินค้า รายชื่อสมาชิก และพนักงานจะ <b>ยังคงอยู่ครบถ้วน</b>
              </p>
            </div>

            {resetError && (
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-bold text-center">
                {resetError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. ใส่รหัส PIN แอดมินเจ้าของร้านเพื่อยืนยันสิทธิ์
                </label>
                <input
                  type="password"
                  value={resetPin}
                  onChange={e => setResetPin(e.target.value)}
                  placeholder="รหัส PIN แอดมิน"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold tracking-widest text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. พิมพ์คำว่า <span className="font-mono text-rose-600 font-black">RESET</span> เพื่อยืนยัน
                </label>
                <input
                  type="text"
                  value={resetConfirmWord}
                  onChange={e => setResetConfirmWord(e.target.value)}
                  placeholder="RESET"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold tracking-widest text-rose-700 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetPin('');
                  setResetConfirmWord('');
                  setResetError('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handlePerformReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
