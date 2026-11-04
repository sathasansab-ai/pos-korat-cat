// src/components/WarehouseProductionModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  CheckCircle2, 
  Clock, 
  Printer, 
  X, 
  Phone, 
  Calendar,
  AlertCircle,
  Truck
} from 'lucide-react';
import { db } from '../db';
import type { CustomMadeOrder } from '../types';
import { CloudSync } from '../services/cloudSync';

interface WarehouseProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WarehouseProductionModal: React.FC<WarehouseProductionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [orders, setOrders] = useState<CustomMadeOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const loadOrders = async () => {
    const list = await db.customOrders.orderBy('createdAt').reverse().toArray();
    setOrders(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (orderId: string, newStatus: CustomMadeOrder['status']) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const updated: CustomMadeOrder = {
      ...target,
      status: newStatus
    };
    await db.customOrders.put(updated);
    CloudSync.pushCustomOrder(updated);
    await loadOrders();
  };

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const getStatusBadge = (status: CustomMadeOrder['status']) => {
    switch (status) {
      case 'PENDING_PRODUCTION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">⏳ รอดำเนินการผลิต</span>;
      case 'IN_PRODUCTION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">✂️ กำลังตัดเย็บ/ผลิต</span>;
      case 'READY_FOR_PICKUP':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">📦 ผลิตเสร็จพร้อมส่งมอบ</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">✅ ส่งมอบและชำระครบแล้ว</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">คิวงานสั่งผลิตสำหรับโรงงาน/โกดัง (Production Queue)</h3>
              <p className="text-[11px] text-slate-400">ดูรายการที่หน้าร้านรับออเดอร์มา เพื่อให้โรงงานตัดเย็บ พิมพ์ลาย และอัปเดตสถานะงาน</p>
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

        {/* Filter bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">กรองสถานะ:</span>
            {['ALL', 'PENDING_PRODUCTION', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COMPLETED'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  filterStatus === st 
                    ? 'bg-amber-600 text-white shadow' 
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL' && `ทั้งหมด (${orders.length})`}
                {st === 'PENDING_PRODUCTION' && `รอดำเนินการ (${orders.filter(o => o.status === 'PENDING_PRODUCTION').length})`}
                {st === 'IN_PRODUCTION' && `กำลังผลิต (${orders.filter(o => o.status === 'IN_PRODUCTION').length})`}
                {st === 'READY_FOR_PICKUP' && `พร้อมส่ง (${orders.filter(o => o.status === 'READY_FOR_PICKUP').length})`}
                {st === 'COMPLETED' && `สำเร็จแล้ว (${orders.filter(o => o.status === 'COMPLETED').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400">
              <Scissors className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">ไม่มีรายการสั่งผลิตในหมวดหมู่นี้</p>
            </div>
          ) : (
            filteredOrders.map(o => (
              <div 
                key={o.id}
                className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">{o.orderNo}</span>
                    {getStatusBadge(o.status)}
                    <span className="text-[11px] text-slate-400">
                      สั่งเมื่อ: {new Date(o.createdAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white">
                    {o.itemDescription} ({o.qty} ชิ้น)
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>ลูกค้า: <b>{o.customerName}</b> ({o.customerPhone})</span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">
                      นัดส่งมอบ: {o.dueDate}
                    </span>
                    <span>•</span>
                    <span>วิธีส่ง: {o.deliveryMethod === 'PICKUP_SHOP' ? 'มารับเองที่หน้าร้าน' : `ส่งพัสดุ (${o.shippingAddress || ''})`}</span>
                  </div>

                  <div className="text-[11px] font-mono">
                    ยอดรวม ฿{o.totalPrice.toLocaleString()} | มัดจำแล้ว <span className="text-emerald-400">฿{o.depositAmount.toLocaleString()}</span> | ค้างชำระ <span className="text-rose-400">฿{o.balanceDue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {o.status === 'PENDING_PRODUCTION' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(o.id, 'IN_PRODUCTION')}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      ▶️ เริ่มตัดเย็บ/ผลิต
                    </button>
                  )}

                  {o.status === 'IN_PRODUCTION' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(o.id, 'READY_FOR_PICKUP')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      📦 ผลิตเสร็จแล้ว
                    </button>
                  )}

                  {o.status === 'READY_FOR_PICKUP' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(o.id, 'COMPLETED')}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition"
                    >
                      ✅ ส่งมอบเรียบร้อย
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>KORAT CAT Factory Production Management</span>
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
