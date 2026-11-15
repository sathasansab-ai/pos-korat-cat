// src/pages/MobilePassPage.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Download, CheckCircle2, ShieldCheck, Award, QrCode } from 'lucide-react';
import { BarcodeGenerator } from '../services/barcodeGenerator';

export const MobilePassPage: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Read member data from URL Query Parameters
  const params = new URLSearchParams(window.location.search);
  const memberCode = params.get('code') || 'KCAT-VIP-0001';
  const name = params.get('name') || 'ลูกค้าคนสำคัญ (VIP Customer)';
  const phone = params.get('phone') || '';
  const tier = params.get('tier') || 'BLACK_WISDOM';
  const points = parseInt(params.get('pts') || '0', 10);

  const barcodeUrl = BarcodeGenerator.generateDataUrl(memberCode, { height: 40, showText: true });

  const tierConfig: Record<string, {
    title: string;
    sub: string;
    gradient: string;
    border: string;
    badge: string;
    textColor: string;
    privilege: string;
    discountPct: string;
  }> = {
    BLACK_WISDOM: {
      title: 'BLACK WISDOM ELITE',
      sub: 'บัตรสมาชิกเอกสิทธิ์สูงสุด (VIP)',
      gradient: 'from-neutral-950 via-zinc-900 to-black',
      border: 'border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)]',
      badge: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black',
      textColor: 'text-amber-400',
      privilege: 'สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี',
      discountPct: '10%'
    },
    GOLD: {
      title: 'GOLD HERITAGE',
      sub: 'บัตรสมาชิกระดับทอง (Gold)',
      gradient: 'from-[#78350f] via-[#b45309] to-[#713f12]',
      border: 'border-2 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.35)]',
      badge: 'bg-amber-100 text-amber-950 font-black',
      textColor: 'text-amber-200',
      privilege: 'สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ',
      discountPct: '5%'
    },
    SILVER: {
      title: 'SILVER PRIVILEGE',
      sub: 'บัตรสมาชิกทั่วไป (Silver)',
      gradient: 'from-[#1e293b] via-[#334155] to-[#475569]',
      border: 'border-2 border-slate-300 shadow-[0_0_25px_rgba(203,213,225,0.25)]',
      badge: 'bg-slate-100 text-slate-900 font-black',
      textColor: 'text-slate-200',
      privilege: 'สิทธิพิเศษ: สะสมแต้ม 100 บาท = 1 แต้ม สำหรับอัปเกรดระดับบัตร',
      discountPct: 'สะสมแต้ม'
    }
  };

  const currentTier = tierConfig[tier] || tierConfig.BLACK_WISDOM;

  // Handle Save Image to Mobile Gallery via Canvas
  const handleSaveToPhotos = async () => {
    try {
      const cardEl = cardRef.current;
      if (!cardEl) return;

      // Draw onto a canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // High-res retina
      const width = 640;
      const height = 400;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (tier === 'GOLD') {
        grad.addColorStop(0, '#78350f');
        grad.addColorStop(0.5, '#b45309');
        grad.addColorStop(1, '#713f12');
      } else if (tier === 'SILVER') {
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#475569');
      } else {
        grad.addColorStop(0, '#0a0a0a');
        grad.addColorStop(0.5, '#18181b');
        grad.addColorStop(1, '#000000');
      }

      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        const c = ctx as any;
        if (typeof c.roundRect === 'function') {
          c.beginPath();
          c.roundRect(x, y, w, h, r);
        } else {
          c.beginPath();
          c.rect(x, y, w, h);
        }
      };

      ctx.fillStyle = grad;
      drawRoundedRect(0, 0, width, height, 24);
      ctx.fill();

      // Gold Border
      ctx.strokeStyle = tier === 'SILVER' ? '#cbd5e1' : '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Header Texts
      ctx.fillStyle = tier === 'SILVER' ? '#e2e8f0' : '#fbbf24';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('KORAT CAT x เรือนโคราชเฉลิมวัฒนา', 30, 48);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText('DIGITAL WISDOM PASS', 30, 72);

      // Tier Badge
      ctx.fillStyle = tier === 'SILVER' ? '#f1f5f9' : '#fef08a';
      drawRoundedRect(width - 180, 26, 150, 36, 12);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentTier.title.split(' ')[0], width - 105, 50);
      ctx.textAlign = 'left';

      // Member Name & Phone
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(name, 30, 150);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px sans-serif';
      ctx.fillText(`โทร: ${phone || '-'}`, 30, 180);

      // Points & Privilege
      ctx.fillStyle = tier === 'SILVER' ? '#94a3b8' : '#fde68a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`แต้มสะสม: ${points} แต้ม  •  ส่วนลด: ${currentTier.discountPct}`, 30, 220);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(currentTier.privilege, 30, 246);

      // Draw Barcode Image
      const barcodeImg = new Image();
      barcodeImg.crossOrigin = 'anonymous';
      barcodeImg.onload = () => {
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(30, 275, width - 60, 95, 12);
        ctx.fill();

        ctx.drawImage(barcodeImg, 50, 285, width - 100, 75);

        // Convert to downloadable data URL
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `KoratCat_MemberPass_${memberCode}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      };
      barcodeImg.src = barcodeUrl;
    } catch (e) {
      alert('กรุณาแคปหน้าจอ (Screenshot) บัตรนี้เก็บไว้ในมือถือเพื่อใช้เป็นหลักฐานได้ทันทีครับ');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 py-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>บัตรสมาชิกดิจิทัลทรงคุณค่า</span>
          </div>
          <h1 className="text-xl font-black text-white">KORAT CAT x เรือนโคราช</h1>
          <p className="text-xs text-slate-400">ผสานอัตลักษณ์ศิลปวัฒนธรรมโคราชและแฟชั่นหรู</p>
        </div>

        {/* Digital Member Card */}
        <div
          ref={cardRef}
          className={`relative rounded-3xl p-6 bg-gradient-to-br ${currentTier.gradient} ${currentTier.border} overflow-hidden`}
        >
          {/* Card Top Row */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400">HERITAGE PASS</span>
              <h2 className="text-lg font-black tracking-wide text-white">KORAT CAT</h2>
              <p className="text-[11px] text-amber-300">เรือนโคราชเฉลิมวัฒนา</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs ${currentTier.badge}`}>
              {currentTier.title}
            </span>
          </div>

          {/* Member Details */}
          <div className="mt-8 space-y-1">
            <p className="text-xs text-slate-400">ชื่อสมาชิก</p>
            <h3 className="text-xl font-extrabold text-white">{name}</h3>
            {phone && <p className="text-xs font-mono text-slate-300">โทร: {phone}</p>}
          </div>

          {/* Points & Privilege */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">แต้มสะสม</span>
              <span className="text-base font-black text-amber-400 font-mono">{points} แต้ม</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">สิทธิประโยชน์</span>
              <span className="font-bold text-emerald-400">{currentTier.discountPct}</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-300 bg-black/40 p-2.5 rounded-xl border border-white/5">
            {currentTier.privilege}
          </div>

          {/* Barcode for In-Store Scanning */}
          <div className="mt-5 bg-white p-3 rounded-2xl flex flex-col items-center justify-center">
            <img src={barcodeUrl} alt="Member Barcode" className="h-12 max-w-full object-contain" />
            <span className="text-[11px] font-mono font-bold text-slate-800 mt-1">{memberCode}</span>
          </div>

        </div>

        {/* Action Button: Save Image directly to Mobile Photo Gallery */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSaveToPhotos}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>📥 บันทึกภาพบัตรสมาชิกลงในมือถือ (Save to Photos)</span>
          </button>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>บันทึกภาพบัตรสมาชิกลงเครื่องเรียบร้อยแล้วครับ!</span>
            </div>
          )}

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> วิธีการใช้งานบัตร:
            </p>
            <p>1. กดปุ่มบันทึกภาพด้านบน หรือ <b>แคปภาพหน้าจอ (Screenshot)</b> หน้านี้เก็บไว้ในอัลบั้มภาพมือถือ</p>
            <p>2. เมื่อมาช้อปปิ้งที่ร้าน เพียงเปิดภาพนี้ให้พนักงาน <b>ยิงบาร์โค้ด</b> เพื่อรับส่วนลดพิเศษทันที</p>
          </div>
        </div>

      </div>
    </div>
  );
};
export default MobilePassPage;
