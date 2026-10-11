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
  PieChart
} from 'lucide-react';
import { db } from '../db';
import type { Order, Shift } from '../types';
import { GoogleSheetsBridge } from '../services/googleSheets';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  
  // Date Range Filters
  const [dateFilterMode, setDateFilterMode] = useState<'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Active Report Sub-Tab
  const [reportTab, setReportTab] = useState<'OVERVIEW' | 'SHIFTS' | 'DAILY' | 'ORDERS'>('OVERVIEW');

  useEffect(() => {
    Promise.all([db.orders.toArray(), db.shifts.toArray()]).then(([o, s]) => {
      setOrders(o);
      setShifts(s);
    });
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

  // Export Filtered Orders to CSV
  const handleExportCsv = () => {
    const headers = ['Order_ID', 'Date', 'Time', 'Cashier', 'Customer', 'Items_Count', 'Subtotal', 'Discount', 'Net_Total', 'Payments'];
    const rows = filteredOrders.map(o => [
      `"${o.localOrderId}"`,
      `"${new Date(o.timestamp).toLocaleDateString('th-TH')}"`,
      `"${new Date(o.timestamp).toLocaleTimeString('th-TH')}"`,
      `"${o.cashierName}"`,
      `"${o.customerName || '-'}"`,
      o.items.reduce((s, i) => s + i.qty, 0),
      o.subtotal,
      o.promoDiscount,
      o.netTotal,
      `"${o.payments.map(p => `${p.method}:${p.amount}`).join(';')}"`
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    GoogleSheetsBridge.downloadCsv(csv, `POS_Report_${dateFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            <span>รายงานการเงิน, สรุปกะ และกำไรสุทธิ (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500">
            วิเคราะห์ยอดขาย กำไรขั้นต้น (Gross Profit) สรุปกะพนักงาน สรุปรายวัน และรายเดือน
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
        >
          <Download className="w-4 h-4" />
          <span>ส่งออกรายงานเป็น CSV (Google Sheets)</span>
        </button>
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

      {/* SUB-TABS: ภาพรวม / สรุปกะ / สรุปรายวัน / ประวัติบิล */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-2 bg-slate-50 border-b border-slate-200 flex gap-1">
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
            onClick={() => setReportTab('ORDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              reportTab === 'ORDERS' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            🧾 ประวัติการขาย ({filteredOrders.length})
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

        {/* 4. ORDERS HISTORY TABLE */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
