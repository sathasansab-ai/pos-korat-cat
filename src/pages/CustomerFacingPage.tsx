// src/pages/CustomerFacingPage.tsx
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, CheckCircle2, QrCode, Banknote, ShieldCheck, HeartHandshake } from 'lucide-react';
import { DualMonitorSync, type CustomerDisplayState } from '../services/dualMonitorSync';
import { db } from '../db';
import type { StoreSettings, CustomerScreenTheme } from '../types';
import { PromptPayService } from '../services/promptPay';

export const CustomerFacingPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [welcomeImgError, setWelcomeImgError] = useState(false);
  const [displayState, setDisplayState] = useState<CustomerDisplayState>({
    cart: [],
    subtotal: 0,
    promoDiscount: 0,
    netTotal: 0,
    upsellPrompts: []
  });

  const loadSettings = () => {
    db.settings.get('current_store_settings').then(s => {
      if (s) setSettings(s);
    });
  };

  useEffect(() => {
    loadSettings();

    DualMonitorSync.onUpdate((state) => {
      setDisplayState(state);
      if (state.theme && settings) {
        setSettings(prev => prev ? { ...prev, customerScreenTheme: state.theme! } : prev);
      }
    });

    // Periodically re-sync settings
    const timer = setInterval(loadSettings, 5000);
    return () => clearInterval(timer);
  }, []);

  const theme: CustomerScreenTheme = displayState.theme || settings?.customerScreenTheme || 'BLACK_GOLD';

  // Theme Style Configurations
  const themeStyles = {
    BLACK_GOLD: {
      bg: 'bg-gradient-to-br from-slate-950 via-[#0d1117] to-slate-950',
      headerBorder: 'border-amber-500/30',
      cardBg: 'bg-slate-900/90 border-slate-800',
      accentText: 'text-amber-400',
      accentBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      totalText: 'text-amber-400',
      tag: 'HAUTE COUTURE • BLACK GOLD'
    },
    BROWN_GOLD: {
      bg: 'bg-gradient-to-br from-[#2a1b14] via-[#1f130d] to-[#140b07]',
      headerBorder: 'border-amber-600/40',
      cardBg: 'bg-[#2b1c15]/90 border-amber-900/40',
      accentText: 'text-amber-300',
      accentBg: 'bg-amber-600/20 text-amber-200 border-amber-600/40',
      totalText: 'text-amber-300',
      tag: 'HERITAGE TEAKWOOD • เรือนโคราชเฉลิมวัฒนา'
    },
    WHITE_GOLD: {
      bg: 'bg-gradient-to-br from-amber-50 via-slate-100 to-amber-100/50 text-slate-900',
      headerBorder: 'border-amber-300',
      cardBg: 'bg-white/95 border-amber-200 shadow-xl text-slate-800',
      accentText: 'text-amber-700',
      accentBg: 'bg-amber-100 text-amber-900 border-amber-300',
      totalText: 'text-amber-700',
      tag: 'ROYAL IVORY & GOLD'
    },
    EMERALD_GOLD: {
      bg: 'bg-gradient-to-br from-[#06261c] via-[#031b13] to-[#010e0a]',
      headerBorder: 'border-emerald-500/30',
      cardBg: 'bg-[#062c20]/90 border-emerald-800/40',
      accentText: 'text-emerald-300',
      accentBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
      totalText: 'text-emerald-300',
      tag: 'EMERALD HERITAGE • มรกตทอง'
    }
  }[theme];

  // Dynamic PromptPay QR Payload (Enlarged and crisp)
  const promptPayPayload = (settings?.promptPayId && displayState.netTotal > 0)
    ? PromptPayService.generatePayload(settings.promptPayId, displayState.netTotal)
    : '';

  const qrImageUrl = promptPayPayload
    ? PromptPayService.getQrImageUrl(promptPayPayload, 400)
    : '';

  const isLight = theme === 'WHITE_GOLD';
  const textColor = isLight ? 'text-slate-800' : 'text-white';
  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${textColor} flex flex-col justify-between p-6 sm:p-8 select-none font-sans transition-colors duration-500`}>
      {/* Top Banner */}
      <div className={`flex items-center justify-between pb-5 border-b ${themeStyles.headerBorder}`}>
        <div className="flex items-center space-x-4">
          {settings?.logoUrl && !logoError ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              onError={() => setLogoError(true)}
              className="w-14 h-14 rounded-2xl object-cover shadow-2xl border-2 border-amber-400/50 bg-white"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-3xl shadow-xl border border-amber-400/40 text-white">
              🐱
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase">
                {settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${themeStyles.accentBg}`}>
                {themeStyles.tag}
              </span>
            </div>
            <p className={`text-xs ${themeStyles.accentText} font-medium tracking-wide mt-0.5`}>
              {settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {displayState.isPaid ? (
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>ชำระเงินเรียบร้อยแล้ว</span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[11px] opacity-70">หน้าจอแสดงผลสด: </span>
            <span className="text-xs font-bold text-emerald-400">🟢 พร้อมบริการ</span>
          </div>
        )}
      </div>

      {/* THANK YOU POPUP / OVERLAY (When cashier completes sale) */}
      {displayState.isPaid && (
        <div className="my-auto py-8 text-center animate-in zoom-in-95 duration-300 max-w-2xl mx-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white mx-auto mb-4 shadow-2xl border-4 border-amber-300">
            <HeartHandshake className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black mb-3">
            {settings?.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
          </h2>
          <p className={`text-base ${subTextColor} max-w-lg mx-auto leading-relaxed`}>
            ขอบคุณที่สนับสนุนงานหัตถศิลป์ ผ้าไหม และแฟชั่นอัตลักษณ์เมืองโคราช
            ติดตามคอลเลกชันใหม่และกิจกรรม Workshop ได้เสมอ
          </p>

          {/* Cash Change Given Card */}
          {displayState.changeGiven !== undefined && displayState.changeGiven > 0 && (
            <div className="mt-6 p-4 max-w-xs mx-auto bg-emerald-500/20 border-2 border-emerald-500/40 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">เงินทอนของคุณ</span>
              <div className="text-4xl font-black font-mono text-emerald-400 mt-1">
                ฿{displayState.changeGiven.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEW: CART ITEMS (LEFT) & HUGE QR CODE / TOTAL (RIGHT) */}
      {!displayState.isPaid && (
        <div className="grid grid-cols-12 gap-6 my-auto py-4">
          {/* Scanned Items List with Photos (7 cols) */}
          <div className={`col-span-12 lg:col-span-7 rounded-3xl p-6 border flex flex-col h-[520px] shadow-2xl backdrop-blur-sm ${themeStyles.cardBg}`}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/50">
              <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${subTextColor}`}>
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>รายการสินค้า ({displayState.cart.reduce((s, i) => s + i.qty, 0)} ชิ้น)</span>
              </h2>
              <span className="text-xs font-mono opacity-60">OFFICIAL REGISTER</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {displayState.cart.length === 0 ? (
                /* Welcome Graphic & Text (Replaced playful emoji with luxury poster / logo) */
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  {settings?.welcomeImageUrl && !welcomeImgError ? (
                    <img
                      src={settings.welcomeImageUrl}
                      alt="Welcome"
                      onError={() => setWelcomeImgError(true)}
                      className="w-48 h-48 rounded-3xl object-cover shadow-2xl border-2 border-amber-400/40 mb-4 bg-white/10"
                    />
                  ) : settings?.logoUrl && !logoError ? (
                    <img
                      src={settings.logoUrl}
                      alt="Store Logo"
                      onError={() => setLogoError(true)}
                      className="w-32 h-32 rounded-3xl object-contain shadow-2xl border border-amber-400/30 p-2 bg-white/10 mb-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                      <Sparkles className="w-12 h-12" />
                    </div>
                  )}

                  <h3 className="text-xl font-extrabold tracking-wide">
                    {settings?.welcomeTitle || 'ยินดีต้อนรับสู่ KORAT CAT'}
                  </h3>
                  <p className={`text-xs ${subTextColor} mt-1.5 max-w-sm leading-relaxed`}>
                    {settings?.welcomeSubtitle || 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด'}
                  </p>
                </div>
              ) : (
                displayState.cart.map((item) => (
                  <div
                    key={item.variantId}
                    className={`p-3.5 rounded-2xl flex items-center justify-between border gap-3 transition ${
                      isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-800/80 border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center text-xl flex-shrink-0">
                          👕
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate leading-tight">
                          {item.productName}
                        </h3>
                        {item.attributes && (
                          <div className={`text-[11px] ${themeStyles.accentText} mt-0.5 truncate`}>
                            {Object.values(item.attributes).join(' • ')}
                          </div>
                        )}
                        <div className={`text-[11px] ${subTextColor} font-mono mt-0.5`}>
                          ฿{item.unitPrice.toLocaleString()} x {item.qty} ชิ้น
                        </div>
                      </div>
                    </div>

                    <div className={`text-lg font-black font-mono ${themeStyles.totalText} text-right flex-shrink-0`}>
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

          {/* DYNAMIC PROMPTPAY QR CODE & FINANCIAL TOTALS (5 cols) */}
          <div className={`col-span-12 lg:col-span-5 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between shadow-2xl ${themeStyles.cardBg}`}>
            {/* Price Breakdown */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <span className={`text-xs uppercase font-bold tracking-widest ${subTextColor}`}>
                  สรุปยอดชำระ
                </span>
                <span className={`text-[10px] font-mono font-bold ${themeStyles.accentText}`}>PROMPTPAY VERIFIED</span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className={`flex justify-between ${subTextColor}`}>
                  <span>ราคารวมปกติ:</span>
                  <span className="font-mono">฿{displayState.subtotal.toLocaleString()}</span>
                </div>

                {displayState.promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>ส่วนลดโปรโมชั่น:</span>
                    <span className="font-mono">-฿{displayState.promoDiscount.toLocaleString()}</span>
                  </div>
                )}

                {(displayState.customDiscount || 0) > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>ส่วนลดเพิ่มเติม:</span>
                    <span className="font-mono">-฿{displayState.customDiscount!.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Huge Total */}
              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <span className={`text-xs ${subTextColor} uppercase font-semibold`}>ยอดสุทธิที่ต้องชำระ</span>
                <div className={`text-4xl sm:text-5xl font-black font-mono ${themeStyles.totalText} mt-1 tracking-tight`}>
                  ฿{displayState.netTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* ENLARGED PROMPTPAY QR CODE SECTION (High-contrast, 260px) */}
            {displayState.netTotal > 0 ? (
              <div className="my-3 p-4 bg-white rounded-3xl text-slate-900 flex flex-col items-center justify-center text-center shadow-2xl border-4 border-amber-400/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                    PP
                  </div>
                  <span className="text-xs font-black text-slate-900 tracking-wider uppercase">
                    Thai PromptPay QR
                  </span>
                </div>

                {/* Big QR Image (260px x 260px) */}
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="PromptPay QR Code"
                    className="w-56 h-56 object-contain rounded-xl border border-slate-200 shadow-inner"
                  />
                ) : (
                  <div className="w-56 h-56 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                    <QrCode className="w-20 h-20" />
                  </div>
                )}

                <div className="mt-2 text-xs font-bold text-slate-800">
                  สแกนจ่ายผ่าน Mobile Banking ได้ทุกธนาคาร
                </div>
                <div className="text-[11px] text-emerald-700 font-bold font-mono">
                  ยอดตรงอัตโนมัติ: ฿{displayState.netTotal.toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <QrCode className="w-20 h-20 mx-auto opacity-30 mb-2" />
                <p className="text-xs">QR Code ชำระเงินจะปรากฏขึ้นเมื่อมีรายการสินค้า</p>
              </div>
            )}

            <div className={`text-center text-[10px] ${subTextColor} pt-2 border-t border-slate-700/50`}>
              {settings?.tagline || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`text-center text-[11px] ${subTextColor} pt-4 border-t ${themeStyles.headerBorder}`}>
        {settings?.address || 'ถนนจอมพล อ.เมือง จ.นครราชสีมา'} • โทร: {settings?.phone || '044-123456'}
      </div>
    </div>
  );
};
