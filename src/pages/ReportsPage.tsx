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
import type { Order, Shift, StoreSettings, ConsignmentVendor } from '../types';
import { GoogleSheetsBridge } from '../services/googleSheets';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { CloudSync } from '../services/cloudSync';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [consignors, setConsignors] = useState<ConsignmentVendor[]>([]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('ALL');

  // Add Vendor Modal State
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCode, setNewVendorCode] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorBank, setNewVendorBank] = useState('');
  const [newVendorAccountNo, setNewVendorAccountNo] = useState('');
  const [newVendorDefaultGp, setNewVendorDefaultGp] = useState<number>(20);
  
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
  const [reportTab, setReportTab] = useState<'OVERVIEW' | 'SHIFTS' | 'DAILY' | 'ACCOUNTING' | 'ORDERS' | 'CONSIGNMENT'>('OVERVIEW');

  const loadData = () => {
    Promise.all([
      db.orders.toArray(),
      db.shifts.toArray(),
      db.settings.get('current_store_settings'),
      db.consignors.toArray()
    ]).then(([o, s, sett, v]) => {
      setOrders(o);
      setShifts(s);
      if (sett) setSettings(sett);
      setConsignors(v || []);
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

  // Consignment Filtered Items & Settlement Calculations
  const consignmentSales: {
    orderId: string;
    timestamp: string;
    cashierName: string;
    item: Order['items'][0];
  }[] = [];

  filteredOrders.forEach(o => {
    o.items.forEach(item => {
      if (item.isConsignment || item.vendorId) {
        if (selectedVendorFilter === 'ALL' || item.vendorId === selectedVendorFilter) {
          consignmentSales.push({
            orderId: o.localOrderId || o.id,
            timestamp: o.timestamp,
            cashierName: o.cashierName,
            item
          });
        }
      }
    });
  });

  const totalConsignmentQty = consignmentSales.reduce((sum, s) => sum + s.item.qty, 0);
  const totalConsignmentGross = consignmentSales.reduce((sum, s) => sum + s.item.lineTotal, 0);
  const totalConsignmentStoreFee = consignmentSales.reduce((sum, s) => {
    if (s.item.storeRevenue !== undefined) return sum + s.item.storeRevenue;
    const gp = s.item.gpPercent ?? 20;
    return sum + Math.round((s.item.lineTotal * gp) / 100);
  }, 0);
  const totalConsignmentPayout = consignmentSales.reduce((sum, s) => {
    if (s.item.vendorPayout !== undefined) return sum + s.item.vendorPayout;
    const gp = s.item.gpPercent ?? 20;
    return sum + (s.item.lineTotal - Math.round((s.item.lineTotal * gp) / 100));
  }, 0);

  const activeVendor = consignors.find(c => c.id === selectedVendorFilter);

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

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    const newVendor: ConsignmentVendor = {
      id: `vnd-${Date.now()}`,
      code: newVendorCode.trim().toUpperCase() || `VND-${Date.now().toString().slice(-4)}`,
      name: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      bankName: newVendorBank.trim() || undefined,
      bankAccountNo: newVendorAccountNo.trim() || undefined,
      defaultGpPercent: newVendorDefaultGp,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    await db.consignors.put(newVendor);
    const updated = await db.consignors.toArray();
    setConsignors(updated || []);

    const currentSettings = await db.settings.get('current_store_settings');
    if (currentSettings) {
      const mergedConsignors = [...(currentSettings.consignors || []).filter(c => c.id !== newVendor.id), newVendor];
      await db.settings.update('current_store_settings', { consignors: mergedConsignors });
      CloudSync.pushStoreSettings({ ...currentSettings, consignors: mergedConsignors }).catch(() => {});
    }

    setIsAddVendorOpen(false);
    setNewVendorName('');
    setNewVendorCode('');
    setNewVendorPhone('');
    setNewVendorBank('');
    setNewVendorAccountNo('');
    alert(`ลงทะเบียนผู้ประกอบการ "${newVendor.name}" เรียบร้อย!`);
  };

  const handlePrintSettlement = (vendorTarget?: ConsignmentVendor) => {
    const printEl = document.getElementById('printable-settlement-statement');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-settlement-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-settlement-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ใบส่งมอบเงินและสรุปยอดฝากขาย - ${vendorTarget?.name || 'สรุปรวม'}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 0; margin: 0; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
              .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
              .subtitle { font-size: 12px; color: #64748b; margin-top: 3px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
              th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; text-align: left; }
              td { border: 1px solid #cbd5e1; padding: 7px 8px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .summary-box { float: right; width: 320px; font-size: 12px; margin-bottom: 24px; }
              .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #cbd5e1; }
              .total-highlight { font-weight: 800; font-size: 14px; color: #047857; border-top: 2px solid #047857; border-bottom: 2px solid #047857; padding: 6px 0; margin-top: 6px; }
              .signature-section { clear: both; margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 11px; page-break-inside: avoid; }
              .sig-line { border-bottom: 1px dotted #64748b; width: 80%; margin: 40px auto 8px auto; }
            </style>
          </head>
          <body>
            ${printEl.innerHTML}
          </body>
        </html>
      `);
      frameDoc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 500);
    } catch {
      window.print();
    }
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
          <button
            onClick={() => setReportTab('CONSIGNMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              reportTab === 'CONSIGNMENT' 
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md font-black' 
                : 'text-amber-800 hover:bg-amber-100/60 font-bold'
            }`}
          >
            <span>🤝 ฝากขาย & ส่งมอบเงิน</span>
            {consignmentSales.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                reportTab === 'CONSIGNMENT' ? 'bg-white text-amber-900 font-black' : 'bg-amber-200 text-amber-900 font-bold'
              }`}>
                {totalConsignmentQty} ชิ้น
              </span>
            )}
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

        {/* 6. CONSIGNMENT CONTENT (ระบบสรุปยอดฝากขายและส่งมอบเงิน) */}
        {reportTab === 'CONSIGNMENT' && (
          <div className="p-6 space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    🔍 เลือกผู้ประกอบการ / ชุมชน:
                  </label>
                  <select
                    value={selectedVendorFilter}
                    onChange={e => setSelectedVendorFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="ALL">ผู้ประกอบการทั้งหมด ({consignors.length} ราย)</option>
                    {consignors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''} - GP {c.defaultGpPercent}%
                      </option>
                    ))}
                  </select>
                </div>

                {activeVendor && (
                  <div className="text-xs bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-slate-700">
                    <span className="font-bold text-slate-900">{activeVendor.name}</span>
                    <span className="text-slate-400 mx-1.5">|</span>
                    <span>เบอร์: {activeVendor.phone}</span>
                    {activeVendor.bankAccountNo && (
                      <>
                        <span className="text-slate-400 mx-1.5">|</span>
                        <span>บัญชี: {activeVendor.bankName || ''} {activeVendor.bankAccountNo}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>+ ลงทะเบียนผู้ฝากรายใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintSettlement(activeVendor)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ พิมพ์ใบส่งมอบเงิน (A4 พร้อมเซ็น)</span>
                </button>
              </div>
            </div>

            {/* Consignment KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">จำนวนที่ขายได้</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {totalConsignmentQty.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">จาก {consignmentSales.length} รายการ</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 mb-1">ยอดขายหน้าร้านรวม (Gross)</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  ฿{totalConsignmentGross.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">ราคาขายจริงหน้าร้าน</div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30">
                <div className="text-xs font-bold text-amber-900 mb-1">ส่วนแบ่งรายได้ร้าน (GP Fee)</div>
                <div className="text-2xl font-black font-mono text-amber-700">
                  ฿{totalConsignmentStoreFee.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-700 mt-1">
                  สัดส่วนเฉลี่ย: {totalConsignmentGross > 0 ? ((totalConsignmentStoreFee / totalConsignmentGross) * 100).toFixed(1) : 0}%
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg">
                <div className="text-xs font-bold text-emerald-100 mb-1">💵 ยอดสุทธิต้องจ่ายคืนผู้ฝาก</div>
                <div className="text-2xl font-black font-mono text-white">
                  ฿{totalConsignmentPayout.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-100 mt-1">
                  {activeVendor ? `สำหรับ: ${activeVendor.name}` : 'ยอดรวมทุกผู้ประกอบการ'}
                </div>
              </div>
            </div>

            {/* Consignment Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-800">
                  รายการขายสินค้าฝากขาย (ช่วง: {dateFilterMode})
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  รวม {consignmentSales.length} รายการขาย
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">วัน-เวลา</th>
                      <th className="p-2.5">เลขที่บิล</th>
                      <th className="p-2.5">ชื่อสินค้าฝากขาย</th>
                      <th className="p-2.5">ผู้ประกอบการ</th>
                      <th className="p-2.5 text-center">จำนวน</th>
                      <th className="p-2.5 text-right">ราคาหน้าร้าน</th>
                      <th className="p-2.5 text-right">ยอดรวม</th>
                      <th className="p-2.5 text-center">% GP ร้าน</th>
                      <th className="p-2.5 text-right">รายได้ร้าน</th>
                      <th className="p-2.5 text-right text-emerald-700 font-black">ยอดเงินคืนผู้ฝาก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consignmentSales.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">
                          ยังไม่พบประวัติการขายสินค้าฝากขายในช่วงเวลานี้
                        </td>
                      </tr>
                    ) : (
                      consignmentSales.map((s, idx) => {
                        const gp = s.item.gpPercent ?? 20;
                        const storeCut = s.item.storeRevenue !== undefined ? s.item.storeRevenue : Math.round((s.item.lineTotal * gp) / 100);
                        const vendorCut = s.item.vendorPayout !== undefined ? s.item.vendorPayout : (s.item.lineTotal - storeCut);
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(s.timestamp).toLocaleDateString('th-TH')} {new Date(s.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-700">{s.orderId}</td>
                            <td className="p-2.5 font-bold text-slate-900">{s.item.productName}</td>
                            <td className="p-2.5 text-amber-800 font-semibold">{s.item.vendorName || '-'}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{s.item.qty}</td>
                            <td className="p-2.5 text-right font-mono">฿{s.item.unitPrice.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono font-bold">฿{s.item.lineTotal.toLocaleString()}</td>
                            <td className="p-2.5 text-center font-mono text-amber-700 font-bold">{gp}%</td>
                            <td className="p-2.5 text-right font-mono text-amber-800">฿{storeCut.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-mono font-black text-emerald-700">฿{vendorCut.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {consignmentSales.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-right">รวมทั้งสิ้น:</td>
                        <td className="p-2.5 text-center font-mono text-slate-900 font-black">{totalConsignmentQty}</td>
                        <td className="p-2.5 text-right">-</td>
                        <td className="p-2.5 text-right font-mono text-slate-900 font-black">฿{totalConsignmentGross.toLocaleString()}</td>
                        <td className="p-2.5 text-center">-</td>
                        <td className="p-2.5 text-right font-mono text-amber-800 font-black">฿{totalConsignmentStoreFee.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-700 font-black text-sm">฿{totalConsignmentPayout.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Registered Vendors Directory */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>👥</span> ทะเบียนผู้ประกอบการและวิสาหกิจชุมชนที่ลงทะเบียนไว้ ({consignors.length} ราย)
                  </h4>
                  <p className="text-[11px] text-slate-500">ข้อมูลผู้ฝากขาย บัญชีธนาคาร และเปอร์เซ็นต์ส่วนแบ่ง GP ร้านเริ่มต้น</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  + เพิ่มผู้ประกอบการใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {consignors.map(c => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        GP เริ่มต้น: {c.defaultGpPercent}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>📞 {c.phone}</div>
                      {c.bankAccountNo && (
                        <div>🏦 {c.bankName || 'ธนาคาร'}: <span className="font-mono">{c.bankAccountNo}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hidden Printable Settlement Slip (Rendered when printing) */}
            <div id="printable-settlement-statement" className="hidden">
              <div className="header">
                <div className="title">{settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                <div className="subtitle">{settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px' }}>
                  ใบสรุปยอดขายและส่งมอบเงินสินค้าฝากขาย (Consignment Settlement Statement)
                </div>
              </div>

              <div className="info-grid">
                <div>
                  <div><b>ผู้ฝากขาย:</b> {activeVendor?.name || 'ผู้ประกอบการชุมชนทุกราย (สรุปรวม)'}</div>
                  <div><b>รหัส:</b> {activeVendor?.code || '-'}</div>
                  <div><b>เบอร์โทรศัพท์:</b> {activeVendor?.phone || '-'}</div>
                  <div><b>บัญชีโอนเงิน:</b> {activeVendor?.bankName || ''} {activeVendor?.bankAccountNo || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><b>ช่วงเวลาสรุปยอด:</b> {dateFilterMode}</div>
                  <div><b>วันที่พิมพ์เอกสาร:</b> {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}</div>
                  <div><b>สาขา:</b> เรือนโคราชเฉลิมวัฒนา</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>วัน-เวลาขาย</th>
                    <th>เลขที่บิล</th>
                    <th>รายการสินค้า</th>
                    <th className="text-center">จำนวน</th>
                    <th className="text-right">ราคาขาย</th>
                    <th className="text-right">ยอดรวม (บาท)</th>
                    <th className="text-center">GP ร้าน</th>
                    <th className="text-right">ค่าบริการร้าน</th>
                    <th className="text-right">ยอดเงินคืนผู้ฝาก</th>
                  </tr>
                </thead>
                <tbody>
                  {consignmentSales.map((s, idx) => {
                    const gp = s.item.gpPercent ?? 20;
                    const storeCut = s.item.storeRevenue !== undefined ? s.item.storeRevenue : Math.round((s.item.lineTotal * gp) / 100);
                    const vendorCut = s.item.vendorPayout !== undefined ? s.item.vendorPayout : (s.item.lineTotal - storeCut);
                    return (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{new Date(s.timestamp).toLocaleDateString('th-TH')}</td>
                        <td>{s.orderId}</td>
                        <td>{s.item.productName}</td>
                        <td className="text-center">{s.item.qty}</td>
                        <td className="text-right">฿{s.item.unitPrice.toLocaleString()}</td>
                        <td className="text-right">฿{s.item.lineTotal.toLocaleString()}</td>
                        <td className="text-center">{gp}%</td>
                        <td className="text-right">฿{storeCut.toLocaleString()}</td>
                        <td className="text-right" style={{ fontWeight: 'bold' }}>฿{vendorCut.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="summary-box">
                <div className="summary-row">
                  <span>ยอดขายหน้าร้านรวมทั้งสิ้น:</span>
                  <span>฿{totalConsignmentGross.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>หัก ส่วนแบ่งค่าบริการร้าน (GP):</span>
                  <span>-฿{totalConsignmentStoreFee.toLocaleString()}</span>
                </div>
                <div className="summary-row total-highlight">
                  <span>ยอดเงินสุทธิส่งมอบคืนผู้ฝาก:</span>
                  <span>฿{totalConsignmentPayout.toLocaleString()}</span>
                </div>
              </div>

              <div className="signature-section">
                <div>
                  <div className="sig-line"></div>
                  <div>(____________________________________)</div>
                  <div style={{ marginTop: '4px' }}>ผู้ส่งมอบเงิน (ทางร้าน KORAT CAT)</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>วันที่ ______ / ______ / _________</div>
                </div>
                <div>
                  <div className="sig-line"></div>
                  <div>(____________________________________)</div>
                  <div style={{ marginTop: '4px' }}>ผู้รับมอบเงิน (ผู้ประกอบการฝากขาย)</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>วันที่ ______ / ______ / _________</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD CONSIGNOR MODAL */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <span>🤝</span> ลงทะเบียนผู้ประกอบการฝากขายใหม่
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              บันทึกข้อมูลผู้ผลิต วิสาหกิจชุมชน เพื่อใช้สรุปยอดขายและคำนวณเงินส่งมอบคืน
            </p>
            <form onSubmit={handleCreateVendor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ประกอบการ / ชุมชน *</label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={e => setNewVendorName(e.target.value)}
                  placeholder="เช่น คุณกอ (เครื่องเคลือบดินเผาด่านเกวียน)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผู้ประกอบการ</label>
                  <input
                    type="text"
                    value={newVendorCode}
                    onChange={e => setNewVendorCode(e.target.value)}
                    placeholder="เช่น VND-03"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    required
                    value={newVendorPhone}
                    onChange={e => setNewVendorPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ธนาคาร / พร้อมเพย์</label>
                  <input
                    type="text"
                    value={newVendorBank}
                    onChange={e => setNewVendorBank(e.target.value)}
                    placeholder="เช่น กสิกรไทย / พร้อมเพย์"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่บัญชี</label>
                  <input
                    type="text"
                    value={newVendorAccountNo}
                    onChange={e => setNewVendorAccountNo(e.target.value)}
                    placeholder="เช่น 044-x-xxxxx-x"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เปอร์เซ็นต์หักของร้านเริ่มต้น (GP %)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newVendorDefaultGp}
                    onChange={e => setNewVendorDefaultGp(parseFloat(e.target.value) || 20)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">เช่น 20% หมายถึง ร้านได้รับค่าส่วนแบ่ง 20% และส่งมอบเงินคืนผู้ฝาก 80%</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  บันทึกผู้ประกอบการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
