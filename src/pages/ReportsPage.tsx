// src/pages/ReportsPage.tsx
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Receipt, PieChart } from 'lucide-react';
import { db } from '../db';
import type { Order } from '../types';

export const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    db.orders.toArray().then(setOrders);
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === 'COMPLETED' ? o.netTotal : 0), 0);
  
  // Total Cost of Sold Items
  let totalCogs = 0;
  orders.forEach(o => {
    if (o.status === 'COMPLETED') {
      o.items.forEach(i => {
        totalCogs += (i.costPrice || 0) * i.qty;
      });
    }
  });

  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalBills = orders.filter(o => o.status === 'COMPLETED').length;
  const avgBasket = totalBills > 0 ? totalRevenue / totalBills : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
          <span>รายงานการเงิน & กำไรขั้นต้น (แอดมินเจ้าของร้าน)</span>
        </h1>
        <p className="text-xs text-slate-500">วิเคราะห์ Gross Profit และสถิติยอดขายแบบเรียลไทม์ (คำนวณจากต้นทุนแท้จริงของแต่ละ Variant)</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ยอดขายรวมสุทธิ</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-800">
            ฿{totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">จาก {totalBills} ใบเสร็จ</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">กำไรขั้นต้น (Gross Profit)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600">
            ฿{grossProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Margin: {grossMarginPercent.toFixed(1)}%
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ต้นทุนสินค้ารวม (COGS)</span>
            <ShoppingBag className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-700">
            ฿{totalCogs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">หักต้นทุน ณ วันขาย</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">ยอดเฉลี่ยต่อบิล</span>
            <Receipt className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-800">
            ฿{avgBasket.toFixed(0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Average Ticket Size</div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-800">ประวัติการขายล่าสุด</h2>
          <span className="text-xs text-slate-400">{orders.length} รายการ</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-3">เลขที่บิล</th>
                <th className="p-3">เวลา</th>
                <th className="p-3">แคชเชียร์</th>
                <th className="p-3">รายการสินค้า</th>
                <th className="p-3 text-right">ยอดรวม</th>
                <th className="p-3 text-right">ส่วนลด</th>
                <th className="p-3 text-right">ยอดสุทธิ</th>
                <th className="p-3 text-center">วิธีชำระ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice().reverse().map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-700">{order.localOrderId}</td>
                  <td className="p-3 text-slate-500">{new Date(order.timestamp).toLocaleTimeString('th-TH')}</td>
                  <td className="p-3 text-slate-600">{order.cashierName}</td>
                  <td className="p-3 text-slate-600">
                    {order.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500">฿{order.subtotal.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">
                    {order.promoDiscount > 0 ? `-฿${order.promoDiscount.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-800">฿{order.netTotal.toLocaleString()}</td>
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
      </div>
    </div>
  );
};
