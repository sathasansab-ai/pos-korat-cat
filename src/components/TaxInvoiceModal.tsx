// src/components/TaxInvoiceModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  X, 
  CheckCircle2, 
  Building2, 
  Save, 
  Plus, 
  Trash2, 
  Receipt, 
  DollarSign, 
  User, 
  CreditCard,
  QrCode,
  Banknote,
  Search,
  Percent
} from 'lucide-react';
import type { Order, StoreSettings, CustomerTaxInfo, UserAccount, PaymentMethodType, ProductVariant } from '../types';
import { formatThaiBahtText } from '../services/thaiBahtText';
import { db } from '../db';
import { CloudSync } from '../services/cloudSync';

interface StandaloneLineItem {
  id: string;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
}

interface TaxInvoiceModalProps {
  isOpen: boolean;
  order?: Order | null;
  isStandalone?: boolean;
  settings: StoreSettings;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onSaved?: (savedOrder?: Order) => void;
}

export const TaxInvoiceModal: React.FC<TaxInvoiceModalProps> = ({
  isOpen,
  order,
  isStandalone = false,
  settings,
  currentUser,
  onClose,
  onSaved
}) => {
  // If not open, or in attached mode without an order, return null
  if (!isOpen) return null;
  if (!isStandalone && !order) return null;

  const isStandaloneMode = isStandalone || !order;

  // Header and Document Titles
  const [docTitle, setDocTitle] = useState(
    settings.vatType !== 'NONE'
      ? 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)'
      : 'ใบเสร็จรับเงิน (Receipt)'
  );

  const generateDefaultInvoiceNo = () => {
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    if (order) {
      return order.taxInvoiceNo || `INV-${ymd}-${order.localOrderId.replace(/\D/g, '').slice(-4) || rand}`;
    }
    return `INV-${ymd}-${rand}`;
  };

  const [invoiceNo, setInvoiceNo] = useState(generateDefaultInvoiceNo());
  const [invoiceDate, setInvoiceDate] = useState(
    order?.taxInvoiceDate || new Date().toISOString().slice(0, 10)
  );

  // Customer Tax Info State
  const [customerName, setCustomerName] = useState(order?.customerTaxInfo?.name || order?.customerName || '');
  const [taxId, setTaxId] = useState(order?.customerTaxInfo?.taxId || '');
  const [branch, setBranch] = useState(order?.customerTaxInfo?.branch || 'สำนักงานใหญ่ (Head Office)');
  const [address, setAddress] = useState(order?.customerTaxInfo?.address || '');
  const [phone, setPhone] = useState(order?.customerTaxInfo?.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Standalone Specific State
  const [standaloneItems, setStandaloneItems] = useState<StandaloneLineItem[]>([
    { id: 'item-1', productName: '', sku: '', qty: 1, unitPrice: 0 }
  ]);
  const [standaloneDiscount, setStandaloneDiscount] = useState<number>(0);
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || order?.cashierName || 'แคชเชียร์');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
  const [vatType, setVatType] = useState<'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'>(settings.vatType || 'INCLUSIVE');
  const [vatRate, setVatRate] = useState<number>(settings.vatRate || 7);
  const [currentSavedOrder, setCurrentSavedOrder] = useState<Order | null>(null);

  // Catalog variant suggestions for autocomplete
  const [variantsCatalog, setVariantsCatalog] = useState<ProductVariant[]>([]);
  const [activeItemIndexForSuggest, setActiveItemIndexForSuggest] = useState<number | null>(null);
  const [variantSearchText, setVariantSearchText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInvoiceNo(generateDefaultInvoiceNo());
      setInvoiceDate(order?.taxInvoiceDate || new Date().toISOString().slice(0, 10));
      setCustomerName(order?.customerTaxInfo?.name || order?.customerName || '');
      setTaxId(order?.customerTaxInfo?.taxId || '');
      setBranch(order?.customerTaxInfo?.branch || 'สำนักงานใหญ่ (Head Office)');
      setAddress(order?.customerTaxInfo?.address || '');
      setPhone(order?.customerTaxInfo?.phone || '');
      setCashierName(currentUser?.name || order?.cashierName || 'แคชเชียร์');
      setVatType(settings.vatType || 'INCLUSIVE');
      setVatRate(settings.vatRate || 7);
      setCurrentSavedOrder(null);

      if (isStandaloneMode) {
        setStandaloneItems([
          { id: `item-${Date.now()}`, productName: '', sku: '', qty: 1, unitPrice: 0 }
        ]);
        setStandaloneDiscount(0);
      }

      // Preload variants for fast autocomplete
      db.variants.where({ isActive: true }).toArray().then(vars => {
        setVariantsCatalog(vars);
      }).catch(() => {});
    }
  }, [isOpen, order, isStandaloneMode]);

  // Standalone Item Handlers
  const handleAddLineItem = () => {
    setStandaloneItems(prev => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, productName: '', sku: '', qty: 1, unitPrice: 0 }
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (standaloneItems.length <= 1) {
      setStandaloneItems([{ id: `item-${Date.now()}`, productName: '', sku: '', qty: 1, unitPrice: 0 }]);
      return;
    }
    setStandaloneItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof StandaloneLineItem, value: any) => {
    setStandaloneItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSelectVariantForLine = (index: number, variant: ProductVariant) => {
    setStandaloneItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        productName: variant.productName,
        sku: variant.sku,
        unitPrice: variant.salePrice
      };
      return next;
    });
    setActiveItemIndexForSuggest(null);
    setVariantSearchText('');
  };

  // Financial Calculations
  const calculated = useMemo(() => {
    if (isStandaloneMode && !currentSavedOrder) {
      const rawSubtotal = standaloneItems.reduce((sum, it) => sum + ((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)), 0);
      const discount = Math.min(rawSubtotal, Math.max(0, Number(standaloneDiscount) || 0));
      const afterDiscount = Math.max(0, rawSubtotal - discount);

      let preTax = afterDiscount;
      let vat = 0;
      let grandTotal = afterDiscount;

      if (vatType === 'INCLUSIVE') {
        preTax = (afterDiscount * 100) / (100 + vatRate);
        vat = afterDiscount - preTax;
        grandTotal = afterDiscount;
      } else if (vatType === 'EXCLUSIVE') {
        preTax = afterDiscount;
        vat = (preTax * vatRate) / 100;
        grandTotal = preTax + vat;
      } else {
        preTax = afterDiscount;
        vat = 0;
        grandTotal = afterDiscount;
      }

      return {
        subtotal: rawSubtotal,
        discount,
        preTax,
        vat,
        grandTotal
      };
    } else {
      const targetOrder = currentSavedOrder || order!;
      const discount = (targetOrder.promoDiscount || 0) + (targetOrder.customDiscountAmount || 0);
      let preTax = targetOrder.netTotal;
      let vat = 0;
      let grandTotal = targetOrder.netTotal;

      if (settings.vatType === 'INCLUSIVE') {
        preTax = (targetOrder.netTotal * 100) / (100 + vatRate);
        vat = targetOrder.netTotal - preTax;
        grandTotal = targetOrder.netTotal;
      } else if (settings.vatType === 'EXCLUSIVE') {
        preTax = targetOrder.netTotal;
        vat = (preTax * vatRate) / 100;
        grandTotal = preTax + vat;
      } else {
        preTax = targetOrder.netTotal;
        vat = 0;
        grandTotal = targetOrder.netTotal;
      }

      return {
        subtotal: targetOrder.subtotal,
        discount,
        preTax,
        vat,
        grandTotal
      };
    }
  }, [isStandaloneMode, currentSavedOrder, order, standaloneItems, standaloneDiscount, vatType, vatRate, settings.vatType]);

  const bahtText = formatThaiBahtText(calculated.grandTotal);

  // Save Handler
  const handleSaveInfo = async () => {
    const taxInfo: CustomerTaxInfo = {
      name: customerName.trim() || 'ลูกค้าทั่วไป',
      taxId: taxId.trim(),
      branch: branch.trim() || 'สำนักงานใหญ่',
      address: address.trim(),
      phone: phone.trim()
    };

    if (isStandaloneMode && !currentSavedOrder) {
      // Validate at least one line item
      const validItems = standaloneItems.filter(it => it.productName.trim() !== '');
      if (validItems.length === 0) {
        alert('กรุณาระบุชื่อสินค้าหรือบริการอย่างน้อย 1 รายการ');
        return;
      }

      const generatedId = `TAX-ORD-${Date.now()}`;
      const generatedLocalId = `TAX-${invoiceDate.replace(/-/g, '').slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        id: generatedId,
        localOrderId: generatedLocalId,
        timestamp: new Date(invoiceDate).toISOString(),
        cashierId: currentUser?.id || 'manual-tax',
        cashierName: cashierName.trim() || currentUser?.name || 'แคชเชียร์',
        shiftId: 'STANDALONE-TAX',
        customerName: customerName.trim() || 'ลูกค้าทั่วไป',
        items: validItems.map((it, idx) => ({
          variantId: it.sku || `item-${idx}-${Date.now()}`,
          productName: it.productName.trim(),
          sku: it.sku?.trim() || `TAX-SKU-${idx + 1}`,
          attributes: {},
          qty: Number(it.qty) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          costPrice: 0,
          lineTotal: (Number(it.qty) || 1) * (Number(it.unitPrice) || 0)
        })),
        subtotal: calculated.subtotal,
        promoDiscount: 0,
        customDiscountAmount: calculated.discount,
        netTotal: calculated.grandTotal,
        vatType,
        vatRate,
        preTaxAmount: calculated.preTax,
        vatAmount: calculated.vat,
        branch: 'KORAT_HOUSE',
        payments: [{ method: paymentMethod, amount: calculated.grandTotal }],
        cashReceived: calculated.grandTotal,
        changeGiven: 0,
        status: 'COMPLETED',
        isSynced: false,
        salesChannel: 'STORE_FRONT',
        isTaxInvoiceIssued: true,
        taxInvoiceNo: invoiceNo,
        taxInvoiceDate: invoiceDate,
        customerTaxInfo: taxInfo
      };

      await db.orders.add(newOrder);
      setCurrentSavedOrder(newOrder);

      // Silent sync to cloud
      CloudSync.pushOrder(newOrder).catch(err => console.warn('Cloud sync error for standalone tax invoice', err));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onSaved) onSaved(newOrder);
    } else {
      // Attached Mode (Update existing order)
      const targetOrder = currentSavedOrder || order!;
      await db.orders.update(targetOrder.id, {
        isTaxInvoiceIssued: true,
        taxInvoiceNo: invoiceNo,
        taxInvoiceDate: invoiceDate,
        customerTaxInfo: taxInfo,
        vatType: settings.vatType,
        vatRate,
        preTaxAmount: calculated.preTax,
        vatAmount: calculated.vat
      });

      const updated = await db.orders.get(targetOrder.id);
      if (updated) {
        CloudSync.pushOrder(updated).catch(err => console.warn('Cloud sync update error', err));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onSaved) onSaved(updated || undefined);
    }
  };

  const handlePrint = () => {
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
    setCustomerName(order?.customerName || 'ลูกค้าทั่วไป');
    setTaxId('-');
    setBranch('-');
    setAddress('ตามที่ระบุในระบบ');
  };

  // Active items for the A4 printable sheet
  const activeItems = useMemo(() => {
    if (isStandaloneMode && !currentSavedOrder) {
      return standaloneItems.map(it => ({
        productName: it.productName || 'สินค้า / บริการ',
        sku: it.sku || '-',
        qty: Number(it.qty) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        lineTotal: (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
        attributes: {} as Record<string, string>
      }));
    }
    const target = currentSavedOrder || order!;
    return target.items;
  }, [isStandaloneMode, currentSavedOrder, standaloneItems, order]);

  const activeOrderRef = currentSavedOrder?.localOrderId || order?.localOrderId || invoiceNo;
  const activeCashier = currentSavedOrder?.cashierName || order?.cashierName || cashierName;

  // Autocomplete filtering
  const filteredCatalogSuggestions = useMemo(() => {
    if (!variantSearchText.trim()) return variantsCatalog.slice(0, 8);
    const q = variantSearchText.toLowerCase();
    return variantsCatalog.filter(v => 
      v.productName.toLowerCase().includes(q) || 
      v.sku.toLowerCase().includes(q) || 
      (v.barcode && v.barcode.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [variantsCatalog, variantSearchText]);

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
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  {isStandaloneMode ? 'ออกใบเสร็จรับเงิน / ใบกำกับภาษีแยก (Standalone Tax Invoice)' : 'ออกใบเสร็จรับเงิน / ใบกำกับภาษี (Tax Invoice / Receipt)'}
                </h3>
                {isStandaloneMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black uppercase">
                    ออกแยกต่างหาก
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                ขนาดมาตรฐาน A4 หน้าเดียว ถูกต้องตามกรมสรรพากร • ลงสมุดภาษีขาย ภ.พ.30 อัตโนมัติ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveInfo}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>{isStandaloneMode && !currentSavedOrder ? 'บันทึกเปิดบิลภาษี' : 'บันทึกข้อมูลบิล'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ A4 (1 หน้าพอดี)</span>
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STANDALONE MODE: Line Items Editor (Hidden in Print) */}
        {isStandaloneMode && !currentSavedOrder && (
          <div className="p-3.5 bg-amber-50/70 border-b border-amber-200 text-xs no-print space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-700" />
                <span>กำหนดรายการสินค้า / บริการสำหรับออกใบกำกับภาษีแยก:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-900 font-semibold">วิธีคิด VAT:</span>
                <select
                  value={vatType}
                  onChange={e => setVatType(e.target.value as any)}
                  className="bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-amber-900"
                >
                  <option value="INCLUSIVE">ราคารวม VAT แล้ว 7% (Inclusive)</option>
                  <option value="EXCLUSIVE">ราคาแยกภาษี VAT 7% (Exclusive)</option>
                  <option value="NONE">ไม่คิดภาษี / ยกเว้น VAT</option>
                </select>
              </div>
            </div>

            {/* Line items list */}
            <div className="space-y-2">
              {standaloneItems.map((item, idx) => (
                <div key={item.id} className="relative flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="w-6 text-center text-slate-400 font-bold text-[11px]">{idx + 1}.</span>
                  
                  {/* Product name & Suggestion trigger */}
                  <div className="flex-1 relative min-w-[200px]">
                    <input
                      type="text"
                      value={item.productName}
                      onChange={e => {
                        handleUpdateLineItem(idx, 'productName', e.target.value);
                        setVariantSearchText(e.target.value);
                        setActiveItemIndexForSuggest(idx);
                      }}
                      onFocus={() => {
                        setActiveItemIndexForSuggest(idx);
                        setVariantSearchText(item.productName);
                      }}
                      placeholder="พิมพ์ชื่อสินค้า, งานสั่งตัด, หรือบริการ..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />

                    {/* Autocomplete Dropdown */}
                    {activeItemIndexForSuggest === idx && filteredCatalogSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        <div className="p-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 flex justify-between items-center">
                          <span>เลือกจากสินค้าในระบบ:</span>
                          <button 
                            type="button" 
                            onClick={() => setActiveItemIndexForSuggest(null)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ปิด
                          </button>
                        </div>
                        {filteredCatalogSuggestions.map(v => (
                          <div
                            key={v.id}
                            onClick={() => handleSelectVariantForLine(idx, v)}
                            className="p-2 hover:bg-amber-50 cursor-pointer flex justify-between items-center text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{v.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">SKU: {v.sku}</div>
                            </div>
                            <div className="font-mono font-bold text-amber-700">฿{v.salePrice.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SKU */}
                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      value={item.sku || ''}
                      onChange={e => handleUpdateLineItem(idx, 'sku', e.target.value)}
                      placeholder="SKU / รหัส"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-20 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => handleUpdateLineItem(idx, 'qty', parseInt(e.target.value, 10) || 1)}
                      placeholder="จำนวน"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-center font-bold"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={e => handleUpdateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="ราคา/หน่วย"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-right font-bold text-amber-800"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="w-28 text-right font-mono font-bold text-slate-900 text-xs shrink-0 pr-1">
                    ฿{((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toLocaleString()}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="ลบรายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom controls: Add Item, Discount, Cashier, Payment */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-amber-200/80">
              <button
                type="button"
                onClick={handleAddLineItem}
                className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1 shadow-2xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มรายการสินค้า/บริการ</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {/* Discount */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">ส่วนลด (บาท):</span>
                  <input
                    type="number"
                    min="0"
                    value={standaloneDiscount}
                    onChange={e => setStandaloneDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-right font-bold text-rose-600"
                  />
                </div>

                {/* Cashier */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">แคชเชียร์:</span>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                    className="w-28 p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">ชำระด้วย:</span>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="CASH">💵 เงินสด (Cash)</option>
                    <option value="PROMPTPAY">📱 PromptPay QR</option>
                    <option value="CREDIT_CARD">💳 บัตรเครดิต</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

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
          className="p-6 bg-white text-slate-900 font-sans text-xs select-text overflow-y-auto max-h-[58vh] print:max-h-none print:overflow-visible print:p-0 print:m-0"
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
                <div><b>อ้างอิงบิลขาย:</b> <span className="font-mono">{activeOrderRef}</span></div>
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
              <div><b>แคชเชียร์ผู้รับเงิน:</b> {activeCashier}</div>
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
              {activeItems.map((item, index) => (
                <tr key={index}>
                  <td className="p-1.5 text-center font-mono text-slate-500">{index + 1}</td>
                  <td className="p-1.5">
                    <div className="font-bold text-slate-900 leading-tight">{item.productName}</div>
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <div className="text-[9.5px] text-slate-500">
                        {Object.values(item.attributes).join(' • ')} (SKU: {item.sku})
                      </div>
                    )}
                    {(!item.attributes || Object.keys(item.attributes).length === 0) && item.sku && (
                      <div className="text-[9.5px] text-slate-400 font-mono">
                        SKU: {item.sku}
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
                <span className="font-mono">฿{calculated.subtotal.toLocaleString()}</span>
              </div>

              {calculated.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>ส่วนลดรวม:</span>
                  <span className="font-mono">-฿{calculated.discount.toLocaleString()}</span>
                </div>
              )}

              {settings.vatType !== 'NONE' && (
                <>
                  <div className="flex justify-between text-slate-600 pt-0.5 border-t border-slate-200">
                    <span>มูลค่าสินค้าก่อนภาษี:</span>
                    <span className="font-mono">฿{calculated.preTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม VAT {vatRate}%:</span>
                    <span className="font-mono">฿{calculated.vat.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-baseline pt-1 border-t-2 border-slate-900 font-black text-slate-900">
                <span className="text-xs">จำนวนเงินรวมทั้งสิ้น:</span>
                <span className="text-sm sm:text-base font-mono text-amber-800">฿{calculated.grandTotal.toLocaleString()}</span>
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
              <div className="font-bold text-slate-800 text-[11px]">( {activeCashier} )</div>
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
