// src/components/BarcodePrintModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Tag, 
  Sliders, 
  Layers, 
  Settings2, 
  Check, 
  Maximize2,
  Download,
  FileCode,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';
import type { ProductVariant, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { BarcodeExport } from '../services/barcodeExport';
import { BarcodeQueueService } from '../services/barcodeQueueService';

interface BarcodePrintModalProps {
  isOpen: boolean;
  variant: ProductVariant | null;
  settings: StoreSettings;
  initialPrintCount?: number;
  onClose: () => void;
}

interface StickerPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  desc: string;
  defaultMode?: 'ROLL' | 'SHEET';
  stickersPerPageA4?: number;
}

const STICKER_PRESETS: StickerPreset[] = [
  { 
    id: 'a4_tag_45_65', 
    name: '📄 กระดาษ A4: ป้ายแท็กมาตรฐาน (45 x 65 มม. - 12 ป้าย/แผ่น)', 
    widthMm: 45, 
    heightMm: 65, 
    desc: '3 คอลัมน์ × 4 แถว พอดีหน้า 1 แผ่น A4 ไม่ล้นหน้า 2 มีเส้นประตัดง่าย',
    defaultMode: 'SHEET',
    stickersPerPageA4: 12
  },
  { 
    id: 'a4_tag_45_70', 
    name: '📄 กระดาษ A4: ป้ายแท็กทรงยาว (45 x 70 มม. - 9 ป้าย/แผ่น)', 
    widthMm: 45, 
    heightMm: 70, 
    desc: '3 คอลัมน์ × 3 แถว สัดส่วนตรงกับป้ายแท็กผ้าแมวโคราช เว้นขอบหัว-ท้ายปลอดภัย',
    defaultMode: 'SHEET',
    stickersPerPageA4: 9
  },
  { 
    id: 'a4_sticker_40_50', 
    name: '📄 กระดาษ A4: สติ๊กเกอร์แปะหลังแท็ก (40 x 50 มม. - 20 ป้าย/แผ่น)', 
    widthMm: 40, 
    heightMm: 50, 
    desc: '4 คอลัมน์ × 5 แถว ขนาดกะทัดรัด แปะหลังป้ายแบรนด์เดิมได้สวยงาม',
    defaultMode: 'SHEET',
    stickersPerPageA4: 20
  },
  { 
    id: 'a4_mini_40_30', 
    name: '📄 กระดาษ A4: สติ๊กเกอร์มินิ (40 x 30 มม. - 28 ป้าย/แผ่น)', 
    widthMm: 40, 
    heightMm: 30, 
    desc: '4 คอลัมน์ × 7 แถว สำหรับของที่ระลึก พวงกุญแจ แก้วเซรามิก',
    defaultMode: 'SHEET',
    stickersPerPageA4: 28
  },
  { 
    id: 'roll_50_30', 
    name: '🏷️ สติ๊กเกอร์ม้วนความร้อน (50 x 30 มม.)', 
    widthMm: 50, 
    heightMm: 30, 
    desc: 'สำหรับเครื่องพิมพ์สติ๊กเกอร์ม้วนความร้อน (Thermal Barcode Printer)',
    defaultMode: 'ROLL'
  },
  { 
    id: 'roll_40_30', 
    name: '🏷️ สติ๊กเกอร์ม้วนเล็ก (40 x 30 มม.)', 
    widthMm: 40, 
    heightMm: 30, 
    desc: 'ม้วนความร้อนขนาดเล็กสำหรับของตกแต่งและเครื่องประดับ',
    defaultMode: 'ROLL'
  },
  { 
    id: 'custom', 
    name: '⚙️ กำหนดขนาดเอง (Custom W x H mm)', 
    widthMm: 45, 
    heightMm: 65, 
    desc: 'ระบุความกว้างและความสูงตามขนาดกระดาษหรือป้ายแท็กที่คุณมี'
  },
];

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  variant,
  settings,
  initialPrintCount,
  onClose
}) => {
  if (!isOpen || !variant) return null;

  // Defaults to initialPrintCount or current in-stock quantity (e.g. 20 copies for 20 restocked items)
  const [printCount, setPrintCount] = useState<number>(initialPrintCount ?? variant.stockQuantity ?? 1);

  useEffect(() => {
    if (variant) {
      setPrintCount(initialPrintCount ?? variant.stockQuantity ?? 1);
    }
  }, [variant?.id, initialPrintCount]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('a4_tag_45_65');
  const [widthMm, setWidthMm] = useState<number>(45);
  const [heightMm, setHeightMm] = useState<number>(65);
  const [printMode, setPrintMode] = useState<'ROLL' | 'SHEET'>('SHEET');
  const [barcodeSizeOption, setBarcodeSizeOption] = useState<'GIANT' | 'NORMAL'>('GIANT');
  const [barcodeFormat, setBarcodeFormat] = useState<'EAN13' | 'CODE128' | 'QR'>('EAN13');

  // Display toggles
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showAttributes, setShowAttributes] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);

  // Download & Queue states
  const [isAddedToQueue, setIsAddedToQueue] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = STICKER_PRESETS.find(item => item.id === presetId);
    if (p && presetId !== 'custom') {
      setWidthMm(p.widthMm);
      setHeightMm(p.heightMm);
      if (p.defaultMode) {
        setPrintMode(p.defaultMode);
      }
      if (p.stickersPerPageA4 && p.defaultMode === 'SHEET' && printCount === 1) {
        setPrintCount(p.stickersPerPageA4);
      }
    }
  };

  const currentPreset = STICKER_PRESETS.find(p => p.id === selectedPresetId);

  // Adjust barcode height proportionally (Giant mode takes ~52% of the sticker height!)
  const barcodeHeightMm = barcodeSizeOption === 'GIANT'
    ? Math.max(26, Math.min(38, Math.round(heightMm * 0.52)))
    : Math.max(18, Math.min(26, Math.round(heightMm * 0.38)));

  const barcodeContent = variant.barcode || variant.sku;

  const barcodeSvgString = barcodeFormat === 'EAN13'
    ? BarcodeGenerator.generateEan13Svg(barcodeContent, {
        height: barcodeSizeOption === 'GIANT' ? 180 : 120,
        showText: true
      })
    : barcodeFormat === 'CODE128'
    ? BarcodeGenerator.generateCode128Svg(barcodeContent, {
        height: barcodeSizeOption === 'GIANT' ? 180 : 120,
        showText: true
      })
    : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(barcodeContent)}" alt="QR" style="height:${barcodeHeightMm * 3.5}px;width:${barcodeHeightMm * 3.5}px;object-fit:contain;margin:auto;" />`;

  const getPageStyle = (isRoll: boolean) => isRoll ? `
    @page { 
      size: ${widthMm}mm ${heightMm}mm; 
      margin: 0mm !important; 
    }
    body { 
      background: #ffffff !important; 
      color: #000000 !important; 
      padding: 0 !important; 
      margin: 0 !important; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .stickers-print-grid {
      display: block !important;
      width: ${widthMm}mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
    }
    .sticker-item {
      width: ${widthMm}mm !important;
      height: ${heightMm}mm !important;
      max-height: ${heightMm}mm !important;
      page-break-after: always !important;
      break-after: page !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      align-items: center !important;
      text-align: center !important;
      background: #ffffff !important;
      padding: 1.2mm 1.5mm !important;
      border: none !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .sticker-header {
      width: 100% !important;
      flex-shrink: 0 !important;
    }
    .sticker-store-name {
      font-size: 8px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border-bottom: 0.5px solid #e2e8f0 !important;
      padding-bottom: 0.5mm !important;
      margin-bottom: 0.5mm !important;
    }
    .sticker-product-title {
      font-size: 9.5px !important;
      font-weight: 800 !important;
      line-height: 1.15 !important;
      max-height: 2.3em !important;
      overflow: hidden !important;
      word-break: break-word !important;
    }
    .sticker-sku {
      font-size: 8px !important;
      font-family: monospace !important;
      color: #334155 !important;
      line-height: 1 !important;
      margin-top: 0.5mm !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .barcode-svg-wrapper {
      width: 98% !important;
      flex: 1 1 auto !important;
      min-height: 10mm !important;
      max-height: ${Math.min(barcodeHeightMm, Math.round(heightMm * 0.42))}mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0.5mm 0 !important;
      overflow: hidden !important;
    }
    .barcode-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      display: block !important;
      shape-rendering: crispEdges !important;
    }
    .sticker-footer {
      width: 100% !important;
      flex-shrink: 0 !important;
      margin-top: auto !important;
      border-top: 1px solid #94a3b8 !important;
      padding-top: 0.8mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      font-size: 9px !important;
      box-sizing: border-box !important;
    }
    .sticker-footer .sticker-price {
      font-size: 11px !important;
      font-weight: 900 !important;
      font-family: monospace !important;
      color: #000000 !important;
    }
  ` : `
    @page { 
      size: A4 portrait; 
      margin: 12mm 10mm 12mm 10mm !important; 
    }
    body { 
      background: #ffffff !important; 
      color: #000000 !important; 
      padding: 0 !important; 
      margin: 0 !important; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .stickers-print-grid {
      display: flex !important;
      flex-wrap: wrap !important;
      justify-content: flex-start !important;
      align-content: flex-start !important;
      gap: 3.5mm !important;
      width: 100% !important;
      margin: 0 auto !important;
    }
    .sticker-item {
      width: ${widthMm}mm !important;
      height: ${heightMm}mm !important;
      max-height: ${heightMm}mm !important;
      border: 1.2px dashed #64748b !important;
      border-radius: 4px !important;
      padding: 1.5mm 1.8mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      align-items: center !important;
      text-align: center !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .sticker-header {
      width: 100% !important;
      flex-shrink: 0 !important;
    }
    .sticker-store-name {
      font-size: 8px !important;
      font-weight: 900 !important;
      line-height: 1.1 !important;
      text-transform: uppercase !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border-bottom: 0.5px solid #e2e8f0 !important;
      padding-bottom: 0.5mm !important;
      margin-bottom: 0.5mm !important;
    }
    .sticker-product-title {
      font-size: 9.5px !important;
      font-weight: 800 !important;
      line-height: 1.15 !important;
      max-height: 2.3em !important;
      overflow: hidden !important;
      word-break: break-word !important;
    }
    .sticker-sku {
      font-size: 8px !important;
      font-family: monospace !important;
      color: #334155 !important;
      line-height: 1 !important;
      margin-top: 0.5mm !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .barcode-svg-wrapper {
      width: 98% !important;
      flex: 1 1 auto !important;
      min-height: 10mm !important;
      max-height: ${Math.min(barcodeHeightMm, Math.round(heightMm * 0.42))}mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0.5mm 0 !important;
      overflow: hidden !important;
    }
    .barcode-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      display: block !important;
      shape-rendering: crispEdges !important;
    }
    .sticker-footer {
      width: 100% !important;
      flex-shrink: 0 !important;
      margin-top: auto !important;
      border-top: 1px solid #94a3b8 !important;
      padding-top: 0.8mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      font-size: 9px !important;
      box-sizing: border-box !important;
    }
    .sticker-footer .sticker-price {
      font-size: 11px !important;
      font-weight: 900 !important;
      font-family: monospace !important;
      color: #000000 !important;
    }
  `;

  // Action: Add to Batch Print Queue
  const handleAddToQueue = () => {
    BarcodeQueueService.addToQueue(variant, Math.max(1, printCount));
    setIsAddedToQueue(true);
    setTimeout(() => setIsAddedToQueue(false), 2500);
  };

  // Action: Download Single Barcode Image (PNG)
  const handleDownloadBarcodeImage = async () => {
    setIsDownloadingImage(true);
    const filename = `barcode-${variant.sku}-${barcodeContent}`;
    try {
      if (barcodeFormat === 'QR') {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(barcodeContent)}`;
        await BarcodeExport.downloadQrImage(qrUrl, filename);
      } else {
        const svg = barcodeFormat === 'EAN13'
          ? BarcodeGenerator.generateEan13Svg(barcodeContent, { height: 160, showText: true })
          : BarcodeGenerator.generateCode128Svg(barcodeContent, { height: 160, showText: true });
        await BarcodeExport.downloadSvgAsPng(svg, filename, 900, 450);
      }
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Action: Download Single Barcode Vector (SVG)
  const handleDownloadSvg = () => {
    const filename = `barcode-${variant.sku}-${barcodeContent}.svg`;
    const svg = barcodeFormat === 'EAN13'
      ? BarcodeGenerator.generateEan13Svg(barcodeContent, { height: 160, showText: true })
      : BarcodeGenerator.generateCode128Svg(barcodeContent, { height: 160, showText: true });
    BarcodeExport.downloadSvg(svg, filename);
  };

  // Action: Download Ready-to-Print Sheet (HTML)
  const handleDownloadHtmlSheet = () => {
    const printEl = document.getElementById('printable-stickers-container');
    if (!printEl) return;
    const isRoll = printMode === 'ROLL';
    const pageStyle = getPageStyle(isRoll);
    BarcodeExport.downloadHtmlSheet(
      `สติ๊กเกอร์บาร์โค้ด - ${variant.productName} (${variant.sku})`,
      printEl.innerHTML,
      pageStyle,
      `stickers-${variant.sku}`
    );
  };

  const handlePrint = () => {
    const printEl = document.getElementById('printable-stickers-container');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-stickers-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-stickers-iframe';
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

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const isRoll = printMode === 'ROLL';
      const pageStyle = getPageStyle(isRoll);

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>สติ๊กเกอร์บาร์โค้ด - ${variant.sku}</title>
            ${styles}
            <style>
              * { 
                box-sizing: border-box !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              ${pageStyle}
              .no-print { display: none !important; }
            </style>
          </head>
          <body>
            <div class="stickers-print-grid">
              ${printEl.innerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 350);
    } catch {
      window.print();
    }
  };

  const stickers = Array.from({ length: Math.max(1, printCount) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-4.5 px-6 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-wide">
                พิมพ์สติ๊กเกอร์บาร์โค้ดติดป้ายสินค้า (Barcode Sticker)
              </h3>
              <p className="text-[11px] text-slate-400">
                ปรับขนาดสติ๊กเกอร์ตามจริง รองรับทั้งป้ายแท็กผ้าหน้าร้าน (45x70 มม.) และสติ๊กเกอร์ม้วนความร้อน
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4 no-print">
          {/* Row 1: Preset Selection & Custom mm */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>เลือกขนาดสติ๊กเกอร์ / ป้ายแท็ก:</span>
              </label>
              <select
                value={selectedPresetId}
                onChange={e => handleSelectPreset(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {STICKER_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {STICKER_PRESETS.find(p => p.id === selectedPresetId)?.desc}
              </p>
            </div>

            {/* Custom mm Inputs */}
            <div className="md:col-span-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">กว้าง (มม.):</label>
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={widthMm}
                  onChange={e => {
                    setSelectedPresetId('custom');
                    setWidthMm(parseInt(e.target.value, 10) || 45);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center"
                />
              </div>
              <span className="text-slate-400 mt-4 text-xs font-bold">×</span>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">สูง (มม.):</label>
                <input
                  type="number"
                  min={20}
                  max={150}
                  value={heightMm}
                  onChange={e => {
                    setSelectedPresetId('custom');
                    setHeightMm(parseInt(e.target.value, 10) || 70);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center"
                />
              </div>
            </div>

            {/* Printer Mode Switcher */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">รูปแบบการพิมพ์:</label>
              <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPrintMode('ROLL')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    printMode === 'ROLL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                  title="พิมพ์ทีละ 1 ดวงต่อใบ สำหรับเครื่องพิมพ์สติ๊กเกอร์ม้วน"
                >
                  ม้วนความร้อน
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('SHEET')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    printMode === 'SHEET' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                  title="จัดเรียงหลายดวงบนแผ่น A4"
                >
                  แผ่น A4
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Print Count & Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            {/* Display Field Checkboxes */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <span className="font-bold text-slate-500 text-[11px]">ข้อมูลที่แสดงบนป้าย:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={e => setShowStoreName(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>ชื่อร้าน</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>ราคาขาย</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAttributes}
                  onChange={e => setShowAttributes(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>สี/ไซส์</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={e => setShowSku(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>รหัส SKU</span>
              </label>

              {/* Barcode Format Selector */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg ml-1">
                <span className="text-[10px] font-bold text-slate-700">รูปแบบ:</span>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('EAN13')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'EAN13'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="มาตรฐานสากลค้าปลีก 13 หลัก สแกนเนอร์ทุกตัว ทุกยี่ห้อบนโลกยิงติด 100%"
                >
                  🌟 EAN-13 (แนะนำ)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('CODE128')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'CODE128'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="รหัสแท่ง Code 128 คมชัด รองรับตัวอักษรและตัวเลข"
                >
                  Code 128
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('QR')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'QR'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="QR Code สำหรับปืนสแกนเนอร์แบบ 2D และกล้องมือถือ"
                >
                  📱 QR Code
                </button>
              </div>

              {/* Barcode Height Selector (Giant vs Normal) */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg ml-1">
                <span className="text-[10px] font-bold text-amber-900">ขนาดแท่ง:</span>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('GIANT')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeSizeOption === 'GIANT'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ความสูงเส้นใหญ่ สแกนติดง่าย 100%"
                >
                  ⚡ หนาพิเศษ
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('NORMAL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeSizeOption === 'NORMAL'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ความสูงมาตรฐาน"
                >
                  มาตรฐาน
                </button>
              </div>
            </div>

            {/* Print Quantity & Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-700">จำนวน:</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={printCount === 0 ? '' : printCount}
                  onFocus={e => e.target.select()}
                  onChange={e => setPrintCount(parseInt(e.target.value, 10) || 0)}
                  placeholder="1"
                  className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setPrintCount(variant.stockQuantity || 1)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                  title="ตั้งให้เท่ากับจำนวนในสต็อกปัจจุบัน"
                >
                  เท่าสต็อก ({variant.stockQuantity})
                </button>
                {currentPreset?.stickersPerPageA4 && (
                  <button
                    type="button"
                    onClick={() => {
                      const perPage = currentPreset.stickersPerPageA4 || 12;
                      const currentPages = Math.max(1, Math.ceil(printCount / perPage));
                      setPrintCount(currentPages * perPage);
                    }}
                    className="px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition"
                    title={`จัดให้เต็มแผ่น A4 พอดี (${currentPreset.stickersPerPageA4} ป้ายต่อแผ่น ไม่ล้น ไม่ขาด)`}
                  >
                    เต็มแผ่น A4 ({currentPreset.stickersPerPageA4})
                  </button>
                )}
              </div>

              {/* Action: Add to Queue */}
              <button
                type="button"
                onClick={handleAddToQueue}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                  isAddedToQueue
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                }`}
                title="เพิ่มรายการนี้ลงในตะกร้ารอพิมพ์รวม เพื่อรวบรวมพิมพ์พร้อมสินค้าอื่นในแผ่นเดียว"
              >
                {isAddedToQueue ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>เพิ่มในคิวแล้ว!</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>+ รวมเข้ารอพิมพ์</span>
                  </>
                )}
              </button>

              {/* Action: Download Barcode Image */}
              <button
                type="button"
                onClick={handleDownloadBarcodeImage}
                disabled={isDownloadingImage}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                title="ดาวน์โหลดรูปภาพบาร์โค้ดลงเครื่อง (ไฟล์ PNG ความละเอียดสูง สำหรับนำไปใช้ในงานออกแบบหรือเอกสาร)"
              >
                <Download className="w-3.5 h-3.5 text-slate-700" />
                <span>{isDownloadingImage ? 'กำลังโหลด...' : 'บันทึกรูป PNG'}</span>
              </button>

              {/* Action: Download Offline HTML Sheet */}
              <button
                type="button"
                onClick={handleDownloadHtmlSheet}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                title="ดาวน์โหลดแผ่นสติ๊กเกอร์เป็นไฟล์ HTML สำเร็จรูปสำหรับเปิดพิมพ์ออฟไลน์จากเครื่องใดก็ได้"
              >
                <FileCode className="w-3.5 h-3.5 text-slate-700" />
                <span>บันทึกแผ่นพิมพ์ (HTML)</span>
              </button>

              {/* Action: Direct Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ {printCount} ดวง</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE STICKERS CONTAINER (Live Preview & Printable Target) */}
        <div className="p-6 max-h-[55vh] overflow-y-auto bg-slate-100/80">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              ตัวอย่างการพิมพ์ ({stickers.length} ดวง) • ขนาดจริง: <b>{widthMm} × {heightMm} มม.</b>
            </span>
            <span className="font-mono text-[11px]">
              โหมด: {printMode === 'ROLL' ? 'ม้วนความร้อน (1 ดวงต่อหน้า)' : 'ตารางรวมบนแผ่น A4'}
            </span>
          </div>

          <div 
            id="printable-stickers-container"
            className="flex flex-wrap gap-4 items-start justify-center"
          >
            {stickers.map((_, idx) => (
              <div
                key={idx}
                className="sticker-item bg-white border border-slate-300 rounded-xl p-2.5 flex flex-col justify-between items-center text-center shadow-sm select-none"
                style={{ 
                  width: `${widthMm * 3.78}px`, 
                  height: `${heightMm * 3.78}px`,
                  maxHeight: `${heightMm * 3.78}px`,
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top: Store Name & Product Title */}
                <div className="sticker-header w-full shrink-0">
                  {showStoreName && (
                    <div className="sticker-store-name text-[9px] font-extrabold text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-0.5 truncate">
                      {settings.storeName}
                    </div>
                  )}

                  <div className="sticker-product-title text-[10px] font-bold text-slate-900 leading-tight line-clamp-2 mt-0.5">
                    {variant.productName}
                  </div>

                  {showSku && (
                    <div className="sticker-sku text-[8.5px] text-slate-500 font-mono mt-0.5 truncate">
                      SKU: {variant.sku}
                    </div>
                  )}
                </div>

                {/* Middle: Giant High-Resolution Barcode (Pure Vector SVG) */}
                <div 
                  className="barcode-svg-wrapper my-0.5 w-full flex items-center justify-center flex-1 px-0.5 overflow-hidden"
                  style={{
                    maxHeight: `${Math.min(barcodeHeightMm, Math.round(heightMm * 0.42)) * 3.78}px`,
                    width: '98%'
                  }}
                  dangerouslySetInnerHTML={{ __html: barcodeSvgString }}
                />

                {/* Bottom: Attributes & Price (Never cut off!) */}
                <div className="sticker-footer w-full flex items-center justify-between border-t border-slate-200 pt-1 text-[9.5px] shrink-0 mt-auto">
                  {showAttributes ? (
                    <span className="text-slate-600 font-sans truncate max-w-[90px] text-[9px]">
                      {Object.values(variant.attributes).join(' / ')}
                    </span>
                  ) : <span />}

                  {showPrice && (
                    <span className="sticker-price font-black font-mono text-slate-900 text-xs shrink-0">
                      ฿{variant.salePrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 no-print px-6 gap-2">
          <div className="text-[11px] text-slate-600 leading-tight">
            💡 <b>คำแนะนำการสแกน:</b> หากใช้ปืนยิง 1D (แสงเลเซอร์เส้นตรงสีแดงเส้นเดียว) แนะนำให้เลือกรูปแบบ <b>"🌟 EAN-13"</b> เพราะเป็นมาตรฐานค้าปลีกที่ปืนทุกรุ่นเปิดรับเป็นค่าเริ่มต้น 100% | หากเป็นปืนแบบ 2D (มีไฟส่องเป็นกรอบสี่เหลี่ยม) สามารถยิงได้ทั้ง EAN-13, Code 128 และ QR Code ครับ
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {barcodeFormat !== 'QR' && (
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition flex items-center gap-1"
                title="ดาวน์โหลดไฟล์เวกเตอร์ SVG (คมชัด 100% ขยายไม่แตก สำหรับนำไปวางในโปรแกรมออกแบบ)"
              >
                <span>💎 บันทึกเวกเตอร์ (SVG)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
