// src/pages/PromotionsPage.tsx
import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle, XCircle, Sparkles, Trash2 } from 'lucide-react';
import { db } from '../db';
import type { PromotionRule } from '../types';

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Promo Form
  const [name, setName] = useState('ซื้อเสื้อผ้า 3 ชิ้น เซ็ตพิเศษ 699 บาท');
  const [requiredQty, setRequiredQty] = useState(3);
  const [bundlePrice, setBundlePrice] = useState(699);
  const [eligibleCategories, setEligibleCategories] = useState('เสื้อผ้าแฟชั่น, หมวกและแอคเซสเซอรี่');

  const loadPromos = async () => {
    const list = await db.promotions.toArray();
    setPromotions(list);
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleCreatePromo = async () => {
    const newRule: PromotionRule = {
      id: `promo-${Date.now()}`,
      name,
      type: 'MIX_AND_MATCH',
      requiredQty,
      bundlePrice,
      eligibleCategories: eligibleCategories.split(',').map(s => s.trim()).filter(Boolean),
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
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-600" />
            <span>ระบบโปรโมชั่นอัจฉริยะ (Dynamic Promotions)</span>
          </h1>
          <p className="text-xs text-slate-500">
            ตั้งค่าโปรโมชั่นจับคู่ Mix & Match, ซื้อ X ชิ้นราคาพิเศษ พร้อมระบบ Upsell กระตุ้นยอดขาย
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ สร้างโปรโมชั่น Mix & Match</span>
        </button>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className={`p-5 rounded-2xl border transition shadow-sm bg-white flex flex-col justify-between ${
              promo.isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                  {promo.type}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePromo(promo.id, promo.isActive)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      promo.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
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

              <h3 className="font-bold text-slate-800 text-sm mt-3">{promo.name}</h3>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนที่ต้องซื้อครบ:</span>
                  <span className="font-mono font-bold text-slate-800">{promo.requiredQty} ชิ้น</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ราคาเหมาจ่ายพิเศษ:</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    ฿{promo.bundlePrice.toLocaleString()}
                  </span>
                </div>
                {promo.eligibleCategories && (
                  <div className="pt-1 text-[11px] text-slate-500">
                    หมวดหมู่ที่เข้าร่วม: {promo.eligibleCategories.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-amber-700 font-medium">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              <span>แจ้งเตือนแคชเชียร์อัตโนมัติเมื่อลูกค้าซื้อขาดอีก 1 ชิ้น</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800">สร้างโปรโมชั่น Mix & Match</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อโปรโมชั่น</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนชิ้นที่ต้องซื้อ (Qty)</label>
                <input
                  type="number"
                  value={requiredQty}
                  onChange={e => setRequiredQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ราคาเซ็ตเหมาจ่าย (บาท)</label>
                <input
                  type="number"
                  value={bundlePrice}
                  onChange={e => setBundlePrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่ที่เข้าร่วม (คั่นด้วยจุลภาค ,)</label>
              <input
                type="text"
                value={eligibleCategories}
                onChange={e => setEligibleCategories(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreatePromo}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
              >
                บันทึกโปรโมชั่น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
