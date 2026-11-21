// src/pages/PromotionsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Plus, CheckCircle, XCircle, Sparkles, Trash2, Users, ShieldAlert, Gift, Check, AlertCircle, Search, Layers, ShoppingBag } from 'lucide-react';
import { db } from '../db';
import type { PromotionRule, ProductVariant, StoreSettings, FreeGiftTier } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../types';
import { CloudSync } from '../services/cloudSync';

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Promo Form
  const [name, setName] = useState('แพ็กเกจพิเศษ: ซื้อเสื้อผ้าและของที่ระลึก 2 ชิ้น 899 บาท');
  const [requiredQty, setRequiredQty] = useState(2);
  const [bundlePrice, setBundlePrice] = useState(899);
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'MEMBER_ONLY'>('ALL');
  const [promoScope, setPromoScope] = useState<'BY_CATEGORY' | 'BY_ITEMS'>('BY_CATEGORY');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    DEFAULT_PRODUCT_CATEGORIES[0],
    DEFAULT_PRODUCT_CATEGORIES[1]
  ]);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemFilterCategory, setItemFilterCategory] = useState('ALL');

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Free Gift Tier Form State
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftMinSpend, setGiftMinSpend] = useState<number>(1000);
  const [giftVariantId, setGiftVariantId] = useState<string>('');
  const [giftQty, setGiftQty] = useState<number>(1);
  const [giftDesc, setGiftDesc] = useState<string>('');

  const loadPromos = async () => {
    const [list, s, vList] = await Promise.all([
      db.promotions.toArray(),
      db.settings.get('current_store_settings'),
      db.variants.filter(v => v.isActive !== false).toArray()
    ]);
    setPromotions(list);
    if (s) setSettings(s);
    setVariants(vList);
    if (vList.length > 0 && !giftVariantId) {
      setGiftVariantId(vList[0].id);
    }
  };

  const handleCreateGiftTier = async () => {
    if (!settings) return;
    if (giftMinSpend <= 0) {
      alert('กรุณาระบุยอดซื้อขั้นต่ำ');
      return;
    }
    const chosenVariant = variants.find(v => v.id === giftVariantId);
    if (!chosenVariant) {
      alert('กรุณาเลือกสินค้าของสมนาคุณจากสต็อก');
      return;
    }

    const newTier: FreeGiftTier = {
      id: `gwp-${Date.now()}`,
      minSpend: giftMinSpend,
      giftVariantId: chosenVariant.id,
      giftProductName: chosenVariant.productName,
      giftSku: chosenVariant.sku,
      giftBarcode: chosenVariant.barcode,
      giftQty: Math.max(1, giftQty),
      isActive: true,
      description: giftDesc.trim() || `ยอดซื้อครบ ฿${giftMinSpend.toLocaleString()} รับฟรี ${chosenVariant.productName} 1 ชิ้น`
    };

    const updatedTiers = [...(settings.freeGiftTiers || []), newTier];
    const updatedSettings: StoreSettings = {
      ...settings,
      freeGiftTiers: updatedTiers,
      updatedAt: new Date().toISOString()
    };

    await db.settings.put(updatedSettings);
    setSettings(updatedSettings);
    CloudSync.pushStoreSettings(updatedSettings).catch(() => {});

    setIsGiftModalOpen(false);
    setGiftMinSpend(1000);
    setGiftQty(1);
    setGiftDesc('');
    alert(`เพิ่มเกณฑ์ของสมนาคุณ "ยอดซื้อครบ ฿${newTier.minSpend.toLocaleString()} รับฟรี ${newTier.giftProductName}" เรียบร้อย!`);
  };

  const handleToggleGiftTier = async (id: string, currentStatus: boolean) => {
    if (!settings || !settings.freeGiftTiers) return;
    const updatedTiers = settings.freeGiftTiers.map(t => 
      t.id === id ? { ...t, isActive: !currentStatus } : t
    );
    const updatedSettings: StoreSettings = {
      ...settings,
      freeGiftTiers: updatedTiers,
      updatedAt: new Date().toISOString()
    };
    await db.settings.put(updatedSettings);
    setSettings(updatedSettings);
    CloudSync.pushStoreSettings(updatedSettings).catch(() => {});
  };

  const handleDeleteGiftTier = async (id: string) => {
    if (!settings || !settings.freeGiftTiers) return;
    if (confirm('ยืนยันลบเกณฑ์ของสมนาคุณนี้หรือไม่?')) {
      const updatedTiers = settings.freeGiftTiers.filter(t => t.id !== id);
      const updatedSettings: StoreSettings = {
        ...settings,
        freeGiftTiers: updatedTiers,
        updatedAt: new Date().toISOString()
      };
      await db.settings.put(updatedSettings);
      setSettings(updatedSettings);
      CloudSync.pushStoreSettings(updatedSettings).catch(() => {});
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleVariant = (vId: string) => {
    setSelectedVariantIds(prev =>
      prev.includes(vId) ? prev.filter(id => id !== vId) : [...prev, vId]
    );
  };

  const selectableVariants = useMemo(() => {
    return variants.filter(v => {
      if (itemFilterCategory !== 'ALL' && v.category !== itemFilterCategory) return false;
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        const matchName = v.productName?.toLowerCase().includes(q);
        const matchSku = v.sku?.toLowerCase().includes(q);
        const matchColor = v.attributes?.color?.toLowerCase().includes(q);
        const matchSize = v.attributes?.size?.toLowerCase().includes(q);
        return matchName || matchSku || matchColor || matchSize;
      }
      return true;
    });
  }, [variants, itemFilterCategory, itemSearchQuery]);

  const handleCreatePromo = async () => {
    if (!name.trim()) {
      alert('กรุณากรอกชื่อโปรโมชั่น');
      return;
    }

    if (promoScope === 'BY_ITEMS' && selectedVariantIds.length === 0) {
      alert('กรุณาเลือกสินค้าจากสต็อกอย่างน้อย 1 รายการ');
      return;
    }

    const newRule: PromotionRule = {
      id: `promo-${Date.now()}`,
      name: name.trim(),
      type: 'MIX_AND_MATCH',
      requiredQty,
      bundlePrice,
      targetAudience,
      eligibleCategories: promoScope === 'BY_CATEGORY' ? selectedCategories : [],
      eligibleVariantIds: promoScope === 'BY_ITEMS' ? selectedVariantIds : [],
      startDate: new Date().toISOString(),
      endDate: '2028-12-31',
      isActive: true
    };

    await db.promotions.add(newRule);
    setIsModalOpen(false);
    setSelectedVariantIds([]);
    setItemSearchQuery('');
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            <span>ระบบโปรโมชั่นและการส่งเสริมการขาย</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ตั้งค่าโปรโมชั่นเซ็ตสุดคุ้ม Mix & Match กำหนดตามหมวดหมู่ และสิทธิ์สมาชิก
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ สร้างโปรโมชั่น</span>
        </button>
      </div>

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className={`p-5 rounded-2xl border transition shadow-xs bg-white flex flex-col justify-between ${
              promo.isActive ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200 opacity-60'
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
                    <span className="px-2.5 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span>เฉพาะสมาชิก</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <span>ลูกค้าทุกคน</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePromo(promo.id, promo.isActive)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-lg active:scale-95 transition ${
                      promo.isActive ? 'bg-amber-50 text-amber-800 border border-amber-200/80' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {promo.isActive ? '✓ เปิดใช้งาน' : '✕ ปิดใช้งาน'}
                  </button>
                  <button
                    onClick={() => handleDeletePromo(promo.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded active:scale-95 transition"
                    aria-label={`ลบโปรโมชั่น ${promo.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-sm mt-3">{promo.name}</h3>

              <div className="mt-3 p-3 bg-slate-50/70 rounded-xl space-y-1.5 text-xs border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนที่ต้องซื้อครบ:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-800">{promo.requiredQty} ชิ้น</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ราคาเหมาจ่ายพิเศษ:</span>
                  <span className="font-mono tabular-nums font-bold text-amber-700 text-sm">
                    ฿{promo.bundlePrice.toLocaleString()}
                  </span>
                </div>

                {/* Eligible Items / Categories display */}
                <div className="pt-2 border-t border-slate-200/70">
                  {promo.eligibleVariantIds && promo.eligibleVariantIds.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                          <span>สินค้าจากสต็อกที่เข้าร่วม:</span>
                        </span>
                        <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-[10px] border border-amber-300">
                          {promo.eligibleVariantIds.length} รายการ
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto">
                        {promo.eligibleVariantIds.map(vId => {
                          const v = variants.find(item => item.id === vId);
                          return (
                            <span key={vId} className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 flex items-center gap-1">
                              <span>{v ? `${v.productName} (${v.attributes?.size || ''} ${v.attributes?.color || ''})` : vId}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>หมวดหมู่ที่เข้าร่วม:</span>
                      </span>
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
                  )}
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

      {/* 2. Free Gift With Purchase (GWP) Section */}
      <div className="pt-8 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <span>ของสมนาคุณตามยอดซื้อ (Gift With Purchase)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดเกณฑ์ยอดซื้อขั้นต่ำ (เช่น ซื้อครบ ฿1,000) รับของสมนาคุณฟรีในสต็อก โดยตัดสต็อกจริงแต่ไม่คิดเงินลูกค้า
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsGiftModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition duration-150 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มเกณฑ์ของสมนาคุณ</span>
          </button>
        </div>

        {/* Gift Tiers List */}
        {(!settings?.freeGiftTiers || settings.freeGiftTiers.length === 0) ? (
          <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
            <Gift className="w-10 h-10 text-rose-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-sm font-bold text-rose-900">ยังไม่มีการตั้งค่าของสมนาคุณ</h4>
            <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
              กดปุ่มด้านบนเพื่อเลือกสินค้าในสต็อก (เช่น ตุ๊กตาแมว, พวงกุญแจ) และกำหนดยอดซื้อขั้นต่ำเพื่อแจกลูกค้าหน้าร้าน
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.freeGiftTiers.map((tier) => {
              const matchedVar = variants.find(v => v.id === tier.giftVariantId);
              const currentStock = matchedVar?.shopStock ?? matchedVar?.stockQuantity ?? 0;

              return (
                <div
                  key={tier.id}
                  className={`p-5 rounded-2xl border transition shadow-xs bg-white flex flex-col justify-between ${
                    tier.isActive ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-3 py-1 bg-slate-900 text-amber-300 font-black font-mono tabular-nums text-xs rounded-full shadow-2xs">
                        🎁 ยอดซื้อครบ ฿{tier.minSpend.toLocaleString()} ขึ้นไป
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGiftTier(tier.id, tier.isActive)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-lg active:scale-95 transition ${
                            tier.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tier.isActive ? '✓ เปิดใช้งาน' : '✕ ปิดชั่วคราว'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGiftTier(tier.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded active:scale-95 transition"
                          aria-label={`ลบของสมนาคุณ ${tier.giftProductName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">{tier.giftProductName}</h3>
                    <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">SKU: {tier.giftSku}</p>

                    <div className="mt-3 p-3 bg-amber-50/40 rounded-xl space-y-1.5 text-xs text-slate-800 border border-amber-200/50">
                      <div className="flex justify-between">
                        <span className="text-slate-600">จำนวนที่แจกต่อบิล:</span>
                        <span className="font-bold font-mono tabular-nums text-amber-900">{tier.giftQty} ชิ้น (มูลค่า ฿0 ในบิล)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">สต็อกคงเหลือหน้าร้าน:</span>
                        <span className={`font-bold font-mono tabular-nums ${currentStock > 5 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {currentStock} ชิ้น {currentStock <= 5 && '(ใกล้หมด)'}
                        </span>
                      </div>
                      {tier.description && (
                        <div className="text-[11px] text-slate-600 pt-1 border-t border-amber-200/50">
                          {tier.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-amber-800 font-medium">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    <span>แจ้งเตือนบนหน้าจอแคชเชียร์และจอลูกค้า พร้อมปุ่มกดเพิ่มลงบิลและตัดสต็อกจริงอัตโนมัติ</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
                  <label className="block font-bold text-slate-700 mb-1">จำนวนชิ้นที่ต้องซื้อครบ (ชิ้น)</label>
                  <input
                    type="number"
                    min="1"
                    value={requiredQty === 0 ? '' : requiredQty}
                    onFocus={e => e.target.select()}
                    onChange={e => setRequiredQty(parseInt(e.target.value, 10) || 0)}
                    placeholder="2"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาเซ็ตเหมาจ่ายพิเศษ (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={bundlePrice === 0 ? '' : bundlePrice}
                    onFocus={e => e.target.select()}
                    onChange={e => setBundlePrice(parseFloat(e.target.value) || 0)}
                    placeholder="899"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              {/* SCOPE SELECTOR: BY CATEGORY vs BY SPECIFIC STOCK ITEMS */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <label className="block font-bold text-slate-700 text-xs">
                  ขอบเขตสินค้าที่เข้าร่วมโปรโมชั่น
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPromoScope('BY_CATEGORY')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      promoScope === 'BY_CATEGORY'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400'
                        : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="text-xs">🏷️ ตามหมวดหมู่สินค้า</div>
                      <div className="text-[10px] font-normal text-slate-500">คละได้ทุกชิ้นในหมวดที่เลือก</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPromoScope('BY_ITEMS')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      promoScope === 'BY_ITEMS'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400'
                        : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-teal-600" />
                    <div>
                      <div className="text-xs">📦 เลือกชิ้นสินค้าจากสต็อก</div>
                      <div className="text-[10px] font-normal text-slate-500">เช่น จับคู่เสื้อ+กางเกง, ไซส์ใหญ่</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* MODE A: Category Checkboxes */}
              {promoScope === 'BY_CATEGORY' && (
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
              )}

              {/* MODE B: Specific Stock Items Picker */}
              {promoScope === 'BY_ITEMS' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <span>เลือกสินค้า/ไซส์จากสต็อกที่ร่วมโปรโมชั่น</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold font-mono text-[10px]">
                        เลือกแล้ว {selectedVariantIds.length} รายการ
                      </span>
                    </label>

                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedVariantIds(selectableVariants.map(v => v.id))}
                        className="text-teal-700 hover:underline font-semibold"
                      >
                        เลือกทั้งหมด ({selectableVariants.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedVariantIds([])}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ล้างการเลือก
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={e => setItemSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อสินค้า, SKU, ไซส์, สี..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <select
                      value={itemFilterCategory}
                      onChange={e => setItemFilterCategory(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="ALL">-- ทุกหมวดหมู่สินค้า --</option>
                      {DEFAULT_PRODUCT_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Variant List Scroll Area */}
                  <div className="border border-slate-200 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {selectableVariants.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        ไม่พบสินค้าที่ตรงกับการค้นหา
                      </div>
                    ) : (
                      selectableVariants.map(v => {
                        const isChecked = selectedVariantIds.includes(v.id);
                        const stockCount = v.shopStock ?? v.stockQuantity ?? 0;
                        return (
                          <div
                            key={v.id}
                            onClick={() => toggleVariant(v.id)}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                              isChecked ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent onClick
                                className="rounded text-amber-600 focus:ring-amber-500 flex-shrink-0"
                              />

                              {v.imageUrl ? (
                                <img src={v.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] flex-shrink-0">
                                  ภาพ
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 truncate">{v.productName}</div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                  <span className="font-mono">{v.sku}</span>
                                  {v.attributes?.size && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                                      {v.attributes.size}
                                    </span>
                                  )}
                                  {v.attributes?.color && (
                                    <span className="text-slate-600">
                                      {v.attributes.color}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0 text-xs">
                              <div className="font-bold font-mono text-slate-900">฿{v.salePrice.toLocaleString()}</div>
                              <div className="text-[10px] font-mono text-slate-500">สต็อก: {stockCount} ชิ้น</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

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

      {/* Create Free Gift Tier Modal */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-rose-500" />
                <span>เพิ่มเกณฑ์ของสมนาคุณตัดสต็อกฟรี</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ยอดซื้อขั้นต่ำต่อบิล (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">฿</span>
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={giftMinSpend === 0 ? '' : giftMinSpend}
                    onFocus={e => e.target.select()}
                    onChange={e => setGiftMinSpend(parseInt(e.target.value, 10) || 0)}
                    placeholder="เช่น 1000 หรือ 2000"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-base text-rose-700 outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">เช่น เมื่อยอดซื้อสินค้าในบิลถึง 1,000 หรือ 2,000 บาท</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เลือกสินค้าของสมนาคุณจากสต็อกร้าน</label>
                <select
                  value={giftVariantId}
                  onChange={e => setGiftVariantId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                >
                  {variants.map(v => {
                    const stock = v.shopStock ?? v.stockQuantity ?? 0;
                    return (
                      <option key={v.id} value={v.id}>
                        {v.productName} (สต็อก: {stock} ชิ้น) - SKU: {v.sku}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">* ระบบจะนำสินค้านี้ไปใส่ในบิลในราคา ฿0 และตัดสต็อกจริงอัตโนมัติ</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนที่แจก (ชิ้น/บิล)</label>
                  <input
                    type="number"
                    min="1"
                    value={giftQty === 0 ? '' : giftQty}
                    onFocus={e => e.target.select()}
                    onChange={e => setGiftQty(parseInt(e.target.value, 10) || 1)}
                    placeholder="1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">มูลค่าในบิล</label>
                  <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono font-black text-rose-600 text-sm">
                    ฿0 (ฟรี)
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">คำอธิบายโปรโมชั่นสำหรับแสดงบนหน้าจอ</label>
                <input
                  type="text"
                  value={giftDesc}
                  onChange={e => setGiftDesc(e.target.value)}
                  placeholder="เช่น ซื้อครบ ฿1,000 รับฟรี ตุ๊กตาแมวโคราช 1 ชิ้น"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCreateGiftTier}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold shadow-sm transition duration-150"
                >
                  บันทึกของสมนาคุณ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
