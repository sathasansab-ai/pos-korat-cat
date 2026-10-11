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
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../db';
import type { StoreSettings, UserAccount } from '../types';
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

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');

  // Storage Stats
  const [dbStats, setDbStats] = useState({ orders: 0, customers: 0, variants: 0, shifts: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    const s = await db.settings.get('current_store_settings');
    if (s) setSettings(s);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 256, 256, 0.9);
      setSettings(prev => prev ? { ...prev, logoUrl: base64 } : prev);
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
      version: '1.0',
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
          if (json.data.variants) await db.variants.bulkPut(json.data.variants);
          if (json.data.promotions) await db.promotions.bulkPut(json.data.promotions);
          if (json.data.customers) await db.customers.bulkPut(json.data.customers);
          if (json.data.orders) await db.orders.bulkPut(json.data.orders);
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

  if (!settings) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>ตั้งค่าระบบร้าน, สลิปใบเสร็จ และพนักงาน (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500">
            ปรับแต่งชื่อร้าน อัตลักษณ์เรือนโคราชเฉลิมวัฒนา ข้อมูลสลิปใบเสร็จ จัดการพนักงาน และสำรองข้อมูล
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
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
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
              <label className="block font-bold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
              <input
                type="text"
                value={settings.taxId}
                onChange={e => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>

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
                  <div className="w-20 h-20 rounded-2xl bg-slate-200 border border-slate-300 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-[9px]">ไอคอน 🐱</span>
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
                    หรือใส่ลิงก์รูปภาพโดยตรง:
                  </div>
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://... หรืออัปโหลดไฟล์จากเครื่องด้านบน"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: PromptPay Settings (For Customer Screen QR) */}
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

        {/* Section 3: Receipt Customization */}
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

        {/* Section 4: Owner Identity & PIN */}
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
              <label className="block font-bold text-slate-700 mb-1">รหัส PIN แอดมินหลัก (ค่าเริ่มต้น: 9999)</label>
              <input
                type="password"
                maxLength={6}
                value={ownerPin}
                onChange={e => setOwnerPin(e.target.value)}
                className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono text-center text-sm font-bold tracking-widest"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                รหัสนี้ใช้สำหรับสลับเข้าสู่สิทธิ์เจ้าของร้าน และอนุมัติการยกเลิกบิล
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

      {/* Section 5: Staff & Cashier Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              รายชื่อพนักงานกะ / แคชเชียร์ (Cashier Staff)
            </h2>
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
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="ลบพนักงาน"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Section 6: Data Storage Location & Full Backup */}
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

      {/* Add Staff Modal */}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัส PIN ประจำตัว (4-6 หลัก)</label>
              <input
                type="text"
                maxLength={6}
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
    </div>
  );
};
