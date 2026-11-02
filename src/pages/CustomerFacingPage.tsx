// src/pages/CustomerFacingPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Sparkles, CheckCircle2, QrCode, Banknote, ShieldCheck, HeartHandshake, Eye, Tag } from 'lucide-react';
import { DualMonitorSync, type CustomerDisplayState } from '../services/dualMonitorSync';
import { db } from '../db';
import type { StoreSettings, CustomerScreenTheme } from '../types';
import { PromptPayService } from '../services/promptPay';

export const CustomerFacingPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [welcomeImgError, setWelcomeImgError] = useState(false);

  // Thank You State latch (persists 10s after payment even if cart clears)
  const [isThankYouActive, setIsThankYouActive] = useState(false);
  const [thankYouChange, setThankYouChange] = useState<number | undefined>(undefined);
  const thankYouTimerRef = useRef<any>(null);

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
      // 1. Check if sale was just completed
      if (state.isPaid) {
        setIsThankYouActive(true);
        setThankYouChange(state.changeGiven);

        if (thankYouTimerRef.current) clearTimeout(thankYouTimerRef.current);
        thankYouTimerRef.current = setTimeout(() => {
          setIsThankYouActive(false);
        }, 10000);
      } else if (state.cart && state.cart.length > 0) {
        // If cashier starts scanning new items for next customer, clear thank you and pass immediately
        if (thankYouTimerRef.current) clearTimeout(thankYouTimerRef.current);
        setIsThankYouActive(false);
      }

      // If cashier dismissed the pass (showDigitalPass = false), ensure display updates
      setDisplayState(state);
      if (state.theme && settings) {
        setSettings(prev => prev ? { ...prev, customerScreenTheme: state.theme! } : prev);
      }
    });

    const timer = setInterval(loadSettings, 5000);
    return () => {
      clearInterval(timer);
      if (thankYouTimerRef.current) clearTimeout(thankYouTimerRef.current);
    };
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

  // Dynamic PromptPay QR Payload (Generated only when in checkout step)
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
              style={{
                mixBlendMode: !isLight ? 'screen' : 'normal'
              }}
              className="max-h-14 max-w-[130px] w-auto h-auto object-contain select-none"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center font-black text-xl shadow-xl border border-amber-400/40 text-slate-950">
              KC
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
        {isThankYouActive ? (
          <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>ชำระเงินเรียบร้อยแล้ว</span>
          </div>
        ) : displayState.isCheckoutStep ? (
          <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg">
            <QrCode className="w-5 h-5 text-amber-400 animate-pulse" />
            <span>พร้อมชำระเงิน (PromptPay)</span>
          </div>
        ) : (
          <div className="text-right">
            <span className="text-[11px] opacity-70">หน้าจอแสดงผลสด: </span>
            <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              พร้อมบริการ
            </span>
          </div>
        )}
      </div>

      {/* 0. SHOW DIGITAL WISDOM PASS FOR SCANNING */}
      {displayState.showDigitalPass && displayState.memberPassData && !isThankYouActive && (
        <div className="my-auto py-6 max-w-lg mx-auto w-full animate-in zoom-in-95 duration-300">
          <div className="text-center mb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              สมาชิก KORAT CAT BOUTIQUE PRIVILEGE
            </span>
            <h2 className="text-2xl font-black text-white mt-2">
              บัตรสะสมแต้มดิจิทัล (Digital Wisdom Pass)
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              เปิดกล้องมือถือสแกน QR Code หรือถ่ายรูปเก็บบัตรนี้ไว้ เพื่อใช้สะสมแต้มในครั้งถัดไป
            </p>
          </div>

          {(() => {
            const tierStr = displayState.memberPassData.tier || '';
            const isBW = tierStr.includes('BLACK');
            const isG = tierStr.includes('GOLD');
            const cardStyle = isBW
              ? 'bg-gradient-to-br from-neutral-950 via-zinc-900 to-black border-2 border-amber-400 text-white'
              : isG
              ? 'bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#713f12] border-2 border-amber-300 text-amber-100'
              : 'bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#475569] border-2 border-slate-300 text-slate-100';
            const badgeStyle = isBW
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950'
              : isG
              ? 'bg-amber-100 text-amber-950'
              : 'bg-slate-100 text-slate-900';

            return (
              <div className={`rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden aspect-[85.6/53.98] max-w-xl mx-auto w-full ${cardStyle}`}>
                <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center space-x-2.5">
                    {settings?.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Store Logo"
                        className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-white/20 p-1 shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center font-black text-slate-950 text-sm shadow">
                        KC
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-xs uppercase text-white tracking-wider">
                        {settings?.storeName || 'KORAT CAT BOUTIQUE'}
                      </h4>
                      <p className="text-[10px] text-white/70">เรือนโคราชเฉลิมวัฒนา</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap shadow-md tracking-wider ${badgeStyle}`}>
                      {displayState.memberPassData.tier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between my-4 relative z-10">
                  <div>
                    <p className="text-[10px] text-white/70 uppercase tracking-widest font-mono">MEMBER NAME</p>
                    <h3 className="text-lg font-bold text-white tracking-wide mt-0.5">{displayState.memberPassData.name}</h3>
                    <p className="text-xs font-mono text-white/80 mt-0.5">โทร: {displayState.memberPassData.phone}</p>
                    
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/30 border border-white/20">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs font-mono font-bold text-amber-200">
                        แต้มสะสม: {displayState.memberPassData.points} pt
                      </span>
                    </div>
                  </div>

                  {displayState.memberPassData.qrDataUrl && (
                    <div className="bg-white p-2 rounded-2xl shadow-xl border border-white/40 flex flex-col items-center">
                      <img src={displayState.memberPassData.qrDataUrl} alt="Member QR" className="w-20 h-20" />
                      <span className="text-[8px] font-mono text-slate-900 font-bold mt-1">สแกนเก็บเข้ามือถือ</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-col items-center relative z-10">
                  {displayState.memberPassData.barcodeDataUrl && (
                    <img 
                      src={displayState.memberPassData.barcodeDataUrl} 
                      alt={displayState.memberPassData.memberCode} 
                      className="max-h-9 invert brightness-200 opacity-90"
                    />
                  )}
                  <div className="flex justify-between w-full text-[10px] font-mono text-white/80 mt-1">
                    <span>PASS ID: {displayState.memberPassData.memberCode}</span>
                    <span>KORAT CAT PRIVILEGE</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 1. THANK YOU POPUP / OVERLAY (Stays for 10s after payment) */}
      {!displayState.showDigitalPass && isThankYouActive && (
        <div className="my-auto py-8 text-center animate-in zoom-in-95 duration-300 max-w-2xl mx-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white mx-auto mb-4 shadow-2xl border-4 border-amber-300">
            <HeartHandshake className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black mb-3 text-amber-400">
            {settings?.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
          </h2>
          <p className={`text-base ${subTextColor} max-w-lg mx-auto leading-relaxed`}>
            ขอบคุณที่สนับสนุนงานหัตถศิลป์ ผ้าไหม และแฟชั่นอัตลักษณ์เมืองโคราช
            ติดตามคอลเลกชันใหม่และกิจกรรม Workshop ได้เสมอ
          </p>

          {/* Cash Change Given Card */}
          {thankYouChange !== undefined && thankYouChange > 0 && (
            <div className="mt-6 p-4 max-w-xs mx-auto bg-emerald-500/20 border-2 border-emerald-500/40 rounded-2xl shadow-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">เงินทอนของคุณ</span>
              <div className="text-4xl font-black font-mono text-emerald-400 mt-1">
                ฿{thankYouChange.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN VIEW: CART ITEMS (LEFT) & STATUS / QR (RIGHT) */}
      {!displayState.showDigitalPass && !isThankYouActive && (
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
                /* Welcome Graphic & Text (Pure transparent image with no frame) */
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  {settings?.welcomeImageUrl && !welcomeImgError ? (
                    <img
                      src={settings.welcomeImageUrl}
                      alt="Welcome"
                      onError={() => setWelcomeImgError(true)}
                      style={{
                        mixBlendMode: !isLight ? 'screen' : 'normal'
                      }}
                      className="max-h-56 max-w-sm w-auto h-auto object-contain mb-4 select-none drop-shadow-md"
                    />
                  ) : settings?.logoUrl && !logoError ? (
                    <img
                      src={settings.logoUrl}
                      alt="Store Logo"
                      onError={() => setLogoError(true)}
                      style={{
                        mixBlendMode: !isLight ? 'screen' : 'normal'
                      }}
                      className="max-h-36 max-w-xs w-auto h-auto object-contain mb-4 select-none drop-shadow-md"
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
                        <div className="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-6 h-6 text-slate-400" />
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

                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-extrabold font-mono">
                        ฿{(item.unitPrice * item.qty).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upsell banner */}
            {displayState.upsellPrompts.length > 0 && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-amber-300 font-medium truncate">{displayState.upsellPrompts[0]}</span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PRICE TOTALS & DYNAMIC CHECKOUT QR CODE (5 cols) */}
          <div className={`col-span-12 lg:col-span-5 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between shadow-2xl ${themeStyles.cardBg}`}>
            {/* Price Breakdown */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <span className={`text-xs uppercase font-bold tracking-widest ${subTextColor}`}>
                  สรุปยอดชำระ
                </span>
                <span className={`text-[10px] font-mono font-bold ${themeStyles.accentText}`}>OFFICIAL TERMINAL</span>
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

                {(displayState.memberDiscount || 0) > 0 && (
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>ส่วนลดบัตรสมาชิก ({displayState.memberTier === 'BLACK_WISDOM' ? `${settings?.blackWisdomDiscountPercent ?? 10}%` : `${settings?.goldDiscountPercent ?? 5}%`}):</span>
                    <span className="font-mono">-฿{displayState.memberDiscount!.toLocaleString()}</span>
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

            {/* DYNAMIC MIDDLE CONTENT: 
                - If still scanning: Show item check badge (NO QR code yet)
                - When cashier clicks checkout: Pop up large PromptPay QR code
            */}
            {displayState.cart.length > 0 && displayState.isCheckoutStep ? (
              /* PROMPTPAY QR CODE (Appears only when cashier clicks "ชำระเงิน") */
              <div className="my-2 p-4 bg-white rounded-3xl text-slate-900 flex flex-col items-center justify-center text-center shadow-2xl border-4 border-amber-400 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs">
                    PP
                  </div>
                  <span className="text-xs font-black text-slate-900 tracking-wider uppercase">
                    Thai PromptPay QR
                  </span>
                </div>

                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="PromptPay QR Code"
                    className="w-52 h-52 object-contain rounded-xl border border-slate-200 shadow-inner"
                  />
                ) : (
                  <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
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
            ) : displayState.cart.length > 0 ? (
              /* SCANNING IN PROGRESS BADGE (Customer checks items comfortably) */
              <div className="my-auto p-5 text-center space-y-2.5 bg-slate-800/40 rounded-3xl border border-slate-700/50">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Eye className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100">
                    กำลังสแกนรายการสินค้า
                  </h3>
                  <p className={`text-xs ${subTextColor} mt-1 max-w-xs mx-auto leading-relaxed`}>
                    โปรดตรวจเช็ครายการและจำนวนสินค้าทางด้านซ้าย<br />
                    QR Code จะปรากฏเมื่อพนักงานกดชำระเงิน
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <QrCode className="w-16 h-16 mx-auto opacity-30 mb-2" />
                <p className="text-xs">หน้าจอพร้อมบริการ</p>
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
