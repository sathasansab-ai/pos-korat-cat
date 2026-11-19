// src/pages/StockCheckerPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Boxes, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Tag, 
  Layers, 
  X, 
  Eye, 
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Building2,
  Warehouse,
  ShoppingBag
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, StoreSettings } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../types';
import { CloudSync } from '../services/cloudSync';

export const StockCheckerPage: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('ALL');

  // Detail Modal
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Load Variants from local IndexedDB and background pull from Cloud
  const loadData = async (forceCloud = false) => {
    try {
      const localVariants = await db.variants.toArray();
      setVariants(localVariants);
      const localSettings = await db.settings.get('current_store_settings');
      if (localSettings) setSettings(localSettings);

      if (forceCloud || navigator.onLine) {
        setIsSyncing(true);
        const res = await CloudSync.pullFromCloud().catch(() => ({ success: false }));
        if (res.success) {
          const freshVariants = await db.variants.toArray();
          setVariants(freshVariants);
        }
        setLastSyncTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Error loading stock checker data:', err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Auto-refresh in background every 8 seconds when online for real-time stock sync
    const timer = setInterval(() => {
      if (navigator.onLine) {
        loadData(false);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Extract all categories and sizes
  const categories = useMemo(() => {
    const set = new Set<string>();
    variants.forEach(v => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set);
  }, [variants]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    variants.forEach(v => {
      if (v.attributes?.size) {
        set.add(v.attributes.size);
      }
    });
    return Array.from(set);
  }, [variants]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      // 1. Search filter
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const matchesName = v.productName.toLowerCase().includes(term);
        const matchesSku = v.sku.toLowerCase().includes(term);
        const matchesBarcode = v.barcode.includes(term);
        const matchesAttr = Object.values(v.attributes || {}).some(val => val.toLowerCase().includes(term));
        const matchesVendor = (v.vendorName || '').toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesAttr && !matchesVendor) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL' && v.category !== selectedCategory) {
        return false;
      }

      // 3. Size filter
      if (selectedSizeFilter !== 'ALL' && v.attributes?.size !== selectedSizeFilter) {
        return false;
      }

      // 4. Stock status filter
      const shop = v.shopStock ?? (v.stockQuantity - (v.warehouseStock ?? 0));
      const total = v.stockQuantity;
      if (stockStatusFilter === 'IN_STOCK' && total <= 0) return false;
      if (stockStatusFilter === 'LOW_STOCK' && (total > v.minStockAlert || total <= 0)) return false;
      if (stockStatusFilter === 'OUT_OF_STOCK' && total > 0) return false;

      return true;
    });
  }, [variants, searchTerm, selectedCategory, selectedSizeFilter, stockStatusFilter]);

  // Sibling variants (same product name/prefix) for size matrix comparison in detail modal
  const siblingVariants = useMemo(() => {
    if (!selectedVariant) return [];
    const baseName = selectedVariant.productName.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return variants.filter(v => {
      const vBase = v.productName.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return vBase === baseName || (v.productId && v.productId === selectedVariant.productId);
    });
  }, [selectedVariant, variants]);

  // Overall stock stats
  const totalItemsCount = variants.length;
  const inStockCount = variants.filter(v => v.stockQuantity > 0).length;
  const outOfStockCount = variants.filter(v => v.stockQuantity <= 0).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 pb-12">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-amber-500/30 p-1 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-sm shadow flex-shrink-0">
                KC
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white truncate tracking-wide uppercase">
                  {settings?.storeName || 'KORAT CAT x เรือนโคราช'}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  📱 โหมดเช็คสต็อกฝ่ายขาย
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 truncate">
                ระบบค้นหาและตรวจสอบสต็อกสดหน้าร้านสำหรับ iPad / แท็บเล็ต
              </p>
            </div>
          </div>

          {/* Sync Status Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="ดึงสต็อกสดล่าสุดจาก Cloud ทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'กำลังซิงค์...' : 'อัปเดตสด'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-4">
        {/* Quick KPI Overview Bar */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs text-slate-400 font-semibold">สินค้าทั้งหมด</div>
              <div className="text-lg sm:text-2xl font-black font-mono text-white mt-0.5">
                {totalItemsCount}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300">
              <Boxes className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs text-emerald-300 font-semibold">พร้อมขาย (มีของ)</div>
              <div className="text-lg sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                {inStockCount}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-900/50 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-rose-950/40 rounded-2xl border border-rose-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] sm:text-xs text-rose-300 font-semibold">หมดสต็อก (0 ชิ้น)</div>
              <div className="text-lg sm:text-2xl font-black font-mono text-rose-400 mt-0.5">
                {outOfStockCount}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-900/50 flex items-center justify-center text-rose-300">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 space-y-3 shadow-lg">
          {/* Big Search Input */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า, ไซส์ (เช่น XL), สี, เทคนิค, รหัสบาร์โค้ด..."
              className="w-full pl-11 pr-10 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Scrollable horizontally) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              ทุกหมวด ({variants.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {cat} ({variants.filter(v => v.category === cat).length})
              </button>
            ))}
          </div>

          {/* Secondary Filters: Size & Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
            {/* Stock status filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">สถานะ:</span>
              <button
                type="button"
                onClick={() => setStockStatusFilter('ALL')}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  stockStatusFilter === 'ALL' ? 'bg-white text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('IN_STOCK')}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  stockStatusFilter === 'IN_STOCK' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                มีของ
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  stockStatusFilter === 'OUT_OF_STOCK' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                หมด
              </button>
            </div>

            {/* Size filter if available */}
            {sizes.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">ไซส์:</span>
                <select
                  value={selectedSizeFilter}
                  onChange={e => setSelectedSizeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-amber-300 px-2 py-1 rounded-lg font-bold font-mono outline-none"
                >
                  <option value="ALL">ทุกไซส์</option>
                  {sizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>พบสินค้า <b>{filteredVariants.length}</b> รายการ</span>
          {lastSyncTime && (
            <span className="text-[11px] text-slate-500 font-mono">
              ข้อมูลล่าสุด: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Product Cards Grid (Optimized for iPad / Tablet touch) */}
        {filteredVariants.length === 0 ? (
          <div className="py-16 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60 p-8 space-y-3">
            <Boxes className="w-16 h-16 text-slate-600 mx-auto stroke-1" />
            <h3 className="text-base font-bold text-slate-300">ไม่พบรายการสินค้าที่ค้นหา</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ลองพิมพ์คำค้นหาใหม่ หรือกดเปลี่ยนหมวดหมู่ด้านบนดูครับ
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setSelectedSizeFilter('ALL');
                setStockStatusFilter('ALL');
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredVariants.map(item => {
              const shopStock = item.shopStock ?? (item.stockQuantity - (item.warehouseStock ?? 0));
              const warehouseStock = item.warehouseStock ?? 0;
              const totalStock = item.stockQuantity;
              const isOut = totalStock <= 0;
              const isLow = totalStock > 0 && totalStock <= item.minStockAlert;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedVariant(item)}
                  className={`bg-slate-800/90 hover:bg-slate-800 border rounded-2xl p-3.5 flex flex-col justify-between transition cursor-pointer group shadow-sm active:scale-[0.99] relative overflow-hidden ${
                    isOut 
                      ? 'border-rose-900/60 opacity-75' 
                      : isLow 
                      ? 'border-amber-500/50' 
                      : 'border-slate-700/80 hover:border-amber-500/50'
                  }`}
                >
                  <div>
                    {/* Top row: Image & Product Details */}
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-700 flex-shrink-0 group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500">
                          <Tag className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {item.sku}
                          </span>
                          {item.attributes?.size && (
                            <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded">
                              ไซส์ {item.attributes.size}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-white mt-1 leading-snug line-clamp-2">
                          {item.productName}
                        </h3>

                        {item.attributes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {Object.entries(item.attributes)
                              .filter(([k]) => !['isConsignment', 'vendorId', 'vendorName', 'gpPercent', 'vendorPayoutPrice', 'size'].includes(k))
                              .map(([_, v]) => v)
                              .join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Stock Breakdown and Price */}
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-end justify-between gap-2">
                    {/* 2-Location Stock Breakdown */}
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <div className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center gap-1" title="สต็อกพร้อมขายหน้าร้าน">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>หน้าร้าน: <b className="text-emerald-300 font-black">{shopStock}</b></span>
                      </div>

                      <div className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center gap-1" title="สต็อกสำรองในโกดัง">
                        <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                        <span>โกดัง: <b>{warehouseStock}</b></span>
                      </div>
                    </div>

                    {/* Price & Status */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-black font-mono text-amber-400">
                        ฿{item.salePrice.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold">
                        {isOut ? (
                          <span className="text-rose-400 font-bold">● หมด (0)</span>
                        ) : isLow ? (
                          <span className="text-amber-400 font-bold">● เหลือ {totalStock} ชิ้น</span>
                        ) : (
                          <span className="text-emerald-400">● มีของ ({totalStock})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* DETAIL MODAL (ซูมดูภาพใหญ่ ลายละเอียด และเช็คไซส์ทั้งหมดของสินค้ารุ่นนี้) */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {selectedVariant.category}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  SKU: {selectedVariant.sku}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Big Product Image */}
            <div className="w-full h-56 sm:h-64 rounded-2xl bg-black/60 border border-slate-800 overflow-hidden flex items-center justify-center relative group">
              {selectedVariant.imageUrl ? (
                <img
                  src={selectedVariant.imageUrl}
                  alt={selectedVariant.productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-16 h-16 mb-2 opacity-50" />
                  <span className="text-xs">ไม่มีรูปภาพสินค้า</span>
                </div>
              )}
            </div>

            {/* Product Title and Price */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {selectedVariant.productName}
              </h2>
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">ราคาขายหน้าร้าน:</span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  ฿{selectedVariant.salePrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Location Stock Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                <div className="text-[10px] text-emerald-300 font-semibold">🏢 หน้าร้านพร้อมขาย</div>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {selectedVariant.shopStock ?? (selectedVariant.stockQuantity - (selectedVariant.warehouseStock ?? 0))}
                </div>
                <div className="text-[9px] text-slate-400">ตัว/ชิ้น</div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                <div className="text-[10px] text-amber-300 font-semibold">🏭 โกดัง/สต็อกสำรอง</div>
                <div className="text-xl font-black font-mono text-amber-400 mt-1">
                  {selectedVariant.warehouseStock ?? 0}
                </div>
                <div className="text-[9px] text-slate-400">ตัว/ชิ้น</div>
              </div>

              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <div className="text-[10px] text-slate-300 font-semibold">📦 สต็อกรวมทั้งหมด</div>
                <div className="text-xl font-black font-mono text-white mt-1">
                  {selectedVariant.stockQuantity}
                </div>
                <div className="text-[9px] text-slate-400">ตัว/ชิ้น</div>
              </div>
            </div>

            {/* Sibling Sizes Breakdown Table (ดูสต็อกทุกไซส์ของรุ่นนี้ในที่เดียว) */}
            {siblingVariants.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>สต็อกไซส์อื่นๆ ของสินค้ารุ่นนี้ ({siblingVariants.length} ตัวเลือก):</span>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
                  {siblingVariants.map(sib => {
                    const sibShop = sib.shopStock ?? (sib.stockQuantity - (sib.warehouseStock ?? 0));
                    const isSelected = sib.id === selectedVariant.id;
                    return (
                      <div
                        key={sib.id}
                        onClick={() => setSelectedVariant(sib)}
                        className={`p-2.5 flex items-center justify-between transition cursor-pointer ${
                          isSelected ? 'bg-amber-500/20 text-white font-bold' : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-12 font-bold text-amber-400">
                            {sib.attributes?.size || 'Free'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {sib.sku}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px]">
                            หน้าร้าน: <b className={sibShop > 0 ? 'text-emerald-400' : 'text-rose-400'}>{sibShop}</b>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            (รวม {sib.stockQuantity})
                          </span>
                          {isSelected && <span className="text-[10px] text-amber-400">✓ ตัวปัจจุบัน</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
