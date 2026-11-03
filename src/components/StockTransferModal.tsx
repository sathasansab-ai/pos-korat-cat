// src/components/StockTransferModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ArrowRight, 
  Check, 
  X
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, StockTransfer } from '../types';
import { CloudSync } from '../services/cloudSync';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferComplete?: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  onTransferComplete
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQty, setTransferQty] = useState(10);
  const [senderName, setSenderName] = useState('ฝ่ายคลังสินค้า/โรงงาน');
  const [receiverName, setReceiverName] = useState('แคชเชียร์หน้าร้าน');
  const [notes, setNotes] = useState('ตัดส่งจากโรงงานเฉลิมวัฒนา เข้าหน้าร้านแมวโคราช');
  const [recentTransfers, setRecentTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<StockTransfer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const list = await db.variants.filter(v => v.isActive !== false).toArray();
    setVariants(list);
    if (list.length > 0 && !selectedVariantId) {
      setSelectedVariantId(list[0].id);
    }
    const history = await db.transfers.orderBy('timestamp').reverse().limit(10).toArray();
    setRecentTransfers(history);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentVariant = variants.find(v => v.id === selectedVariantId);
  const currentWarehouseStock = currentVariant?.warehouseStock ?? Math.floor((currentVariant?.stockQuantity || 0) * 0.6);
  const currentShopStock = currentVariant?.shopStock ?? ((currentVariant?.stockQuantity || 0) - currentWarehouseStock);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVariant || transferQty <= 0) return;

    if (transferQty > currentWarehouseStock) {
      alert(`สต็อกที่โกดัง/โรงงานมีเพียง ${currentWarehouseStock} ชิ้น ไม่สามารถโอนเกินได้`);
      return;
    }

    setIsSubmitting(true);
    try {
      const transferNo = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      
      const newTransfer: StockTransfer = {
        id: `tr-${Date.now()}`,
        transferNo,
        timestamp: new Date().toISOString(),
        fromBranch: 'WAREHOUSE',
        toBranch: 'SHOP',
        items: [
          {
            variantId: currentVariant.id,
            productName: currentVariant.productName,
            sku: currentVariant.sku,
            barcode: currentVariant.barcode,
            qty: transferQty
          }
        ],
        totalQty: transferQty,
        senderName: senderName.trim(),
        receiverName: receiverName.trim(),
        status: 'COMPLETED', // สามารถตรวจรับเข้าทันที
        receivedAt: new Date().toISOString(),
        notes: notes.trim()
      };

      // 1. Save Transfer Record
      await db.transfers.add(newTransfer);

      // 2. Adjust Stock in Database: Warehouse -qty, Shop +qty, Total unchanged
      const newWarehouse = Math.max(0, currentWarehouseStock - transferQty);
      const newShop = currentShopStock + transferQty;
      await db.variants.update(currentVariant.id, {
        warehouseStock: newWarehouse,
        shopStock: newShop,
        stockQuantity: newWarehouse + newShop
      });

      // 3. Sync to Cloud
      CloudSync.pushTransfer(newTransfer);

      setSelectedTransferForPrint(newTransfer);
      await loadData();
      if (onTransferComplete) onTransferComplete();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกการโอนสินค้า: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบโอนย้ายสต็อกข้ามคลัง (Stock Transfer)</h3>
              <p className="text-[11px] text-slate-400">ตัดสต็อกส่งจากโรงงาน/โกดัง (ร้านเก่า) เข้าสู่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Transfer Visual Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* From: Warehouse */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
              <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                ต้นทาง: โกดัง / โรงงาน
              </span>
              <div className="text-sm font-bold text-white mt-2">คลังผลิตร้านเก่า</div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                สต็อกคงเหลือ: <span className="font-bold text-amber-300">{currentWarehouseStock}</span> ชิ้น
              </div>
            </div>

            {/* Transfer Direction */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 animate-pulse">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-1">โอนส่ง {transferQty} ชิ้น</span>
            </div>

            {/* To: Shop */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
              <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ปลายทาง: หน้าร้าน
              </span>
              <div className="text-sm font-bold text-white mt-2">เรือนโคราชเฉลิมวัฒนา</div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                สต็อกหน้าร้าน: <span className="font-bold text-emerald-300">{currentShopStock}</span> ชิ้น
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateTransfer} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Variant Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  เลือกสินค้าและไซส์/สี ที่ต้องการโอนส่ง:
                </label>
                <select
                  value={selectedVariantId}
                  onChange={e => setSelectedVariantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.productName} ({v.sku}) — โกดัง: {v.warehouseStock ?? Math.floor(v.stockQuantity * 0.6)} ชิ้น
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  จำนวนชิ้นที่ต้องการโอน (ชิ้น):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={currentWarehouseStock}
                    value={transferQty}
                    onChange={e => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-28 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-sm text-center text-white font-bold"
                  />
                  <div className="flex gap-1">
                    {[10, 20, 50].map(n => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setTransferQty(Math.min(currentWarehouseStock, n))}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300"
                      >
                        +{n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTransferQty(currentWarehouseStock)}
                      className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-bold"
                    >
                      ทั้งหมด ({currentWarehouseStock})
                    </button>
                  </div>
                </div>
              </div>

              {/* Sender Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ผู้ตัดส่ง (โรงงาน/โกดัง):</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Receiver Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">ผู้ตรวจรับ (หน้าร้าน):</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || currentWarehouseStock <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันโอนส่งและตัดสต็อก {transferQty} ชิ้น</span>
              </button>
            </div>
          </form>

          {/* Recent Transfers Log */}
          {recentTransfers.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-2">ประวัติการโอนสินค้าระหว่างคลังล่าสุด:</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recentTransfers.map(t => (
                  <div key={t.id} className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-400 mr-2">{t.transferNo}</span>
                      <span className="text-slate-300 font-medium">
                        {t.items[0]?.productName} ({t.items[0]?.qty} ชิ้น)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>{new Date(t.timestamp).toLocaleDateString('th-TH')}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t.status === 'COMPLETED' ? 'สำเร็จ' : t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>KORAT CAT Multi-Location Warehouse Sync</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
