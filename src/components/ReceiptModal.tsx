// src/components/ReceiptModal.tsx
import React, { useRef, useState } from 'react';
import { Printer, X, FileText, Settings2, Sliders, AlertCircle } from 'lucide-react';
import type { Order, StoreSettings } from '../types';
import { db } from '../db';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { ThermalPrinterService } from '../services/thermalPrinter';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onOpenTaxInvoice?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  order,
  settings,
  onClose,
  onOpenTaxInvoice
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Settings State: Paper Width, Scale %, Font Size
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(() => {
    return ThermalPrinterService.getStoredPaperWidth(settings.printerPaperWidth || '80mm');
  });

  const [scale, setScale] = useState<number>(() => {
    return ThermalPrinterService.getStoredScale(100);
  });

  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>(() => {
    return ThermalPrinterService.getStoredFontSize('normal');
  });

  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    return settings.autoPrintReceiptOnComplete ?? false;
  });

  const [isCalibratorOpen, setIsCalibratorOpen] = useState(false);

  const handleSelectPaperWidth = (w: '58mm' | '80mm') => {
    setPaperWidth(w);
    ThermalPrinterService.setStoredPaperWidth(w);
  };

  const handleAdjustScale = (delta: number) => {
    const next = Math.max(75, Math.min(115, scale + delta));
    setScale(next);
    ThermalPrinterService.setStoredScale(next);
  };

  const handleSelectFontSize = (size: 'compact' | 'normal' | 'large') => {
    setFontSize(size);
    ThermalPrinterService.setStoredFontSize(size);
  };

  const handleToggleAutoPrint = async (checked: boolean) => {
    setAutoPrint(checked);
    if (settings.id) {
      await db.settings.update(settings.id, { autoPrintReceiptOnComplete: checked });
    }
  };

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    ThermalPrinterService.printElement('printable-thermal-receipt', {
      paperWidth,
      scale,
      fontSize,
      title: `สลิปใบเสร็จ-${order.localOrderId}`
    });
  };

  const barcodeSvg = BarcodeGenerator.generateSvg(order.localOrderId, {
    height: 38,
    showText: true
  });

  // Calculate live preview container max-width to simulate physical paper
  const previewMaxWidth = paperWidth === '80mm' ? 'max-w-[340px]' : 'max-w-[270px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      {/* Modal Card */}
      <div className={`bg-white rounded-3xl shadow-2xl ${previewMaxWidth} w-full overflow-hidden flex flex-col my-auto border border-slate-200 transition-all duration-300`}>
        
        {/* ACTION HEADER (Hidden in Print) */}
        <div className="bg-slate-950 text-white p-3.5 flex flex-col gap-2 no-print border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs">พิมพ์สลิปใบเสร็จ</h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCalibratorOpen(prev => !prev)}
                className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                  isCalibratorOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="ปรับจูนขนาด/สเกลและตัวอักษรให้พอดีกับกระดาษ"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[10px]">ปรับจูนสลิป</span>
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Paper Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleSelectPaperWidth('80mm')}
              className={`py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                paperWidth === '80mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🖨️ 80 มม. (เครื่องใหญ่)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPaperWidth('58mm')}
              className={`py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                paperWidth === '58mm'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🖨️ 58 มม. (Xprinter/เล็ก)</span>
            </button>
          </div>

          {/* Calibrator Drawer (Scale & Font Size & Auto-Print) */}
          {isCalibratorOpen && (
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-amber-500/30 text-xs space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-[11px] font-semibold">🔍 สเกลย่อ/ขยาย ({scale}%):</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAdjustScale(-5)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                    title="ย่อลง 5%"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-amber-400 px-2 text-xs">
                    {scale}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdjustScale(5)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                    title="ขยายขึ้น 5%"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-[11px] font-semibold">🔤 ขนาดตัวอักษร:</span>
                <div className="flex gap-1 text-[10px]">
                  {(['compact', 'normal', 'large'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSelectFontSize(s)}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        fontSize === s
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s === 'compact' ? 'กะทัดรัด' : s === 'normal' ? 'ปกติ' : 'ใหญ่'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Print Quick Checkbox */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition py-0.5">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={e => handleToggleAutoPrint(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-bold">
                    ⚡ พิมพ์อัตโนมัติเมื่อคิดเงินเสร็จ (Auto-Print)
                  </span>
                </label>
              </div>

              {/* Crucial Printer Driver Advice */}
              <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-[10px] text-amber-200 leading-relaxed flex gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>เคล็ดลับให้สลิปออกพอดีเป๊ะ 100%:</strong>
                  <br />ในหน้าต่างสั่งพิมพ์ (Ctrl+P) ของคอมพิวเตอร์ ให้เลือก <strong>ระยะขอบ (Margins) ➔ "ไม่มี" (None)</strong> และนำติ๊ก <strong>"ส่วนหัวและส่วนท้าย" ออก</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SCROLLABLE MODAL BODY (Keeps max-height away from printable container) */}
        <div className="flex-1 max-h-[68vh] overflow-y-auto bg-slate-100 p-2 sm:p-3">
          {/* PRINTABLE THERMAL RECEIPT CONTAINER */}
          <div
            ref={receiptRef}
            id="printable-thermal-receipt"
            className="p-4 sm:p-5 text-slate-950 font-mono text-xs bg-white select-text w-full rounded-2xl shadow-xs mx-auto"
          >
            {/* Store Brand Header */}
            <div className="text-center pb-1">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt="Store Logo"
                  className="max-h-12 max-w-[120px] w-auto h-auto mx-auto mb-1.5 object-contain select-none"
                />
              )}
              <h2 className="font-black text-sm text-slate-950 uppercase tracking-tight">
                {settings.storeName}
              </h2>
              <div className="text-[10px] text-slate-700 font-sans font-medium mt-0.5">
                {settings.subTitle}
              </div>
              <div className="text-[9px] text-slate-600 font-sans mt-0.5 leading-tight">
                {settings.address}
              </div>
              <div className="text-[9px] text-slate-600 font-sans mt-0.5">
                โทร: {settings.phone} | เลขผู้เสียภาษี: {settings.taxId}
              </div>
              {settings.receiptHeader && (
                <div className="text-[9.5px] text-slate-800 font-sans mt-1 whitespace-pre-line italic font-semibold">
                  {settings.receiptHeader}
                </div>
              )}
            </div>

            {/* DIVIDER 1 */}
            <div className="receipt-line my-2 border-t border-dashed border-slate-900" />

            {/* Bill Metadata */}
            <div className="py-1 text-[10.5px] space-y-0.5 font-medium">
              <div className="flex justify-between">
                <span>เลขที่บิล:</span>
                <span className="font-bold">{order.localOrderId}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>วันที่:</span>
                <span>{new Date(order.timestamp).toLocaleString('th-TH')}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>พนักงาน:</span>
                <span>{order.cashierName}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between text-slate-900 font-bold">
                  <span>สมาชิก:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
            </div>

            {/* DIVIDER 2 */}
            <div className="receipt-line my-2 border-t border-dashed border-slate-900" />

            {/* Items List (Two-row rock-solid layout: Never overflows or breaks lines) */}
            <div className="py-1">
              <div className="text-[10px] font-black uppercase text-slate-800 pb-1.5 flex justify-between">
                <span>รายการสินค้า</span>
                <span>จำนวนเงิน</span>
              </div>

              <div className="space-y-1.5 py-0.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-0.5">
                    {/* Row 1: Full Item Name + Variant Attributes */}
                    <div className="font-bold text-slate-950 leading-tight break-words">
                      {item.productName}
                      {item.isFreeGift && (
                        <span className="text-[9.5px] text-rose-700 font-extrabold ml-1">
                          (ของสมนาคุณฟรี)
                        </span>
                      )}
                    </div>
                    {item.attributes && (
                      <div className="text-[8.5px] text-slate-600 font-sans">
                        {Object.values(item.attributes).join(' / ')}
                      </div>
                    )}

                    {/* Row 2: Quantity x Unit Price on Left, Line Total on Right */}
                    <div className="flex justify-between items-baseline text-[10.5px] mt-0.5">
                      <span className="text-slate-600 font-sans">
                        {item.qty} ชิ้น x {item.isFreeGift ? 'ฟรี ฿0' : `@${item.unitPrice.toLocaleString()}`}
                      </span>
                      <span className="font-black font-mono text-slate-950 whitespace-nowrap ml-2">
                        {item.isFreeGift ? '฿0' : `฿${item.lineTotal.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DIVIDER 3 */}
            <div className="receipt-line my-2 border-t border-dashed border-slate-900" />

            {/* Financial Calculation */}
            <div className="py-1 space-y-1 text-xs">
              <div className="flex justify-between text-slate-700 font-medium">
                <span>ยอดรวมสินค้า:</span>
                <span className="font-mono whitespace-nowrap font-bold">฿{order.subtotal.toLocaleString()}</span>
              </div>

              {(order.promoDiscount || 0) > 0 ? (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>ส่วนลดโปรโมชั่น:</span>
                  <span className="font-mono whitespace-nowrap">-฿{(order.promoDiscount || 0).toLocaleString()}</span>
                </div>
              ) : null}

              {(order.memberDiscountAmount || 0) > 0 ? (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>ส่วนลดบัตรสมาชิก:</span>
                  <span className="font-mono whitespace-nowrap">-฿{(order.memberDiscountAmount || 0).toLocaleString()}</span>
                </div>
              ) : null}

              {(order.customDiscountAmount || 0) > 0 ? (
                <div className="flex justify-between text-rose-800 font-bold">
                  <span>ส่วนลดพิเศษ:</span>
                  <span className="font-mono whitespace-nowrap">-฿{(order.customDiscountAmount || 0).toLocaleString()}</span>
                </div>
              ) : null}

              {/* DIVIDER 4 */}
              <div className="receipt-line my-1.5 border-t border-dashed border-slate-900" />

              {/* NET TOTAL */}
              <div className="flex justify-between items-baseline text-sm font-black text-slate-950 py-0.5">
                <span>ยอดสุทธิ (NET):</span>
                <span className="text-base font-black font-mono whitespace-nowrap">฿{order.netTotal.toLocaleString()}</span>
              </div>

              {/* Payments Breakdown */}
              <div className="pt-0.5 text-[10.5px] text-slate-700 space-y-0.5 font-medium">
                {order.payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span>ชำระด้วย {p.method === 'CASH' ? 'เงินสด' : p.method === 'PROMPTPAY' ? 'PromptPay' : p.method}:</span>
                    <span className="font-mono whitespace-nowrap font-bold">฿{p.amount.toLocaleString()}</span>
                  </div>
                ))}
                {order.cashReceived !== undefined && order.cashReceived > 0 && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>รับเงินสด:</span>
                      <span className="font-mono whitespace-nowrap">฿{order.cashReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-950">
                      <span>เงินทอน:</span>
                      <span className="font-mono whitespace-nowrap font-black">฿{(order.changeGiven || 0).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DIVIDER 5 */}
            <div className="receipt-line my-2 border-t border-dashed border-slate-900" />

            {/* Barcode & Footer */}
            <div className="text-center pt-1 space-y-2">
              <div 
                className="flex justify-center items-center [&_svg]:max-w-[88%] [&_svg]:h-auto [&_svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: barcodeSvg }}
              />
              {settings.receiptFooter && (
                <div className="text-[9.5px] text-slate-700 font-sans whitespace-pre-line leading-relaxed font-medium">
                  {settings.receiptFooter}
                </div>
              )}
              <div className="text-[8.5px] text-slate-500 font-sans">
                ขอบคุณที่มาอุดหนุน • ยินดีให้บริการอีกครั้ง
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS (Hidden in Print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition"
          >
            ปิด
          </button>

          {onOpenTaxInvoice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTaxInvoice();
              }}
              className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>ใบกำกับภาษี (A4)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สลิป ({paperWidth})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
