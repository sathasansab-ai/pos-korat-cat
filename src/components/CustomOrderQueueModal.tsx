// src/components/CustomOrderQueueModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  X, 
  ChevronRight, 
  Phone, 
  User, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Layers, 
  Plus, 
  Sparkles, 
  Check, 
  Eye, 
  Truck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { db } from '../db';
import type { 
  CustomMadeOrder, 
  StoreSettings, 
  Shift, 
  UserAccount, 
  Order 
} from '../types';
import { GENDER_CONFIG } from '../types';
import { CloudSync } from '../services/cloudSync';
import { PromptPayService } from '../services/promptPay';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { SoundEffects } from '../services/soundEffects';
import { renderMannequinSvgHtml } from './MannequinFigure';

interface CustomOrderQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  activeShift?: Shift | null;
  settings?: StoreSettings | null;
  onOpenShiftRequired?: () => void;
  onShiftUpdated?: () => void;
  onOpenNewCustomOrder?: () => void;
  initialSelectedOrder?: CustomMadeOrder | null;
}

export const CustomOrderQueueModal: React.FC<CustomOrderQueueModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeShift,
  settings,
  onOpenShiftRequired,
  onShiftUpdated,
  onOpenNewCustomOrder,
  initialSelectedOrder
}) => {
  const [orders, setOrders] = useState<CustomMadeOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY_FOR_PICKUP' | 'COMPLETED'>('ALL');
  
  // Settlement modal state (when customer picks up and pays balance due)
  const [selectedOrderForSettlement, setSelectedOrderForSettlement] = useState<CustomMadeOrder | null>(null);
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [settlementSuccessOrder, setSettlementSuccessOrder] = useState<CustomMadeOrder | null>(null);

  // Measurement detail modal
  const [viewingMeasurementOrder, setViewingMeasurementOrder] = useState<CustomMadeOrder | null>(null);

  const loadOrders = async () => {
    const list = await db.customOrders.reverse().toArray();
    setOrders(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
      if (initialSelectedOrder) {
        setSelectedOrderForSettlement(initialSelectedOrder);
      }
    } else {
      setSelectedOrderForSettlement(null);
      setSettlementSuccessOrder(null);
      setViewingMeasurementOrder(null);
      setSearchTerm('');
    }
  }, [isOpen, initialSelectedOrder]);

  // Synchronize with Customer-Facing Dual Screen during balance settlement
  useEffect(() => {
    if (!isOpen || !selectedOrderForSettlement) return;

    const balanceDue = selectedOrderForSettlement.balanceDue;
    const promptPayPayload = (settings?.promptPayId && balanceDue > 0)
      ? PromptPayService.generatePayload(settings.promptPayId, balanceDue)
      : '';
    const qrImageUrl = promptPayPayload
      ? PromptPayService.getQrImageUrl(promptPayPayload, 260)
      : '';

    DualMonitorSync.broadcast({
      cart: [],
      subtotal: selectedOrderForSettlement.totalPrice,
      promoDiscount: 0,
      netTotal: balanceDue,
      upsellPrompts: [],
      theme: settings?.customerScreenTheme,
      welcomeTitle: settings?.welcomeTitle,
      welcomeSubtitle: settings?.welcomeSubtitle,
      welcomeImageUrl: settings?.welcomeImageUrl,
      thankYouMessage: settings?.thankYouMessage,
      customOrderPayment: {
        orderNo: selectedOrderForSettlement.orderNo,
        customerName: selectedOrderForSettlement.customerName,
        customerPhone: selectedOrderForSettlement.customerPhone,
        itemDescription: `รับสินค้า: ${selectedOrderForSettlement.itemDescription}`,
        totalAmount: selectedOrderForSettlement.totalPrice,
        depositAmount: balanceDue, // Show balance due as current payment
        balanceDue: 0,
        dueDate: selectedOrderForSettlement.dueDate,
        qrImageUrl: qrImageUrl,
        promptPayId: settings?.promptPayId,
        paymentMethod: settlementPaymentMethod,
        status: settlementSuccessOrder ? 'DEPOSIT_PAID' : 'PENDING_DEPOSIT'
      }
    });
  }, [isOpen, selectedOrderForSettlement, settlementPaymentMethod, settlementSuccessOrder, settings]);

  if (!isOpen) return null;

  const handleClose = () => {
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      customOrderPayment: null
    });
    onClose();
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.itemDescription.toLowerCase().includes(q)
    );
  });

  // Status counts
  const pendingCount = orders.filter(o => o.status === 'PENDING_PRODUCTION').length;
  const inProdCount = orders.filter(o => o.status === 'IN_PRODUCTION').length;
  const readyCount = orders.filter(o => o.status === 'READY_FOR_PICKUP').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  // Quick Status Transition
  const handleUpdateStatus = async (orderId: string, newStatus: CustomMadeOrder['status']) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    await db.customOrders.put(updated);
    CloudSync.pushCustomOrder(updated);
    SoundEffects.playBeep();
    loadOrders();
  };

  // Confirm Final Balance Settlement & Deliver Item
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForSettlement) return;

    if (!activeShift) {
      alert('⚠️ ไม่สามารถรับชำระยอดคงเหลือหรือส่งมอบสินค้าได้!\nเนื่องจาก "ยังไม่ได้เปิดกะทำงาน"\n\nกรุณาเปิดกะก่อนรับเงิน เพื่อให้ระบบรวมยอดเงินเข้าลิ้นชักอย่างถูกต้อง');
      if (onOpenShiftRequired) onOpenShiftRequired();
      return;
    }

    const order = selectedOrderForSettlement;
    const balanceDue = order.balanceDue;
    const isCash = settlementPaymentMethod === 'CASH';

    setIsSubmittingSettlement(true);

    try {
      const cashierId = currentUser?.id || activeShift.cashierId;
      const cashierName = currentUser?.name || activeShift.cashierName;
      const shiftId = activeShift.id;

      // 1. Update Custom Order to COMPLETED
      const updatedOrder: CustomMadeOrder = {
        ...order,
        balanceDue: 0,
        status: 'COMPLETED',
        finalPaymentMethod: settlementPaymentMethod,
        finalPaidAmount: balanceDue,
        finalPaidAt: new Date().toISOString()
      };
      await db.customOrders.put(updatedOrder);
      CloudSync.pushCustomOrder(updatedOrder);

      // 2. Add collected balance to shift totals
      if (balanceDue > 0) {
        const updatedShift: Shift = {
          ...activeShift,
          totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? balanceDue : 0),
          totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + (!isCash ? balanceDue : 0),
          totalTransactions: (activeShift.totalTransactions || 0) + 1
        };
        await db.shifts.put(updatedShift);
        CloudSync.pushShift(updatedShift);
        if (onShiftUpdated) onShiftUpdated();

        // 3. Record order bill in db.orders for accounting and sales reports
        const settlementBill: Order = {
          id: `ord-fin-${Date.now()}`,
          localOrderId: `FIN-${order.orderNo}`,
          timestamp: new Date().toISOString(),
          cashierId,
          cashierName,
          shiftId,
          customerId: order.customerId,
          customerName: order.customerName,
          customerGender: order.customerGender,
          items: [{
            variantId: `custom-settle-${order.id}`,
            productName: `ชำระยอดคงเหลือรับสินค้า: ${order.itemDescription}`,
            sku: order.orderNo,
            attributes: {
              'ประเภท': order.categoryType || 'สั่งตัดพิเศษ',
              'ลูกค้า': order.customerName,
              'โทร': order.customerPhone,
              'ยอดสั่งผลิตเต็ม': `฿${order.totalPrice.toLocaleString()}`,
              'มัดจำที่จ่ายแล้ว': `฿${order.depositAmount.toLocaleString()}`,
              'สถานะ': 'ส่งมอบสินค้า & ชำระครบถ้วน 100%'
            },
            qty: order.qty,
            unitPrice: balanceDue,
            costPrice: 0,
            lineTotal: balanceDue
          }],
          subtotal: balanceDue,
          promoDiscount: 0,
          netTotal: balanceDue,
          payments: [{
            method: settlementPaymentMethod,
            amount: balanceDue
          }],
          cashReceived: isCash ? (parseFloat(cashTendered) || balanceDue) : undefined,
          changeGiven: isCash ? Math.max(0, (parseFloat(cashTendered) || balanceDue) - balanceDue) : 0,
          status: 'COMPLETED',
          isSynced: false
        };

        await db.orders.add(settlementBill);
        CloudSync.pushOrder(settlementBill);
      }

      SoundEffects.playSuccess();
      setSettlementSuccessOrder(updatedOrder);
      await loadOrders();
    } catch (err) {
      console.error('Failed to complete custom order settlement', err);
      alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Print Completed Work Order & Receipt (A4)
  const handlePrintCompletedA4 = (order: CustomMadeOrder) => {
    const isFem = order.customerGender === 'FEMALE';
    const meas = order.measurements || {};
    const orderBarcodeDataUrl = BarcodeGenerator.generateDataUrl(order.orderNo, { height: 40, showText: false });

    const measurementRows: string[] = [];
    if (meas.chest) measurementRows.push(`<tr><td>รอบอก</td><td class="bold">${meas.chest}</td></tr>`);
    if (meas.waist || meas.waistPants) measurementRows.push(`<tr><td>รอบเอว</td><td class="bold">${meas.waist || meas.waistPants}</td></tr>`);
    if (meas.hips || meas.hipsPants) measurementRows.push(`<tr><td>รอบสะโพก</td><td class="bold">${meas.hips || meas.hipsPants}</td></tr>`);
    if (meas.shoulder) measurementRows.push(`<tr><td>ไหล่กว้าง</td><td class="bold">${meas.shoulder}</td></tr>`);
    if (meas.shirtLength) measurementRows.push(`<tr><td>ความยาวเสื้อ</td><td class="bold">${meas.shirtLength}</td></tr>`);
    if (meas.armLength) measurementRows.push(`<tr><td>ความยาวแขน</td><td class="bold">${meas.armLength}</td></tr>`);
    if (meas.pantsLength) measurementRows.push(`<tr><td>ความยาวกางเกง</td><td class="bold">${meas.pantsLength}</td></tr>`);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบเสร็จรับเงิน & ส่งมอบสินค้า Haute Couture - ${order.orderNo}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #15803d; padding-bottom: 12px; margin-bottom: 15px; }
            .brand-title { font-size: 18px; font-weight: 800; color: #15803d; text-transform: uppercase; }
            .brand-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
            .doc-title { font-size: 15px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-no { font-family: monospace; font-size: 12px; font-weight: bold; color: #15803d; text-align: right; }
            
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; }
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.items-table th, table.items-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            table.items-table th { background: #f1f5f9; font-weight: 700; color: #334155; }
            
            .paid-stamp { border: 3px solid #16a34a; color: #16a34a; font-size: 16px; font-weight: 900; text-transform: uppercase; padding: 6px 14px; border-radius: 8px; display: inline-block; transform: rotate(-5deg); margin-top: 5px; }
            .summary-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .summary-table td { padding: 5px 8px; }
            .total-row { border-top: 1.5px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 13px; }
            .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            .signature-table td { width: 50%; text-align: center; vertical-align: bottom; }
            .sig-line { border-bottom: 1px solid #64748b; width: 80%; margin: 40px auto 6px auto; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-title">${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                <div class="brand-sub">${settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 3px;">
                  ที่อยู่: ${settings?.address || 'เรือนโคราชเฉลิมวัฒนา จ.นครราชสีมา'} | โทร: ${settings?.phone || '044-XXXXXX'}
                </div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div class="doc-title">ใบเสร็จรับเงิน & ใบส่งมอบสินค้า</div>
                <div class="doc-title" style="font-size: 11px; font-weight: normal; color: #16a34a;">(COMPLETED ORDER RECEIPT)</div>
                <div class="doc-no">เลขที่: ${order.orderNo}</div>
                <div style="font-size: 11px; color: #64748b;">วันที่ส่งมอบ: ${new Date().toLocaleDateString('th-TH')}</div>
                <div style="margin-top: 4px; display: flex; justify-content: flex-end;">
                  <img src="${orderBarcodeDataUrl}" style="height: 36px; width: 140px; object-fit: contain;" alt="Order Barcode" />
                </div>
              </td>
            </tr>
          </table>

          <div class="info-box">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <b>ลูกค้าผู้รับสินค้า:</b> ${order.customerName} (${order.customerPhone})<br>
                <b>การรับมอบ:</b> ${order.deliveryMethod === 'PICKUP_SHOP' ? 'รับสินค้าเรียบร้อยที่หน้าร้าน' : 'จัดส่งพัสดุ: ' + (order.shippingAddress || '')}
              </div>
              <div style="text-align: right;">
                <div class="paid-stamp">✓ ชำระครบถ้วน 100%</div>
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ลำดับ</th>
                <th>รายละเอียดสินค้าสั่งผลิต</th>
                <th style="width: 60px; text-align: center;">จำนวน</th>
                <th style="width: 100px; text-align: right;">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${order.itemDescription}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ชนิดผ้า: ${order.fabricType || '-'} | นัดรับ: ${order.dueDate}</div>
                </td>
                <td style="text-align: center; font-weight: 700;">${order.qty} ชิ้น</td>
                <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 10px; font-size: 11px; color: #166534;">
                  <b>ประวัติการชำระเงิน:</b><br>
                  • เงินมัดจำ (50%): ฿${order.depositAmount.toLocaleString()} (${order.depositPaymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์ QR' : 'เงินสด'})<br>
                  • ยอดคงเหลือวันรับของ: ฿${(order.finalPaidAmount ?? order.balanceDue).toLocaleString()} (${order.finalPaymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์ QR' : 'เงินสด'})<br>
                  <b>สถานะ: ส่งมอบและชำระครบถ้วนสมบูรณ์แล้ว</b>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                <table class="summary-table">
                  <tr>
                    <td>ยอดรวมทั้งสิ้น (Total):</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
                  </tr>
                  <tr style="color: #15803d;">
                    <td>มัดจำที่ชำระแล้ว:</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.depositAmount.toLocaleString()}</td>
                  </tr>
                  <tr style="color: #15803d;">
                    <td>ชำระยอดคงเหลือวันรับของ:</td>
                    <td style="text-align: right; font-weight: 700;">฿${(order.finalPaidAmount ?? order.balanceDue).toLocaleString()}</td>
                  </tr>
                  <tr class="total-row" style="color: #15803d;">
                    <td style="font-weight: 800;">ยอดค้างชำระคงเหลือ (Balance Due):</td>
                    <td style="text-align: right; font-weight: 800;">฿0 (ครบถ้วน)</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="signature-table">
            <tr>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.staffName} )</div>
                <div style="font-size: 10px; color: #64748b;">พนักงานผู้ส่งมอบสินค้า / แคชเชียร์</div>
              </td>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.customerName} )</div>
                <div style="font-size: 10px; color: #64748b;">ลูกค้าผู้รับสินค้า / ตรวจรับของเรียบร้อย</div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">คิวงานสั่งผลิต &amp; ส่งมอบสินค้า (Custom Tailoring Queue)</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {orders.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">ติดตามสถานะตัดเย็บ, สแกนบาร์โค้ดใบสั่งผลิต, และรับชำระยอดคงเหลือเมื่อลูกค้ามารับของ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenNewCustomOrder && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenNewCustomOrder();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ออกใบสั่งตัดใหม่</span>
              </button>
            )}

            <button 
              type="button" 
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Barcode Scanner Bar */}
        <div className="p-4 px-6 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Barcode / Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-amber-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 สแกนบาร์โค้ดใบสั่ง A4 / ค้นหาเบอร์โทร, ชื่อ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ทั้งหมด ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING_PRODUCTION')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'PENDING_PRODUCTION'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ⏳ รอดำเนินการ ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PRODUCTION')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'IN_PRODUCTION'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              🧵 กำลังตัดเย็บ ({inProdCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY_FOR_PICKUP')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'READY_FOR_PICKUP'
                  ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ✨ พร้อมรับสินค้า ({readyCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ✓ รับของครบแล้ว ({completedCount})
            </button>
          </div>
        </div>

        {/* Content Body: Order Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Scissors className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
              <h4 className="text-sm font-bold text-slate-300">ไม่พบรายการสั่งตัดตามเงื่อนไขที่เลือก</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                สามารถสแกนบาร์โค้ดบนใบ A4 หรือคลิกปุ่ม "+ ออกใบสั่งตัดใหม่" ด้านบนเพื่อเริ่มสั่งตัด
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map(order => {
                const isPaidFull = order.balanceDue <= 0 || order.status === 'COMPLETED';
                const isReady = order.status === 'READY_FOR_PICKUP';
                const isPending = order.status === 'PENDING_PRODUCTION';
                const isInProd = order.status === 'IN_PRODUCTION';

                // Due date urgency check
                const todayStr = new Date().toISOString().slice(0, 10);
                const isDueToday = order.dueDate === todayStr;
                const isOverdue = order.dueDate < todayStr && !isPaidFull;

                return (
                  <div 
                    key={order.id}
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                      isPaidFull 
                        ? 'bg-slate-950/40 border-slate-800' 
                        : isOverdue 
                        ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30' 
                        : isReady 
                        ? 'bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    {/* Top Row: Order No, Date, Status Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-amber-400">{order.orderNo}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              order.status === 'READY_FOR_PICKUP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse' :
                              order.status === 'IN_PRODUCTION' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {order.status === 'COMPLETED' ? '✓ ส่งมอบแล้ว' :
                               order.status === 'READY_FOR_PICKUP' ? '✨ พร้อมรับสินค้า' :
                               order.status === 'IN_PRODUCTION' ? '🧵 กำลังตัดเย็บ' : '⏳ รอดำเนินการ'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ออกใบสั่ง: {new Date(order.createdAt).toLocaleDateString('th-TH')} • โดย {order.staffName}
                          </p>
                        </div>

                        {/* Due Date Indicator */}
                        <div className="text-right">
                          <div className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                            isOverdue ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-bounce' :
                            isDueToday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>นัดรับ: {order.dueDate ? `${new Date(order.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} (${order.dueDate.split('-').reverse().join('/')})` : '-'}</span>
                          </div>
                          {isOverdue && (
                            <span className="text-[9px] text-rose-400 font-bold block mt-0.5">🚨 เกินกำหนดรับ</span>
                          )}
                          {isDueToday && (
                            <span className="text-[9px] text-amber-400 font-bold block mt-0.5">⚠️ ครบกำหนดวันนี้</span>
                          )}
                        </div>
                      </div>

                      {/* Customer & Item Description */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>{order.customerName}</span>
                          </span>
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="font-mono text-slate-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                          {order.referenceImageUrl ? (
                            <img 
                              src={order.referenceImageUrl} 
                              alt="Mockup" 
                              className="w-12 h-12 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <Scissors className="w-5 h-5 text-amber-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white text-xs truncate">
                              {order.itemDescription}
                            </div>
                            <div className="text-[10px] text-amber-300 mt-0.5 truncate">
                              ผ้า: {order.fabricType || 'ตามที่กำหนด'} • {order.qty} ชิ้น
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              รับมอบ: {order.deliveryMethod === 'PICKUP_SHOP' ? '🏪 หน้าร้าน' : `🚚 พัสดุ: ${order.shippingAddress || ''}`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Summary Box */}
                      <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>ยอดสั่งผลิตรวม:</span>
                          <span className="font-mono text-slate-200">฿{order.totalPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 text-[11px]">
                          <span>เงินมัดจำ (ชำระแล้ว):</span>
                          <span className="font-mono font-bold">฿{order.depositAmount.toLocaleString()} ({order.depositPaymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'})</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 border-t border-slate-800 font-bold">
                          <span className={isPaidFull ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPaidFull ? '✓ ชำระครบถ้วน 100%' : 'ยอดค้างชำระคงเหลือ:'}
                          </span>
                          <span className={`text-base font-mono font-black ${isPaidFull ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ฿{order.balanceDue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
                      {/* Status pipeline selector */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400 text-[9px] mr-1">สถานะงาน:</span>
                        {order.status !== 'COMPLETED' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'IN_PRODUCTION')}
                              className={`px-2 py-1 rounded-lg font-bold transition border ${
                                isInProd ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              🧵 กำลังตัดเย็บ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                              className={`px-2 py-1 rounded-lg font-bold transition border ${
                                isReady ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              ✨ พร้อมรับ
                            </button>
                          </>
                        ) : (
                          <span className="text-emerald-400 font-bold">✓ งานเสร็จสมบูรณ์แล้ว</span>
                        )}
                      </div>

                      {/* Main Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {order.balanceDue > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForSettlement(order);
                              setSettlementSuccessOrder(null);
                              setSettlementPaymentMethod('PROMPTPAY');
                              setCashTendered(order.balanceDue.toString());
                            }}
                            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>💰 ชำระยอดคงเหลือ (฿{order.balanceDue.toLocaleString()}) &amp; ส่งมอบ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePrintCompletedA4(order)}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>🖨️ พิมพ์ใบเสร็จส่งมอบ (A4)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewingMeasurementOrder(order)}
                          title="ดูสัดส่วนวัดตัว & หุ่นจำลอง"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6 flex-shrink-0">
          <span>KORAT CAT Haute Couture Atelier Queue Management</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. MODAL: FINAL PAYMENT & BALANCE DUE SETTLEMENT POPUP   */}
      {/* ======================================================== */}
      {selectedOrderForSettlement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-white my-auto flex flex-col">
            
            {/* Header */}
            <div className="p-4 px-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">รับชำระยอดค้างชำระ &amp; ส่งมอบสินค้า</h4>
                  <p className="text-[11px] text-amber-300 font-mono">เลขที่สั่ง: {selectedOrderForSettlement.orderNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForSettlement(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {settlementSuccessOrder ? (
                /* SUCCESS VIEW */
                <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">รับชำระยอดคงเหลือและส่งมอบสำเร็จ!</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      ออเดอร์ <span className="font-mono font-bold text-amber-300">{settlementSuccessOrder.orderNo}</span> ได้รับการบันทึกสถานะเป็น <b>"ชำระครบถ้วน 100%"</b> และรวมยอดเงินเข้ากะพนักงานแล้ว
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs max-w-sm mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ลูกค้า:</span>
                      <span className="font-bold text-white">{settlementSuccessOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ยอดชำระส่วนที่เหลือ:</span>
                      <span className="font-mono font-bold text-emerald-400">฿{(settlementSuccessOrder.finalPaidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ช่องทางชำระ:</span>
                      <span className="font-bold text-white">{settlementSuccessOrder.finalPaymentMethod === 'PROMPTPAY' ? 'PromptPay QR' : 'เงินสด'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrintCompletedA4(settlementSuccessOrder)}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>🖨️ พิมพ์ใบเสร็จส่งมอบ A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForSettlement(null);
                        setSettlementSuccessOrder(null);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ) : (
                /* PAYMENT FORM VIEW */
                <form onSubmit={handleConfirmSettlement} className="space-y-4">
                  {/* Order Overview */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ลูกค้า:</span>
                      <span className="font-bold text-white">{selectedOrderForSettlement.customerName} ({selectedOrderForSettlement.customerPhone})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">รายการสั่งผลิต:</span>
                      <span className="font-bold text-slate-200 truncate">{selectedOrderForSettlement.itemDescription}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5">
                      <span className="text-slate-400">ยอดสั่งผลิตรวม:</span>
                      <span className="font-mono text-slate-300">฿{selectedOrderForSettlement.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>มัดจำ 50% ที่ชำระแล้ว:</span>
                      <span className="font-mono">฿{selectedOrderForSettlement.depositAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Huge Balance Due Display */}
                  <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl text-center space-y-1">
                    <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                      ยอดเงินที่ต้องเรียกเก็บจากลูกค้าทันที (Balance Due):
                    </span>
                    <div className="text-3xl font-black font-mono text-rose-400">
                      ฿{selectedOrderForSettlement.balanceDue.toLocaleString()}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300">เลือกช่องทางรับเงิน:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettlementPaymentMethod('PROMPTPAY')}
                        className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                          settlementPaymentMethod === 'PROMPTPAY'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>PromptPay QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementPaymentMethod('CASH')}
                        className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                          settlementPaymentMethod === 'CASH'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>เงินสด (Cash)</span>
                      </button>
                    </div>
                  </div>

                  {/* Method Details: PromptPay vs Cash */}
                  {settlementPaymentMethod === 'PROMPTPAY' ? (
                    <div className="p-3 bg-slate-950 border border-sky-500/40 rounded-2xl flex items-center gap-3">
                      {(() => {
                        const payload = settings?.promptPayId
                          ? PromptPayService.generatePayload(settings.promptPayId, selectedOrderForSettlement.balanceDue)
                          : '';
                        const qrUrl = payload ? PromptPayService.getQrImageUrl(payload, 200) : '';

                        return (
                          <>
                            <div className="bg-white p-1.5 rounded-xl flex-shrink-0 shadow">
                              {qrUrl ? (
                                <img src={qrUrl} alt="PromptPay QR" className="w-20 h-20 object-contain rounded-lg" />
                              ) : (
                                <div className="w-20 h-20 flex items-center justify-center text-slate-400">
                                  <QrCode className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                                QR ส่งขึ้นหน้าจอที่ 2 ฝั่งลูกค้าแล้ว
                              </span>
                              <div className="font-bold text-white text-xs">
                                สแกนจ่ายยอดคงเหลือ: <span className="font-mono text-emerald-400">฿{selectedOrderForSettlement.balanceDue.toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                พร้อมเพย์: <b className="font-mono text-slate-200">{settings?.promptPayId || '-'}</b>
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-2xl space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          เงินสดที่รับจากลูกค้า (บาท) *เข้าลิ้นชัก:
                        </label>
                        <input
                          type="number"
                          autoFocus
                          value={cashTendered}
                          onChange={e => setCashTendered(e.target.value)}
                          className="w-full text-lg font-mono font-bold text-emerald-400 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl"
                        />
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl text-xs font-bold">
                        <span className="text-slate-400">เงินทอนที่ต้องคืน:</span>
                        <span className="font-mono text-amber-400 text-base">
                          ฿{Math.max(0, (parseFloat(cashTendered) || 0) - selectedOrderForSettlement.balanceDue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingSettlement}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ ยืนยันรับเงิน ฿{selectedOrderForSettlement.balanceDue.toLocaleString()} &amp; บันทึกส่งมอบสินค้า</span>
                  </button>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: MEASUREMENT & SILHOUETTE DETAIL POPUP           */}
      {/* ======================================================== */}
      {viewingMeasurementOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-white my-auto flex flex-col max-h-[85vh]">
            <div className="p-4 px-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-300">
                สัดส่วนการวัดตัว &amp; แบบอ้างอิง: {viewingMeasurementOrder.orderNo}
              </h4>
              <button
                type="button"
                onClick={() => setViewingMeasurementOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-300 border-b border-slate-800 pb-1">📐 สัดส่วนที่วัดได้ (นิ้ว/ซม.):</h5>
                  {Object.entries(viewingMeasurementOrder.measurements || {}).filter(([_, v]) => Boolean(v)).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5 border-b border-slate-800/40">
                      <span className="text-slate-400">{k}:</span>
                      <span className="font-bold font-mono text-amber-300">{v}</span>
                    </div>
                  ))}
                  {viewingMeasurementOrder.specialInstructions && (
                    <div className="pt-2">
                      <span className="text-slate-400 block font-bold">เทคนิค/ตำแหน่งปัก:</span>
                      <span className="text-slate-200">{viewingMeasurementOrder.specialInstructions}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  {viewingMeasurementOrder.referenceImageUrl ? (
                    <div>
                      <img
                        src={viewingMeasurementOrder.referenceImageUrl}
                        alt="Mockup"
                        className="max-h-48 rounded-xl object-contain border border-slate-700 shadow"
                      />
                      <span className="text-[10px] text-slate-400 block text-center mt-1">ภาพแบบอ้างอิงจากลูกค้า</span>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      <Scissors className="w-8 h-8 mx-auto opacity-40 mb-1" />
                      <span>ไม่มีรูปแนบ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingMeasurementOrder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
