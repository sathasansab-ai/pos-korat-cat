// src/pages/PromotionsPage.tsx
import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle, XCircle, Sparkles, Trash2, Users, ShieldAlert } from 'lucide-react';
import { db } from '../db';
import type { PromotionRule } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../types';

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Promo Form
  const [name, setName] = useState('แพ็กเกจพิเศษ: ซื้อเสื้อผ้าและของที่ระลึก 2 ชิ้น 899 บาท');
  const [requiredQty, setRequiredQty] = useState(2);
  const [bundlePrice, setBundlePrice] = useState(899);
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'MEMBER_ONLY'>('ALL');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    DEFAULT_PRODUCT_CATEGORIES[0],
    DEFAULT_PRODUCT_CATEGORIES[1]
  ]);

  const loadPromos = async () => {
    const list = await db.promotions.toArray();
    setPromotions(list);
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleCreatePromo = async () => {
    if (!name.trim()) return;

    const newRule: PromotionRule = {
      id: `promo-${Date.now()}`,
      name: name.trim(),
      type: 'MIX_AND_MATCH',
      requiredQty,
      bundlePrice,
      targetAudience,
      eligibleCategories: selectedCategories,
      startDate: new Date().toISOString(),
      endDate: '2028-12-31',
      isActive: true
    };

    await db.promotions.add(newRule);
    setIsModalOpen(false);
    loadPromos();
  };

  const handleTogglePromo = async (id: string, currentStatus: boolean) => {
    await db.promotions.update(id, { isActive: !currentStatus });
    loadPromos();
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบโปรโมชั่นนี้?')) {
      await db.promotions.delete(id);
      loadPromos();
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-amber-500" />
            <span>ระบบโปรโมชั่นอัจฉริยะ (Dynamic Promotions)</span>
          </h1>
          <p className="text-xs text-slate-500">
            ตั้งค่าโปรโมชั่น Mix & Match กำหนดเฉพาะหมวดหมู่ และกำหนดสิทธิ์ (ทั่วไป vs เฉพาะสมาชิก)
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ สร้างโปรโมชั่นใหม่</span>
        </button>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className={`p-5 rounded-2xl border transition shadow-sm bg-white flex flex-col justify-between ${
              promo.isActive ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-full uppercase">
                    {promo.type}
                  </span>

                  {/* Target Audience Badge */}
                  {promo.targetAudience === 'MEMBER_ONLY' ? (
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span>💎 เฉพาะสมาชิก</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span>👥 ลูกค้าทุกคน</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePromo(promo.id, promo.isActive)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      promo.isActive ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {promo.isActive ? '✓ กำลังใช้งาน' : '✕ ปิดใช้งาน'}
                  </button>
                  <button
                    onClick={() => handleDeletePromo(promo.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-3">{promo.name}</h3>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนที่ต้องซื้อครบ:</span>
                  <span className="font-mono font-bold text-slate-800">{promo.requiredQty} ชิ้น</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ราคาเหมาจ่ายพิเศษ:</span>
                  <span className="font-mono font-bold text-amber-700 text-sm">
                    ฿{promo.bundlePrice.toLocaleString()}
                  </span>
                </div>

                {/* Eligible Categories display */}
                <div className="pt-1.5 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600">หมวดหมู่ที่เข้าร่วม:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {promo.eligibleCategories && promo.eligibleCategories.length > 0 ? (
                      promo.eligibleCategories.map(cat => (
                        <span key={cat} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">ทุกหมวดหมู่ในร้าน</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-amber-700 font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              <span>แจ้งเตือนแคชเชียร์และจอฝั่งลูกค้าอัตโนมัติเมื่อยอดเข้าเกณฑ์</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>สร้างโปรโมชั่น Mix & Match</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อโปรโมชั่น</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Target Audience Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">กลุ่มเป้าหมายผู้รับสิทธิ์</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('ALL')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      targetAudience === 'ALL'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400'
                        : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>ลูกค้าทั่วไปทุกคน</div>
                      <div className="text-[10px] font-normal text-slate-500">ใครซื้อก็ได้รับส่วนลดทันที</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('MEMBER_ONLY')}
                    className={`p-3 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      targetAudience === 'MEMBER_ONLY'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 ring-1 ring-purple-400'
                        : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <div>
                      <div>💎 เฉพาะสมาชิกเท่านั้น</div>
                      <div className="text-[10px] font-normal text-slate-500">ต้องมีเบอร์สมาชิกจึงได้ส่วนลด</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนชิ้นที่ต้องซื้อ (Qty)</label>
                  <input
                    type="number"
                    value={requiredQty}
                    onChange={e => setRequiredQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาเซ็ตเหมาจ่าย (บาท)</label>
                  <input
                    type="number"
                    value={bundlePrice}
                    onChange={e => setBundlePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              {/* Category Checkboxes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  เลือกหมวดหมู่ที่เข้าร่วมโปรโมชั่นนี้
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {DEFAULT_PRODUCT_CATEGORIES.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-amber-100/70 text-amber-900 font-semibold' : 'hover:bg-slate-200/60 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs truncate">{cat}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  * หากไม่ติ๊กเลือกหมวดใดเลย จะถือว่าโปรโมชั่นนี้ใช้ได้กับสินค้าทุกชิ้นในร้าน
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCreatePromo}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
                >
                  บันทึกโปรโมชั่น
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
