// src/components/SlipAuditModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Filter, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  X, 
  User, 
  Phone, 
  Plus, 
  Building2,
  DollarSign,
  ShoppingBag,
  RotateCcw,
  Tag,
  CreditCard
} from 'lucide-react';
import type { Order, StoreSettings, UserAccount } from '../types';
import { SALES_CHANNEL_CONFIG } from '../types';
import { db } from '../db';

interface SlipAuditModalProps {
  isOpen: boolean;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onOpenReceipt: (order: Order) => void;
  onOpenTaxInvoice: (order: Order) => void;
  onOpenStandaloneTaxInvoice: () => void;
}

const DATE_FILTER_LABELS: Record<'TODAY' | 'YESTERDAY' | '7DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM', string> = {
  TODAY: 'วันนี้',
  YESTERDAY: 'เมื่อวาน',
  '7DAYS': '7 วันล่าสุด',
  THIS_MONTH: 'เดือนนี้',
  ALL: 'ทั้งหมด',
  CUSTOM: 'ระบุวันเอง'
};

export const SlipAuditModal: React.FC<SlipAuditModalProps> = ({
  isOpen,
  settings,
  currentUser,
  onClose,
  onOpenReceipt,
  onOpenTaxInvoice,
  onOpenStandaloneTaxInvoice
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | '7DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [taxFilter, setTaxFilter] = useState<'ALL' | 'TAX_PENDING' | 'TAX_ISSUED'>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await db.orders.orderBy('timestamp').reverse().toArray();
      setOrders(allOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Status Filter: only show completed or valid bills
      if (o.status === 'VOIDED') return false;

      // 2. Date Filter
      const orderDate = new Date(o.timestamp);
      const now = new Date();

      if (dateFilter === 'TODAY') {
        if (orderDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        if (orderDate.toDateString() !== yest.toDateString()) return false;
      } else if (dateFilter === '7DAYS') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (orderDate < sevenDaysAgo) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        if (orderDate.getFullYear() !== now.getFullYear() || orderDate.getMonth() !== now.getMonth()) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate && orderDate < new Date(customStartDate)) return false;
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
      }

      // 3. Tax Invoice Filter
      if (taxFilter === 'TAX_PENDING' && o.isTaxInvoiceIssued) return false;
      if (taxFilter === 'TAX_ISSUED' && !o.isTaxInvoiceIssued) return false;

      // 4. Sales Channel Filter
      if (channelFilter !== 'ALL') {
        const ch = o.salesChannel || 'STORE_FRONT';
        if (ch !== channelFilter) return false;
      }

      // 5. Search Query (Bill ID, Tax Invoice No, Customer, Phone, Cashier, Item)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBillId = o.localOrderId.toLowerCase().includes(q);
        const matchTaxNo = (o.taxInvoiceNo || '').toLowerCase().includes(q);
        const matchCustomer = (o.customerName || '').toLowerCase().includes(q) || (o.customerTaxInfo?.name || '').toLowerCase().includes(q);
        const matchTaxId = (o.customerTaxInfo?.taxId || '').includes(q);
        const matchPhone = (o.customerTaxInfo?.phone || '').includes(q);
        const matchCashier = (o.cashierName || '').toLowerCase().includes(q);
        const matchItem = o.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));

        if (!matchBillId && !matchTaxNo && !matchCustomer && !matchTaxId && !matchPhone && !matchCashier && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [orders, dateFilter, customStartDate, customEndDate, taxFilter, channelFilter, searchQuery]);

  // Statistics
  const totalBillCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.netTotal || 0), 0);
  const taxIssuedCount = filteredOrders.filter(o => o.isTaxInvoiceIssued).length;
  const taxPendingCount = totalBillCount - taxIssuedCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* TOP MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  ตรวจสอบสลิปย้อนหลัง & ออกใบกำกับภาษี
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalBillCount} บิล
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ค้นหาสลิปเดิม พิมพ์สลิปซ้ำ (58/80mm) และออกใบกำกับภาษีย้อนหลัง (A4) ตามสลิป หรือออกใบกำกับภาษีแยก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Standalone Tax Invoice Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStandaloneTaxInvoice();
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
              title="สร้างและออกใบกำกับภาษีเต็มรูปแยกต่างหาก โดยไม่ต้องมีสลิปขาย POS มาก่อน"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ออกใบกำกับภาษีแยก (ต่างหาก)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">จำนวนบิลที่ค้นพบ:</span>
            <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
              {totalBillCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">บิล</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500">ยอดขายรวมตามที่กรอง:</span>
            <div className="text-lg font-black font-mono text-amber-700 mt-0.5">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ออกใบกำกับภาษีแล้ว:
            </span>
            <div className="text-lg font-black font-mono text-emerald-700 mt-0.5">
              {taxIssuedCount} <span className="text-xs font-normal text-emerald-600">บิล</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
            <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> ยังไม่ออกใบกำกับ:
            </span>
            <div className="text-lg font-black font-mono text-amber-800 mt-0.5">
              {taxPendingCount} <span className="text-xs font-normal text-amber-600">บิล</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
          {/* Row 1: Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 ค้นหาเลขที่สลิป/บิล (เช่น KCAT-315140), ชื่อลูกค้า, เลขผู้เสียภาษี 13 หลัก, แคชเชียร์ หรือชื่อสินค้า..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 2: Date Filters & Tax Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Date Pills */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> วันที่:
              </span>
              {(['TODAY', 'YESTERDAY', '7DAYS', 'THIS_MONTH', 'ALL', 'CUSTOM'] as const).map(mode => {
                const isSel = dateFilter === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateFilter(mode)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                      isSel ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {DATE_FILTER_LABELS[mode]}
                  </button>
                );
              })}
            </div>

            {/* Tax Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> ใบกำกับภาษี:
              </span>
              <button
                type="button"
                onClick={() => setTaxFilter('ALL')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  taxFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setTaxFilter('TAX_PENDING')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  taxFilter === 'TAX_PENDING' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🟡 ยังไม่ออกใบกำกับ ({taxPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setTaxFilter('TAX_ISSUED')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  taxFilter === 'TAX_ISSUED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🟢 ออกใบกำกับแล้ว ({taxIssuedCount})
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'CUSTOM' && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">ตั้งแต่วันที่:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">ถึงวันที่:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ORDER LIST CARDS */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-100/60">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <span className="animate-spin inline-block mr-2">⏳</span> กำลังโหลดประวัติสลิป...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-2">
              <div className="text-3xl">🧾</div>
              <p className="font-bold text-slate-700 text-sm">ไม่พบสลิปหรือบิลขายที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ลองปรับเปลี่ยนคำค้นหา หรือเลือกช่วงเวลาเป็น "ทั้งหมด" เพื่อดูประวัติการขายที่ผ่านมา
              </p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const ch = order.salesChannel || 'STORE_FRONT';
              const cfg = SALES_CHANNEL_CONFIG[ch] || SALES_CHANNEL_CONFIG['STORE_FRONT'];
              const dateTh = new Date(order.timestamp).toLocaleDateString('th-TH');
              const timeTh = new Date(order.timestamp).toLocaleTimeString('th-TH');

              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition duration-150 space-y-3"
                >
                  {/* Card Top: Order ID, Timestamp, Cashier, Channel */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl text-xs border border-slate-200">
                        {order.localOrderId}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {dateTh} {timeTh}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ${cfg.badgeClass}`}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label.split(' ')[0]}</span>
                      </span>
                      <span className="text-xs text-slate-600">
                        แคชเชียร์: <b>{order.cashierName}</b>
                      </span>
                    </div>

                    {/* Tax Invoice Badge */}
                    <div>
                      {order.isTaxInvoiceIssued ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ออกใบกำกับภาษีแล้ว: <b className="font-mono">{order.taxInvoiceNo}</b></span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-500">
                          <span>⚪ ยังไม่ออกใบกำกับ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Middle: Customer info, Items, Net Total */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
                    {/* Customer & Items Summary */}
                    <div className="md:col-span-8 space-y-1.5">
                      {order.customerName && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" /> ลูกค้า:
                          </span>
                          <span className="font-bold text-slate-900 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
                            {order.customerName}
                          </span>
                          {order.customerTaxInfo?.phone && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              📞 {order.customerTaxInfo.phone}
                            </span>
                          )}
                          {order.customerTaxInfo?.taxId && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              (Tax ID: {order.customerTaxInfo.taxId})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Line Items */}
                      <div className="text-[11.5px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                        <div className="font-semibold text-slate-700 text-[11px] mb-1">
                          รายการสินค้า ({order.items.reduce((s, i) => s + (i.qty || 1), 0)} ชิ้น):
                        </div>
                        <div className="space-y-0.5">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span className="truncate pr-2">
                                • {it.productName} <b>x{it.qty}</b>
                              </span>
                              <span className="font-mono text-slate-700 shrink-0">
                                ฿{((it.unitPrice || 0) * it.qty).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary & Actions */}
                    <div className="md:col-span-4 flex flex-col justify-between items-end gap-2.5 text-right">
                      <div>
                        <div className="text-[11px] text-slate-400">ยอดชำระสุทธิ:</div>
                        <div className="text-xl font-black font-mono text-slate-900">
                          ฿{order.netTotal.toLocaleString()}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          ชำระโดย: <span className="font-semibold text-slate-700">{order.payments.map(p => p.method === 'CASH' ? '💵 เงินสด' : p.method === 'PROMPTPAY' ? '📱 PromptPay' : p.method).join(' + ')}</span>
                        </div>
                        {order.promoDiscount > 0 && (
                          <div className="text-[10px] text-rose-600 font-semibold">
                            (ส่วนลดโปรโมชั่น: -฿{order.promoDiscount.toLocaleString()})
                          </div>
                        )}
                      </div>

                      {/* Interactive Buttons for this slip */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenReceipt(order);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                          title="ดูและสั่งพิมพ์สลิปใบเสร็จรับเงิน (58 มม. / 80 มม.)"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>พิมพ์สลิป</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenTaxInvoice(order);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-xs border ${
                            order.isTaxInvoiceIssued
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                          title="ออกใบกำกับภาษีเต็มรูปขนาด A4 หรือพิมพ์ซ้ำ"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>{order.isTaxInvoiceIssued ? 'พิมพ์ใบกำกับ (A4)' : 'ออกใบกำกับภาษี (A4)'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0 px-6">
          <div className="flex items-center gap-2">
            <span>💡 <b>คำแนะนำ:</b> สามารถพิมพ์ค้นหาเลขที่บิลที่ปรากฏบนสลิปของลูกค้า เพื่อพิมพ์ซ้ำหรือออกใบกำกับภาษีย้อนหลังได้ตลอดเวลา</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};