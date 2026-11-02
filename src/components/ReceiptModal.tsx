// src/components/ReceiptModal.tsx
import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, QrCode, FileText } from 'lucide-react';
import type { Order, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';

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
  const [paperWidth, setPaperWidth] = React.useState<'58mm' | '80mm'>(
    settings.printerPaperWidth || '80mm'
  );

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const printEl = document.getElementById('printable-thermal-receipt');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-thermal-receipt-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-thermal-receipt-iframe';
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

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>สลิปใบเสร็จ - ${order.localOrderId}</title>
            ${styles}
            <style>
              @page { 
                size: ${paperWidth === '80mm' ? '80mm auto' : '58mm auto'}; 
                margin: 0mm !important; 
              }
              * { 
                box-sizing: border-box; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              html, body { 
                background: #ffffff !important; 
                color: #000000 !important; 
                padding: 1mm 2mm 3mm 2mm !important; 
                margin: 0 auto !important; 
                width: 100% !important;
                max-width: ${paperWidth === '80mm' ? '72mm' : '48mm'} !important;
                font-family: 'Courier New', Courier, monospace, system-ui, sans-serif !important;
                font-size: ${paperWidth === '80mm' ? '11px' : '9.5px'} !important;
                line-height: 1.25 !important;
                overflow: hidden !important;
                height: auto !important;
              }
              #printable-thermal-receipt { 
                width: 100% !important; 
                max-width: ${paperWidth === '80mm' ? '72mm' : '48mm'} !important;
                border: none !important; 
                padding: 0 !important; 
                margin: 0 auto !important;
                background: #ffffff !important; 
                box-shadow: none !important; 
              }
              img {
                max-width: ${paperWidth === '80mm' ? '46mm' : '36mm'} !important;
                height: auto !important;
                display: block !important;
                margin-left: auto !important;
                margin-right: auto !important;
              }
              .no-print { display: none !important; }
            </style>
          </head>
          <body>
            ${printEl.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 300);
    } catch (e) {
      window.print();
    }
  };

  const barcodeDataUrl = BarcodeGenerator.generateDataUrl(order.localOrderId, {
    height: 40,
    showText: true
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Action Header (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">ใบเสร็จรับเงิน</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm vs 80mm Switcher */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-[11px] font-bold border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded transition ${
                  paperWidth === '58mm' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="XP-58IIH หรือเครื่องสลิปขนาดเล็ก 58mm"
              >
                58 มม.
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded transition ${
                  paperWidth === '80mm' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Epson, Xprinter, Sunmi ขนาด 80mm"
              >
                80 มม.
              </button>
            </div>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT (Optimized for 80mm / 58mm Thermal Printers) */}
        <div
          ref={receiptRef}
          className="p-6 text-slate-800 font-mono text-xs bg-white select-text print:p-2 print:m-0 print:w-full"
          id="printable-thermal-receipt"
        >
          {/* Store Brand & Logo */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt="Store Logo"
                className="max-h-16 max-w-[140px] w-auto h-auto mx-auto mb-2 object-contain select-none"
              />
            )}
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-tight">
              {settings.storeName}
            </h2>
            <div className="text-[10px] text-slate-600 font-sans mt-0.5">{settings.subTitle}</div>
            <div className="text-[9px] text-slate-500 mt-1 font-sans">{settings.address}</div>
            <div className="text-[9px] text-slate-500 font-sans">
              โทร: {settings.phone} | เลขผู้เสียภาษี: {settings.taxId}
            </div>
            {settings.receiptHeader && (
              <div className="text-[9px] text-amber-800 font-sans mt-1.5 whitespace-pre-line italic">
                {settings.receiptHeader}
              </div>
            )}
          </div>

          {/* Bill Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
            <div className="flex justify-between font-bold">
              <span>เลขที่บิล:</span>
              <span>{order.localOrderId}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>วันที่/เวลา:</span>
              <span>{new Date(order.timestamp).toLocaleString('th-TH')}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>แคชเชียร์:</span>
              <span>{order.cashierName}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between text-slate-700 font-medium">
                <span>ลูกค้าสมาชิก:</span>
                <span>{order.customerName}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold pb-1 text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <span className="w-1/2">รายการ</span>
              <span className="w-1/6 text-center">จำนวน</span>
              <span className="w-1/3 text-right">จำนวนเงิน</span>
            </div>

            <div className="divide-y divide-slate-100 py-1 space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="pt-1.5">
                  <div className="font-semibold text-slate-900 leading-tight">
                    {item.productName}
                  </div>
                  {item.attributes && (
                    <div className="text-[9px] text-slate-500 font-sans">
                      {Object.values(item.attributes).join(' / ')}
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-slate-600 mt-0.5">
                    <span className="w-1/2 text-slate-400">@{item.unitPrice.toLocaleString()}</span>
                    <span className="w-1/6 text-center">{item.qty}</span>
                    <span className="w-1/3 text-right font-bold">฿{item.lineTotal.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Calculation */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>ยอดรวมสินค้า:</span>
              <span>฿{order.subtotal.toLocaleString()}</span>
            </div>

            {order.promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>ส่วนลดโปรโมชั่น:</span>
                <span>-฿{order.promoDiscount.toLocaleString()}</span>
              </div>
            )}

            {order.memberDiscountAmount && order.memberDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-800 font-semibold">
                <span>ส่วนลดบัตรสมาชิก ({order.memberTier === 'BLACK_WISDOM' ? `${settings.blackWisdomDiscountPercent ?? 10}%` : `${settings.goldDiscountPercent ?? 5}%`}):</span>
                <span>-฿{order.memberDiscountAmount.toLocaleString()}</span>
              </div>
            )}

            {order.customDiscountAmount && order.customDiscountAmount > 0 && (
              <div className="flex justify-between text-rose-700 font-semibold">
                <span>ส่วนลดพิเศษ ({order.customDiscountReason || 'ส่วนลดหน้าร้าน'}):</span>
                <span>-฿{order.customDiscountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>ยอดสุทธิ (NET):</span>
              <span>฿{order.netTotal.toLocaleString()}</span>
            </div>

            {/* Payments breakdown */}
            <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
              {order.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span>ชำระด้วย {p.method === 'CASH' ? 'เงินสด' : p.method === 'PROMPTPAY' ? 'สแกน QR PromptPay' : p.method}:</span>
                  <span>฿{p.amount.toLocaleString()}</span>
                </div>
              ))}
              {order.cashReceived !== undefined && order.cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>รับเงินสด:</span>
                    <span>฿{order.cashReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>เงินทอน:</span>
                    <span>฿{(order.changeGiven || 0).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Barcode & Footer */}
          <div className="text-center pt-3 space-y-2">
            <img src={barcodeDataUrl} alt="Order Barcode" className="mx-auto max-h-12" />
            <div className="text-[10px] text-slate-600 font-sans whitespace-pre-line leading-relaxed">
              {settings.receiptFooter}
            </div>
            <div className="text-[9px] text-slate-400">ขอบคุณที่มาอุดหนุน • ยินดีให้บริการอีกครั้ง</div>
          </div>
        </div>

        {/* Bottom Actions (Hidden in Print) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
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
              className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>ออกใบกำกับภาษี (A4)</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สลิป (Thermal)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
