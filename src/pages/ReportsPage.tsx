// src/pages/ReportsPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  Clock, 
  Calendar, 
  Filter, 
  Download, 
  ChevronRight,
  PieChart,
  FileSpreadsheet,
  FileText,
  Printer,
  Boxes,
  Scissors,
  Truck
} from 'lucide-react';
import { db } from '../db';
import type { Order, Shift, StoreSettings } from '../types';
import { GoogleSheetsBridge } from '../services/googleSheets';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { ReceiptModal } from '../components/ReceiptModal';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  
  // Tax Invoice & Receipt Modal States (For Reprinting)
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Date Range Filters
  const [dateFilterMode, setDateFilterMode] = useState<'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Active Report Sub-Tab
  const [reportTab, setReportTab] = useState<'OVERVIEW' | 'SHIFTS' | 'DAILY' | 'ACCOUNTING' | 'ORDERS'>('OVERVIEW');

  const loadData = () => {
    Promise.all([
      db.orders.toArray(),
      db.shifts.toArray(),
      db.settings.get('current_store_settings')
    ]).then(([o, s, sett]) => {
      setOrders(o);
      setShifts(s);
      if (sett) setSettings(sett);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Orders based on selected Date Range
  const filteredOrders = orders.filter(o => {
    if (o.status !== 'COMPLETED') return false;
    const orderDate = new Date(o.timestamp);
    const now = new Date();

    if (dateFilterMode === 'TODAY') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (dateFilterMode === '7DAYS') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return orderDate >= sevenDaysAgo && orderDate <= now;
    }
    if (dateFilterMode === 'THIS_MONTH') {
      return orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth();
    }
    if (dateFilterMode === 'LAST_MONTH') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return orderDate.getFullYear() === lastMonth.getFullYear() && orderDate.getMonth() === lastMonth.getMonth();
    }
    if (dateFilterMode === 'CUSTOM') {
      if (startDate && orderDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    }
    return true; // 'ALL'
  });

  // Financial Calculations
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.netTotal, 0);
  
  let totalCogs = 0;
  filteredOrders.forEach(o => {
    o.items.forEach(i => {
      totalCogs += (i.costPrice || 0) * i.qty;
    });
  });

  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalBills = filteredOrders.length;
  const avgBasket = totalBills > 0 ? totalRevenue / totalBills : 0;

  // Breakdown by Date (Daily summary)
  const dailyMap = new Map<string, { revenue: number; cogs: number; orders: number; cash: number; promptpay: number }>();
  filteredOrders.forEach(o => {
    const dayKey = new Date(o.timestamp).toLocaleDateString('th-TH');
    const existing = dailyMap.get(dayKey) || { revenue: 0, cogs: 0, orders: 0, cash: 0, promptpay: 0 };
    existing.revenue += o.netTotal;
    existing.orders += 1;
    o.items.forEach(i => {
      existing.cogs += (i.costPrice || 0) * i.qty;
    });
    o.payments.forEach(p => {
      if (p.method === 'CASH') existing.cash += p.amount;
      if (p.method === 'PROMPTPAY') existing.promptpay += p.amount;
    });
    dailyMap.set(dayKey, existing);
  });

  // 1. Export Detailed Sales & Accounting Ledger (สมุดรายวันขายและกำไร)
  const handleExportOrdersCsv = () => {
    const headers = [
      'เลขที่บิล',
      'วันที่ขาย',
      'เวลาขาย',
      'แคชเชียร์',
      'ลูกค้าสมาชิก',
      'จำนวนชิ้นรวม',
      'รายการสินค้าที่ขาย',
      'ยอดรวมก่อนส่วนลด',
      'ส่วนลด',
      'ยอดขายสุทธิ',
      'ต้นทุนสินค้า (COGS)',
      'กำไรขั้นต้น',
      'วิธีชำระเงิน',
      'ยอดเงินสด (บาท)',
      'ยอดโอน PromptPay (บาท)',
      'สถานะใบกำกับภาษี'
    ];

    const rows = filteredOrders.map(o => {
      let orderCost = 0;
      o.items.forEach(i => { orderCost += (i.costPrice || 0) * i.qty; });
      const profit = o.netTotal - orderCost;
      const cashAmt = o.payments.find(p => p.method === 'CASH')?.amount || 0;
      const promptPayAmt = o.payments.find(p => p.method === 'PROMPTPAY')?.amount || 0;
      const itemsSummary = o.items.map(i => `${i.productName} (x${i.qty})`).join('; ');

      return [
        `"${o.localOrderId}"`,
        `"${new Date(o.timestamp).toLocaleDateString('th-TH')}"`,
        `"${new Date(o.timestamp).toLocaleTimeString('th-TH')}"`,
        `"${o.cashierName}"`,
        `"${o.customerName || '-'}"`,
        o.items.reduce((s, i) => s + i.qty, 0),
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.subtotal,
        o.promoDiscount,
        o.netTotal,
        orderCost,
        profit,
        `"${o.payments.map(p => p.method).join('+')}"`,
        cashAmt,
        promptPayAmt,
        `"${o.isTaxInvoiceIssued ? `ออกแล้ว (${o.taxInvoiceNo || ''})` : 'บิลย่อ'}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    GoogleSheetsBridge.downloadCsv(csv, `รายงานบัญชี_สมุดรายวันขาย_${dateFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 2. Export Daily Summary (สรุปยอดขายรายวัน)
  const handleExportDailyCsv = () => {
    const headers = [
      'วันที่',
      'จำนวนบิลที่ขาย',
      'ยอดขายรวม (บาท)',
      'ต้นทุนสินค้า (บาท)',
      'กำไรขั้นต้น (บาท)',
      'สัดส่วนกำไร (%)',
      'ยอดเงินสด (บาท)',
      'ยอดโอน PromptPay (บาท)'
    ];

    const rows = Array.from(dailyMap.entries()).map(([day, data]) => {
      const profit = data.revenue - data.cogs;
      const margin = data.revenue > 0 ? ((profit / data.revenue) * 100).toFixed(1) : '0';
      return [
        `"${day}"`,
        data.orders,
        data.revenue,
        data.cogs,
        profit,
        `"${margin}%"`,
        data.cash,
        data.promptpay
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    GoogleSheetsBridge.downloadCsv(csv, `รายงานบัญชี_สรุปรายวัน_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 3. Export Shifts Audit (สรุปกะแคชเชียร์)
  const handleExportShiftsCsv = () => {
    const headers = [
      'รหัสกะ',
      'พนักงานแคชเชียร์',
      'เวลาเปิดกะ',
      'เวลาปิดกะ',
      'เงินทอนตั้งต้น (บาท)',
      'ยอดขายเงินสด (บาท)',
      'ยอดขาย PromptPay (บาท)',
      'ยอดขายรวม (บาท)',
      'เงินสดที่ควรมีในลิ้นชัก (บาท)',
      'เงินสดนับได้จริง (บาท)',
      'ผลต่าง ขาด/เกิน (บาท)',
      'สถานะ',
      'หมายเหตุ'
    ];

    const rows = shifts.map(s => {
      const totalSales = (s.totalCashSales || 0) + (s.totalPromptPaySales || 0);
      const diff = s.cashDifference !== undefined ? s.cashDifference : 0;
      return [
        `"${s.id}"`,
        `"${s.cashierName}"`,
        `"${new Date(s.startTime).toLocaleString('th-TH')}"`,
        `"${s.endTime ? new Date(s.endTime).toLocaleString('th-TH') : '-'}"`,
        s.startingCash,
        s.totalCashSales || 0,
        s.totalPromptPaySales || 0,
        totalSales,
        s.closingCashExpected !== undefined ? s.closingCashExpected : (s.startingCash + (s.totalCashSales || 0)),
        s.closingCashActual !== undefined ? s.closingCashActual : '-',
        diff,
        `"${s.status === 'OPEN' ? 'กำลังเปิดกะ' : 'ปิดกะแล้ว'}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');
    GoogleSheetsBridge.downloadCsv(csv, `รายงานสรุปกะแคชเชียร์_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 4. Export Monthly VAT Sales Tax Report (รายงานภาษีขาย ภ.พ.30 ตามแบบสรรพากร)
  const handleExportVatReportCsv = () => {
    const headers = [
      'ลำดับที่',
      'วัน เดือน ปี',
      'เลขที่ใบกำกับภาษี / เลขที่บิล',
      'ชื่อผู้ซื้อสินค้า/ผู้รับบริการ',
      'เลขประจำตัวผู้เสียภาษี / เลขบัตร ปชช.',
      'สถานประกอบการ',
      'มูลค่าสินค้าหรือบริการ (ก่อน VAT)',
      'จำนวนเงินภาษีมูลค่าเพิ่ม (VAT 7%)',
      'รวมมูลค่าสินค้าพร้อมภาษี (ยอดสุทธิ)'
    ];

    let runningVat = 0;
    let runningPreTax = 0;
    let runningNet = 0;

    const rows = filteredOrders.map((o, idx) => {
      const vatRate = o.vatRate || settings?.vatRate || 7;
      let preTax = o.preTaxAmount || 0;
      let vatAmt = o.vatAmount || 0;

      if (vatAmt === 0 && settings?.vatType === 'INCLUSIVE') {
        preTax = (o.netTotal * 100) / (100 + vatRate);
        vatAmt = o.netTotal - preTax;
      } else if (vatAmt === 0 && settings?.vatType === 'EXCLUSIVE') {
        preTax = o.netTotal;
        vatAmt = (o.netTotal * vatRate) / 100;
      } else if (preTax === 0) {
        preTax = Math.max(0, o.netTotal - vatAmt);
      }

      runningPreTax += preTax;
      runningVat += vatAmt;
      runningNet += o.netTotal;

      const invoiceNo = o.taxInvoiceNo || o.localOrderId;
      const customerName = o.customerTaxInfo?.name || o.customerName || 'ลูกค้าทั่วไป (สด)';
      const taxId = o.customerTaxInfo?.taxId || '-';
      const branch = o.customerTaxInfo?.branch || 'สำนักงานใหญ่';

      return [
        idx + 1,
        `"${new Date(o.timestamp).toLocaleDateString('th-TH')}"`,
        `"${invoiceNo}"`,
        `"${customerName.replace(/"/g, '""')}"`,
        `"${taxId}"`,
        `"${branch}"`,
        preTax.toFixed(2),
        vatAmt.toFixed(2),
        o.netTotal.toFixed(2)
      ].join(',');
    });

    const summaryRow = [
      'รวมทั้งสิ้น',
      '',
      '',
      '',
      '',
      '',
      runningPreTax.toFixed(2),
      runningVat.toFixed(2),
      runningNet.toFixed(2)
    ].join(',');

    const csv = [
      `"รายงานภาษีขาย (ภ.พ.30) - ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}"`,
      `"ประจำช่วง: ${dateFilterMode}"`,
      `"เลขประจำตัวผู้เสียภาษีอากร: ${settings?.taxId || '-'}"`,
      '',
      headers.join(','),
      ...rows,
      summaryRow
    ].join('\r\n');

    GoogleSheetsBridge.downloadCsv(csv, `รายงานภาษีขาย_ภพ30_${dateFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 5. Export Stock Inventory & Valuation Report (รายงานสต็อกสินค้าและมูลค่าคลัง)
  const handleExportStockCsv = async () => {
    const variants = await db.variants.toArray();
    const headers = [
      'ลำดับ',
      'รหัส SKU',
      'บาร์โค้ด',
      'ชื่อสินค้า',
      'หมวดหมู่',
      'คุณลักษณะ (ไซส์/สี)',
      'สต็อกโกดัง/โรงงาน (ชิ้น)',
      'สต็อกหน้าร้าน (ชิ้น)',
      'สต็อกรวมทั้งหมด (ชิ้น)',
      'ราคาทุนต่อชิ้น (บาท)',
      'ราคาขายต่อชิ้น (บาท)',
      'มูลค่าสต็อกรวมตามทุน (บาท)',
      'สถานะการขาย'
    ];

    let totalWh = 0;
    let totalShop = 0;
    let totalStock = 0;
    let totalCostVal = 0;

    const rows = variants.map((v, idx) => {
      const wh = v.warehouseStock ?? 0;
      const sh = v.shopStock ?? (v.stockQuantity - wh);
      const tot = v.stockQuantity;
      const cost = v.costPrice || 0;
      const costVal = tot * cost;

      totalWh += wh;
      totalShop += sh;
      totalStock += tot;
      totalCostVal += costVal;

      const attrs = v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}:${val}`).join(';') : '';

      return [
        idx + 1,
        `"${v.sku}"`,
        `"${v.barcode}"`,
        `"${v.productName.replace(/"/g, '""')}"`,
        `"${v.category}"`,
        `"${attrs}"`,
        wh,
        sh,
        tot,
        cost.toFixed(2),
        v.salePrice.toFixed(2),
        costVal.toFixed(2),
        `"${v.isActive !== false ? 'เปิดขาย' : 'ปิดการขาย'}"`
      ].join(',');
    });

    const summaryRow = [
      'รวมทั้งหมด',
      '',
      '',
      '',
      '',
      '',
      totalWh,
      totalShop,
      totalStock,
      '',
      '',
      totalCostVal.toFixed(2),
      ''
    ].join(',');

    const csv = [
      `"รายงานสต็อกสินค้าและมูลค่าคลัง - ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}"`,
      `"วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}"`,
      '',
      headers.join(','),
      ...rows,
      summaryRow
    ].join('\r\n');

    GoogleSheetsBridge.downloadCsv(csv, `รายงานสต็อกสินค้าและมูลค่าคลัง_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 6. Export Custom Made Orders & Deposits Report (รายงานสั่งผลิตและเงินมัดจำ)
  const handleExportCustomOrdersCsv = async () => {
    const list = await db.customOrders.orderBy('createdAt').reverse().toArray();
    const headers = [
      'ลำดับ',
      'เลขที่สั่งผลิต',
      'วันที่สั่งทำ',
      'พนักงานรับออเดอร์',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'รายละเอียดงานสั่งทำ',
      'จำนวน (ชิ้น)',
      'ยอดสั่งทำรวม (บาท)',
      'เงินมัดจำที่รับแล้ว (บาท)',
      'ยอดคงค้าง (บาท)',
      'วิธีชำระมัดจำ',
      'วันนัดรับสินค้า',
      'วิธีส่งมอบ',
      'สถานะงานผลิต',
      'หมายเหตุ'
    ];

    let totalOrderAmt = 0;
    let totalDepositAmt = 0;
    let totalBalanceAmt = 0;

    const rows = list.map((co, idx) => {
      totalOrderAmt += co.totalPrice || 0;
      totalDepositAmt += co.depositAmount || 0;
      totalBalanceAmt += co.balanceDue || 0;

      return [
        idx + 1,
        `"${co.orderNo}"`,
        `"${new Date(co.createdAt).toLocaleDateString('th-TH')}"`,
        `"${co.staffName}"`,
        `"${co.customerName.replace(/"/g, '""')}"`,
        `"${co.customerPhone}"`,
        `"${co.itemDescription.replace(/"/g, '""')}"`,
        co.qty,
        co.totalPrice.toFixed(2),
        co.depositAmount.toFixed(2),
        co.balanceDue.toFixed(2),
        `"${co.depositPaymentMethod === 'CASH' ? 'เงินสด' : 'PromptPay'}"`,
        `"${co.dueDate}"`,
        `"${co.deliveryMethod === 'PICKUP_SHOP' ? 'รับเองที่ร้าน' : 'จัดส่งพัสดุ'}"`,
        `"${co.status}"`,
        `"${(co.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const summaryRow = [
      'รวมทั้งหมด',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalOrderAmt.toFixed(2),
      totalDepositAmt.toFixed(2),
      totalBalanceAmt.toFixed(2),
      '',
      '',
      '',
      '',
      ''
    ].join(',');

    const csv = [
      `"รายงานงานสั่งผลิตและเงินมัดจำ - ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}"`,
      `"วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}"`,
      '',
      headers.join(','),
      ...rows,
      summaryRow
    ].join('\r\n');

    GoogleSheetsBridge.downloadCsv(csv, `รายงานสั่งผลิตและเงินมัดจำ_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // 7. Export Stock Transfers Audit Report (รายงานประวัติการโอนย้ายสต็อกข้ามคลัง)
  const handleExportTransfersCsv = async () => {
    const list = await db.transfers.orderBy('timestamp').reverse().toArray();
    const headers = [
      'ลำดับ',
      'เลขที่ใบส่งของ',
      'วันที่ส่งมอบ',
      'คลังต้นทาง',
      'คลังปลายทาง',
      'จำนวนสินค้ารวม (ชิ้น)',
      'รายการสินค้าที่โอน',
      'ผู้ตัดส่งสินค้า',
      'ผู้ตรวจรับสินค้า',
      'เวลาที่ตรวจรับ',
      'สถานะการโอน',
      'หมายเหตุ'
    ];

    const rows = list.map((t, idx) => {
      const itemsText = t.items.map(it => `${it.productName} (${it.sku}) x${it.qty}`).join('; ');
      return [
        idx + 1,
        `"${t.transferNo}"`,
        `"${new Date(t.timestamp).toLocaleDateString('th-TH')} ${new Date(t.timestamp).toLocaleTimeString('th-TH')}"`,
        `"${t.fromBranch === 'WAREHOUSE' ? 'โกดัง/โรงงานผลิต' : 'หน้าร้านเรือนโคราช'}"`,
        `"${t.toBranch === 'SHOP' ? 'หน้าร้านเรือนโคราช' : 'โกดัง/โรงงานผลิต'}"`,
        t.totalQty,
        `"${itemsText.replace(/"/g, '""')}"`,
        `"${t.senderName}"`,
        `"${t.receiverName || '-'}"`,
        `"${t.receivedAt ? new Date(t.receivedAt).toLocaleTimeString('th-TH') : '-'}"`,
        `"${t.status === 'COMPLETED' ? 'ตรวจรับสำเร็จแล้ว' : 'รอตรวจรับ'}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = [
      `"รายงานประวัติการโอนย้ายสต็อกข้ามคลัง - ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}"`,
      `"วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}"`,
      '',
      headers.join(','),
      ...rows
    ].join('\r\n');

    GoogleSheetsBridge.downloadCsv(csv, `รายงานประวัติการโอนย้ายสต็อก_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleOpenTaxInvoice = (order: Order) => {
    setSelectedOrderForInvoice(order);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenReceipt = (order: Order) => {
    setSelectedOrderForReceipt(order);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>รายงานการเงิน, สรุปกะ, บัญชี และกำไรสุทธิ (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            วิเคราะห์ยอดขาย กำไรขั้นต้น (Gross Profit) สรุปกะพนักงาน สรุปรายวัน บัญชีแจกแจงรายการ และพิมพ์ใบกำกับภาษีย้อนหลัง
          </p>
        </div>

        {/* Excel / CSV Export Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดสมุดรายวันขายและกำไรแบบละเอียดทุกบิล สำหรับนำเข้า Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel: สมุดรายวันขาย & กำไร</span>
          </button>

          <button
            type="button"
            onClick={handleExportDailyCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดสรุปยอดขายและกำไรสุทธิรายวัน"
          >
            <Download className="w-4 h-4" />
            <span>Excel: สรุปรายวัน</span>
          </button>

          <button
            type="button"
            onClick={handleExportShiftsCsv}
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
            title="ดาวน์โหลดรายงานสรุปกะและการส่งมอบเงินสดของแคชเชียร์"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Excel: สรุปกะแคชเชียร์</span>
          </button>

          <button
            type="button"
            onClick={handleExportVatReportCsv}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดรายงานภาษีขาย (ภ.พ.30) ประจำงวดตามมาตรฐานสรรพากร"
          >
            <FileText className="w-4 h-4 text-amber-200" />
            <span>📑 ภ.พ.30 (ภาษีขาย)</span>
          </button>

          <button
            type="button"
            onClick={handleExportStockCsv}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดรายงานสรุปสต็อกสินค้าและมูลค่าคลัง 2 สาขา"
          >
            <Boxes className="w-4 h-4 text-teal-200" />
            <span>📦 สต็อก & มูลค่าคลัง</span>
          </button>

          <button
            type="button"
            onClick={handleExportCustomOrdersCsv}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดรายงานสรุปงานสั่งผลิตและเงินมัดจำทั้งหมด"
          >
            <Scissors className="w-4 h-4 text-purple-200" />
            <span>✂️ สั่งผลิต & มัดจำ</span>
          </button>

          <button
            type="button"
            onClick={handleExportTransfersCsv}
            className="px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="ดาวน์โหลดประวัติการโอนย้ายสต็อกข้ามคลัง (โกดัง ➔ หน้าร้าน)"
          >
            <Truck className="w-4 h-4 text-sky-200" />
            <span>🚚 ประวัติการโอนย้าย</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR (เลือกช่วงเวลา: วันนี้, 7 วัน, เดือนนี้, เลือกเดือน, กำหนดวันเอง) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-amber-600" /> เลือกช่วงสรุปผล:
          </span>

          <button
            onClick={() => setDateFilterMode('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'TODAY' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            วันนี้
          </button>

          <button
            onClick={() => setDateFilterMode('7DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === '7DAYS' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            7 วันล่าสุด
          </button>

          <button
            onClick={() => setDateFilterMode('THIS_MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'THIS_MONTH' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            เดือนนี้
          </button>

          <button
            onClick={() => setDateFilterMode('LAST_MONTH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'LAST_MONTH' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            เดือนที่แล้ว
          </button>

          <button
            onClick={() => setDateFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'ALL' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            สรุปรวมทั้งหมด
          </button>

          <button
            onClick={() => setDateFilterMode('CUSTOM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              dateFilterMode === 'CUSTOM' ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📅 กำหนดวันเอง
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilterMode === 'CUSTOM' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">ตั้งแต่วันที่:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">ถึงวันที่:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ยอดขายรวมสุทธิ</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ฿{totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">จาก {totalBills} ใบเสร็จ</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">กำไรขั้นต้น (Gross Profit)</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            ฿{grossProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-800 font-semibold mt-1">
            Margin: {grossMarginPercent.toFixed(1)}%
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ต้นทุนรวม (COGS)</span>
            <ShoppingBag className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-700">
            ฿{totalCogs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">หักต้นทุน ณ วันขายจริง</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ยอดเฉลี่ยต่อบิล</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            ฿{avgBasket.toFixed(0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Average Ticket Size</div>
        </div>
      </div>

      {/* SUB-TABS: ภาพรวม / สรุปกะ / สรุปรายวัน / บัญชีแจกแจงละเอียด / ประวัติบิล */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1">
          <button
            onClick={() => setReportTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'OVERVIEW' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            📊 สรุปภาพรวม
          </button>
          <button
            onClick={() => setReportTab('SHIFTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'SHIFTS' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            ⏱️ สรุปกะพนักงาน ({shifts.length})
          </button>
          <button
            onClick={() => setReportTab('DAILY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'DAILY' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            📅 สรุปยอดรายวัน ({dailyMap.size})
          </button>
          <button
            onClick={() => setReportTab('ACCOUNTING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'ACCOUNTING' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            📑 บัญชีและรายการขายละเอียด ({filteredOrders.length})
          </button>
          <button
            onClick={() => setReportTab('ORDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'ORDERS' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            🧾 ประวัติการขาย & ออกใบกำกับภาษี ({filteredOrders.length})
          </button>
        </div>

        {/* 1. OVERVIEW CONTENT */}
        {reportTab === 'OVERVIEW' && (
          <div className="p-6 space-y-6">
            <h3 className="font-bold text-sm text-slate-800">
              สรุปผลประกอบการช่วง: <span className="text-amber-700">{dateFilterMode}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700">สัดส่วนช่องทางการชำระเงิน</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>เงินสด (Cash):</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ฿{filteredOrders.reduce((s, o) => s + (o.payments.find(p => p.method === 'CASH')?.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>สแกน PromptPay QR:</span>
                  <span className="font-mono font-bold text-sky-700">
                    ฿{filteredOrders.reduce((s, o) => s + (o.payments.find(p => p.method === 'PROMPTPAY')?.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-700">ประสิทธิภาพโปรโมชั่น</span>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>ส่วนลดโปรโมชั่นที่ให้ลูกค้า:</span>
                  <span className="font-mono font-bold text-rose-600">
                    -฿{filteredOrders.reduce((s, o) => s + o.promoDiscount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>จำนวนบิลที่ใช้โปรโมชั่น:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {filteredOrders.filter(o => o.promoDiscount > 0).length} บิล
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SHIFT SUMMARY TABLE */}
        {reportTab === 'SHIFTS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">แคชเชียร์</th>
                  <th className="p-3">เวลาเปิดกะ</th>
                  <th className="p-3">เวลาปิดกะ</th>
                  <th className="p-3 text-right">เงินทอนตั้งต้น</th>
                  <th className="p-3 text-right">ยอดขายสด</th>
                  <th className="p-3 text-right">ยอดขายโอน</th>
                  <th className="p-3 text-right">เงินสดที่นับได้</th>
                  <th className="p-3 text-right">ผลต่าง (เงินขาด/เกิน)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.slice().reverse().map(shift => {
                  const diff = shift.cashDifference || 0;
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          shift.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {shift.status === 'OPEN' ? '🟢 กำลังเปิดกะ' : '🔒 ปิดกะแล้ว'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{shift.cashierName}</td>
                      <td className="p-3 text-slate-500">{new Date(shift.startTime).toLocaleString('th-TH')}</td>
                      <td className="p-3 text-slate-500">{shift.endTime ? new Date(shift.endTime).toLocaleString('th-TH') : '-'}</td>
                      <td className="p-3 text-right font-mono">฿{shift.startingCash.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-bold">฿{(shift.totalCashSales || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-sky-700">฿{(shift.totalPromptPaySales || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {shift.closingCashActual !== undefined ? `฿${shift.closingCashActual.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {shift.closingCashActual !== undefined ? (
                          <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            {diff > 0 ? `+฿${diff.toLocaleString()}` : diff < 0 ? `-฿${Math.abs(diff).toLocaleString()}` : '✓ พอดี (0)'}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. DAILY SUMMARY BREAKDOWN */}
        {reportTab === 'DAILY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3 text-center">จำนวนบิล</th>
                  <th className="p-3 text-right">ยอดขายรวม</th>
                  <th className="p-3 text-right">ต้นทุนสินค้า (COGS)</th>
                  <th className="p-3 text-right">กำไรขั้นต้น</th>
                  <th className="p-3 text-right">ยอดเงินสด</th>
                  <th className="p-3 text-right">ยอดสแกนโอน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(dailyMap.entries()).map(([day, data]) => {
                  const profit = data.revenue - data.cogs;
                  return (
                    <tr key={day} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{day}</td>
                      <td className="p-3 text-center font-mono">{data.orders}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">฿{data.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-slate-500">฿{data.cogs.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-700">฿{profit.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">฿{data.cash.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-sky-700">฿{data.promptpay.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. DETAILED ACCOUNTING LEDGER */}
        {reportTab === 'ACCOUNTING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">วันที่ / เวลา</th>
                  <th className="p-3">เลขที่บิล</th>
                  <th className="p-3">แคชเชียร์</th>
                  <th className="p-3">ลูกค้า / สมาชิก</th>
                  <th className="p-3">รายการสินค้าที่ขาย</th>
                  <th className="p-3 text-center">ชำระเงิน</th>
                  <th className="p-3 text-right">ยอดขายสุทธิ</th>
                  <th className="p-3 text-right">ต้นทุนสินค้า</th>
                  <th className="p-3 text-right">กำไรขั้นต้น</th>
                  <th className="p-3 text-center">เอกสาร</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice().reverse().map(order => {
                  const orderCogs = order.items.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0);
                  const orderProfit = order.netTotal - orderCogs;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(order.timestamp).toLocaleString('th-TH', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{order.localOrderId}</td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">{order.cashierName}</td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">{order.customerName || '-'}</td>
                      <td className="p-3 text-slate-700">
                        <div className="space-y-0.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between gap-2 text-[11px]">
                              <span>• {item.productName}</span>
                              <span className="font-mono text-slate-400">x{item.qty} (฿{item.lineTotal.toLocaleString()})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {order.payments.map((p, idx) => (
                          <span
                            key={idx}
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-1 ${
                              p.method === 'CASH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {p.method === 'CASH' ? '💵 สด' : '📱 โอน'} ฿{p.amount.toLocaleString()}
                          </span>
                        ))}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ฿{order.netTotal.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        ฿{orderCogs.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        ฿{orderProfit.toLocaleString()}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(order)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition"
                            title="ดูและพิมพ์สลิปความร้อน (Thermal Slip)"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                            <span>สลิป</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTaxInvoice(order)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition"
                            title="ดูและพิมพ์ใบกำกับภาษีเต็มรูป (A4)"
                          >
                            <FileText className="w-3 h-3 text-amber-600" />
                            <span>ใบกำกับ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Grand Total Sticky Footer */}
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={6} className="p-3.5 text-right uppercase text-xs tracking-wider">
                    ยอดรวมสุทธิทั้งสิ้น ({filteredOrders.length} บิล):
                  </td>
                  <td className="p-3.5 text-right font-mono text-sm text-emerald-700">
                    ฿{totalRevenue.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono text-sm text-slate-600">
                    ฿{totalCogs.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono text-sm text-amber-700">
                    ฿{grossProfit.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 5. ORDERS HISTORY TABLE */}
        {reportTab === 'ORDERS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">เลขที่บิล</th>
                  <th className="p-3">เวลา</th>
                  <th className="p-3">แคชเชียร์</th>
                  <th className="p-3">สมาชิก</th>
                  <th className="p-3">รายการสินค้า</th>
                  <th className="p-3 text-right">ยอดรวม</th>
                  <th className="p-3 text-right">ส่วนลด</th>
                  <th className="p-3 text-right">ยอดสุทธิ</th>
                  <th className="p-3 text-center">ชำระด้วย</th>
                  <th className="p-3 text-center">พิมพ์เอกสาร (สลิป / ใบกำกับ A4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice().reverse().map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-800">{order.localOrderId}</td>
                    <td className="p-3 text-slate-500">{new Date(order.timestamp).toLocaleTimeString('th-TH')}</td>
                    <td className="p-3 text-slate-700">{order.cashierName}</td>
                    <td className="p-3 text-slate-700">{order.customerName || '-'}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {order.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">฿{order.subtotal.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-rose-600">
                      {order.promoDiscount > 0 ? `-฿${order.promoDiscount.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">฿{order.netTotal.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {order.payments.map(p => p.method).join(' + ')}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition"
                          title="ดูและพิมพ์สลิปใบเสร็จ (Thermal Slip)"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>สลิป</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTaxInvoice(order)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition shadow-xs"
                          title="ดูและพิมพ์ใบกำกับภาษีเต็มรูป (A4)"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>ใบกำกับ (A4)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Invoice Modal */}
      {selectedOrderForInvoice && settings && (
        <TaxInvoiceModal
          isOpen={isInvoiceModalOpen}
          order={selectedOrderForInvoice}
          settings={settings}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedOrderForInvoice(null);
          }}
          onSaved={loadData}
        />
      )}

      {/* Thermal Receipt Slip Modal (พิมพ์สลิปซ้ำ) */}
      {selectedOrderForReceipt && settings && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          order={selectedOrderForReceipt}
          settings={settings}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedOrderForReceipt(null);
          }}
          onOpenTaxInvoice={() => {
            const ord = selectedOrderForReceipt;
            setIsReceiptModalOpen(false);
            setSelectedOrderForReceipt(null);
            handleOpenTaxInvoice(ord);
          }}
        />
      )}
    </div>
  );
};
