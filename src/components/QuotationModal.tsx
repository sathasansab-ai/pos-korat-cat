// src/components/QuotationModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Mail, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  Phone, 
  CheckCircle2, 
  Clock, 
  X,
  ShoppingCart,
  Send,
  Eye,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { db } from '../db';
import type { 
  Quotation, 
  QuotationItem, 
  QuotationStatus, 
  StoreSettings, 
  CartItem, 
  ProductVariant, 
  UserAccount 
} from '../types';
import { thaiBahtText } from '../utils/thaiBaht';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  settings?: StoreSettings | null;
  initialCart?: CartItem[];
  onLoadToCart?: (items: CartItem[]) => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  initialCart = [],
  onLoadToCart
}) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'ARCHIVE'>('CREATE');
  const [savedQuotations, setSavedQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Catalog search to add items
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([]);

  // Form State
  const [quotationNo, setQuotationNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [validDays, setValidDays] = useState(15);
  const [staffName, setStaffName] = useState(currentUser?.name || 'เจ้าหน้าที่ฝ่ายขาย');
  
  // Customer State
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custBranch, setCustBranch] = useState('สำนักงานใหญ่');
  const [custAddress, setCustAddress] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custTaxId, setCustTaxId] = useState('');
  const [custContactPerson, setCustContactPerson] = useState('');

  // Items State
  const [items, setItems] = useState<QuotationItem[]>([]);

  // Financials
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatType, setVatType] = useState<'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'>('NONE');
  const [vatRate, setVatRate] = useState<number>(7);
  const [paymentTerms, setPaymentTerms] = useState('มัดจำ 50% เมื่อยืนยันการสั่งซื้อ ส่วนที่เหลือ 50% ชำระ ณ วันส่งมอบสินค้า');
  const [notes, setNotes] = useState('1. สินค้าตัดเย็บและงานหัตถศิลป์ใช้เวลาผลิต 5-7 วันทำการ\n2. โอนชำระเงินเข้าบัญชีร้านค้าตามที่ระบุในเอกสาร\n3. กำหนดยืนราคาตามที่ระบุในใบเสนอราคานี้');

  // Preview & Archive View State
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Generate Quotation Number
  const generateNewQuotationNo = async () => {
    const todayPrefix = `QT-${new Date().toISOString().slice(0, 7).replace('-', '')}`;
    const count = await db.quotations.count();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `${todayPrefix}-${String(count + 1).padStart(3, '0')}${randomSuffix.toString().slice(0, 1)}`;
  };

  const loadData = async () => {
    const qList = await db.quotations.orderBy('createdAt').reverse().toArray();
    setSavedQuotations(qList);
    const vList = await db.variants.filter(v => v.isActive !== false).toArray();
    setAllVariants(vList);
  };

  // Initialize Form
  useEffect(() => {
    if (!isOpen) return;

    loadData();
    generateNewQuotationNo().then(setQuotationNo);
    setStaffName(currentUser?.name || 'เจ้าหน้าที่ฝ่ายขาย');
    setIssueDate(new Date().toISOString().slice(0, 10));

    // If opened with items from POS Cart, pre-fill them
    if (initialCart && initialCart.length > 0) {
      const qItems: QuotationItem[] = initialCart.map(c => ({
        variantId: c.variantId,
        productName: c.productName,
        sku: c.sku,
        barcode: c.barcode,
        attributes: c.attributes,
        qty: c.qty,
        unitPrice: c.unitPrice,
        discount: 0,
        lineTotal: c.unitPrice * c.qty
      }));
      setItems(qItems);
    } else {
      setItems([]);
    }

    setViewingQuotation(null);
    setSuccessToast(null);
  }, [isOpen]);

  // Search Variants
  useEffect(() => {
    if (!itemSearchQuery.trim()) {
      setFilteredVariants([]);
      return;
    }
    const q = itemSearchQuery.toLowerCase();
    const matched = allVariants.filter(v => 
      v.productName.toLowerCase().includes(q) || 
      v.sku.toLowerCase().includes(q) || 
      v.barcode.includes(q)
    ).slice(0, 6);
    setFilteredVariants(matched);
  }, [itemSearchQuery, allVariants]);

  if (!isOpen) return null;

  // Add Item from Catalog
  const handleAddItemFromCatalog = (v: ProductVariant) => {
    const existingIndex = items.findIndex(it => it.variantId === v.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      updated[existingIndex].lineTotal = updated[existingIndex].qty * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      setItems(prev => [
        ...prev,
        {
          variantId: v.id,
          productName: v.productName,
          sku: v.sku,
          barcode: v.barcode,
          attributes: v.attributes,
          qty: 1,
          unitPrice: v.salePrice,
          discount: 0,
          lineTotal: v.salePrice
        }
      ]);
    }
    setItemSearchQuery('');
    setFilteredVariants([]);
  };

  // Add Custom Blank Item
  const handleAddCustomRow = () => {
    setItems(prev => [
      ...prev,
      {
        variantId: `custom-${Date.now()}`,
        productName: 'งานสั่งตัดเย็บ / สกรีนลายพิเศษ',
        sku: 'CUSTOM-ITEM',
        qty: 1,
        unitPrice: 590,
        discount: 0,
        lineTotal: 590
      }
    ]);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const updated = [...items];
    const safeQty = Math.max(1, newQty);
    updated[index].qty = safeQty;
    updated[index].lineTotal = safeQty * updated[index].unitPrice - (updated[index].discount || 0);
    setItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    const safePrice = Math.max(0, newPrice);
    updated[index].unitPrice = safePrice;
    updated[index].lineTotal = updated[index].qty * safePrice - (updated[index].discount || 0);
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.unitPrice * it.qty), 0);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  let preTaxAmount = afterDiscount;
  let vatAmount = 0;
  let netTotal = afterDiscount;

  if (vatType === 'EXCLUSIVE') {
    vatAmount = (afterDiscount * vatRate) / 100;
    netTotal = afterDiscount + vatAmount;
  } else if (vatType === 'INCLUSIVE') {
    preTaxAmount = (afterDiscount * 100) / (100 + vatRate);
    vatAmount = afterDiscount - preTaxAmount;
    netTotal = afterDiscount;
  }

  // Calculate Valid Until Date
  const validUntilDate = new Date(issueDate);
  validUntilDate.setDate(validUntilDate.getDate() + validDays);
  const validUntilStr = validUntilDate.toISOString().slice(0, 10);

  // Save Quotation
  const handleSaveQuotation = async (status: QuotationStatus = 'SENT') => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้าในใบเสนอราคาอย่างน้อย 1 รายการ');
      return null;
    }
    if (!custName.trim() && !custCompany.trim()) {
      alert('กรุณาระบุชื่อลูกค้าหรือชื่อบริษัท/หน่วยงาน');
      return null;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const newQuotation: Quotation = {
        id: `qt-${Date.now()}`,
        quotationNo: quotationNo || (await generateNewQuotationNo()),
        date: issueDate,
        validUntil: validUntilStr,
        staffName,
        customer: {
          name: custName.trim() || custCompany.trim(),
          companyName: custCompany.trim() || undefined,
          branch: custBranch.trim() || undefined,
          address: custAddress.trim() || undefined,
          phone: custPhone.trim() || undefined,
          email: custEmail.trim() || undefined,
          taxId: custTaxId.trim() || undefined,
          contactPerson: custContactPerson.trim() || undefined
        },
        items,
        subtotal,
        discount: discountAmount,
        vatType,
        vatRate,
        preTaxAmount,
        vatAmount,
        netTotal,
        notes,
        paymentTerms,
        status,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await db.quotations.put(newQuotation);
      await loadData();
      setViewingQuotation(newQuotation);
      setSuccessToast(`บันทึกใบเสนอราคา ${newQuotation.quotationNo} สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => setSuccessToast(null), 3500);
      return newQuotation;
    } catch (e: any) {
      alert(`บันทึกไม่สำเร็จ: ${e.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Print A4
  const handlePrintA4 = async () => {
    let target = viewingQuotation;
    if (!target) {
      target = await handleSaveQuotation('SENT');
      if (!target) return;
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Send Email (mailto: pre-filled email draft)
  const handleSendEmail = async () => {
    let target = viewingQuotation;
    if (!target) {
      target = await handleSaveQuotation('SENT');
      if (!target) return;
    }

    const emailTo = target.customer.email || '';
    const subject = encodeURIComponent(`[ใบเสนอราคา ${target.quotationNo}] ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}`);
    
    const itemsSummary = target.items
      .map((it, i) => `${i + 1}. ${it.productName} (จำนวน ${it.qty} ชิ้น x ฿${it.unitPrice.toLocaleString()}) = ฿${it.lineTotal.toLocaleString()}`)
      .join('\n');

    const bodyText = `เรียน ${target.customer.contactPerson || target.customer.name || 'ท่านผู้มีอุปการคุณ'}

ทาง ${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'} ขอขอบพระคุณที่ท่านได้ให้ความสนใจในสินค้าแฟชั่นหัตถศิลป์ของเรา ทางร้านขอส่งมอบใบเสนอราคาตามรายละเอียดดังต่อไปนี้:

เลขที่ใบเสนอราคา: ${target.quotationNo}
วันที่: ${target.date}
กำหนดยืนราคาถึงวันที่: ${target.validUntil}

รายการสินค้า:
${itemsSummary}

ยอดรวมสุทธิทั้งสิ้น: ฿${target.netTotal.toLocaleString()} บาท (${thaiBahtText(target.netTotal)})

เงื่อนไขการชำระเงิน:
${target.paymentTerms || 'มัดจำ 50% และชำระส่วนที่เหลือ ณ วันส่งมอบสินค้า'}
พร้อมเพย์ / บัญชีร้านค้า: ${settings?.promptPayId || '0819998888'}

หากท่านมีข้อสงสัยหรือต้องการปรับเปลี่ยนรายละเอียด สามารถติดต่อเราได้ที่:
โทรศัพท์: ${settings?.phone || '044-123456 / 081-999-8888'}
อีเมล: ${settings?.storeEmail || 'koratcat.heritage@gmail.com'}
ที่อยู่: ${settings?.address || 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000'}

ขอแสดงความนับถือ
${target.staffName || 'ฝ่ายบริการลูกค้า'}
${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}`;

    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    // Update status to SENT
    await db.quotations.update(target.id, { status: 'SENT', updatedAt: new Date().toISOString() });
    await loadData();
    setSuccessToast(`เปิดโปรแกรมอีเมลเพื่อส่งใบเสนอราคา ${target.quotationNo} ให้ลูกค้าเรียบร้อยแล้ว!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Convert to POS Cart
  const handleConvertToPosCart = (q: Quotation) => {
    if (!onLoadToCart) return;
    const cartItems: CartItem[] = q.items.map(it => ({
      variantId: it.variantId,
      productName: it.productName,
      sku: it.sku,
      barcode: it.barcode || it.sku,
      attributes: it.attributes || {},
      category: 'สินค้าทั่วไป',
      costPrice: 0,
      unitPrice: it.unitPrice,
      qty: it.qty
    }));
    onLoadToCart(cartItems);
    onClose();
  };

  // Status Badge Helper
  const renderStatusBadge = (st: QuotationStatus) => {
    switch (st) {
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">✓ สั่งซื้อแล้ว</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300">✉️ ส่งลูกค้าแล้ว</span>;
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300">📝 ร่างเอกสาร</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">✕ ยกเลิก</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">⏳ หมดอายุ</span>;
    }
  };

  // Filter Saved Quotations
  const filteredArchive = savedQuotations.filter(q => {
    const matchesSearch = 
      q.quotationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer.companyName && q.customer.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.customer.phone && q.customer.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[96vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Top Modal Header */}
        <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>ระบบออกใบเสนอราคามาตรฐานสากล (A4 Price Quotation)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ออกใบเสนอราคาขนาด A4 พิมพ์เอกสาร บันทึก PDF ส่งอีเมล และจัดเก็บประวัติอย่างเป็นระบบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('CREATE');
                  setViewingQuotation(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'CREATE' && !viewingQuotation
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>สร้างใบเสนอราคาใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ARCHIVE')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'ARCHIVE' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ประวัติทั้งหมด ({savedQuotations.length})</span>
              </button>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successToast}
            </span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          
          {/* TAB 1: CREATE / EDIT FORM */}
          {activeTab === 'CREATE' && (
            <div className="space-y-5">
              
              {/* Main Action Bar for Creation */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800">เลขที่เอกสาร:</span>
                  <input
                    type="text"
                    value={quotationNo}
                    onChange={e => setQuotationNo(e.target.value)}
                    className="font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-amber-700 w-36"
                  />
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-600">วันที่:</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                  />
                  <span className="text-xs text-slate-600">ยืนราคา (วัน):</span>
                  <select
                    value={validDays}
                    onChange={e => setValidDays(Number(e.target.value))}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                  >
                    <option value={7}>7 วัน</option>
                    <option value={15}>15 วัน</option>
                    <option value={30}>30 วัน</option>
                    <option value={60}>60 วัน</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveQuotation('DRAFT')}
                    disabled={isSaving}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>บันทึกแบบร่าง</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={isSaving}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-200" />
                    <span>ส่งอีเมลให้ลูกค้า</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintA4}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ A4 / บันทึก PDF</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Information: Store Info & Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Store Information Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>ข้อมูลผู้เสนอราคา (ฝ่ายร้านค้า)</span>
                    </h4>
                    <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                      ดึงจากการตั้งค่าร้าน
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
                    <div className="text-slate-600 mt-1 leading-relaxed text-[11px]">{settings?.address || 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000'}</div>
                    <div className="flex flex-wrap gap-x-3 text-slate-600 mt-1 text-[11px]">
                      <span>📞 โทร: {settings?.phone || '044-123456 / 081-999-8888'}</span>
                      <span>✉️ อีเมล: {settings?.storeEmail || 'koratcat.heritage@gmail.com'}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5 text-[11px]">
                      <span>เลขประจำตัวผู้เสียภาษี: <b className="font-mono">{settings?.taxId || '0305566001234'}</b></span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <span className="text-slate-600">ผู้จัดทำเอกสาร:</span>
                      <input
                        type="text"
                        value={staffName}
                        onChange={e => setStaffName(e.target.value)}
                        placeholder="ชื่อเจ้าหน้าที่ฝ่ายขาย"
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Information Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-amber-600" />
                    <span>ข้อมูลลูกค้า / องค์กร / ผู้สั่งซื้อ *</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">ชื่อลูกค้า / บุคคลติดต่อ *</label>
                      <input
                        type="text"
                        value={custName}
                        onChange={e => setCustName(e.target.value)}
                        placeholder="เช่น คุณวิภาวรรณ สุวรรณ"
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">ชื่อบริษัท / นิติบุคคล / หน่วยงาน</label>
                      <input
                        type="text"
                        value={custCompany}
                        onChange={e => setCustCompany(e.target.value)}
                        placeholder="เช่น บริษัท สยามแฟชั่น จำกัด"
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">เบอร์โทรศัพท์ติดต่อ</label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={e => setCustPhone(e.target.value)}
                        placeholder="081-XXX-XXXX"
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">อีเมล (สำหรับส่งใบเสนอราคา)</label>
                      <input
                        type="email"
                        value={custEmail}
                        onChange={e => setCustEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">เลขประจำตัวผู้เสียภาษี 13 หลัก</label>
                      <input
                        type="text"
                        value={custTaxId}
                        onChange={e => setCustTaxId(e.target.value)}
                        placeholder="01055XXXXXXXX"
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">สาขา</label>
                      <input
                        type="text"
                        value={custBranch}
                        onChange={e => setCustBranch(e.target.value)}
                        placeholder="สำนักงานใหญ่ หรือ สาขาที่..."
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">ที่อยู่ออกใบเสนอราคา / ส่งของ</label>
                    <input
                      type="text"
                      value={custAddress}
                      onChange={e => setCustAddress(e.target.value)}
                      placeholder="ที่อยู่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table Section */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>ตารางรายการสินค้าที่เสนอราคา ({items.length} รายการ)</span>
                  </h4>

                  {/* Search and Add from Catalog */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={e => setItemSearchQuery(e.target.value)}
                        placeholder="ค้นหาสินค้าในสต็อกเพื่อเพิ่ม..."
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-56 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />

                      {/* Dropdown Results */}
                      {filteredVariants.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {filteredVariants.map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleAddItemFromCatalog(v)}
                              className="w-full p-2 text-left hover:bg-amber-50 flex items-center justify-between text-xs transition"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{v.productName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{v.sku}</div>
                              </div>
                              <span className="font-bold text-amber-700 font-mono">฿{v.salePrice.toLocaleString()}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomRow}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ รายการสั่งทำพิเศษ</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-12">ลำดับ</th>
                        <th className="p-2.5">รายการสินค้า / รายละเอียดงานสั่งทำ</th>
                        <th className="p-2.5 text-center w-24">จำนวน</th>
                        <th className="p-2.5 text-right w-28">ราคาต่อหน่วย</th>
                        <th className="p-2.5 text-right w-32">จำนวนเงิน (บาท)</th>
                        <th className="p-2.5 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            ยังไม่มีรายการสินค้าในใบเสนอราคา (ค้นหาสินค้าด้านบน หรือกด "+ รายการสั่งทำพิเศษ")
                          </td>
                        </tr>
                      ) : (
                        items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition">
                            <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={it.productName}
                                onChange={e => {
                                  const updated = [...items];
                                  updated[idx].productName = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full font-bold text-slate-800 p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-amber-500 rounded text-xs"
                              />
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                SKU: {it.sku}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={it.qty}
                                onChange={e => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                                className="w-16 p-1 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={it.unitPrice}
                                onChange={e => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-24 p-1 text-right font-mono font-bold bg-slate-50 border border-slate-200 rounded text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-700">
                              ฿{it.lineTotal.toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Left: Terms and Notes */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">เงื่อนไขการชำระเงิน (Payment Terms)</label>
                      <input
                        type="text"
                        value={paymentTerms}
                        onChange={e => setPaymentTerms(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">หมายเหตุและเงื่อนไขเพิ่มเติม</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
                      />
                    </div>
                  </div>

                  {/* Right: Totals, Discounts, VAT */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดรวมราคาสินค้า:</span>
                      <span className="font-mono font-bold">฿{subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>ส่วนลดพิเศษ:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">฿</span>
                        <input
                          type="number"
                          min="0"
                          value={discountAmount || ''}
                          onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-24 p-1 text-right font-mono bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* VAT Configuration */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span>ภาษีมูลค่าเพิ่ม:</span>
                      <select
                        value={vatType}
                        onChange={e => setVatType(e.target.value as any)}
                        className="p-1 bg-white border border-slate-200 rounded text-xs"
                      >
                        <option value="NONE">ไม่มีภาษี (None)</option>
                        <option value="INCLUSIVE">รวมภาษี 7% ในราคา</option>
                        <option value="EXCLUSIVE">คิดภาษีเพิ่ม 7% (Exclusive)</option>
                      </select>
                    </div>

                    {vatType !== 'NONE' && (
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>ยอดภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                        <span className="font-mono">฿{vatAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-300 text-sm">
                      <span className="font-black text-slate-900">ยอดรวมสุทธิทั้งสิ้น:</span>
                      <span className="text-xl font-black text-amber-700 font-mono">
                        ฿{netTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Thai Baht text reading */}
                    <div className="text-[11px] font-bold text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200 text-center">
                      ({thaiBahtText(netTotal)})
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ARCHIVE / HISTORY */}
          {activeTab === 'ARCHIVE' && (
            <div className="space-y-4">
              
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาตามเลขที่ใบเสนอราคา, ชื่อลูกค้า, หรือเบอร์โทร..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-slate-500 font-semibold mr-1">สถานะ:</span>
                  {(['ALL', 'SENT', 'ACCEPTED', 'DRAFT', 'REJECTED'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        statusFilter === st ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? 'ทั้งหมด' : st === 'SENT' ? 'ส่งแล้ว' : st === 'ACCEPTED' ? 'สั่งซื้อแล้ว' : st === 'DRAFT' ? 'แบบร่าง' : 'ยกเลิก'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Archive Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-3">เลขที่เอกสาร</th>
                      <th className="p-3">วันที่ / ยืนราคาถึง</th>
                      <th className="p-3">ลูกค้า / องค์กร</th>
                      <th className="p-3 text-center">จำนวนรายการ</th>
                      <th className="p-3 text-right">ยอดเงินสุทธิ</th>
                      <th className="p-3 text-center">สถานะ</th>
                      <th className="p-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredArchive.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400">
                          ไม่พบประวัติใบเสนอราคาตามเงื่อนไข
                        </td>
                      </tr>
                    ) : (
                      filteredArchive.map(q => (
                        <tr key={q.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-amber-700">{q.quotationNo}</td>
                          <td className="p-3">
                            <div className="text-slate-800">{q.date}</div>
                            <div className="text-[10px] text-slate-400">ถึง: {q.validUntil}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{q.customer.name}</div>
                            {q.customer.phone && <div className="text-[10px] text-slate-400 font-mono">โทร: {q.customer.phone}</div>}
                          </td>
                          <td className="p-3 text-center font-mono">{q.items.length} รายการ</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ฿{q.netTotal.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {renderStatusBadge(q.status)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingQuotation(q);
                                  // Populate form with this quotation
                                  setQuotationNo(q.quotationNo);
                                  setIssueDate(q.date);
                                  setStaffName(q.staffName);
                                  setCustName(q.customer.name);
                                  setCustCompany(q.customer.companyName || '');
                                  setCustBranch(q.customer.branch || 'สำนักงานใหญ่');
                                  setCustAddress(q.customer.address || '');
                                  setCustPhone(q.customer.phone || '');
                                  setCustEmail(q.customer.email || '');
                                  setCustTaxId(q.customer.taxId || '');
                                  setCustContactPerson(q.customer.contactPerson || '');
                                  setItems(q.items);
                                  setDiscountAmount(q.discount);
                                  setVatType(q.vatType);
                                  setPaymentTerms(q.paymentTerms || '');
                                  setNotes(q.notes || '');
                                  setActiveTab('CREATE');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                title="เปิดดู / แก้ไข / พิมพ์"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>ดูเอกสาร</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleConvertToPosCart(q)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                title="โหลดรายการเข้าหน้าขาย POS เพื่อคิดเงิน"
                              >
                                <ShoppingCart className="w-3 h-3 text-amber-700" />
                                <span>ขายทันที</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* HIDDEN PRINTABLE A4 QUOTATION SHEET (Triggered on Print) */}
      <div id="printable-quotation-a4" className="hidden print:block print:w-[210mm] print:min-h-[297mm] print:p-8 print:bg-white print:text-black print:mx-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * { visibility: hidden; }
            #printable-quotation-a4, #printable-quotation-a4 * { visibility: visible; }
            #printable-quotation-a4 {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 24px;
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #000;
              background: #fff;
            }
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
          }
        `}} />

        {/* Header Store Info & Document Title */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex gap-3">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="" className="w-16 h-16 object-contain" />
            ) : null}
            <div>
              <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                {settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
              </h1>
              <p className="text-xs text-slate-700 font-bold">{settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</p>
              <p className="text-xs text-slate-600 mt-1">{settings?.address || 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000'}</p>
              <p className="text-xs text-slate-600">
                โทร: {settings?.phone || '044-123456 / 081-999-8888'} | อีเมล: {settings?.storeEmail || 'koratcat.heritage@gmail.com'}
              </p>
              <p className="text-xs text-slate-600 font-bold">
                เลขประจำตัวผู้เสียภาษี: {settings?.taxId || '0305566001234'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-slate-950 text-white font-black text-base px-4 py-1.5 rounded-lg uppercase tracking-wider mb-2">
              ใบเสนอราคา (Quotation)
            </div>
            <div className="text-xs space-y-0.5">
              <div>เลขที่เอกสาร: <b className="font-mono text-sm">{viewingQuotation?.quotationNo || quotationNo}</b></div>
              <div>วันที่ออกเอกสาร: <b>{viewingQuotation?.date || issueDate}</b></div>
              <div>กำหนดยืนราคาถึง: <b>{viewingQuotation?.validUntil || validUntilStr}</b></div>
              <div>ผู้เสนอราคา: <b>{viewingQuotation?.staffName || staffName}</b></div>
            </div>
          </div>
        </div>

        {/* Customer Info Box */}
        <div className="border border-slate-300 rounded-lg p-3 mb-4 bg-slate-50/50 text-xs flex justify-between">
          <div className="space-y-0.5 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">ข้อมูลลูกค้า / ผู้สั่งซื้อ (Customer):</div>
            <div className="font-black text-sm text-slate-900">{viewingQuotation?.customer.name || custName || custCompany}</div>
            {custCompany && <div className="font-bold">{custCompany} ({custBranch})</div>}
            <div className="text-slate-700">{viewingQuotation?.customer.address || custAddress}</div>
            <div>โทร: <b className="font-mono">{viewingQuotation?.customer.phone || custPhone}</b> | อีเมล: <b>{viewingQuotation?.customer.email || custEmail}</b></div>
          </div>
          <div className="text-right space-y-0.5 pl-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase">เลขผู้เสียภาษี:</div>
            <div className="font-mono font-bold">{viewingQuotation?.customer.taxId || custTaxId || '-'}</div>
            {custContactPerson && (
              <div className="text-slate-600">ผู้ติดต่อ: <b>{custContactPerson}</b></div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-xs border-collapse border border-slate-300 mb-4">
          <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
            <tr>
              <th className="p-2 border-r border-slate-300 text-center w-10">ลำดับ</th>
              <th className="p-2 border-r border-slate-300">รายการสินค้า / รายละเอียด</th>
              <th className="p-2 border-r border-slate-300 text-center w-16">จำนวน</th>
              <th className="p-2 border-r border-slate-300 text-right w-24">ราคา/หน่วย</th>
              <th className="p-2 text-right w-28">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {(viewingQuotation?.items || items).map((it, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                <td className="p-2 border-r border-slate-300">
                  <div className="font-bold">{it.productName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">SKU: {it.sku}</div>
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{it.qty}</td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">฿{it.unitPrice.toLocaleString()}</td>
                <td className="p-2 text-right font-mono font-bold">฿{it.lineTotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Bottom Calculations & Notes */}
        <div className="flex justify-between items-start gap-4 mb-6 text-xs">
          <div className="flex-1 space-y-1.5 border border-slate-300 p-3 rounded-lg bg-slate-50/50">
            <div>
              <b className="text-slate-800">เงื่อนไขการชำระเงิน:</b>
              <p className="text-slate-700 mt-0.5">{viewingQuotation?.paymentTerms || paymentTerms}</p>
            </div>
            <div>
              <b className="text-slate-800">หมายเหตุ:</b>
              <p className="text-slate-700 mt-0.5 whitespace-pre-line">{viewingQuotation?.notes || notes}</p>
            </div>
            <div className="pt-1.5 border-t border-slate-200 text-slate-600">
              พร้อมเพย์ร้านค้า: <b className="font-mono">{settings?.promptPayId || '0819998888'}</b>
            </div>
          </div>

          <div className="w-64 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>ยอดรวมสินค้า:</span>
              <span className="font-mono font-bold">฿{(viewingQuotation?.subtotal || subtotal).toLocaleString()}</span>
            </div>
            {(viewingQuotation?.discount || discountAmount) > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>ส่วนลด:</span>
                <span className="font-mono font-bold">-฿{(viewingQuotation?.discount || discountAmount).toLocaleString()}</span>
              </div>
            )}
            {(viewingQuotation?.vatType || vatType) !== 'NONE' && (
              <div className="flex justify-between text-slate-600">
                <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                <span className="font-mono font-bold">฿{(viewingQuotation?.vatAmount || vatAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t-2 border-slate-900 text-sm font-black">
              <span>ยอดสุทธิทั้งสิ้น:</span>
              <span className="font-mono text-base">฿{(viewingQuotation?.netTotal || netTotal).toLocaleString()}</span>
            </div>
            <div className="text-[11px] font-bold text-center bg-slate-100 p-1.5 rounded mt-1">
              ({thaiBahtText(viewingQuotation?.netTotal || netTotal)})
            </div>
          </div>
        </div>

        {/* Dual Signature Boxes */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg">
            <div className="h-14"></div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-1"></div>
            <div className="font-bold">({viewingQuotation?.staffName || staffName})</div>
            <div className="text-[11px] text-slate-500 mt-0.5">ผู้มีอำนาจลงนาม / ผู้เสนอราคา</div>
            <div className="text-[10px] text-slate-400 mt-1">วันที่: ____/____/________</div>
          </div>

          <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg">
            <div className="h-14"></div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-1"></div>
            <div className="font-bold">({viewingQuotation?.customer.name || custName || 'ผู้สั่งซื้อ / ลูกค้า'})</div>
            <div className="text-[11px] text-slate-500 mt-0.5">ผู้มีอำนาจสั่งซื้อ / รับใบเสนอราคา</div>
            <div className="text-[10px] text-slate-400 mt-1">วันที่: ____/____/________</div>
          </div>
        </div>

      </div>

    </div>
  );
};
