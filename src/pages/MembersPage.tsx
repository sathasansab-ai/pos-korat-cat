// src/pages/MembersPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  Sparkles, 
  QrCode, 
  CreditCard, 
  Phone, 
  Mail, 
  Award,
  CheckCircle2,
  X,
  Share2,
  SlidersHorizontal,
  Save,
  ShieldCheck
} from 'lucide-react';
import { db } from '../db';
import type { Customer, StoreSettings } from '../types';
import { DigitalPassModal } from '../components/DigitalPassModal';
import { SoundEffects } from '../services/soundEffects';

export const MembersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Modals
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [selectedCustomerForPass, setSelectedCustomerForPass] = useState<Customer | null>(null);

  const [isAddOrEditModalOpen, setIsAddOrEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Member Tier Customization Modal
  const [isTierSettingsModalOpen, setIsTierSettingsModalOpen] = useState(false);
  const [goldDiscount, setGoldDiscount] = useState(5);
  const [goldPoints, setGoldPoints] = useState(50);
  const [goldSpent, setGoldSpent] = useState(5000);
  const [goldPrivilege, setGoldPrivilege] = useState('สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ');

  const [blackWisdomDiscount, setBlackWisdomDiscount] = useState(10);
  const [blackWisdomPoints, setBlackWisdomPoints] = useState(150);
  const [blackWisdomSpent, setBlackWisdomSpent] = useState(15000);
  const [blackWisdomPrivilege, setBlackWisdomPrivilege] = useState('สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี');

  const [showStockOnPos, setShowStockOnPos] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<'SILVER' | 'GOLD' | 'BLACK_WISDOM'>('BLACK_WISDOM');
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [contactChannel, setContactChannel] = useState('');
  const [address, setAddress] = useState('');

  const loadData = async () => {
    const list = await db.customers.toArray();
    setCustomers(list);
    const s = await db.settings.get('current_store_settings');
    if (s) {
      setSettings(s);
      setGoldDiscount(s.goldDiscountPercent ?? 5);
      setGoldPoints(s.goldPointsThreshold ?? 50);
      setGoldSpent(s.goldSpentThreshold ?? 5000);
      setGoldPrivilege(s.goldPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ');
      setBlackWisdomDiscount(s.blackWisdomDiscountPercent ?? 10);
      setBlackWisdomPoints(s.blackWisdomPointsThreshold ?? 150);
      setBlackWisdomSpent(s.blackWisdomSpentThreshold ?? 15000);
      setBlackWisdomPrivilege(s.blackWisdomPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี');
      setShowStockOnPos(s.showStockQuantityOnPos ?? false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTierSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const updated: StoreSettings = {
      ...settings,
      goldDiscountPercent: goldDiscount,
      goldPointsThreshold: goldPoints,
      goldSpentThreshold: goldSpent,
      goldPrivilegeText: goldPrivilege,
      blackWisdomDiscountPercent: blackWisdomDiscount,
      blackWisdomPointsThreshold: blackWisdomPoints,
      blackWisdomSpentThreshold: blackWisdomSpent,
      blackWisdomPrivilegeText: blackWisdomPrivilege,
      showStockQuantityOnPos: showStockOnPos
    };
    await db.settings.put(updated);
    setSettings(updated);
    setIsTierSettingsModalOpen(false);
    SoundEffects.playSuccess();
    alert('บันทึกเกณฑ์และสิทธิประโยชน์ของบัตรสมาชิกเรียบร้อยแล้ว!');
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setTier('SILVER');
    setRewardPoints(0);
    setContactChannel('');
    setAddress('');
    setIsAddOrEditModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setTier(c.tier || 'BLACK_WISDOM');
    setRewardPoints(c.rewardPoints || 0);
    setContactChannel(c.contactChannel || '');
    setAddress(c.address || '');
    setIsAddOrEditModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    if (editingCustomer) {
      // Edit
      await db.customers.update(editingCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        tier,
        rewardPoints,
        contactChannel: contactChannel.trim() || undefined,
        address: address.trim() || undefined
      });
    } else {
      // Generate Unique Member Code (e.g. KCAT-8924)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const memberCode = `KCAT-${randomSuffix}`;

      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        memberCode,
        name: name.trim(),
        phone: phone.trim(),
        tier,
        rewardPoints,
        totalSpent: 0,
        contactChannel: contactChannel.trim() || undefined,
        address: address.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      await db.customers.add(newCustomer);
      SoundEffects.playSuccess();
      // Auto open pass for new member
      setSelectedCustomerForPass(newCustomer);
      setIsPassModalOpen(true);
    }

    setIsAddOrEditModalOpen(false);
    loadData();
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสมาชิกคุณ "${c.name}"?`)) {
      await db.customers.delete(c.id);
      loadData();
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.memberCode && c.memberCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>ระบบจัดการสมาชิก & บัตร Digital Wisdom Pass</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการรายชื่อสมาชิก แต้มสะสม และออกบัตรสะสมแต้มดิจิทัลสุดหรูหราส่งตรงเข้ามือถือลูกค้า
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTierSettingsModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition border border-amber-500/30"
            title="กำหนดเกณฑ์คะแนน ยอดซื้อสะสม และ % ส่วนลดของแต่ละระดับบัตร"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>⚙️ กำหนดเกณฑ์ & สิทธิประโยชน์บัตร</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ สมัครสมาชิกใหม่</span>
          </button>
        </div>
      </div>

      {/* 3-Tier Luxury Privilege Guide Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-900">
              SILVER PRIVILEGE
            </span>
            <span className="text-[10px] text-slate-400">ระดับเริ่มต้น</span>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-200">
            สะสมแต้ม (100 บ. = 1 แต้ม)
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เกณฑ์: สมาชิกแรกเข้า (0 - {(goldPoints - 1)} แต้ม / ยอดซื้อ &lt; ฿{goldSpent.toLocaleString()})
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#713f12] border border-amber-400/50 rounded-2xl text-amber-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100 text-amber-950">
              GOLD HERITAGE
            </span>
            <span className="text-[10px] text-amber-200/90 font-bold">ลด {goldDiscount}% ทันที</span>
          </div>
          <div className="mt-2 text-xs font-bold text-amber-200">
            รับส่วนลด {goldDiscount}% อัตโนมัติทุกยอดซื้อ
          </div>
          <div className="text-[11px] text-amber-200/80 mt-1">
            เกณฑ์: สะสมครบ {goldPoints} แต้ม หรือยอดซื้อครบ ฿{goldSpent.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-neutral-950 via-zinc-900 to-black border-2 border-amber-400/80 rounded-2xl text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950">
              BLACK WISDOM ELITE
            </span>
            <span className="text-[10px] text-amber-300 font-bold">ลด {blackWisdomDiscount}% VIP</span>
          </div>
          <div className="mt-2 text-xs font-bold text-amber-300">
            รับส่วนลด {blackWisdomDiscount}% อัตโนมัติทุกยอดซื้อ
          </div>
          <div className="text-[11px] text-amber-200/70 mt-1">
            เกณฑ์: สะสมครบ {blackWisdomPoints} แต้ม หรือยอดซื้อครบ ฿{blackWisdomSpent.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือรหัสบัตรสมาชิก..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span>สมาชิกทั้งหมด: <b className="font-mono text-amber-800 font-bold">{customers.length}</b> คน</span>
        </div>
      </div>

      {/* Members Grid / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">บัตร Digital Pass</th>
                <th className="p-3.5">ชื่อ-นามสกุล</th>
                <th className="p-3.5">เบอร์โทรศัพท์</th>
                <th className="p-3.5">ระดับบัตร (Tier)</th>
                <th className="p-3.5 text-center">แต้มสะสม</th>
                <th className="p-3.5 text-right">ยอดซื้อสะสม</th>
                <th className="p-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลสมาชิก
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const mCode = c.memberCode || `KCAT-${c.phone.slice(-4)}`;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForPass(c);
                            setIsPassModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-slate-900 to-amber-950 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:scale-105 transition shadow-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                          <span>{mCode}</span>
                          <Sparkles className="w-3 h-3 text-amber-400" />
                        </button>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{c.phone}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          c.tier === 'BLACK_WISDOM'
                            ? 'bg-slate-900 text-amber-300 border-amber-400/50'
                            : c.tier === 'GOLD'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {c.tier || 'BLACK_WISDOM'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-800 text-sm">
                        {c.rewardPoints.toLocaleString()} pt
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        ฿{c.totalSpent.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerForPass(c);
                              setIsPassModalOpen(true);
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="เปิดบัตร Digital Pass เพื่อส่งขึ้นหน้าจอลูกค้า"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="แก้ไขข้อมูลสมาชิก / ปรับแต้ม"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ลบสมาชิก"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MEMBER MODAL */}
      {isAddOrEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span>{editingCustomer ? 'แก้ไขข้อมูลสมาชิก' : 'สมัครสมาชิกใหม่ (Digital Pass)'}</span>
              </h3>
              <button onClick={() => setIsAddOrEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="เช่น คุณวิภาวี นครราช"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ (สำหรับค้นหาหน้าร้าน) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="เช่น 0891234567"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระดับบัตร (Tier)</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="SILVER">🌟 Silver Privilege (ระดับเริ่มต้น / สะสมแต้ม)</option>
                    <option value="GOLD">✨ Gold Heritage (ระดับทอง / ส่วนลด 5%)</option>
                    <option value="BLACK_WISDOM">👑 Black Wisdom Elite (ระดับ VIP / ส่วนลด 10%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">แต้มสะสม (Reward Points)</label>
                  <input
                    type="number"
                    min={0}
                    value={rewardPoints}
                    onChange={e => setRewardPoints(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ช่องทางติดต่อเพิ่มเติม (LINE / Email / Facebook)</label>
                <input
                  type="text"
                  value={contactChannel}
                  onChange={e => setContactChannel(e.target.value)}
                  placeholder="เช่น LINE ID: vip_korat"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow"
                >
                  {editingCustomer ? 'บันทึกการแก้ไข' : 'ยืนยันและออกบัตร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER TIER & PRIVILEGE CONFIGURATION MODAL */}
      {isTierSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  กำหนดเกณฑ์ & สิทธิประโยชน์บัตรสมาชิก (Tier Rules)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTierSettingsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTierSettings} className="space-y-4 text-xs">
              {/* GOLD TIER SETTINGS */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5 text-sm">
                    ✨ บัตรรอง: GOLD HERITAGE
                  </span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] rounded-full">
                    ระดับทอง
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ส่วนลดอัตโนมัติ (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={goldDiscount}
                        onChange={e => setGoldDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-amber-900 pr-8"
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      เกณฑ์แต้มสะสม (pt)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={goldPoints}
                      onChange={e => setGoldPoints(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    หรือ เกณฑ์ยอดซื้อสะสมถึง (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={goldSpent}
                    onChange={e => setGoldSpent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    เมื่อแต้มหรือยอดซื้อถึงเกณฑ์ ระบบจะอัปเกรดบัตรให้ลูกค้าอัตโนมัติ
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ข้อความสิทธิพิเศษบนบัตร
                  </label>
                  <input
                    type="text"
                    value={goldPrivilege}
                    onChange={e => setGoldPrivilege(e.target.value)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              </div>

              {/* BLACK WISDOM TIER SETTINGS */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-amber-400/50 space-y-3">
                <div className="flex items-center justify-between font-bold text-amber-300">
                  <span className="flex items-center gap-1.5 text-sm">
                    👑 บัตรสูงสุด: BLACK WISDOM ELITE
                  </span>
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full">
                    VIP ELITE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      ส่วนลดอัตโนมัติ (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={blackWisdomDiscount}
                        onChange={e => setBlackWisdomDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 bg-slate-800 border border-amber-400/60 rounded-xl font-mono font-bold text-amber-300 pr-8"
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-amber-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      เกณฑ์แต้มสะสม (pt)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={blackWisdomPoints}
                      onChange={e => setBlackWisdomPoints(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2.5 bg-slate-800 border border-amber-400/60 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    หรือ เกณฑ์ยอดซื้อสะสมถึง (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={blackWisdomSpent}
                    onChange={e => setBlackWisdomSpent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-800 border border-amber-400/60 rounded-xl font-mono font-bold text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    เมื่อแต้มหรือยอดซื้อถึงเกณฑ์ จะได้สิทธิ์ VIP สูงสุดทันที
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    ข้อความสิทธิพิเศษบนบัตร
                  </label>
                  <input
                    type="text"
                    value={blackWisdomPrivilege}
                    onChange={e => setBlackWisdomPrivilege(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-amber-400/60 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* POS DISPLAY PREFERENCE */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    แสดงตัวเลขจำนวนสต็อกบนหน้าขาย (POS)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    หากปิด: จะซ่อนป้าย "คลัง: XX" ให้หน้าจอขายดูคลีนหรูหรา (แต่ยังแจ้งเตือนเมื่อหมด)
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStockOnPos}
                    onChange={e => setShowStockOnPos(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTierSettingsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-xs shadow flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าเกณฑ์บัตร</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL PASS MODAL */}
      <DigitalPassModal
        isOpen={isPassModalOpen}
        customer={selectedCustomerForPass}
        settings={settings}
        onClose={() => {
          setIsPassModalOpen(false);
          setSelectedCustomerForPass(null);
        }}
      />
    </div>
  );
};
