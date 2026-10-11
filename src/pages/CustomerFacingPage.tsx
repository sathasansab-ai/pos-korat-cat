// src/pages/CustomerFacingPage.tsx
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, CheckCircle2 } from 'lucide-react';
import { DualMonitorSync, type CustomerDisplayState } from '../services/dualMonitorSync';

export const CustomerFacingPage: React.FC = () => {
  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    cart: [],
    subtotal: 0,
    promoDiscount: 0,
    netTotal: 0,
    upsellPrompts: []
  });

  useEffect(() => {
    DualMonitorSync.onUpdate((state) => {
      setDisplayState(state);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-8 select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-3xl shadow-lg">
            🐱
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wide text-white">POS Korat Cat</h1>
            <p className="text-sm text-emerald-400 font-medium">ยินดีต้อนรับคุณลูกค้า</p>
          </div>
        </div>

        {displayState.isPaid && (
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ!</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-8 my-auto py-6">
        {/* Scanned Items List (7 cols) */}
        <div className="col-span-7 bg-slate-800/60 rounded-3xl p-6 border border-slate-700/60 flex flex-col h-[520px]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>รายการสินค้า ({displayState.cart.reduce((s, i) => s + i.qty, 0)} ชิ้น)</span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {displayState.cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <span className="text-5xl mb-3">🛍️</span>
                <p className="text-base font-semibold">ยินดีต้อนรับสู่ร้าน</p>
                <p className="text-xs text-slate-500 mt-1">สินค้าจะแสดงที่นี่เมื่อแคชเชียร์ทำการสแกน</p>
              </div>
            ) : (
              displayState.cart.map((item) => (
                <div
                  key={item.variantId}
                  className="p-3 bg-slate-800/90 rounded-2xl flex items-center justify-between border border-slate-700"
                >
                  <div>
                    <h3 className="text-base font-bold text-white">{item.productName}</h3>
                    <div className="text-xs text-slate-400 font-mono">
                      ฿{item.unitPrice.toLocaleString()} x {item.qty} ชิ้น
                    </div>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    ฿{(item.unitPrice * item.qty).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Upsell Banner on Customer Screen */}
          {displayState.upsellPrompts.length > 0 && (
            <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-xs font-semibold text-amber-200">
                {displayState.upsellPrompts[0]}
              </div>
            </div>
          )}
        </div>

        {/* Total Summary (5 cols) */}
        <div className="col-span-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 flex flex-col justify-between shadow-2xl">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-slate-400">สรุปยอดชำระ</span>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-slate-400 text-sm">
                <span>ราคารวมปกติ:</span>
                <span className="font-mono">฿{displayState.subtotal.toLocaleString()}</span>
              </div>

              {displayState.promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold text-sm">
                  <span>ส่วนลดโปรโมชั่น:</span>
                  <span className="font-mono">-฿{displayState.promoDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-700/80">
            <span className="text-xs text-slate-400 uppercase font-semibold">ยอดสุทธิที่ต้องชำระ</span>
            <div className="text-5xl font-black font-mono text-emerald-400 mt-2">
              ฿{displayState.netTotal.toLocaleString()}
            </div>

            {displayState.changeGiven !== undefined && displayState.changeGiven > 0 && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex justify-between items-center text-emerald-300">
                <span className="text-xs font-semibold">เงินทอนของคุณ:</span>
                <span className="text-xl font-bold font-mono">฿{displayState.changeGiven.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-600 pt-4 border-t border-slate-800">
        POS Korat Cat — All-in-One Fashion & Retail POS System
      </div>
    </div>
  );
};
