// src/pages/CustomerFacingPage.tsx
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, CheckCircle2, QrCode, CreditCard, Banknote } from 'lucide-react';
import { DualMonitorSync, type CustomerDisplayState } from '../services/dualMonitorSync';
import { db } from '../db';
import type { StoreSettings } from '../types';
import { PromptPayService } from '../services/promptPay';

export const CustomerFacingPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    cart: [],
    subtotal: 0,
    promoDiscount: 0,
    netTotal: 0,
    upsellPrompts: []
  });

  useEffect(() => {
    db.settings.get('current_store_settings').then(s => {
      if (s) setSettings(s);
    });

    DualMonitorSync.onUpdate((state) => {
      setDisplayState(state);
    });
  }, []);

  // Generate PromptPay QR if net total > 0 and store PromptPay ID is configured
  const promptPayPayload = (settings?.promptPayId && displayState.netTotal > 0)
    ? PromptPayService.generatePayload(settings.promptPayId, displayState.netTotal)
    : '';

  const qrImageUrl = promptPayPayload
    ? PromptPayService.getQrImageUrl(promptPayPayload, 320)
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-8 select-none font-sans">
      {/* Top Banner (Luxury Boutique Header) */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-3xl shadow-xl border border-amber-400/30">
            🐱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wide text-white uppercase">
                {settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider">
                HAUTE COUTURE
              </span>
            </div>
            <p className="text-xs text-amber-400 font-medium tracking-wide">
              {settings?.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา และวิสาหกิจชุมชน'}
            </p>
          </div>
        </div>

        {displayState.isPaid ? (
          <div className="flex items-center gap-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg animate-pulse">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span>ชำระเงินเรียบร้อยแล้ว ขอบคุณที่สนับสนุนงานหัตถศิลป์!</span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[11px] text-slate-400">สถานะ: </span>
            <span className="text-xs font-bold text-emerald-400">🟢 หน้าร้านพร้อมบริการ</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-12 gap-8 my-auto py-6">
        {/* Scanned Items List with Images (6.5 cols) */}
        <div className="col-span-12 lg:col-span-7 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 flex flex-col h-[520px] shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>รายการสินค้า ({displayState.cart.reduce((s, i) => s + i.qty, 0)} ชิ้น)</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">KORAT CAT BOUTIQUE</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {displayState.cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <span className="text-6xl mb-3 opacity-60">✨</span>
                <p className="text-lg font-bold text-slate-300">ยินดีต้อนรับสู่ KORAT CAT</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                  สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด
                </p>
              </div>
            ) : (
              displayState.cart.map((item) => (
                <div
                  key={item.variantId}
                  className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between border border-slate-700/70 hover:border-amber-500/40 transition gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Item Image Thumbnail */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                        👕
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate leading-tight">
                        {item.productName}
                      </h3>
                      {item.attributes && (
                        <div className="text-[11px] text-amber-300/80 mt-0.5 truncate">
                          {Object.values(item.attributes).join(' • ')}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ฿{item.unitPrice.toLocaleString()} x {item.qty} ชิ้น
                      </div>
                    </div>
                  </div>

                  <div className="text-lg font-black font-mono text-amber-400 text-right flex-shrink-0">
                    ฿{(item.unitPrice * item.qty).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Upsell Banner on Customer Screen */}
          {displayState.upsellPrompts.length > 0 && (
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 animate-spin" />
              <div className="text-xs font-semibold text-amber-200">
                {displayState.upsellPrompts[0]}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic PromptPay QR Code & Total Summary (5 cols) */}
        <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 flex flex-col justify-between shadow-2xl">
          {/* Price Breakdown */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                สรุปยอดชำระ
              </span>
              <span className="text-[10px] text-amber-400 font-mono">OFFICIAL CASH REGISTER</span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>ราคารวมปกติ:</span>
                <span className="font-mono">฿{displayState.subtotal.toLocaleString()}</span>
              </div>

              {displayState.promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>ส่วนลดโปรโมชั่นพิเศษ:</span>
                  <span className="font-mono">-฿{displayState.promoDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Total Big Display */}
            <div className="mt-4 pt-3 border-t border-slate-700">
              <span className="text-xs text-slate-400 uppercase font-semibold">ยอดสุทธิที่ต้องชำระ</span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 mt-1">
                ฿{displayState.netTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* DYNAMIC PROMPTPAY QR CODE SECTION */}
          {displayState.netTotal > 0 && !displayState.isPaid ? (
            <div className="my-3 p-4 bg-white rounded-2xl text-slate-900 flex items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>สแกนจ่ายผ่าน PromptPay</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  เปิดแอปธนาคารแล้วสแกนได้ทันที
                </div>
                <div className="text-xs font-bold font-mono text-emerald-700">
                  ยอดตรงพอดี: ฿{displayState.netTotal.toLocaleString()}
                </div>
              </div>

              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="PromptPay QR Code"
                  className="w-28 h-28 object-contain rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-28 h-28 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
            </div>
          ) : null}

          {/* Change Given Display if Paid by Cash */}
          {displayState.changeGiven !== undefined && displayState.changeGiven > 0 && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex justify-between items-center text-emerald-300">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold">เงินทอนของคุณ:</span>
              </div>
              <span className="text-2xl font-black font-mono text-white">
                ฿{displayState.changeGiven.toLocaleString()}
              </span>
            </div>
          )}

          {/* Customer Screen Footer */}
          <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-slate-800">
            {settings?.tagline || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
          </div>
        </div>
      </div>
    </div>
  );
};
