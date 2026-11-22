// src/components/BatchBarcodeModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Tag, 
  Sliders, 
  Layers, 
  Settings2, 
  Check, 
  Download, 
  Trash2, 
  Plus, 
  Minus, 
  FileCode, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { BarcodeQueueService, type BarcodeQueueItem } from '../services/barcodeQueueService';
import { BarcodeExport } from '../services/barcodeExport';

interface BatchBarcodeModalProps {
  isOpen: boolean;
  settings: StoreSettings;
  onClose: () => void;
  onPrinted?: () => void;
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

export const BatchBarcodeModal: React.FC<BatchBarcodeModalProps> = ({
  isOpen,
  settings,
  onClose,
  onPrinted
}) => {
  const [queue, setQueue] = useState<BarcodeQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'PREVIEW'>('ITEMS');
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);

  // Settings
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

  // Load and subscribe to queue changes
  useEffect(() => {
    if (isOpen) {
      setQueue(BarcodeQueueService.getQueue());
      const unsubscribe = BarcodeQueueService.subscribe(updatedQueue => {
        setQueue(updatedQueue);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = STICKER_PRESETS.find(item => item.id === presetId);
    if (p && presetId !== 'custom') {
      setWidthMm(p.widthMm);
      setHeightMm(p.heightMm);
      if (p.defaultMode) {
        setPrintMode(p.defaultMode);
      }
    }
  };

  const currentPreset = STICKER_PRESETS.find(p => p.id === selectedPresetId);
  const totalStickers = queue.reduce((sum, item) => sum + item.quantity, 0);

  // Barcode height logic
  const barcodeHeightMm = barcodeSizeOption === 'GIANT'
    ? Math.max(26, Math.min(38, Math.round(heightMm * 0.52)))
    : Math.max(18, Math.min(26, Math.round(heightMm * 0.38)));

  const perPageA4 = currentPreset?.stickersPerPageA4 || 12;
  const estimatedSheets = Math.ceil(totalStickers / perPageA4);
  const remainderStickers = totalStickers % perPageA4;
  const stickersToFillSheet = remainderStickers === 0 ? 0 : perPageA4 - remainderStickers;

  // Flattened list of stickers to render
  const expandedStickers: { item: BarcodeQueueItem; stickerIndex: number }[] = [];
  queue.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      expandedStickers.push({ item, stickerIndex: i });
    }
  });

  const getBarcodeSvgOrImg = (item: BarcodeQueueItem) => {
    const content = item.barcode || item.sku;
    if (barcodeFormat === 'EAN13') {
      return BarcodeGenerator.generateEan13Svg(content, {
        height: barcodeSizeOption === 'GIANT' ? 180 : 120,
        showText: true
      });
    }
    if (barcodeFormat === 'CODE128') {
      return BarcodeGenerator.generateCode128Svg(content, {
        height: barcodeSizeOption === 'GIANT' ? 180 : 120,
        showText: true
      });
    }
    return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(content)}" alt="QR" style="height:${barcodeHeightMm * 3.5}px;width:${barcodeHeightMm * 3.5}px;object-fit:contain;margin:auto;" />`;
  };

  const getPageStyle = (isRoll: boolean) => {
    return isRoll ? `
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
        padding: 1.5mm !important;
        border: none !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }
      .barcode-svg-wrapper {
        width: 98% !important;
        height: ${barcodeHeightMm}mm !important;
        max-height: ${barcodeHeightMm}mm !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 1mm 0 !important;
        overflow: hidden !important;
      }
      .barcode-svg-wrapper svg {
        width: 100% !important;
        height: 100% !important;
        max-height: ${barcodeHeightMm}mm !important;
        display: block !important;
        shape-rendering: crispEdges !important;
      }
    ` : `
      @page { 
        size: A4 portrait; 
        margin: 15mm 12mm 15mm 12mm !important; 
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
        gap: 4mm !important;
        width: 100% !important;
        margin: 0 auto !important;
      }
      .sticker-item {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-height: ${heightMm}mm !important;
        border: 1.5px dashed #64748b !important;
        border-radius: 4px !important;
        padding: 2mm !important;
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
      .barcode-svg-wrapper {
        width: 98% !important;
        height: ${barcodeHeightMm}mm !important;
        max-height: ${barcodeHeightMm}mm !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 1mm 0 !important;
        overflow: hidden !important;
      }
      .barcode-svg-wrapper svg {
        width: 100% !important;
        height: 100% !important;
        max-height: ${barcodeHeightMm}mm !important;
        display: block !important;
        shape-rendering: crispEdges !important;
      }
    `;
  };

  const handlePrintBatch = () => {
    if (totalStickers === 0) {
      alert('ไม่มีรายการสติ๊กเกอร์ในคิวรอพิมพ์');
      return;
    }

    const printEl = document.getElementById('batch-printable-stickers-container');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('batch-print-stickers-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'batch-print-stickers-iframe';
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
            <meta charset="utf-8">
            <title>พิมพ์สติ๊กเกอร์บาร์โค้ดรวม (${totalStickers} ดวง) - ${settings.storeName}</title>
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

        if (confirm('พิมพ์สติ๊กเกอร์เรียบร้อยแล้ว ต้องการล้างรายการรอพิมพ์ออกจากตะกร้าหรือไม่?')) {
          BarcodeQueueService.clearQueue();
          if (onPrinted) onPrinted();
          onClose();
        }
      }, 400);
    } catch {
      window.print();
    }
  };

  const handleDownloadHtmlSheet = () => {
    if (totalStickers === 0) {
      alert('ไม่มีรายการสติ๊กเกอร์ในคิว');
      return;
    }
    const printEl = document.getElementById('batch-printable-stickers-container');
    if (!printEl) return;

    const isRoll = printMode === 'ROLL';
    const pageStyle = getPageStyle(isRoll);
    const filename = `stickers-batch-${Date.now()}`;

    BarcodeExport.downloadHtmlSheet(
      `แผ่นพิมพ์สติ๊กเกอร์รวม ${totalStickers} ดวง (${queue.length} รายการ)`,
      printEl.innerHTML,
      pageStyle,
      filename
    );
  };

  const handleDownloadAllBarcodeImages = async () => {
    if (queue.length === 0) {
      alert('ไม่มีรายการสินค้าในคิว');
      return;
    }
    setIsDownloadingImages(true);
    try {
      for (const item of queue) {
        const filename = `barcode-${item.sku}-${item.barcode}`;
        if (barcodeFormat === 'QR') {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(item.barcode || item.sku)}`;
          await BarcodeExport.downloadQrImage(qrUrl, filename);
        } else {
          const svgString = barcodeFormat === 'EAN13'
            ? BarcodeGenerator.generateEan13Svg(item.barcode || item.sku, { height: 160, showText: true })
            : BarcodeGenerator.generateCode128Svg(item.barcode || item.sku, { height: 160, showText: true });
          
          await BarcodeExport.downloadSvgAsPng(svgString, filename, 900, 450);
        }
        // slight pause so browser handles multi-downloads smoothly
        await new Promise(r => setTimeout(r, 200));
      }
      alert(`บันทึกรูปภาพบาร์โค้ดลงเครื่องเรียบร้อยแล้ว (${queue.length} ไฟล์)`);
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ: ${e.message}`);
    } finally {
      setIsDownloadingImages(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col my-auto border border-slate-200 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-4.5 px-6 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white tracking-wide">
                  กล่องรวบรวมบาร์โค้ดรอพิมพ์ & ดาวน์โหลด (Batch Barcode Print & Download)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {queue.length} สินค้า • รวม {totalStickers} ดวง
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                รวบรวมบาร์โค้ดจากสินค้าหลายชนิดมาพิมพ์รวมกันในแผ่นเดียว ประหยัดกระดาษสติ๊กเกอร์ หรือดาวน์โหลดลงเครื่องเก็บไว้
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

        {/* Toolbar & Tab Switcher */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 no-print shrink-0">
          {/* Row 1: Preset & Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>ขนาดสติ๊กเกอร์ / ป้ายแท็ก:</span>
              </label>
              <select
                value={selectedPresetId}
                onChange={e => handleSelectPreset(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {STICKER_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom mm Inputs */}
            <div className="md:col-span-3 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">กว้าง (มม.):</label>
                <input
                  type="number"
                  min={20}
                  max={120}
                  value={widthMm}
                  onChange={e => {
                    setSelectedPresetId('custom');
                    setWidthMm(parseInt(e.target.value, 10) || 45);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center"
                />
              </div>
              <span className="text-slate-400 mt-4 text-xs font-bold">×</span>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">สูง (มม.):</label>
                <input
                  type="number"
                  min={20}
                  max={150}
                  value={heightMm}
                  onChange={e => {
                    setSelectedPresetId('custom');
                    setHeightMm(parseInt(e.target.value, 10) || 70);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center"
                />
              </div>
            </div>

            {/* Printer Mode Switcher */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-0.5">ประเภทกระดาษ:</label>
              <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPrintMode('SHEET')}
                  className={`flex-1 py-1 rounded-lg transition ${
                    printMode === 'SHEET' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  แผ่น A4
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('ROLL')}
                  className={`flex-1 py-1 rounded-lg transition ${
                    printMode === 'ROLL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  ม้วนความร้อน
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Format & Display Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 text-slate-700">
              {/* Barcode Format */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                <span className="text-[10px] font-bold text-slate-700">รูปแบบ:</span>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('EAN13')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'EAN13' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  🌟 EAN-13
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('CODE128')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'CODE128' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Code 128
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('QR')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeFormat === 'QR' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  📱 QR
                </button>
              </div>

              {/* Barcode Thickness */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                <span className="text-[10px] font-bold text-amber-900">ขนาดเส้น:</span>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('GIANT')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    barcodeSizeOption === 'GIANT' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  หนาพิเศษ
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('NORMAL')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    barcodeSizeOption === 'NORMAL' ? 'bg-amber-600 text-white' : 'text-slate-600'
                  }`}
                >
                  มาตรฐาน
                </button>
              </div>

              {/* Toggles */}
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={e => setShowStoreName(e.target.checked)}
                  className="rounded text-amber-600 w-3.5 h-3.5"
                />
                <span className="text-[11px]">ชื่อร้าน</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={e => setShowPrice(e.target.checked)}
                  className="rounded text-amber-600 w-3.5 h-3.5"
                />
                <span className="text-[11px]">ราคา</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAttributes}
                  onChange={e => setShowAttributes(e.target.checked)}
                  className="rounded text-amber-600 w-3.5 h-3.5"
                />
                <span className="text-[11px]">ไซส์/สี</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={e => setShowSku(e.target.checked)}
                  className="rounded text-amber-600 w-3.5 h-3.5"
                />
                <span className="text-[11px]">SKU</span>
              </label>
            </div>

            {/* Tab switch buttons */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl font-bold text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ITEMS')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'ITEMS' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                📋 จัดการรายการในคิว ({queue.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeTab === 'PREVIEW' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
                }`}
              >
                👁️ ดูตัวอย่าง ({totalStickers} ดวง)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/70">
          {queue.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Tag className="w-8 h-8" />
              </div>
              <div className="font-bold text-base text-slate-700">ไม่มีรายการสินค้าในคิวรอพิมพ์</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                กดปุ่ม <b>"+ รวมพิมพ์"</b> หรือติ๊กเลือกสินค้าในหน้ารายการสต็อก เพื่อรวบรวมบาร์โค้ดมาพิมพ์หรือดาวน์โหลดพร้อมกันที่นี่
              </p>
            </div>
          ) : activeTab === 'ITEMS' ? (
            /* Tab 1: Queue Items List */
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                    <span>📊 สรุปรายการรอพิมพ์:</span>
                    <span className="font-black text-amber-700">{queue.length} รายการ</span>
                    <span>•</span>
                    <span className="font-black text-amber-700">รวม {totalStickers} ดวง</span>
                  </div>
                  <div className="text-[11px] text-amber-900/80">
                    {printMode === 'SHEET' ? (
                      <span>
                        พิมพ์บน A4 ได้ <b>{estimatedSheets} แผ่น</b> ({perPageA4} ดวง/แผ่น) 
                        {stickersToFillSheet > 0 && ` • แผ่นสุดท้ายขาดอีก ${stickersToFillSheet} ดวงจะเต็มแผ่นพอดี`}
                      </span>
                    ) : (
                      <span>พิมพ์ด้วยเครื่องม้วนความร้อนต่อเนื่อง {totalStickers} ใบ</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {stickersToFillSheet > 0 && printMode === 'SHEET' && queue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = queue[queue.length - 1];
                        BarcodeQueueService.updateQuantity(last.id, last.quantity + stickersToFillSheet);
                      }}
                      className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs transition"
                      title="เพิ่มจำนวนของรายการสุดท้ายให้เต็มแผ่น A4 พอดี ไม่เสียกระดาษ"
                    >
                      + เติมให้เต็มแผ่น (+{stickersToFillSheet})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('คุณแน่ใจว่าต้องการล้างรายการรอพิมพ์ทั้งหมดออกจากตะกร้า?')) {
                        BarcodeQueueService.clearQueue();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างทั้งหมด</span>
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">สินค้า / ตัวเลือก</th>
                      <th className="p-3">รหัส SKU / บาร์โค้ด</th>
                      <th className="p-3 text-right">ราคาขาย</th>
                      <th className="p-3 text-center">สต็อกปัจจุบัน</th>
                      <th className="p-3 text-center w-40">จำนวนที่จะพิมพ์ (ดวง)</th>
                      <th className="p-3 text-center w-24">ดาวน์โหลด</th>
                      <th className="p-3 text-center w-12">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queue.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Tag className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{item.productName}</div>
                              <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 mt-0.5">
                                {Object.entries(item.attributes).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="font-bold text-slate-800 text-[11px]">{item.sku}</div>
                          <div className="text-[10px] text-amber-700 font-semibold">{item.barcode}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-700">
                          ฿{item.salePrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {item.stockQuantity} ชิ้น
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => BarcodeQueueService.updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={item.quantity === 0 ? '' : item.quantity}
                              onFocus={e => e.target.select()}
                              onChange={e => BarcodeQueueService.updateQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                              className="w-14 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => BarcodeQueueService.updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => BarcodeQueueService.updateQuantity(item.id, item.stockQuantity || 1)}
                              className="px-1.5 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition ml-1"
                              title="ตั้งให้เท่าจำนวนสต็อกปัจจุบัน"
                            >
                              ={item.stockQuantity}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                const filename = `barcode-${item.sku}-${item.barcode}`;
                                if (barcodeFormat === 'QR') {
                                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(item.barcode || item.sku)}`;
                                  await BarcodeExport.downloadQrImage(qrUrl, filename);
                                } else {
                                  const svg = barcodeFormat === 'EAN13'
                                    ? BarcodeGenerator.generateEan13Svg(item.barcode || item.sku, { height: 160, showText: true })
                                    : BarcodeGenerator.generateCode128Svg(item.barcode || item.sku, { height: 160, showText: true });
                                  await BarcodeExport.downloadSvgAsPng(svg, filename, 900, 450);
                                }
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg text-[10px] font-bold transition"
                              title="ดาวน์โหลดรูปภาพบาร์โค้ด (PNG)"
                            >
                              PNG
                            </button>
                            {barcodeFormat !== 'QR' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const svg = barcodeFormat === 'EAN13'
                                    ? BarcodeGenerator.generateEan13Svg(item.barcode || item.sku, { height: 160, showText: true })
                                    : BarcodeGenerator.generateCode128Svg(item.barcode || item.sku, { height: 160, showText: true });
                                  BarcodeExport.downloadSvg(svg, `barcode-${item.sku}-${item.barcode}.svg`);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg text-[10px] font-bold transition"
                                title="ดาวน์โหลดไฟล์เวกเตอร์ SVG"
                              >
                                SVG
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => BarcodeQueueService.removeFromQueue(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ลบออกจากคิว"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Tab 2: Live Mixed Stickers Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  ตัวอย่างการพิมพ์แบบผสม ({expandedStickers.length} ดวง) • ขนาด: <b>{widthMm} × {heightMm} มม.</b>
                </span>
                <span className="font-mono text-[11px]">
                  โหมด: {printMode === 'ROLL' ? 'ม้วนความร้อน (1 ดวงต่อหน้า)' : 'ตารางรวมบนแผ่น A4'}
                </span>
              </div>

              <div 
                id="batch-printable-stickers-container"
                className="flex flex-wrap gap-4 items-start justify-center"
              >
                {expandedStickers.map(({ item, stickerIndex }, idx) => (
                  <div
                    key={`${item.id}-${stickerIndex}-${idx}`}
                    className="sticker-item bg-white border border-slate-300 rounded-xl p-3 flex flex-col justify-between items-center text-center shadow-sm select-none"
                    style={{ 
                      width: `${widthMm * 3.78}px`, 
                      minHeight: `${heightMm * 3.78}px`,
                      maxWidth: '100%'
                    }}
                  >
                    {/* Top: Store Name & Product Title */}
                    <div className="w-full">
                      {showStoreName && (
                        <div className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-0.5 truncate">
                          {settings.storeName}
                        </div>
                      )}

                      <div className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                        {item.productName}
                      </div>

                      {showSku && (
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                          SKU: {item.sku}
                        </div>
                      )}
                    </div>

                    {/* Middle: Giant High-Resolution Barcode */}
                    <div 
                      className="barcode-svg-wrapper my-1 w-full flex items-center justify-center flex-1 px-0.5"
                      style={{
                        height: `${barcodeHeightMm * 3.78}px`,
                        minHeight: `${barcodeHeightMm * 3.78}px`,
                        width: '98%'
                      }}
                      dangerouslySetInnerHTML={{ __html: getBarcodeSvgOrImg(item) }}
                    />

                    {/* Bottom: Attributes & Price */}
                    <div className="w-full flex items-center justify-between border-t border-slate-200 pt-1 text-[10px]">
                      {showAttributes ? (
                        <span className="text-slate-600 font-sans truncate max-w-[90px]">
                          {Object.values(item.attributes).join(' / ')}
                        </span>
                      ) : <span />}

                      {showPrice && (
                        <span className="font-black font-mono text-slate-900 text-xs">
                          ฿{item.salePrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Toolbar */}
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="text-xs text-slate-400">
            {queue.length > 0 ? (
              <span>
                พร้อมส่งออก: <b className="text-amber-400">{queue.length} รายการ</b> • รวม{' '}
                <b className="text-amber-400">{totalStickers} ดวง</b>
                {printMode === 'SHEET' && ` (ใช้ A4 ประมาณ ${estimatedSheets} แผ่น)`}
              </span>
            ) : (
              <span>ยังไม่มีสินค้าในคิว</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download HTML Sheet Button */}
            <button
              type="button"
              disabled={queue.length === 0}
              onClick={handleDownloadHtmlSheet}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
              title="ดาวน์โหลดไฟล์ HTML พร้อมพิมพ์ สามารถเปิดพิมพ์บนเครื่องใดก็ได้แบบออฟไลน์"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>ดาวน์โหลดแผ่นพิมพ์ (HTML)</span>
            </button>

            {/* Download Images Button */}
            <button
              type="button"
              disabled={queue.length === 0 || isDownloadingImages}
              onClick={handleDownloadAllBarcodeImages}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
              title="ดาวน์โหลดรูปภาพบาร์โค้ด/QR Code ทั้งหมดลงเครื่องคอมพิวเตอร์"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isDownloadingImages ? 'กำลังดาวน์โหลด...' : 'ดาวน์โหลดรูปภาพบาร์โค้ด'}</span>
            </button>

            {/* Print Batch Button */}
            <button
              type="button"
              disabled={queue.length === 0}
              onClick={handlePrintBatch}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์รวม ({totalStickers} ดวง)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
