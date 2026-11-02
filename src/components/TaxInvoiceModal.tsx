// src/components/TaxInvoiceModal.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Printer, X, CheckCircle2, Building2, User, Save, Sparkles } from 'lucide-react';
import type { Order, StoreSettings, CustomerTaxInfo } from '../types';
import { formatThaiBahtText } from '../services/thaiBahtText';
import { db } from '../db';

interface TaxInvoiceModalProps {
  isOpen: boolean;
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
  onSaved?: () => void;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  order,
  settings,
  onClose,
  onSaved
}) => {
  if (!isOpen || !order) return null;

  const [docTitle, setDocTitle] = useState(
    settings.vatType !== 'NONE'
      ? 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)'
      : 'ใบเสร็จรับเงิน (Receipt)'
  );
  const [invoiceNo, setInvoiceNo] = useState(
    order.taxInvoiceNo || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${order.localOrderId.replace(/\D/g, '').slice(-4)}`
  );
  const [invoiceDate, setInvoiceDate] = useState(
    order.taxInvoiceDate || new Date().toISOString().slice(0, 10)
  );

  // Customer Tax Info State
  const [customerName, setCustomerName] = useState(order.customerTaxInfo?.name || order.customerName || '');
  const [taxId, setTaxId] = useState(order.customerTaxInfo?.taxId || '');
  const [branch, setBranch] = useState(order.customerTaxInfo?.branch || 'สำนักงานใหญ่ (Head Office)');
  const [address, setAddress] = useState(order.customerTaxInfo?.address || '');
  const [phone, setPhone] = useState(order.customerTaxInfo?.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate VAT based on settings
  const vatRate = settings.vatRate || 7;
  let preTax = order.netTotal;
  let vat = 0;
  let grandTotal = order.netTotal;

  if (settings.vatType === 'INCLUSIVE') {
    // ราคารวม VAT แล้ว -> preTax = netTotal * 100 / 107
    preTax = (order.netTotal * 100) / (100 + vatRate);
    vat = order.netTotal - preTax;
    grandTotal = order.netTotal;
  } else if (settings.vatType === 'EXCLUSIVE') {
    // ราคาไม่รวม VAT -> คิดเพิ่ม 7%
    preTax = order.netTotal;
    vat = (preTax * vatRate) / 100;
    grandTotal = preTax + vat;
  } else {
    // ไม่คิด VAT
    preTax = order.netTotal;
    vat = 0;
    grandTotal = order.netTotal;
  }

  const bahtText = formatThaiBahtText(grandTotal);

  const handleSaveInfo = async () => {
    const taxInfo: CustomerTaxInfo = {
      name: customerName,
      taxId,
      branch,
      address,
      phone
    };

    await db.orders.update(order.id, {
      isTaxInvoiceIssued: true,
      taxInvoiceNo: invoiceNo,
      taxInvoiceDate: invoiceDate,
      customerTaxInfo: taxInfo,
      vatType: settings.vatType,
      vatRate,
      preTaxAmount: preTax,
      vatAmount: vat
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onSaved) onSaved();
  };

  const handlePrint = () => {
    // 1. First attempt to use print iframe for 100% isolated single A4 page print
    const printEl = document.getElementById('printable-tax-invoice');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-tax-invoice-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-tax-invoice-iframe';
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

      // Copy stylesheets to iframe
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docTitle} - ${invoiceNo}</title>
            ${styles}
            <style>
              @page { size: A4 portrait; margin: 8mm 10mm; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; font-family: system-ui, -apple-system, sans-serif; }
              #printable-tax-invoice { max-width: 100% !important; max-height: none !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; }
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
        setTimeout(() => {
          if (document.getElementById('print-tax-invoice-iframe')) {
            printFrame.remove();
          }
        }, 3000);
      }, 350);
    } catch {
      window.print();
    }
  };

  const handleSetQuickIndividual = () => {
    setCustomerName(order.customerName || 'ลูกค้าทั่วไป');
    setTaxId('-');
    setBranch('-');
    setAddress('ตามที่ระบุในระบบ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto border border-slate-200 animate-in fade-in">
        {/* Action Header (Hidden in Print) */}
        <div className="bg-slate-950 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">ออกใบเสร็จรับเงิน / ใบกำกับภาษี (Tax Invoice / Receipt)</h3>
              <p className="text-[10px] text-slate-400">ขนาดมาตรฐาน A4 หน้าเดียว ถูกต้องตามกรมสรรพากร</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveInfo}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูลบิล</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ A4 (1 หน้าพอดี)</span>
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit Inputs for Customer Tax Info (Hidden in Print) */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs no-print space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>ข้อมูลผู้ซื้อสำหรับออกใบเสร็จ / ใบกำกับภาษี:</span>
            </div>
            <button
              type="button"
              onClick={handleSetQuickIndividual}
              className="text-[11px] text-amber-700 hover:underline font-semibold"
            >
              + กรอกเป็นลูกค้าทั่วไป (ไม่ต้องระบุเลขภาษี)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">หัวเอกสาร</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-amber-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">ชื่อผู้ซื้อ / นิติบุคคล *</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="ชื่อบริษัท หรือ ชื่อลูกค้า..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
              <input
                type="text"
                maxLength={13}
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                placeholder="01055xxxxxxxx หรือ -"
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">สาขา</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="สำนักงานใหญ่ หรือ -"
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">ที่อยู่ตามทะเบียนภาษี *</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* PRINTABLE A4 TAX INVOICE CONTENT (Engineered to fit precisely on 1 A4 page) */}
        <div 
          className="p-6 bg-white text-slate-900 font-sans text-xs select-text overflow-y-auto max-h-[62vh] print:max-h-none print:overflow-visible print:p-0 print:m-0"
          id="printable-tax-invoice"
        >
          {/* Company / Store Header */}
          <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900 gap-4">
            <div className="flex items-center space-x-3">
              {settings.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  className="max-h-16 max-w-[130px] w-auto h-auto object-contain flex-shrink-0 select-none"
                />
              )}
              <div>
                <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-slate-900 leading-tight">
                  {settings.storeName}
                </h1>
                <div className="text-[10px] text-slate-600 mt-0.5">{settings.subTitle}</div>
                <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{settings.address}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  โทร: {settings.phone} | เลขประจำตัวผู้เสียภาษีอากร: <b>{settings.taxId}</b> (สำนักงานใหญ่)
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <h2 className="text-xs sm:text-sm font-black text-amber-800 uppercase tracking-wide">
                {docTitle}
              </h2>
              <div className="mt-1 space-y-0.5 text-[10px] sm:text-[11px]">
                <div><b>เลขที่เอกสาร:</b> <span className="font-mono font-bold">{invoiceNo}</span></div>
                <div><b>วันที่:</b> {new Date(invoiceDate).toLocaleDateString('th-TH')}</div>
                <div><b>อ้างอิงบิลขาย:</b> <span className="font-mono">{order.localOrderId}</span></div>
              </div>
            </div>
          </div>

          {/* Customer / Buyer Section */}
          <div className="my-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs leading-snug">
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">ข้อมูลผู้ซื้อ / ข้อมูลลูกค้า</div>
              <div className="font-bold text-slate-900 text-xs sm:text-sm">{customerName || 'ลูกค้าทั่วไป (Walk-in Customer)'}</div>
              <div className="text-slate-600 text-[10.5px] mt-0.5">{address || 'ที่อยู่: ตามที่ระบุ'}</div>
              {phone && <div className="text-slate-600 text-[10px]">โทร: {phone}</div>}
            </div>

            <div className="text-right sm:text-left text-[10.5px]">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">ข้อมูลภาษี & พนักงาน</div>
              <div><b>เลขประจำตัวผู้เสียภาษี:</b> <span className="font-mono font-bold">{taxId || '-'}</span></div>
              <div><b>สาขา:</b> {branch}</div>
              <div><b>แคชเชียร์ผู้รับเงิน:</b> {order.cashierName}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-[11px] border border-slate-300 rounded-lg overflow-hidden mb-2.5">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300 text-[10px]">
              <tr>
                <th className="p-2 text-center w-10">ลำดับ</th>
                <th className="p-2">รายการสินค้า / บริการ</th>
                <th className="p-2 text-center w-16">จำนวน</th>
                <th className="p-2 text-right w-24">ราคา/หน่วย</th>
                <th className="p-2 text-right w-24">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="p-1.5 text-center font-mono text-slate-500">{index + 1}</td>
                  <td className="p-1.5">
                    <div className="font-bold text-slate-900 leading-tight">{item.productName}</div>
                    {item.attributes && (
                      <div className="text-[9.5px] text-slate-500">
                        {Object.values(item.attributes).join(' • ')} (SKU: {item.sku})
                      </div>
                    )}
                  </td>
                  <td className="p-1.5 text-center font-mono font-semibold">{item.qty}</td>
                  <td className="p-1.5 text-right font-mono">฿{item.unitPrice.toLocaleString()}</td>
                  <td className="p-1.5 text-right font-mono font-bold">฿{item.lineTotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals & Baht Text */}
          <div className="grid grid-cols-12 gap-3 pb-2.5 border-b border-slate-200">
            {/* Thai Baht Text */}
            <div className="col-span-7 flex flex-col justify-end p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="text-[9px] font-bold uppercase text-amber-800 tracking-wider">จำนวนเงินตัวอักษร</span>
              <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 leading-snug">{bahtText}</div>
            </div>

            {/* Calculations Breakdown */}
            <div className="col-span-5 space-y-0.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>มูลค่ารวม (Subtotal):</span>
                <span className="font-mono">฿{order.subtotal.toLocaleString()}</span>
              </div>

              {(order.promoDiscount > 0 || (order.customDiscountAmount || 0) > 0) && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>ส่วนลดรวม:</span>
                  <span className="font-mono">-฿{((order.promoDiscount || 0) + (order.customDiscountAmount || 0)).toLocaleString()}</span>
                </div>
              )}

              {settings.vatType !== 'NONE' && (
                <>
                  <div className="flex justify-between text-slate-600 pt-0.5 border-t border-slate-200">
                    <span>มูลค่าสินค้าก่อนภาษี:</span>
                    <span className="font-mono">฿{preTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม VAT {vatRate}%:</span>
                    <span className="font-mono">฿{vat.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-baseline pt-1 border-t-2 border-slate-900 font-black text-slate-900">
                <span className="text-xs">จำนวนเงินรวมทั้งสิ้น:</span>
                <span className="text-sm sm:text-base font-mono text-amber-800">฿{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-2 gap-6 pt-4 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 w-44 mx-auto mb-1.5 h-7"></div>
              <div className="font-bold text-slate-800 text-[11px]">( {customerName || 'ผู้จ่ายเงิน'} )</div>
              <div className="text-[9.5px] text-slate-500">ผู้รับบริการ / ผู้จ่ายเงิน</div>
            </div>

            <div>
              <div className="border-b border-slate-400 w-44 mx-auto mb-1.5 h-7"></div>
              <div className="font-bold text-slate-800 text-[11px]">( {order.cashierName} )</div>
              <div className="text-[9.5px] text-slate-500">ผู้รับเงิน / แคชเชียร์ผู้มีอำนาจลงนาม</div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-4 text-center text-[9.5px] text-slate-400 pt-1.5 border-t border-slate-100">
            เอกสารนี้ออกโดยระบบ POS Korat Cat • ในนาม {settings.storeName}
          </div>
        </div>
      </div>
    </div>
  );
};
