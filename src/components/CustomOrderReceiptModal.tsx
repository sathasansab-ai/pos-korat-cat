// src/components/CustomOrderReceiptModal.tsx
import React, { useRef, useState } from 'react';
import { Printer, X, Scissors, CheckCircle2, Clock, Calendar, Phone, User, QrCode } from 'lucide-react';
import type { CustomMadeOrder, StoreSettings } from '../types';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { ThermalPrinterService } from '../services/thermalPrinter';

interface CustomOrderReceiptModalProps {
  isOpen: boolean;
  order: CustomMadeOrder | null;
  settings: StoreSettings;
  paymentPhase?: 'DEPOSIT' | 'FINAL_PICKUP' | 'FULL';
  paidAmountThisTime?: number;
  paymentMethodThisTime?: 'PROMPTPAY' | 'CASH';
  onClose: () => void;
}

export const CustomOrderReceiptModal: React.FC<CustomOrderReceiptModalProps> = ({
  isOpen,
  order,
  settings,
  paymentPhase,
  paidAmountThisTime,
  paymentMethodThisTime,
  onClose
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(() => {
    return ThermalPrinterService.getStoredPaperWidth(settings.printerPaperWidth || '80mm');
  });

  if (!isOpen || !order) return null;

  // Auto-detect payment phase if not explicitly provided
  const isFinalPickup = paymentPhase === 'FINAL_PICKUP' || 
    (order.status === 'COMPLETED' && order.balanceDue === 0 && (order.finalPaidAmount || 0) > 0);
  const isFullPayment = paymentPhase === 'FULL' || 
    (order.paymentType === 'FULL' || order.depositAmount >= order.totalPrice);

  const receiptTitle = isFinalPickup
    ? 'ใบเสร็จรับเงินส่งมอบสินค้า & ชำระยอดคงเหลือ'
    : isFullPayment
    ? 'ใบเสร็จรับเงินงานสั่งตัด (ชำระเต็มจำนวน 100%)'
    : 'ใบเสร็จรับเงินมัดจำงานสั่งตัด (DEPOSIT RECEIPT)';

  const receiptSubTitle = isFinalPickup
    ? 'FINAL PAYMENT & DELIVERY RECEIPT'
    : isFullPayment
    ? 'FULL PAYMENT RECEIPT'
    : 'TAILORING DEPOSIT RECEIPT';

  // Current payment amount and method
  const currentPaid = paidAmountThisTime !== undefined
    ? paidAmountThisTime
    : isFinalPickup
    ? (order.finalPaidAmount ?? order.balanceDue)
    : order.depositAmount;

  const currentMethod = paymentMethodThisTime || (
    isFinalPickup 
      ? (order.finalPaymentMethod || 'PROMPTPAY')
      : (order.depositPaymentMethod || 'PROMPTPAY')
  );

  const remainingBalance = isFinalPickup
    ? 0
    : isFullPayment
    ? 0
    : Math.max(0, order.totalPrice - (order.depositAmount || 0));

  const handleSelectPaperWidth = (w: '58mm' | '80mm') => {
    setPaperWidth(w);
    ThermalPrinterService.setStoredPaperWidth(w);
  };

  const handlePrint = () => {
    ThermalPrinterService.printElement('printable-custom-order-receipt', {
      paperWidth,
      title: `สลิปสั่งตัด-${order.orderNo}`
    });
  };

  const barcodeSvg = BarcodeGenerator.generateSvg(order.orderNo, {
    height: 36,
    showText: true
  });

  const previewMaxWidth = paperWidth === '80mm' ? 'max-w-[340px]' : 'max-w-[270px]';

  const itemsList = order.items && order.items.length > 0 ? order.items : [{
    id: 'item-1',
    categoryType: order.categoryType || 'SHIRT',
    itemDescription: order.itemDescription,
    sizeMode: order.sizeMode || 'STANDARD',
    standardSize: order.standardSize,
    measurements: order.measurements,
    fabricType: order.fabricType,
    specialInstructions: order.specialInstructions,
    qty: order.qty || 1,
    unitPrice: order.totalPrice,
    lineTotal: order.totalPrice
  }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className={`bg-white rounded-3xl shadow-2xl ${previewMaxWidth} w-full overflow-hidden flex flex-col my-auto border border-slate-200 transition-all duration-300`}>
        
        {/* ACTION HEADER (Hidden in Print) */}
        <div className="bg-slate-950 text-white p-3.5 flex flex-col gap-2 no-print border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs">สลิปใบเสร็จรับเงินงานสั่งตัด</h3>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Paper Size Selector */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => handleSelectPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded font-bold transition ${paperWidth === '58mm' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                58 มม.
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded font-bold transition ${paperWidth === '80mm' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                80 มม.
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์สลิป</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE THERMAL RECEIPT SLIP CONTENT */}
        <div 
          id="printable-custom-order-receipt"
          className="p-4 bg-white text-slate-950 font-mono text-[11px] leading-snug select-text overflow-y-auto max-h-[75vh]"
          style={{ width: '100%' }}
        >
          {/* Store Logo & Header */}
          <div className="text-center pb-2.5 border-b border-dashed border-slate-400 space-y-1">
            {settings.logoUrl && (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="max-h-12 w-auto mx-auto object-contain filter grayscale contrast-200 mb-1" 
              />
            )}
            <div className="font-extrabold text-[13px] tracking-tight text-slate-950 uppercase leading-tight font-sans">
              {settings.storeName}
            </div>
            {settings.subTitle && (
              <div className="text-[9.5px] text-slate-600 font-sans leading-tight">
                {settings.subTitle}
              </div>
            )}
            <div className="text-[9px] text-slate-600 leading-tight">
              {settings.address}
            </div>
            <div className="text-[9px] text-slate-600">
              โทร: {settings.phone} | เลขผู้เสียภาษี: {settings.taxId}
            </div>
          </div>

          {/* Receipt Title & Order No Badge */}
          <div className="py-2 text-center border-b border-dashed border-slate-400 space-y-0.5">
            <div className="font-black text-[12px] text-slate-900 font-sans uppercase">
              {receiptTitle}
            </div>
            <div className="text-[9px] text-slate-500 font-sans tracking-wide">
              {receiptSubTitle}
            </div>
            <div className="text-[10px] text-slate-700 pt-0.5">
              เลขที่ใบสั่ง: <span className="font-bold text-slate-950">{order.orderNo}</span>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>วันที่: {new Date().toLocaleDateString('th-TH')}</span>
              <span>{new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
            </div>
            <div className="flex justify-between">
              <span>พนักงาน:</span>
              <span className="font-semibold">{order.staffName || 'สาขาหน้าร้าน'}</span>
            </div>
            <div className="flex justify-between">
              <span>ลูกค้า:</span>
              <span className="font-bold">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>เบอร์โทรศัพท์:</span>
              <span>{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>กำหนดนัดรับ:</span>
              <span className="font-bold text-amber-900">{order.dueDate || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>การรับสินค้า:</span>
              <span>{order.deliveryMethod === 'PICKUP_SHOP' ? 'มารับเองที่หน้าร้าน' : 'จัดส่งพัสดุ'}</span>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="py-2 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold text-[10px] pb-1 text-slate-700">
              <span>รายการสั่งตัด</span>
              <span>จำนวนเงิน</span>
            </div>
            <div className="space-y-1.5 pt-0.5">
              {itemsList.map((item, idx) => (
                <div key={item.id || idx}>
                  <div className="flex justify-between font-bold text-[10.5px]">
                    <span className="pr-1">{idx + 1}. {item.itemDescription || order.itemDescription}</span>
                    <span className="shrink-0 font-mono">฿{(item.lineTotal || item.unitPrice).toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] text-slate-600 pl-3 leading-tight">
                    • ไซส์: {item.sizeMode === 'STANDARD' ? `ไซส์มาตรฐาน (${item.standardSize || 'Free Size'})` : 'วัดตัวสั่งตัดเฉพาะบุคคล'}
                    {item.fabricType && ` | ผ้า: ${item.fabricType}`}
                    {item.qty > 1 && ` (x${item.qty})`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Payment Summary */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span>ยอดรวมงานสั่งตัดทั้งสิ้น:</span>
              <span className="font-bold font-mono">฿{order.totalPrice.toLocaleString()}</span>
            </div>

            {/* Current Payment Highlight */}
            <div className="flex justify-between font-black text-[12px] text-slate-900 py-1 bg-amber-50 px-1.5 rounded border border-amber-200">
              <span>
                {isFinalPickup ? 'ชำระยอดคงเหลือครั้งนี้:' : isFullPayment ? 'ชำระเต็มจำนวนครั้งนี้:' : 'ชำระเงินมัดจำครั้งนี้:'}
              </span>
              <span className="font-mono">฿{currentPaid.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-600 pl-1">
              <span>ช่องทางชำระ:</span>
              <span className="font-bold">{currentMethod === 'CASH' ? '💵 เงินสด' : '📱 PromptPay QR'}</span>
            </div>

            {isFinalPickup && order.depositAmount > 0 && (
              <div className="flex justify-between text-[10px] text-slate-600 pl-1">
                <span>(เงินมัดจำที่เคยชำระแล้ว):</span>
                <span className="font-mono">฿{order.depositAmount.toLocaleString()}</span>
              </div>
            )}

            {/* Remaining Balance Due */}
            <div className="flex justify-between pt-1 border-t border-dotted border-slate-300 font-bold">
              <span>ยอดค้างชำระคงเหลือ:</span>
              {remainingBalance === 0 ? (
                <span className="text-emerald-700 font-black">✓ ชำระครบถ้วน (฿0)</span>
              ) : (
                <span className="text-rose-700 font-black font-mono">฿{remainingBalance.toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Barcode representation for scanner gun */}
          <div className="py-2.5 text-center">
            <div 
              className="inline-block mx-auto"
              dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            />
            <div className="text-[9px] text-slate-500 mt-1">
              {remainingBalance > 0 
                ? '★ กรุณานำสลิปนี้หรือใบสั่งตัดมาแสดงในวันรับสินค้า ★' 
                : '★ ตรวจรับสินค้าเรียบร้อย ขอบพระคุณครับ ★'}
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-1 text-center text-[8.5px] text-slate-400 border-t border-dashed border-slate-300">
            เอกสารนี้ออกโดยระบบ POS Korat Cat • {settings.storeName}
          </div>
        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs no-print">
          <span className="text-slate-500 text-[10.5px]">
            💡 สลิปนี้ใช้เป็นหลักฐานแนบใบสั่งตัดได้
          </span>
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
  );
};
