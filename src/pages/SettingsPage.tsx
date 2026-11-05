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
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { db } from '../db';
import type { StoreSettings, UserAccount, CustomerScreenTheme, CustomerSlideItem } from '../types';
import { AuthService } from '../services/auth';
import { ImageOptimizer } from '../services/imageOptimizer';
import { CloudSync } from '../services/cloudSync';
import { DualMonitorSync } from '../services/dualMonitorSync';

const DEFAULT_PROMO_SLIDES: CustomerSlideItem[] = [
  {
    id: 'heritage',
    tag: 'HERITAGE BOUTIQUE • ผสานอัตลักษณ์เมืองโคราช',
    badgeColor: 'AMBER',
    layoutMode: 'SPLIT',
    title: 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
    subtitle: 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา และแฟชั่นอัตลักษณ์แมวสีสวาด',
    description: 'งานหัตถศิลป์ทรงคุณค่า เอกลักษณ์เมืองนครราชสีมา เสื้อยืดพรีเมียมลิมิเต็ด ลายฉลุทองคำประณีต สกรีน DTF & Flex นูนเมทัลลิกชั้นสูง',
    highlight1: '✨ สกรีน DTF สีสวาดทองคำ ลิขสิทธิ์แท้',
    highlight2: '🏛️ มนต์เสน่ห์ศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา',
    highlight3: '🧵 เส้นใย Premium Comb Cotton 100% สวมใส่สบาย'
  },
  {
    id: 'mix_match',
    tag: 'SPECIAL PRIVILEGE • เซ็ตสุดคุ้ม',
    badgeColor: 'EMERALD',
    layoutMode: 'SPLIT',
    title: 'โปรโมชั่นพิเศษ "Mix & Match 3 ชิ้น ฿1,000"',
    subtitle: 'จับคู่ความคุ้มค่า ซื้อเสื้อยืดหรือของที่ระลึก 3 ชิ้น ประหยัดทันที 170 บาท',
    description: 'สามารถเลือกคละสี คละไซส์ (S, M, L, XL, 2XL) และคละลายพิมพ์ฉลุได้ตามใจชอบ ระบบจะคำนวณราคาโปรโมชั่นให้อัตโนมัติที่หน้าเคาน์เตอร์',
    highlight1: '🏷️ คละสี คละไซส์ คละลายพิมพ์ได้อิสระ',
    highlight2: '⚡ ระบบคำนวณส่วนลดให้อัตโนมัติบนหน้าจอ',
    highlight3: '🎁 เหมาะสำหรับเป็นของขวัญและของฝากพรีเมียม'
  },
  {
    id: 'digital_pass',
    tag: 'VIP MEMBERSHIP • บัตรสมาชิกดิจิทัล',
    badgeColor: 'SKY',
    layoutMode: 'SPLIT',
    title: 'Digital Wisdom Pass สมาชิกทรงเกียรติ',
    subtitle: 'สมัครสมาชิกฟรีเพียงแจ้งเบอร์โทรศัพท์ รับส่วนลด 5% - 10% ทุกยอดซื้อ',
    description: 'ยกระดับประสบการณ์ช้อปปิ้งสู่ระดับ Luxury บัตรสมาชิกดิจิทัล SILVER, GOLD และ BLACK WISDOM สแกน QR บัตรเก็บไว้ในสมาร์ทโฟนได้ทันที',
    highlight1: '💎 บัตรสมาชิกดิจิทัลหรูหรา สแกน QR เก็บเข้ามือถือได้',
    highlight2: '🎁 รับส่วนลด 5% สำหรับ GOLD และ 10% สำหรับ BLACK WISDOM',
    highlight3: '🎨 สิทธิ์เข้าร่วมกิจกรรม Workshop หัตถศิลป์เรือนโคราชฟรี'
  },
  {
    id: 'custom_made',
    tag: 'HAUTE COUTURE SERVICES • งานสั่งตัด',
    badgeColor: 'PURPLE',
    layoutMode: 'SPLIT',
    title: 'บริการสั่งตัดเย็บ & สกรีนสั่งผลิตพิเศษ',
    subtitle: 'รับทำเสื้อทีม ลายปักประณีต และของที่ระลึกองค์กร วางมัดจำเพียง 50%',
    description: 'สร้างสรรค์ชิ้นงานเฉพาะบุคคลโดยกลุ่มวิสาหกิจชุมชนหัตถศิลป์โคราช พร้อมออกใบสั่งผลิตดิจิทัลและนัดรับสินค้าได้ที่หน้าร้าน',
    highlight1: '✂️ งานปักตราสัญลักษณ์ และงานสกรีนตามแบบเฉพาะคุณ',
    highlight2: '📜 ใบสั่งผลิตและใบรับมัดจำดิจิทัลพร้อมกำหนดวันนัดรับ',
    highlight3: '🏪 นัดรับสินค้าได้ที่หน้าร้านเรือนโคราช หรือจัดส่งถึงบ้าน'
  }
];

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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // New Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');

  // Storage Stats
  const [dbStats, setDbStats] = useState({ orders: 0, customers: 0, variants: 0, shifts: 0, customOrders: 0, transfers: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Factory Reset Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetOrders, setResetOrders] = useState(true);
  const [resetShifts, setResetShifts] = useState(true);
  const [resetCustomOrders, setResetCustomOrders] = useState(true);
  const [resetTransfers, setResetTransfers] = useState(true);
  const [resetCustomers, setResetCustomers] = useState(false);
  const [resetCloud, setResetCloud] = useState(true);
  const [resetError, setResetError] = useState('');

  const [syncStatusText, setSyncStatusText] = useState<string>('');

  const persistAndBroadcastSettings = async (newSettings: StoreSettings) => {
    setSettings(newSettings);
    await db.settings.put(newSettings);
    DualMonitorSync.broadcastSettings(newSettings);
    setSyncStatusText('⚡ ซิงค์ภาพและข้อมูลไปยังจอฝั่งลูกค้าเรียบร้อยแล้ว (อัปเดตทันที)');
    setTimeout(() => setSyncStatusText(''), 4000);

    // Sync to Supabase Cloud in background for cross-device/tablets
    CloudSync.pushStoreSettings(newSettings).catch(err => console.warn('Cloud sync background error', err));
  };

  const loadData = async () => {
    const s = await db.settings.get('current_store_settings');
    if (s) {
      const slides = (s.customSlides && s.customSlides.length > 0)
        ? s.customSlides
        : DEFAULT_PROMO_SLIDES;

      // Ensure defaults for all optional or newly added fields
      const loaded: StoreSettings = {
        ...s,
        customSlides: slides,
        vatType: s.vatType || 'NONE',
        vatRate: s.vatRate ?? 7,
        taxInvoiceTitle: s.taxInvoiceTitle || 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)',
        customerScreenTheme: s.customerScreenTheme || 'BLACK_GOLD',
        welcomeTitle: s.welcomeTitle || 'ยินดีต้อนรับสู่ KORAT CAT',
        welcomeSubtitle: s.welcomeSubtitle || 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด',
        welcomeImageUrl: s.welcomeImageUrl || '',
        thankYouMessage: s.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
        showStockQuantityOnPos: s.showStockQuantityOnPos ?? false,
        goldPointsThreshold: s.goldPointsThreshold ?? 50,
        goldSpentThreshold: s.goldSpentThreshold ?? 5000,
        goldDiscountPercent: s.goldDiscountPercent ?? 5,
        goldPrivilegeText: s.goldPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ',
        blackWisdomPointsThreshold: s.blackWisdomPointsThreshold ?? 150,
        blackWisdomSpentThreshold: s.blackWisdomSpentThreshold ?? 15000,
        blackWisdomDiscountPercent: s.blackWisdomDiscountPercent ?? 10,
        blackWisdomPrivilegeText: s.blackWisdomPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี'
      };
      setSettings(loaded);

      // If customSlides were missing in storage, backfill them immediately
      if (!s.customSlides || s.customSlides.length === 0) {
        await db.settings.put(loaded);
        DualMonitorSync.broadcastSettings(loaded);
      }
    }

    const u = await db.users.toArray();
    setUsers(u);

    const owner = u.find(x => x.role === 'OWNER');
    if (owner) {
      setOwnerName(owner.name);
      setOwnerPin(owner.pin);
    }

    const [ordersCount, custCount, varCount, shiftCount, coCount, transCount] = await Promise.all([
      db.orders.count(),
      db.customers.count(),
      db.variants.count(),
      db.shifts.count(),
      db.customOrders.count(),
      db.transfers.count()
    ]);
    setDbStats({ orders: ordersCount, customers: custCount, variants: varCount, shifts: shiftCount, customOrders: coCount, transfers: transCount });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Upload Logo from local file
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 400, 400, 0.9);
      const updated: StoreSettings = { ...settings, logoUrl: base64, updatedAt: new Date().toISOString() };
      await persistAndBroadcastSettings(updated);
    } catch {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    }
  };

  // Upload Welcome Graphic / Poster from local file
  const handleWelcomeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 800, 600, 0.82);
      const updated: StoreSettings = { ...settings, welcomeImageUrl: base64, updatedAt: new Date().toISOString() };
      await persistAndBroadcastSettings(updated);
    } catch {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    }
  };

  // Upload Slide Poster / Image from local file
  const handleSlideImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 800, 600, 0.82);
      const currentSlides = settings.customSlides && settings.customSlides.length > 0 
        ? [...settings.customSlides] 
        : [...DEFAULT_PROMO_SLIDES];
      while (currentSlides.length <= index) {
        currentSlides.push({ ...DEFAULT_PROMO_SLIDES[currentSlides.length] || DEFAULT_PROMO_SLIDES[0], id: `slide-${Date.now()}-${currentSlides.length}` });
      }
      currentSlides[index] = { ...currentSlides[index], imageUrl: base64 };
      const updated: StoreSettings = { ...settings, customSlides: currentSlides, updatedAt: new Date().toISOString() };
      await persistAndBroadcastSettings(updated);
    } catch {
      alert('ไม่สามารถประมวลผลไฟล์รูปภาพได้');
    }
  };

  const handleSetAllSlidesFullImage = async () => {
    if (!settings) return;
    const currentSlides = settings.customSlides && settings.customSlides.length > 0 
      ? [...settings.customSlides] 
      : [...DEFAULT_PROMO_SLIDES];
    const updated = currentSlides.map(s => ({ ...s, layoutMode: 'FULL_IMAGE' as const }));
    const newSettings: StoreSettings = { ...settings, customSlides: updated, screensaverMode: 'FULL_POSTER', updatedAt: new Date().toISOString() };
    await persistAndBroadcastSettings(newSettings);
  };

  const handleSetAllSlidesSplit = async () => {
    if (!settings) return;
    const currentSlides = settings.customSlides && settings.customSlides.length > 0 
      ? [...settings.customSlides] 
      : [...DEFAULT_PROMO_SLIDES];
    const updated = currentSlides.map(s => ({ ...s, layoutMode: 'SPLIT' as const }));
    const newSettings: StoreSettings = { ...settings, customSlides: updated, screensaverMode: 'SLIDESHOW', updatedAt: new Date().toISOString() };
    await persistAndBroadcastSettings(newSettings);
  };

  const handleUpdateSlideField = async (index: number, field: keyof CustomerSlideItem, value: any) => {
    if (!settings) return;
    const currentSlides = settings.customSlides && settings.customSlides.length > 0 
      ? [...settings.customSlides] 
      : [...DEFAULT_PROMO_SLIDES];
    if (currentSlides[index]) {
      currentSlides[index] = { ...currentSlides[index], [field]: value };
      const updated: StoreSettings = { ...settings, customSlides: currentSlides, updatedAt: new Date().toISOString() };
      await persistAndBroadcastSettings(updated);
    }
  };

  const handleAddSlide = async () => {
    if (!settings) return;
    const currentSlides = settings.customSlides && settings.customSlides.length > 0 
      ? [...settings.customSlides] 
      : [...DEFAULT_PROMO_SLIDES];
    const newSlide: CustomerSlideItem = {
      id: `slide-${Date.now()}`,
      tag: 'NEW PROMOTION • โปรโมชั่นใหม่',
      badgeColor: 'AMBER',
      layoutMode: 'SPLIT',
      title: 'โปรโมชั่นพิเศษต้อนรับลูกค้า',
      subtitle: 'สิทธิพิเศษและข้อเสนอประจำสัปดาห์',
      description: 'กรอกรายละเอียดข้อเสนอ หรือโปรโมชั่นของร้านเพื่อดึงดูดความสนใจของลูกค้าที่เคาน์เตอร์',
      highlight1: '✨ ไฮไลต์จุดเด่นข้อที่ 1',
      highlight2: '🏷️ ไฮไลต์จุดเด่นข้อที่ 2',
      highlight3: '🎁 ไฮไลต์จุดเด่นข้อที่ 3'
    };
    const updated = [...currentSlides, newSlide];
    const newSettings: StoreSettings = { ...settings, customSlides: updated, updatedAt: new Date().toISOString() };
    await persistAndBroadcastSettings(newSettings);
    setActiveSlideIndex(updated.length - 1);
  };

  const handleDeleteSlide = async (index: number) => {
    if (!settings) return;
    const currentSlides = settings.customSlides && settings.customSlides.length > 0 
      ? [...settings.customSlides] 
      : [...DEFAULT_PROMO_SLIDES];
    if (currentSlides.length <= 1) {
      alert('ต้องมีสไลด์โฆษณาอย่างน้อย 1 สไลด์');
      return;
    }
    const updated = currentSlides.filter((_, i) => i !== index);
    const newSettings: StoreSettings = { ...settings, customSlides: updated, updatedAt: new Date().toISOString() };
    await persistAndBroadcastSettings(newSettings);
    setActiveSlideIndex(Math.max(0, index - 1));
  };

  const handleResetSlidesToDefault = async () => {
    if (!settings) return;
    if (confirm('ต้องการรีเซ็ตสไลด์โฆษณาทั้งหมดกลับเป็นค่าเริ่มต้นอัตลักษณ์โคราช 4 สไลด์หรือไม่?')) {
      const newSettings: StoreSettings = { ...settings, customSlides: [...DEFAULT_PROMO_SLIDES], updatedAt: new Date().toISOString() };
      await persistAndBroadcastSettings(newSettings);
      setActiveSlideIndex(0);
    }
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const newSettings: StoreSettings = { ...settings, updatedAt: new Date().toISOString() };
    await persistAndBroadcastSettings(newSettings);

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
    // Auto-scroll smoothly to top so user sees the top view
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => setSaveSuccess(false), 3500);
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
      if (resetOrders) await db.orders.clear();
      if (resetShifts) await db.shifts.clear();
      if (resetTransfers) await db.transfers.clear();
      if (resetCustomOrders) await db.customOrders.clear();
      if (resetCustomers) await db.customers.clear();

      if (resetCloud) {
        try {
          await CloudSync.resetCloudData();
        } catch (cErr) {
          console.warn('Could not reset cloud data:', cErr);
        }
      }

      AuthService.logout();
      alert('ล้างข้อมูลส่วนที่เลือกเรียบร้อยแล้ว!\n(รวมถึงข้อมูลทดสอบบน Cloud)\n\nระบบจะออกจากระบบเพื่อเตรียมพร้อมสำหรับการเปิดร้านจริง');
      window.location.reload();
    } catch (err: any) {
      setResetError('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + err.message);
    }
  };

  if (!settings) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-16 relative">
      {/* FLOATING SUCCESS TOAST (Always visible on screen when saved) */}
      {saveSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border-2 border-emerald-400 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-white animate-bounce" />
          <span>✓ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว! หน้าจอและระบบอัปเดตทันที</span>
        </div>
      )}

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
                รูปภาพโลโก้ร้าน (แสดงที่แถบเมนูด้านบน, จอฝั่งลูกค้า และหัวใบเสร็จสลิป)
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
                  <div className="w-20 h-20 rounded-2xl bg-amber-100/60 border border-amber-300 flex flex-col items-center justify-center text-amber-800 flex-shrink-0 font-bold">
                    <span className="text-xl font-black font-mono">KC</span>
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
                        ใช้ไอคอนเริ่มต้น (KC)
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    คำแนะนำ: อัปโหลดไฟล์จากเครื่อง รูปภาพจะถูกบันทึกไว้ในเครื่องแบบ Offline 100% ใช้งานได้ตลอดเวลาแม้ไม่มีอินเทอร์เน็ต
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

            {/* POS Display Preferences */}
            <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-xs">
                  แสดงตัวเลขจำนวนสต็อกคงเหลือบนการ์ดสินค้าในหน้าขาย (POS)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  หากปิด (แนะนำ): การ์ดสินค้าจะแสดงเฉพาะชื่อและราคา เหมาะกับร้านแฟชั่นบูทีคเรียบหรู (ระบบยังคงบล็อคไม่ให้ขายเมื่อสินค้าหมดเป็น 0 ชิ้น)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={settings.showStockQuantityOnPos ?? false}
                  onChange={e => setSettings({ ...settings, showStockQuantityOnPos: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
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
                เลือกธีมสีหน้าจอฝั่งลูกค้า (Luxury Boutique Themes)
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

            {/* Global Screensaver Mode Selection (เลือกรูปแบบหน้าจอพักสายตา) */}
            <div className="md:col-span-2 p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border-2 border-amber-500/40 shadow-sm">
              <label className="block font-black text-slate-800 text-sm mb-2 flex items-center gap-2">
                <span>🖥️ รูปแบบการแสดงผลบนจอฝั่งลูกค้าขณะพักจอ (Screensaver Display Mode)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => persistAndBroadcastSettings({ ...settings, screensaverMode: 'FULL_POSTER', updatedAt: new Date().toISOString() })}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center gap-3 ${
                    settings.screensaverMode === 'FULL_POSTER'
                      ? 'bg-white border-amber-500 text-slate-900 shadow-md font-bold ring-2 ring-amber-400'
                      : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-3xl">🖼️</span>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">โหมดที่ 1: ภาพโปสเตอร์เต็มจอ 100% (แนะนำ)</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      แสดงรูปภาพแบนเนอร์/โปสเตอร์เต็มจอ ไร้กล่องข้อความบดบัง สวยงามระดับลักชัวรี ดึงดูดสายตาลูกค้าทันที
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => persistAndBroadcastSettings({ ...settings, screensaverMode: 'SLIDESHOW', updatedAt: new Date().toISOString() })}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center gap-3 ${
                    (settings.screensaverMode || 'SLIDESHOW') === 'SLIDESHOW'
                      ? 'bg-white border-amber-500 text-slate-900 shadow-md font-bold ring-2 ring-amber-400'
                      : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="text-3xl">📑</span>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">โหมดที่ 2: สไลด์โชว์หมุนเวียน 4 รายการ</div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      หมุนเวียนข้อความโปรโมชั่นและงานสั่งตัด พร้อม 3 ไฮไลต์จุดเด่นของแต่ละสไลด์
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Welcome Poster / Crest Uploader */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-2">
                ภาพต้อนรับ / โปสเตอร์แบรนด์กลางจอฝั่งลูกค้า (แสดงเต็มจอในโหมดโปสเตอร์)
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
                    <ImageIcon className="w-8 h-8 text-indigo-400 mb-1" />
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

            {/* Custom Promo Slides Manager (แก้ไขข้อความ & ภาพสไลด์โชว์ที่วงกลมสีแดง) */}
            <div className="md:col-span-2 pt-4 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block font-black text-slate-800 text-sm flex items-center gap-1.5">
                    <span>🎬 ปรับแต่งเนื้อหาและรูปภาพสไลด์โฆษณาบนจอที่ 2 (Screensaver & Promo Slides)</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    แก้ไขข้อความหัวข้อ คำบรรยาย รูปภาพ และไฮไลต์ของแต่ละสไลด์ (ที่วนแสดงบนจอฝั่งลูกค้าขณะพักจอ)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open('/display', '_blank', 'width=1200,height=800')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                    title="เปิดหน้าจอฝั่งลูกค้าในหน้าต่างใหม่เพื่อดูผลลัพธ์ทันที"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🖥️ เปิดดูหน้าจอที่ 2 (จอฝั่งลูกค้า)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSlidesToDefault}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1"
                    title="คืนค่ากลับเป็นสไลด์อัตลักษณ์โคราช 4 สไลด์เริ่มต้น"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มสไลด์ใหม่</span>
                  </button>
                </div>
              </div>

              {/* Sync Status Banner */}
              {syncStatusText && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{syncStatusText}</span>
                </div>
              )}

              {/* Slide Tabs Navigation */}
              {(() => {
                const slides = settings.customSlides && settings.customSlides.length > 0 
                  ? settings.customSlides 
                  : DEFAULT_PROMO_SLIDES;
                const curSlide = slides[activeSlideIndex] || slides[0];

                return (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                    {/* Tabs & Quick Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div className="flex flex-wrap gap-1.5">
                        {slides.map((s, idx) => (
                          <button
                            key={s.id || idx}
                            type="button"
                            onClick={() => setActiveSlideIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              activeSlideIndex === idx
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>สไลด์ที่ {idx + 1}:</span>
                            <span className="truncate max-w-[120px] font-normal">{s.title || `สไลด์ ${idx + 1}`}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={handleSetAllSlidesFullImage}
                          className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-300 rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                          title="ปรับทุกสไลด์ให้แสดงเฉพาะรูปภาพเต็มกรอบ 100%"
                        >
                          <span>🖼️ ตั้งทุกสไลด์เป็นภาพเต็มจอ 100%</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSetAllSlidesSplit}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium flex items-center gap-1 transition"
                          title="ปรับทุกสไลด์เป็นแบบข้อความ + ภาพ"
                        >
                          <span>📝 เป็นข้อความ+ภาพ</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Slide Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Layout Mode Selector (แบบที่ 1: ข้อความ+รูป VS แบบที่ 2: ภาพโปสเตอร์เต็มกรอบ) */}
                      <div className="md:col-span-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                        <label className="block font-black text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                          <span>🖼️ เลือกรูปแบบการแสดงผลของสไลด์ที่ {activeSlideIndex + 1}:</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateSlideField(activeSlideIndex, 'layoutMode', 'SPLIT')}
                            className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                              (curSlide.layoutMode || 'SPLIT') === 'SPLIT'
                                ? 'bg-white border-amber-500 text-slate-900 shadow-sm font-bold ring-2 ring-amber-400'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <span className="text-xl">📝</span>
                            <div>
                              <div className="font-extrabold text-xs">แบบที่ 1: ข้อความ + ภาพ (แบบปัจจุบัน)</div>
                              <div className="text-[10px] text-slate-500 font-normal">มีกล่องภาพด้านซ้าย พร้อมหัวข้อ คำบรรยาย และ 3 ไฮไลต์</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateSlideField(activeSlideIndex, 'layoutMode', 'FULL_IMAGE')}
                            className={`p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                              curSlide.layoutMode === 'FULL_IMAGE'
                                ? 'bg-white border-amber-500 text-slate-900 shadow-sm font-bold ring-2 ring-amber-400'
                                : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <span className="text-xl">🖼️</span>
                            <div>
                              <div className="font-extrabold text-xs">แบบที่ 2: ภาพโปสเตอร์เต็มกรอบ 100%</div>
                              <div className="text-[10px] text-slate-500 font-normal">แสดงรูปภาพแบนเนอร์/โปสเตอร์เต็มพื้นที่ ไม่มีข้อความมาบดบัง</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Left: Image / Poster for this slide */}
                      <div className="md:col-span-2 p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {curSlide.imageUrl ? (
                          <div className="relative group flex-shrink-0">
                            <img
                              src={curSlide.imageUrl}
                              alt="Slide Poster"
                              className="w-24 h-24 rounded-xl object-contain border border-amber-300 bg-slate-900 p-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateSlideField(activeSlideIndex, 'imageUrl', '')}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow"
                              title="ลบภาพสไลด์นี้"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center p-2 flex-shrink-0">
                            <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                            <span className="text-[9px]">ใช้โลโก้ร้านแทน</span>
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1 w-full text-xs">
                          <div className="font-bold text-slate-700">
                            {curSlide.layoutMode === 'FULL_IMAGE'
                              ? `🖼️ รูปภาพโปสเตอร์/แบนเนอร์ของสไลด์ที่ ${activeSlideIndex + 1} (จะแสดงแบบเต็มกรอบ 100% บนจอที่ 2)`
                              : `รูปภาพประกอบสไลด์ที่ ${activeSlideIndex + 1} (แสดงในกรอบ BOUTIQUE DISPLAY ด้านซ้าย)`}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 shadow transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{curSlide.layoutMode === 'FULL_IMAGE' ? 'อัปโหลดภาพโปสเตอร์เต็มกรอบ (PNG, JPG)' : 'อัปโหลดภาพสำหรับสไลด์นี้ (PNG, JPG)'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleSlideImageUpload(activeSlideIndex, e)}
                                className="hidden"
                              />
                            </label>
                            {curSlide.imageUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSlideField(activeSlideIndex, 'imageUrl', '')}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                              >
                                ใช้โลโก้เริ่มต้น
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={curSlide.imageUrl || ''}
                            onChange={e => handleUpdateSlideField(activeSlideIndex, 'imageUrl', e.target.value)}
                            placeholder="หรือวางลิงก์รูปภาพ เช่น https://..."
                            className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      {curSlide.layoutMode === 'FULL_IMAGE' && (
                        <div className="md:col-span-2 p-3 bg-sky-50 rounded-xl border border-sky-200 text-sky-900 text-xs flex items-center gap-2">
                          <span>💡</span>
                          <span>
                            <b>โหมดภาพโปสเตอร์เต็มกรอบ 100%:</b> ระบบจะดึงรูปภาพด้านบนไปขยายแสดงเต็มกรอบสวยงามบนจอที่ 2 โดยไม่ต้องมีกรอบข้อความมาบดบัง
                          </span>
                        </div>
                      )}

                      {/* Tag & Badge Color */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          ข้อความป้ายหัวเรื่อง (Tag Badge)
                        </label>
                        <input
                          type="text"
                          value={curSlide.tag}
                          onChange={e => handleUpdateSlideField(activeSlideIndex, 'tag', e.target.value)}
                          placeholder="เช่น HAUTE COUTURE SERVICES • งานสั่งตัด"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          สีป้ายหัวเรื่อง (Badge Color)
                        </label>
                        <select
                          value={curSlide.badgeColor || 'AMBER'}
                          onChange={e => handleUpdateSlideField(activeSlideIndex, 'badgeColor', e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs"
                        >
                          <option value="AMBER">🟡 ทองอำพัน (Amber Gold)</option>
                          <option value="PURPLE">🟣 ม่วงหรูหรา (Haute Purple)</option>
                          <option value="EMERALD">🟢 เขียวมรกต (Emerald Green)</option>
                          <option value="SKY">🔵 ฟ้าสดใส (Sky Blue)</option>
                          <option value="ROSE">🔴 ชมพูกุหลาบ (Rose Red)</option>
                        </select>
                      </div>

                      {/* Title */}
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          หัวข้อหลักของสไลด์ (Slide Title)
                        </label>
                        <input
                          type="text"
                          value={curSlide.title}
                          onChange={e => handleUpdateSlideField(activeSlideIndex, 'title', e.target.value)}
                          placeholder="เช่น บริการสั่งตัดเย็บ & สกรีนสั่งผลิตพิเศษ"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900"
                        />
                      </div>

                      {/* Subtitle */}
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          คำโปรยรอง (Subtitle)
                        </label>
                        <input
                          type="text"
                          value={curSlide.subtitle}
                          onChange={e => handleUpdateSlideField(activeSlideIndex, 'subtitle', e.target.value)}
                          placeholder="เช่น รับทำเสื้อทีม ลายปักประณีต และของที่ระลึกองค์กร วางมัดจำเพียง 50%"
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-xs text-amber-900"
                        />
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">
                          คำอธิบายรายละเอียด (Description)
                        </label>
                        <textarea
                          rows={2}
                          value={curSlide.description}
                          onChange={e => handleUpdateSlideField(activeSlideIndex, 'description', e.target.value)}
                          placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับสินค้าหรือบริการที่จะแสดงให้ลูกค้าอ่าน..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      {/* 3 Highlights */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="block font-bold text-slate-700">
                          จุดเด่น 3 ข้อด้านล่าง (Highlights Pills)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={curSlide.highlight1 || ''}
                            onChange={e => handleUpdateSlideField(activeSlideIndex, 'highlight1', e.target.value)}
                            placeholder="เช่น ✂️ งานปักตราสัญลักษณ์"
                            className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                          <input
                            type="text"
                            value={curSlide.highlight2 || ''}
                            onChange={e => handleUpdateSlideField(activeSlideIndex, 'highlight2', e.target.value)}
                            placeholder="เช่น 📜 ใบสั่งผลิตและใบรับมัดจำดิจิทัล"
                            className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                          <input
                            type="text"
                            value={curSlide.highlight3 || ''}
                            onChange={e => handleUpdateSlideField(activeSlideIndex, 'highlight3', e.target.value)}
                            placeholder="เช่น 🏪 นัดรับสินค้าที่หน้าร้านเรือนโคราช"
                            className="p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      {/* Delete Slide Button */}
                      {slides.length > 1 && (
                        <div className="md:col-span-2 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(activeSlideIndex)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบสไลด์นี้ออก</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
            className={`px-7 py-3.5 text-white font-bold rounded-2xl text-xs shadow-xl flex items-center gap-2 transition duration-300 ${
              saveSuccess 
                ? 'bg-emerald-600 ring-4 ring-emerald-300 scale-105' 
                : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                <span>✓ บันทึกการตั้งค่าสำเร็จเรียบร้อย!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่าทั้งหมด</span>
              </>
            )}
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

            <div className="bg-rose-50 p-3.5 rounded-xl text-xs text-rose-800 space-y-2">
              <p className="font-bold text-rose-950">เลือกส่วนของข้อมูลที่ต้องการล้าง:</p>
              
              <div className="space-y-1.5 pl-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                  <input
                    type="checkbox"
                    checked={resetOrders}
                    onChange={e => setResetOrders(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>บิลการขายทดสอบทั้งหมด ({dbStats.orders} บิล)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900">
                  <input
                    type="checkbox"
                    checked={resetShifts}
                    onChange={e => setResetShifts(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>บันทึกเปิด-ปิดกะพนักงานทั้งหมด ({dbStats.shifts} กะ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
                  <input
                    type="checkbox"
                    checked={resetCustomOrders}
                    onChange={e => setResetCustomOrders(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>✂️ ใบสั่งผลิต & เงินมัดจำทดสอบ ({dbStats.customOrders} รายการ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-teal-900">
                  <input
                    type="checkbox"
                    checked={resetTransfers}
                    onChange={e => setResetTransfers(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>🚚 ประวัติการโอนย้ายสต็อกทดสอบ ({dbStats.transfers} ใบ)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={resetCustomers}
                    onChange={e => setResetCustomers(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>👥 รายชื่อสมาชิกที่ทดลองสมัคร ({dbStats.customers} คน)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900 pt-1 border-t border-rose-200">
                  <input
                    type="checkbox"
                    checked={resetCloud}
                    onChange={e => setResetCloud(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>☁️ ล้างข้อมูลทดสอบส่วนที่เลือกบน Cloud (Supabase) ด้วย</span>
                </label>
              </div>

              <p className="pt-1.5 text-[11px] text-slate-600 border-t border-rose-200">
                ✨ ข้อมูลสินค้าในคลัง ({dbStats.variants} รายการ) และบัญชีพนักงานจะ <b>ยังคงอยู่ครบถ้วน ไม่ถูกลบ</b>
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
