// src/components/BarcodePrintModal.tsx
import React, { useState } from 'react';
import { Printer, X, Tag, Copy } from 'lucide-react';
import type { ProductVariant, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';

interface BarcodePrintModalProps {
  isOpen: boolean;
  variant: ProductVariant | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  variant,
  settings,
  onClose
}) => {
  if (!isOpen || !variant) return null;

  // Defaults to the current in-stock quantity (e.g. 25 copies for 25 items in stock)
  const [printCount, setPrintCount] = useState<number>(variant.stockQuantity || 1);

  const barcodeSvgDataUrl = BarcodeGenerator.generateDataUrl(variant.barcode, {
    height: 38,
    showText: true
  });

  const handlePrint = () => {
    window.print();
  };

  const stickers = Array.from({ length: Math.max(1, printCount) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Header (No print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">พิมพ์สติ๊กเกอร์บาร์โค้ดติดสินค้า</h3>
              <p className="text-[11px] text-slate-400">คำนวณและพิมพ์สติ๊กเกอร์ตามสต็อกเพื่อนำไปติดที่ตัวสินค้า</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls (No print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700">จำนวนดวงสติ๊กเกอร์:</span>
            <input
              type="number"
              min={1}
              max={500}
              value={printCount}
              onChange={e => setPrintCount(parseInt(e.target.value, 10) || 1)}
              className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm text-center"
            />
            <span className="text-xs text-slate-500">(สต็อกปัจจุบันในคลัง: {variant.stockQuantity} ชิ้น)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintCount(variant.stockQuantity || 1)}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
            >
              เท่าจำนวนสต็อก ({variant.stockQuantity})
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ {printCount} ดวง</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE STICKERS CONTAINER */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-100 print:p-0 print:m-0 print:bg-white print:max-h-none print:overflow-visible">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-2 print:gap-2">
            {stickers.map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between items-center text-center shadow-xs print:shadow-none print:border-slate-800 print:break-inside-avoid"
                style={{ width: '100%', minHeight: '140px' }}
              >
                <div className="w-full">
                  <div className="text-[9px] font-bold text-slate-800 uppercase tracking-tighter truncate">
                    {settings.storeName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-900 leading-tight line-clamp-2 mt-0.5">
                    {variant.productName}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                    SKU: {variant.sku}
                  </div>
                </div>

                {/* Barcode image */}
                <div className="my-1 w-full flex justify-center">
                  <img
                    src={barcodeSvgDataUrl}
                    alt={variant.barcode}
                    className="max-h-11 w-auto object-contain"
                  />
                </div>

                {/* Price and Details */}
                <div className="w-full flex items-center justify-between border-t border-slate-100 pt-1 text-[10px]">
                  <span className="text-slate-600 font-sans truncate max-w-[80px]">
                    {Object.values(variant.attributes).join('/')}
                  </span>
                  <span className="font-extrabold font-mono text-slate-900 text-xs">
                    ฿{variant.salePrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
