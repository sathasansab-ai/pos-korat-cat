// src/components/DigitalPassModal.tsx
import React, { useRef } from 'react';
import { X, Download, Share2, Sparkles, QrCode, Monitor, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Customer, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { DualMonitorSync } from '../services/dualMonitorSync';

interface DigitalPassModalProps {
  isOpen: boolean;
  customer: Customer | null;
  settings?: StoreSettings | null;
  onClose: () => void;
  onSentToDisplay?: () => void;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({
  isOpen,
  customer,
  settings,
  onClose,
  onSentToDisplay
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [broadcasted, setBroadcasted] = React.useState(false);

  if (!isOpen || !customer) return null;

  const memberCode = customer.memberCode || `KCAT-${customer.phone.slice(-4)}`;
  const tier = customer.tier || 'BLACK_WISDOM';
  
  const goldDiscountPct = settings?.goldDiscountPercent ?? 5;
  const blackWisdomDiscountPct = settings?.blackWisdomDiscountPercent ?? 10;
  const goldPts = settings?.goldPointsThreshold ?? 50;
  const goldSpend = settings?.goldSpentThreshold ?? 5000;
  const bwPts = settings?.blackWisdomPointsThreshold ?? 150;
  const bwSpend = settings?.blackWisdomSpentThreshold ?? 15000;
  const goldPriv = settings?.goldPrivilegeText || `สิทธิพิเศษ: ส่วนลด ${goldDiscountPct}% อัตโนมัติทุกยอดซื้อ + รับแต้มสะสมพิเศษ`;
  const bwPriv = settings?.blackWisdomPrivilegeText || `สิทธิพิเศษ: ส่วนลด ${blackWisdomDiscountPct}% อัตโนมัติทุกยอดซื้อ + เข้าร่วม Workshop ฟรี`;

  const tierConfig = {
    BLACK_WISDOM: {
      name: 'BLACK WISDOM ELITE',
      levelLabel: 'ระดับสูงสุด (VIP)',
      bg: 'bg-gradient-to-br from-neutral-950 via-zinc-900 to-black',
      border: 'border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)]',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black border-amber-300 shadow-md',
      accentColor: 'text-amber-400',
      shimmer: 'bg-amber-400/20',
      criteria: `เกณฑ์อัปเกรด: ยอดซื้อสะสมครบ ฿${bwSpend.toLocaleString()} หรือ ${bwPts} แต้ม`,
      privilege: bwPriv
    },
    GOLD: {
      name: 'GOLD HERITAGE',
      levelLabel: 'ระดับทอง (Gold)',
      bg: 'bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#713f12]',
      border: 'border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.35)]',
      badgeBg: 'bg-amber-100 text-amber-950 font-black border-amber-300 shadow-md',
      accentColor: 'text-amber-200',
      shimmer: 'bg-amber-300/25',
      criteria: `เกณฑ์อัปเกรด: ยอดซื้อสะสมครบ ฿${goldSpend.toLocaleString()} หรือ ${goldPts} แต้ม`,
      privilege: goldPriv
    },
    SILVER: {
      name: 'SILVER PRIVILEGE',
      levelLabel: 'ระดับเงิน (Silver)',
      bg: 'bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#475569]',
      border: 'border-2 border-slate-300 shadow-[0_0_25px_rgba(203,213,225,0.25)]',
      badgeBg: 'bg-slate-100 text-slate-900 font-black border-slate-300 shadow-md',
      accentColor: 'text-slate-200',
      shimmer: 'bg-slate-200/20',
      criteria: 'เกณฑ์อัปเกรด: สมาชิกแรกเข้า (สะสมแต้ม 100 บาท = 1 แต้ม)',
      privilege: `สิทธิพิเศษ: สะสมแต้ม 100 บ. = 1 แต้ม (ครบ ${goldPts} แต้มอัปเป็น GOLD ${goldDiscountPct}%)`
    }
  }[tier] || {
    name: 'BLACK WISDOM ELITE',
    levelLabel: 'ระดับสูงสุด (VIP)',
    bg: 'bg-gradient-to-br from-neutral-950 via-zinc-900 to-black',
    border: 'border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)]',
    badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black border-amber-300 shadow-md',
    accentColor: 'text-amber-400',
    shimmer: 'bg-amber-400/20',
    criteria: `เกณฑ์อัปเกรด: ยอดซื้อสะสมครบ ฿${bwSpend.toLocaleString()} หรือ ${bwPts} แต้ม`,
    privilege: bwPriv
  };

  const tierName = tierConfig.name;

  // Barcode & QR Data URLs
  const barcodeUrl = BarcodeGenerator.generateDataUrl(memberCode, { height: 36, showText: true });
  // Dynamic QR: encoded with JSON or Direct Code for cashier scanning
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(memberCode)}&format=svg`;

  // Send to Customer Monitor (/display)
  const handleSendToCustomerScreen = () => {
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      showDigitalPass: true,
      memberPassData: {
        name: customer.name,
        phone: customer.phone,
        memberCode,
        tier: tierName,
        points: customer.rewardPoints || 0,
        qrDataUrl: qrUrl,
        barcodeDataUrl: barcodeUrl
      }
    });

    setBroadcasted(true);
    setTimeout(() => setBroadcasted(false), 3000);
    if (onSentToDisplay) onSentToDisplay();
  };

  const handleClose = () => {
    // Dismiss Digital Pass on Customer Monitor as well
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      showDigitalPass: false,
      memberPassData: undefined
    });
    onClose();
  };

  // Download Card as HTML / Image preview for Customer
  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">บัตรดิจิทัลสมาชิก (Digital Wisdom Pass)</h3>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-4">
          {/* THE LUXURY WISDOM PASS CARD (Standard Credit Card Ratio 85.6mm x 53.98mm) */}
          <div 
            ref={cardRef}
            className={`relative rounded-3xl p-5 overflow-hidden shadow-2xl ${tierConfig.border} ${tierConfig.bg} text-amber-100 flex flex-col justify-between aspect-[85.6/53.98] max-w-sm mx-auto w-full`}
          >
            {/* Shimmer Effect Background */}
            <div className={`absolute -right-12 -top-12 w-44 h-44 ${tierConfig.shimmer} rounded-full blur-2xl pointer-events-none`} />
            <div className={`absolute -left-12 -bottom-12 w-44 h-44 ${tierConfig.shimmer} rounded-full blur-2xl pointer-events-none`} />

            {/* Top Brand Header */}
            <div className="flex items-center justify-between relative z-10 gap-2 pb-2.5 border-b border-white/10">
              <div className="flex items-center space-x-2 min-w-0">
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Store Logo"
                    className="w-9 h-9 rounded-xl object-contain bg-slate-900/80 border border-white/20 p-1 shadow-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-700 flex items-center justify-center font-black text-slate-950 text-xs shadow-md border border-amber-300 flex-shrink-0">
                    KC
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-black text-xs tracking-wider uppercase text-white truncate">
                    {settings?.storeName || 'KORAT CAT BOUTIQUE'}
                  </h4>
                  <p className="text-[9px] text-white/70 tracking-tight truncate">
                    {settings?.subTitle || 'เรือนโคราชเฉลิมวัฒนา'}
                  </p>
                </div>
              </div>

              {/* Bold, prominent luxury tier badge that NEVER wraps */}
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md whitespace-nowrap ${tierConfig.badgeBg}`}>
                  {tierConfig.name}
                </span>
              </div>
            </div>

            {/* Middle: Member Details & QR */}
            <div className="flex items-center justify-between my-2 relative z-10 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-white/60 uppercase tracking-widest font-mono">MEMBER NAME</p>
                <h3 className="text-base font-extrabold text-white tracking-wide truncate">{customer.name}</h3>
                <p className="text-[11px] font-mono text-white/80">โทร: {customer.phone}</p>
                
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/30 border border-white/20">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span className="text-[11px] font-mono font-bold text-amber-200">
                    แต้มสะสม: {customer.rewardPoints || 0} pt
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white p-1 rounded-xl shadow-lg border border-white/40 flex flex-col items-center flex-shrink-0">
                <img src={qrUrl} alt="Member QR" className="w-14 h-14" />
                <span className="text-[7.5px] font-mono text-slate-800 font-bold mt-0.5">SCAN PASS</span>
              </div>
            </div>

            {/* Bottom: Barcode & Member Code */}
            <div className="pt-2 border-t border-white/10 flex flex-col items-center relative z-10">
              <img src={barcodeUrl} alt={memberCode} className="max-h-8 invert brightness-200 opacity-90" />
              <div className="flex justify-between w-full text-[8.5px] font-mono text-white/80 mt-0.5">
                <span>PASS ID: {memberCode}</span>
                <span>{tierConfig.levelLabel}</span>
              </div>
            </div>
          </div>

          {/* Tier Criteria & Privilege Explanation Box */}
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs space-y-1">
            <div className="text-amber-300 font-bold text-[11px] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{tierConfig.privilege}</span>
            </div>
            <div className="text-slate-400 text-[10px]">
              {tierConfig.criteria} (หรือแอดมินสามารถอัปเกรดระดับได้ทันทีในหน้าสมาชิก)
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            ส่งไปยังหน้าจอลูกค้า เพื่อให้ลูกค้าใช้มือถือเปิดกล้องสแกน หรือถ่ายรูปเก็บบัตร Digital Pass นี้ไว้สแกนในครั้งถัดไป
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={handleSendToCustomerScreen}
            className={`flex-1 py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition ${
              broadcasted 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950'
            }`}
          >
            {broadcasted ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ส่งขึ้นหน้าจอลูกค้าสำเร็จ!</span>
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 text-slate-950" />
                <span>กดส่งขึ้นจอฝั่งลูกค้าให้สแกน</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            title="พิมพ์หรือเซฟเป็น PDF"
          >
            <Download className="w-4 h-4" />
            <span>พิมพ์บัตร</span>
          </button>
        </div>
      </div>
    </div>
  );
};
