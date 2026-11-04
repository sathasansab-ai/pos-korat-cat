// src/components/BarcodePrintModal.tsx
import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  Tag, 
  Sliders, 
  Layers, 
  Settings2, 
  Check, 
  Maximize2 
} from 'lucide-react';
import type { ProductVariant, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';

interface BarcodePrintModalProps {
  isOpen: boolean;
  variant: ProductVariant | null;
  settings: StoreSettings;
  onClose: () => void;
}

interface StickerPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  desc: string;
}

const STICKER_PRESETS: StickerPreset[] = [
  { 
    id: 'tag_45_70', 
    name: 'ป้ายแท็กผ้าหน้าร้าน (45 x 70 มม.)', 
    widthMm: 45, 
    heightMm: 70, 
    desc: 'สัดส่วนตรงกับป้ายแท็กแมวโคราชจริงในรูปภาพ' 
  },
  { 
    id: 'sticker_40_50', 
    name: 'สติ๊กเกอร์แปะหลังแท็ก (40 x 50 มม.)', 
    widthMm: 40, 
    heightMm: 50, 
    desc: 'พอดีหลังป้ายแท็ก มีระยะเว้นขอบ 2.5 มม. ไม่ล้นขอบ' 
  },
  { 
    id: 'roll_50_30', 
    name: 'สติ๊กเกอร์ม้วนมาตรฐาน (50 x 30 มม.)', 
    widthMm: 50, 
    heightMm: 30, 
    desc: 'ม้วนสติ๊กเกอร์ความร้อนเครื่องพิมพ์บาร์โค้ดยอดนิยม' 
  },
  { 
    id: 'roll_40_30', 
    name: 'สติ๊กเกอร์มินิ (40 x 30 มม.)', 
    widthMm: 40, 
    heightMm: 30, 
    desc: 'ขนาดเล็กสำหรับของที่ระลึก พวงกุญแจ เครื่องประดับ' 
  },
  { 
    id: 'roll_40_60', 
    name: 'สติ๊กเกอร์ทรงสูง (40 x 60 มม.)', 
    widthMm: 40, 
    heightMm: 60, 
    desc: 'สติ๊กเกอร์แนวยาวสำหรับติดป้ายสินค้าทรงกระบอก' 
  },
  { 
    id: 'custom', 
    name: 'กำหนดขนาดเอง (Custom W x H mm)', 
    widthMm: 45, 
    heightMm: 70, 
    desc: 'ระบุความกว้างและความสูงตามขนาดกระดาษที่มี' 
  },
];

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  variant,
  settings,
  onClose
}) => {
  if (!isOpen || !variant) return null;

  // Defaults to the current in-stock quantity (e.g. 25 copies for 25 items in stock)
  const [printCount, setPrintCount] = useState<number>(variant.stockQuantity || 1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tag_45_70');
  const [widthMm, setWidthMm] = useState<number>(45);
  const [heightMm, setHeightMm] = useState<number>(70);
  const [printMode, setPrintMode] = useState<'ROLL' | 'SHEET'>('ROLL');
  const [barcodeSizeOption, setBarcodeSizeOption] = useState<'GIANT' | 'NORMAL'>('GIANT');

  // Display toggles
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showAttributes, setShowAttributes] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = STICKER_PRESETS.find(item => item.id === presetId);
    if (p && presetId !== 'custom') {
      setWidthMm(p.widthMm);
      setHeightMm(p.heightMm);
    }
  };

  // Adjust barcode height proportionally (Giant mode takes ~52% of the sticker height!)
  const barcodeHeightMm = barcodeSizeOption === 'GIANT'
    ? Math.max(26, Math.min(38, Math.round(heightMm * 0.52)))
    : Math.max(18, Math.min(26, Math.round(heightMm * 0.38)));

  const barcodeSvgString = BarcodeGenerator.generateSvg(variant.barcode, {
    height: barcodeSizeOption === 'GIANT' ? 180 : 120,
    showText: true
  });

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

      // CSS for Roll Printer (1 sticker per page) vs Sheet Grid (Multiple stickers on A4)
      const pageStyle = isRoll ? `
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
          margin: 6mm 8mm !important; 
        }
        body { 
          background: #ffffff !important; 
          color: #000000 !important; 
          padding: 0 !important; 
          margin: 0 !important; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .stickers-print-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(${widthMm}mm, 1fr)) !important;
          gap: 3mm !important;
          width: 100% !important;
          margin: 0 auto !important;
        }
        .sticker-item {
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          max-height: ${heightMm}mm !important;
          border: 1px dashed #94a3b8 !important;
          border-radius: 4px !important;
          padding: 1.5mm !important;
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

              {/* Barcode Height Selector (Giant vs Normal) */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg ml-1">
                <span className="text-[10px] font-bold text-amber-900">ขนาดแท่งบาร์โค้ด:</span>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('GIANT')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeSizeOption === 'GIANT'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ความสูง 36 มม. เส้นใหญ่ สแกนติดง่าย 100%"
                >
                  ⚡ ใหญ่พิเศษ ({barcodeHeightMm} มม.)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeSizeOption('NORMAL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    barcodeSizeOption === 'NORMAL'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="ความสูงมาตรฐาน 22 มม."
                >
                  มาตรฐาน
                </button>
              </div>
            </div>

            {/* Print Quantity & Action */}
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-700">จำนวน:</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={printCount}
                  onChange={e => setPrintCount(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-xs text-center"
                />
                <button
                  type="button"
                  onClick={() => setPrintCount(variant.stockQuantity || 1)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                  title="ตั้งให้เท่ากับจำนวนในสต็อกปัจจุบัน"
                >
                  เท่าสต็อก ({variant.stockQuantity})
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
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
                    {variant.productName}
                  </div>

                  {showSku && (
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                      SKU: {variant.sku}
                    </div>
                  )}
                </div>

                {/* Middle: Giant High-Resolution Barcode (Pure Vector SVG) */}
                <div 
                  className="barcode-svg-wrapper my-1 w-full flex items-center justify-center flex-1 px-0.5"
                  style={{
                    height: `${barcodeHeightMm * 3.78}px`,
                    minHeight: `${barcodeHeightMm * 3.78}px`,
                    width: '98%'
                  }}
                  dangerouslySetInnerHTML={{ __html: barcodeSvgString }}
                />

                {/* Bottom: Attributes & Price */}
                <div className="w-full flex items-center justify-between border-t border-slate-200 pt-1 text-[10px]">
                  {showAttributes ? (
                    <span className="text-slate-600 font-sans truncate max-w-[90px]">
                      {Object.values(variant.attributes).join(' / ')}
                    </span>
                  ) : <span />}

                  {showPrice && (
                    <span className="font-black font-mono text-slate-900 text-xs">
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
            💡 <b>คำแนะนำการทดสอบสแกน:</b> เครื่องยิงบาร์โค้ดแบบเลเซอร์ (Laser 1D Gun) จะสแกนอ่านจาก <b>กระดาษหรือป้ายแท็กจริง</b> เท่านั้น ไม่สามารถยิงทะลุแสงสะท้อนของหน้าจอมือถือได้ หากต้องการทดสอบโดยยังไม่พิมพ์ ให้ใช้กล้องมือถืออีกเครื่องเปิดแอปกล้อง/สแกนเนอร์ส่อง หรือพิมพ์ใส่กระดาษแล้วยิงจะติดทันทีครับ
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition shrink-0"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
