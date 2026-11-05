// src/pages/CustomerFacingPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  QrCode, 
  Banknote, 
  ShieldCheck, 
  HeartHandshake, 
  Eye, 
  Tag,
  ChevronLeft,
  ChevronRight,
  Award,
  Scissors,
  Layers,
  Star,
  Image as ImageIcon
} from 'lucide-react';
import { DualMonitorSync, type CustomerDisplayState } from '../services/dualMonitorSync';
import { db } from '../db';
import type { StoreSettings, CustomerScreenTheme } from '../types';
import { PromptPayService } from '../services/promptPay';
import { CloudSync } from '../services/cloudSync';

export const CustomerFacingPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [welcomeImgError, setWelcomeImgError] = useState(false);

  // Screensaver / Promotional Slideshow state
  const [activeSlide, setActiveSlide] = useState(0);

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

  const loadSettings = async () => {
    // 1. ดึงข้อมูลจาก Local IndexedDB
    const local = await db.settings.get('current_store_settings');
    if (local) {
      setSettings(local);
      setWelcomeImgError(false);
      setLogoError(false);
    }
    // 2. ถ้าต่อเน็ตอยู่ ดึงข้อมูลล่าสุดจาก Supabase Cloud (สำหรับกรณีจอที่ 2 เปิดบนเครื่องอื่น เช่น แท็บเล็ต)
    if (navigator.onLine) {
      const cloud = await CloudSync.pullStoreSettings();
      if (cloud) {
        setSettings(cloud);
        setWelcomeImgError(false);
        setLogoError(false);
      }
    }
  };

  // Badge color mapping
  const badgeClasses: Record<string, string> = {
    AMBER: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    EMERALD: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    SKY: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    PURPLE: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    ROSE: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  };

  // Promotional Slides Content (ดึงจาก Settings หรือใช้ค่าเริ่มต้นอัตลักษณ์โคราช)
  const defaultPromoSlides = [
    {
      id: 'heritage',
      tag: 'HERITAGE BOUTIQUE • ผสานอัตลักษณ์เมืองโคราช',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
      subtitle: settings?.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา และแฟชั่นอัตลักษณ์แมวสีสวาด',
      description: 'งานหัตถศิลป์ทรงคุณค่า เอกลักษณ์เมืองนครราชสีมา เสื้อยืดพรีเมียมลิมิเต็ด ลายฉลุทองคำประณีต สกรีน DTF & Flex นูนเมทัลลิกชั้นสูง',
      highlights: [
        '✨ สกรีน DTF สีสวาดทองคำ ลิขสิทธิ์แท้',
        '🏛️ มนต์เสน่ห์ศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา',
        '🧵 เส้นใย Premium Comb Cotton 100% สวมใส่สบาย'
      ],
      imageUrl: undefined as string | undefined,
      icon: <Sparkles className="w-8 h-8 text-amber-400" />
    },
    {
      id: 'mix_match',
      tag: 'SPECIAL PRIVILEGE • เซ็ตสุดคุ้ม',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'โปรโมชั่นพิเศษ "Mix & Match 3 ชิ้น ฿1,000"',
      subtitle: 'จับคู่ความคุ้มค่า ซื้อเสื้อยืดหรือของที่ระลึก 3 ชิ้น ประหยัดทันที 170 บาท',
      description: 'สามารถเลือกคละสี คละไซส์ (S, M, L, XL, 2XL) และคละลายพิมพ์ฉลุได้ตามใจชอบ ระบบจะคำนวณราคาโปรโมชั่นให้อัตโนมัติที่หน้าเคาน์เตอร์',
      highlights: [
        '🏷️ คละสี คละไซส์ คละลายพิมพ์ได้อิสระ',
        '⚡ ระบบคำนวณส่วนลดให้อัตโนมัติบนหน้าจอ',
        '🎁 เหมาะสำหรับเป็นของขวัญและของฝากพรีเมียม'
      ],
      imageUrl: undefined as string | undefined,
      icon: <Award className="w-8 h-8 text-emerald-400" />
    },
    {
      id: 'digital_pass',
      tag: 'VIP MEMBERSHIP • สมัครฟรีที่เคาน์เตอร์',
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      title: 'Digital Wisdom Pass สมาชิกทรงเกียรติ',
      subtitle: 'สมัครสมาชิกฟรีเพียงแจ้งเบอร์โทรศัพท์ รับส่วนลด 5% - 10% ทุกยอดซื้อ',
      description: 'ยกระดับประสบการณ์ช้อปปิ้งสู่ระดับ Luxury บัตรสมาชิกดิจิทัล SILVER, GOLD และ BLACK WISDOM สแกน QR บัตรเก็บไว้ในสมาร์ทโฟนได้ทันที',
      highlights: [
        '💎 บัตรสมาชิกดิจิทัลหรูหรา สแกน QR เก็บเข้ามือถือได้',
        '🎁 รับส่วนลด 5% สำหรับ GOLD และ 10% สำหรับ BLACK WISDOM',
        '🎨 สิทธิ์เข้าร่วมกิจกรรม Workshop หัตถศิลป์เรือนโคราชฟรี'
      ],
      imageUrl: undefined as string | undefined,
      icon: <Star className="w-8 h-8 text-sky-400" />
    },
    {
      id: 'custom_made',
      tag: 'HAUTE COUTURE SERVICES • งานสั่งตัด',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      title: 'บริการสั่งตัดเย็บ & สกรีนสั่งผลิตพิเศษ',
      subtitle: 'รับทำเสื้อทีม ลายปักประณีต และของที่ระลึกองค์กร วางมัดจำเพียง 50%',
      description: 'สร้างสรรค์ชิ้นงานเฉพาะบุคคลโดยกลุ่มวิสาหกิจชุมชนหัตถศิลป์โคราช พร้อมออกใบสั่งผลิตดิจิทัลและนัดรับสินค้าได้ที่หน้าร้าน',
      highlights: [
        '✂️ งานปักตราสัญลักษณ์ และงานสกรีนตามแบบเฉพาะคุณ',
        '📜 ใบสั่งผลิตและใบรับมัดจำดิจิทัลพร้อมกำหนดวันนัดรับ',
        '🏪 นัดรับสินค้าได้ที่หน้าร้านเรือนโคราช หรือจัดส่งถึงบ้าน'
      ],
      imageUrl: undefined as string | undefined,
      icon: <Scissors className="w-8 h-8 text-purple-400" />
    }
  ];

  const promoSlides = (settings?.customSlides && settings.customSlides.length > 0)
    ? settings.customSlides.map(cs => ({
        id: cs.id,
        tag: cs.tag,
        badgeClass: badgeClasses[cs.badgeColor || 'AMBER'] || badgeClasses.AMBER,
        title: cs.title,
        subtitle: cs.subtitle,
        description: cs.description,
        highlights: [cs.highlight1, cs.highlight2, cs.highlight3].filter(Boolean) as string[],
        imageUrl: cs.imageUrl,
        layoutMode: cs.layoutMode || 'SPLIT',
        icon: <Sparkles className="w-8 h-8 text-amber-400" />
      }))
    : defaultPromoSlides.map(ds => ({ ...ds, layoutMode: 'SPLIT' as 'SPLIT' | 'FULL_IMAGE' }));

  // Auto-advance screensaver slides every 5.5s when cart is empty
  useEffect(() => {
    if (displayState.cart.length > 0 || displayState.showDigitalPass || isThankYouActive) return;

    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % promoSlides.length);
    }, 5500);

    return () => clearInterval(slideTimer);
  }, [displayState.cart.length, displayState.showDigitalPass, isThankYouActive, promoSlides.length]);

  useEffect(() => {
    loadSettings();

    DualMonitorSync.onUpdate((state) => {
      // 0. If new store settings or slide images arrive, update instantly!
      if (state.fullSettings) {
        setSettings(state.fullSettings);
        setWelcomeImgError(false);
        setLogoError(false);
      }

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

    const handleStorageChange = () => {
      loadSettings();
    };
    window.addEventListener('storage', handleStorageChange);

    const timer = setInterval(loadSettings, 4000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
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

      {/* 2. MAIN VIEW: IDLE SCREENSAVER vs ACTIVE CART CHECKOUT */}
      {!displayState.showDigitalPass && !isThankYouActive && (
        displayState.cart.length === 0 ? (
          /* CINEMA-GRADE LUXURY SCREENSAVER & PROMOTIONAL SLIDESHOW */
          <div className="my-auto py-4 w-full max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className={`relative rounded-3xl p-8 sm:p-12 border shadow-2xl backdrop-blur-md overflow-hidden ${themeStyles.cardBg}`}>
              {/* Ambient Glow in background */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Slide Content */}
              <div className="relative z-10 min-h-[380px]">
                {(() => {
                  const curSlide = promoSlides[activeSlide] || promoSlides[0];
                  if (!curSlide) return null;

                  if (curSlide.layoutMode === 'FULL_IMAGE') {
                    /* MODE 2: แบบที่ 2 - ภาพสไลด์โปสเตอร์อย่างเดียว เต็มกรอบ 100% */
                    const posterImg = curSlide.imageUrl || settings?.welcomeImageUrl || settings?.logoUrl;
                    return (
                      <div className="w-full flex flex-col items-center justify-center min-h-[380px] sm:min-h-[440px]">
                        {posterImg ? (
                          <div className="w-full h-[380px] sm:h-[460px] rounded-2xl overflow-hidden flex items-center justify-center bg-black/40 border border-amber-500/30 shadow-2xl relative group">
                            <img
                              src={posterImg}
                              alt={curSlide.title || 'Poster'}
                              className="w-full h-full object-contain drop-shadow-2xl"
                            />
                            {/* Subtle Tag Overlay in top-left */}
                            {curSlide.tag && (
                              <div className="absolute top-4 left-4 px-3.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-full text-[11px] font-mono font-bold text-amber-300 border border-amber-500/40 shadow-lg">
                                {curSlide.tag}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-[360px] sm:h-[420px] rounded-2xl border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40">
                            <ImageIcon className="w-16 h-16 text-amber-400/60 mb-3" />
                            <h3 className="font-bold text-lg text-white">โหมดภาพสไลด์เต็มกรอบ (Full Poster Mode)</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              สไลด์นี้ถูกตั้งค่าเป็นแบบ "ภาพเต็มกรอบ" แต่ยังไม่ได้อัปโหลดภาพ<br />
                              กรุณาไปที่เมนู <b>ตั้งค่า &gt; จอภาพฝั่งลูกค้า</b> เพื่ออัปโหลดไฟล์ภาพโปสเตอร์
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  /* MODE 1: แบบที่ 1 - แบบปัจจุบัน (ข้อความ + กรอบภาพด้านซ้าย) */
                  return (
                    <div className="flex flex-col md:flex-row items-center gap-8 min-h-[380px]">
                      {/* Visual Art / Logo Container */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center">
                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border-2 border-amber-400/40 p-4 flex items-center justify-center shadow-2xl relative group">
                          {curSlide.imageUrl ? (
                            <img
                              src={curSlide.imageUrl}
                              alt="Slide Poster"
                              className="max-h-full max-w-full object-contain drop-shadow-xl rounded-2xl"
                            />
                          ) : settings?.welcomeImageUrl && !welcomeImgError ? (
                            <img
                              src={settings.welcomeImageUrl}
                              alt="Welcome"
                              onError={() => setWelcomeImgError(true)}
                              className="max-h-full max-w-full object-contain drop-shadow-xl"
                            />
                          ) : settings?.logoUrl && !logoError ? (
                            <img
                              src={settings.logoUrl}
                              alt="Logo"
                              onError={() => setLogoError(true)}
                              className="max-h-full max-w-full object-contain drop-shadow-xl"
                            />
                          ) : (
                            <div className="text-amber-400">
                              {curSlide.icon}
                            </div>
                          )}
                          <div className="absolute -bottom-3 px-3 py-1 bg-slate-900 border border-amber-400/50 rounded-full text-[10px] font-mono font-bold text-amber-300 shadow">
                            BOUTIQUE DISPLAY
                          </div>
                        </div>
                      </div>

                      {/* Text Content of Current Slide */}
                      <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="inline-flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border ${curSlide.badgeClass}`}>
                            {curSlide.tag}
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                          {curSlide.title}
                        </h2>

                        <p className={`text-sm sm:text-base ${themeStyles.accentText} font-semibold leading-relaxed`}>
                          {curSlide.subtitle}
                        </p>

                        <p className={`text-xs sm:text-sm ${subTextColor} leading-relaxed max-w-xl`}>
                          {curSlide.description}
                        </p>

                        {/* 3 Key Feature Bullets */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                          {curSlide.highlights.map((h, i) => (
                            <div
                              key={i}
                              className={`p-2.5 rounded-2xl border text-xs font-medium flex items-center gap-2 shadow-xs ${
                                isLight ? 'bg-amber-50/80 border-amber-200 text-slate-800' : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                              }`}
                            >
                              <span className="truncate">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Slide Controls & Progress Dots */}
              <div className="relative z-10 flex items-center justify-between pt-6 mt-6 border-t border-slate-700/40">
                <div className="flex items-center gap-2">
                  {promoSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        activeSlide === idx 
                          ? 'w-8 bg-amber-400 shadow-md shadow-amber-500/50' 
                          : 'w-2.5 bg-slate-600 hover:bg-slate-500'
                      }`}
                      title={`สไลด์ที่ ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="hidden sm:inline font-mono text-[11px] opacity-70">
                    นำสินค้ามาที่เคาน์เตอร์เพื่อสแกนคิดเงินได้ทันที
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveSlide(prev => (prev - 1 + promoSlides.length) % promoSlides.length)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700"
                      title="สไลด์ก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveSlide(prev => (prev + 1) % promoSlides.length)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700"
                      title="สไลด์ถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE CART & CHECKOUT SPLIT VIEW */
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
                {displayState.cart.map((item) => (
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
                ))}
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
      ))}

      {/* Footer */}
      <div className={`text-center text-[11px] ${subTextColor} pt-4 border-t ${themeStyles.headerBorder}`}>
        {settings?.address || 'ถนนจอมพล อ.เมือง จ.นครราชสีมา'} • โทร: {settings?.phone || '044-123456'}
      </div>
    </div>
  );
};
