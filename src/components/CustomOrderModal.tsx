// src/components/CustomOrderModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Check, 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Plus, 
  RotateCcw,
  Calendar,
  Phone,
  User,
  Upload,
  Image as ImageIcon,
  Ruler,
  Sparkles,
  Search,
  Truck,
  QrCode
} from 'lucide-react';
import { db } from '../db';
import type { 
  CustomMadeOrder, 
  StoreSettings, 
  Order, 
  Shift, 
  UserAccount, 
  Customer, 
  GenderType, 
  CustomOrderCategory, 
  CustomOrderMeasurements 
} from '../types';
import { GENDER_CONFIG } from '../types';
import { CloudSync } from '../services/cloudSync';
import { ImageOptimizer } from '../services/imageOptimizer';
import { PromptPayService } from '../services/promptPay';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { MannequinFigure, renderMannequinSvgHtml } from './MannequinFigure';

interface CustomOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
  currentUser?: UserAccount | null;
  activeShift?: Shift | null;
  onOpenShiftRequired?: () => void;
  onShiftUpdated?: () => void;
}

const CATEGORY_OPTIONS: { id: CustomOrderCategory; label: string; icon: string }[] = [
  { id: 'SHIRT', label: 'เสื้อ (Shirt/Top)', icon: '👔' },
  { id: 'PANTS', label: 'กางเกง (Pants/Bottom)', icon: '👖' },
  { id: 'JACKET', label: 'แจ็กเก็ต / สูท', icon: '🧥' },
  { id: 'BAG', label: 'กระเป๋าผ้า / ย่าม', icon: '👜' },
  { id: 'HAT', label: 'หมวกแก๊ป / บักเก็ต', icon: '🧢' },
  { id: 'OTHER', label: 'งานสั่งทำอื่นๆ', icon: '✨' }
];

export const CustomOrderModal: React.FC<CustomOrderModalProps> = ({
  isOpen,
  onClose,
  staffName,
  currentUser,
  activeShift,
  onOpenShiftRequired,
  onShiftUpdated
}) => {
  // Customer info & Member linking
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGender, setCustomerGender] = useState<GenderType>('FEMALE');

  // Category & Tailoring Measurements
  const [categoryType, setCategoryType] = useState<CustomOrderCategory>('SHIRT');
  const [measurements, setMeasurements] = useState<CustomOrderMeasurements>({
    chest: '',
    waist: '',
    shoulder: '',
    shirtLength: '',
    armLength: '',
    armHole: '',
    neck: '',
    wrist: '',
    waistPants: '',
    hipsPants: '',
    pantsLength: '',
    thigh: '',
    crotch: '',
    legOpening: '',
    customDimension: ''
  });

  // Fabric, Mockup & Order Details
  const [fabricType, setFabricType] = useState('ผ้าไหมมัดหมี่ทอมือโคราช');
  const [specialInstructions, setSpecialInstructions] = useState('ปักลายฉลุทองแมวโคราช x เดินตะเข็บคู่ประณีต');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [itemDescription, setItemDescription] = useState('สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง');
  const [qty, setQty] = useState(1);
  const [totalPrice, setTotalPrice] = useState(3500);
  const [depositAmount, setDepositAmount] = useState(1750); // 50% default
  const [paymentMethod, setPaymentMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP_SHOP' | 'SHIPPING_ADDRESS'>('PICKUP_SHOP');
  const [shippingAddress, setShippingAddress] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10); // Default 10 days
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');

  // View state: 'FORM' | 'SUCCESS_VIEW'
  const [viewState, setViewState] = useState<'FORM' | 'SUCCESS_VIEW'>('FORM');
  const [savedOrder, setSavedOrder] = useState<CustomMadeOrder | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Dynamic PromptPay QR Payload for deposit
  const promptPayPayload = (settings?.promptPayId && depositAmount > 0)
    ? PromptPayService.generatePayload(settings.promptPayId, depositAmount)
    : '';
  const qrImageUrl = promptPayPayload
    ? PromptPayService.getQrImageUrl(promptPayPayload, 260)
    : '';

  const loadData = async () => {
    const [cList, s] = await Promise.all([
      db.customers.toArray(),
      db.settings.get('current_store_settings')
    ]);
    setExistingCustomers(cList);
    if (s) setSettings(s);
  };

  const handleClose = () => {
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      customOrderPayment: null
    });
    onClose();
  };

  const resetForm = () => {
    setSelectedCustomerId(undefined);
    setMemberSearchQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGender('FEMALE');
    setCategoryType('SHIRT');
    setMeasurements({
      chest: '',
      waist: '',
      shoulder: '',
      shirtLength: '',
      armLength: '',
      armHole: '',
      neck: '',
      wrist: '',
      waistPants: '',
      hipsPants: '',
      pantsLength: '',
      thigh: '',
      crotch: '',
      legOpening: '',
      customDimension: ''
    });
    setFabricType('ผ้าไหมมัดหมี่ทอมือโคราช');
    setSpecialInstructions('ปักลายฉลุทองแมวโคราช x เดินตะเข็บคู่ประณีต');
    setReferenceImageUrl('');
    setItemDescription('สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง');
    setQty(1);
    setTotalPrice(3500);
    setDepositAmount(1750);
    setPaymentMethod('PROMPTPAY');
    setDeliveryMethod('PICKUP_SHOP');
    setShippingAddress('');
    setNotes('');
    setViewState('FORM');
    setSavedOrder(null);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  // Synchronize Custom Order state with Customer-Facing 2nd Monitor
  useEffect(() => {
    if (!isOpen) return;

    DualMonitorSync.broadcast({
      cart: [],
      subtotal: totalPrice,
      promoDiscount: 0,
      netTotal: depositAmount,
      upsellPrompts: [],
      theme: settings?.customerScreenTheme,
      welcomeTitle: settings?.welcomeTitle,
      welcomeSubtitle: settings?.welcomeSubtitle,
      welcomeImageUrl: settings?.welcomeImageUrl,
      thankYouMessage: settings?.thankYouMessage,
      customOrderPayment: {
        orderNo: savedOrder ? savedOrder.orderNo : 'งานสั่งผลิตใหม่ (New Order)',
        customerName: customerName.trim() || 'ลูกค้าคนสำคัญ',
        customerPhone: customerPhone.trim(),
        itemDescription: itemDescription.trim() || 'สั่งตัดพิเศษ Haute Couture',
        categoryLabel: CATEGORY_OPTIONS.find(c => c.id === categoryType)?.label,
        fabricType: fabricType.trim(),
        totalAmount: totalPrice,
        depositAmount: depositAmount,
        balanceDue: Math.max(0, totalPrice - depositAmount),
        dueDate: dueDate,
        qrImageUrl: qrImageUrl,
        promptPayId: settings?.promptPayId,
        paymentMethod: paymentMethod,
        status: viewState === 'SUCCESS_VIEW' ? 'DEPOSIT_PAID' : 'PENDING_DEPOSIT'
      }
    });
  }, [
    isOpen,
    customerName,
    customerPhone,
    itemDescription,
    categoryType,
    fabricType,
    totalPrice,
    depositAmount,
    dueDate,
    qrImageUrl,
    settings,
    paymentMethod,
    viewState,
    savedOrder
  ]);

  // Reset custom order display on dual screen when component unmounts
  useEffect(() => {
    return () => {
      DualMonitorSync.broadcast({
        cart: [],
        subtotal: 0,
        promoDiscount: 0,
        netTotal: 0,
        upsellPrompts: [],
        customOrderPayment: null
      });
    };
  }, []);

  if (!isOpen) return null;

  // Auto-fill member if selected
  const handleSelectMember = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.gender) setCustomerGender(c.gender);
    if (c.address) setShippingAddress(c.address);
    setMemberSearchQuery('');
  };

  const handlePriceChange = (val: number) => {
    setTotalPrice(val);
    setDepositAmount(Math.round(val / 2)); // Auto 50%
  };

  const updateMeasurement = (key: keyof CustomOrderMeasurements, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  // Upload mockup / reference fabric photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 800, 800, 0.85);
      setReferenceImageUrl(base64);
    } catch {
      alert('ไม่สามารถประมวลผลรูปภาพได้');
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      alert('⚠️ ไม่สามารถบันทึกงานสั่งผลิตหรือรับเงินมัดจำได้!\nเนื่องจาก "ยังไม่ได้เปิดกะทำงาน"\n\nกรุณาไปที่เมนู "กะพนักงาน" เพื่อเปิดกะรับเงินก่อนครับ');
      onClose();
      if (onOpenShiftRequired) onOpenShiftRequired();
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || totalPrice <= 0) {
      alert('กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์ และยอดเงินสั่งผลิต');
      return;
    }

    const cashierId = currentUser?.id || activeShift.cashierId;
    const cashierName = currentUser?.name || staffName || activeShift.cashierName;
    const shiftId = activeShift.id;

    const orderNo = `CUST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const balanceDue = Math.max(0, totalPrice - depositAmount);

    const newOrder: CustomMadeOrder = {
      id: `co-${Date.now()}`,
      orderNo,
      createdAt: new Date().toISOString(),
      staffName: cashierName,
      branch: activeShift.branch || 'SHOP',
      customerId: selectedCustomerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerGender,
      categoryType,
      measurements,
      referenceImageUrl: referenceImageUrl || undefined,
      fabricType: fabricType.trim() || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      deliveryMethod,
      shippingAddress: deliveryMethod === 'SHIPPING_ADDRESS' ? shippingAddress.trim() : undefined,
      dueDate,
      itemDescription: itemDescription.trim(),
      qty,
      totalPrice,
      depositAmount,
      balanceDue,
      depositPaymentMethod: paymentMethod,
      status: 'PENDING_PRODUCTION',
      notes: notes.trim()
    };

    // 1. บันทึกลงตารางงานสั่งผลิต
    await db.customOrders.add(newOrder);
    CloudSync.pushCustomOrder(newOrder);

    // 2. นำยอดเงินมัดจำเข้ากะพนักงาน
    if (depositAmount > 0) {
      const isCash = paymentMethod === 'CASH';
      const updatedShift: Shift = {
        ...activeShift,
        totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? depositAmount : 0),
        totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + (!isCash ? depositAmount : 0),
        totalTransactions: (activeShift.totalTransactions || 0) + 1
      };
      await db.shifts.put(updatedShift);
      CloudSync.pushShift(updatedShift);
      if (onShiftUpdated) onShiftUpdated();

      // 3. สร้างบิลขายมัดจำลงใน db.orders
      const depositBill: Order = {
        id: `ord-dep-${Date.now()}`,
        localOrderId: `DEP-${newOrder.orderNo}`,
        timestamp: new Date().toISOString(),
        cashierId: cashierId,
        cashierName: cashierName,
        shiftId: shiftId,
        customerId: selectedCustomerId,
        customerName: newOrder.customerName,
        customerGender,
        items: [{
          variantId: `custom-order-${newOrder.id}`,
          productName: `เงินมัดจำสั่งผลิต (50%): ${newOrder.itemDescription}`,
          sku: newOrder.orderNo,
          attributes: {
            'ประเภท': categoryType,
            'ลูกค้า': newOrder.customerName,
            'โทร': newOrder.customerPhone,
            'ยอดสั่งผลิตเต็ม': `฿${newOrder.totalPrice.toLocaleString()}`,
            'ยอดคงค้าง': `฿${newOrder.balanceDue.toLocaleString()}`
          },
          qty: newOrder.qty,
          unitPrice: newOrder.depositAmount,
          costPrice: 0,
          lineTotal: newOrder.depositAmount
        }],
        subtotal: newOrder.depositAmount,
        promoDiscount: 0,
        netTotal: newOrder.depositAmount,
        payments: [{
          method: paymentMethod === 'CASH' ? 'CASH' : 'PROMPTPAY',
          amount: newOrder.depositAmount
        }],
        cashReceived: paymentMethod === 'CASH' ? newOrder.depositAmount : undefined,
        changeGiven: 0,
        status: 'COMPLETED',
        isSynced: false
      };

      await db.orders.add(depositBill);
      CloudSync.pushOrder(depositBill);
    }

    setSavedOrder(newOrder);
    setViewState('SUCCESS_VIEW');
  };

  // พิมพ์ใบสั่งผลิตและยืนยันการสั่งซื้อ ขนาด A4 มาตรฐาน พร้อมอินโฟกราฟิกหุ่นสัดส่วน และ PromptPay QR ชำระเงิน
  const handlePrintA4 = (order: CustomMadeOrder) => {
    const isFem = order.customerGender === 'FEMALE';
    const meas = order.measurements || {};

    // Dynamic QR for printable A4: For remaining balance due (or deposit/total)
    const printAmount = order.balanceDue > 0 ? order.balanceDue : (order.depositAmount > 0 ? order.depositAmount : order.totalPrice);
    const printPromptPayPayload = settings?.promptPayId
      ? PromptPayService.generatePayload(settings.promptPayId, printAmount)
      : '';
    const printQrUrl = printPromptPayPayload
      ? PromptPayService.getQrImageUrl(printPromptPayPayload, 260)
      : '';

    // Code 128 Barcode for quick scanning at POS when customer picks up
    const orderBarcodeDataUrl = BarcodeGenerator.generateDataUrl(order.orderNo, { height: 40, showText: false });

    // Generate Measurement rows
    const measurementRows: string[] = [];
    if (meas.chest) measurementRows.push(`<tr><td>รอบอก</td><td class="bold">${meas.chest}</td></tr>`);
    if (meas.waist || meas.waistPants) measurementRows.push(`<tr><td>รอบเอว</td><td class="bold">${meas.waist || meas.waistPants}</td></tr>`);
    if (meas.hips || meas.hipsPants) measurementRows.push(`<tr><td>รอบสะโพก</td><td class="bold">${meas.hips || meas.hipsPants}</td></tr>`);
    if (meas.shoulder) measurementRows.push(`<tr><td>ไหล่กว้าง</td><td class="bold">${meas.shoulder}</td></tr>`);
    if (meas.shirtLength) measurementRows.push(`<tr><td>ความยาวเสื้อ</td><td class="bold">${meas.shirtLength}</td></tr>`);
    if (meas.armLength) measurementRows.push(`<tr><td>ความยาวแขน</td><td class="bold">${meas.armLength}</td></tr>`);
    if (meas.armHole) measurementRows.push(`<tr><td>รอบวงแขน/ต้นแขน</td><td class="bold">${meas.armHole}</td></tr>`);
    if (meas.neck) measurementRows.push(`<tr><td>รอบคอ</td><td class="bold">${meas.neck}</td></tr>`);
    if (meas.pantsLength) measurementRows.push(`<tr><td>ความยาวกางเกง</td><td class="bold">${meas.pantsLength}</td></tr>`);
    if (meas.thigh) measurementRows.push(`<tr><td>รอบต้นขา</td><td class="bold">${meas.thigh}</td></tr>`);
    if (meas.crotch) measurementRows.push(`<tr><td>เป้ากางเกง</td><td class="bold">${meas.crotch}</td></tr>`);
    if (meas.legOpening) measurementRows.push(`<tr><td>ปลายขา</td><td class="bold">${meas.legOpening}</td></tr>`);
    if (meas.customDimension) measurementRows.push(`<tr><td>มิติสัดส่วนพิเศษ</td><td class="bold">${meas.customDimension}</td></tr>`);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบสั่งผลิตและวัดตัว Haute Couture - ${order.orderNo}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 15px; }
            .brand-title { font-size: 18px; font-weight: 800; color: #78350f; text-transform: uppercase; }
            .brand-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
            .doc-title { font-size: 15px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-no { font-family: monospace; font-size: 12px; font-weight: bold; color: #b45309; text-align: right; }
            
            .info-grid { width: 100%; margin-bottom: 15px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
            .info-box h4 { margin: 0 0 6px 0; font-size: 11px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
            
            .tailoring-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .tailoring-grid td { vertical-align: top; }

            .measurement-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
            .measurement-table th, .measurement-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
            .measurement-table th { background: #f1f5f9; font-weight: 700; color: #334155; }
            .bold { font-weight: bold; color: #b45309; }

            .mannequin-container { width: 100%; text-align: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
            .media-photo { max-height: 230px; width: 100%; object-fit: contain; border-radius: 6px; display: block; margin: 0 auto; }
            .media-caption { font-size: 10px; font-weight: 700; color: #475569; margin-top: 6px; border-top: 1px dashed #e2e8f0; padding-top: 4px; }
            
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.items-table th, table.items-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            table.items-table th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 11.5px; }
            
            .summary-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .summary-table td { padding: 5px 8px; }
            .total-row { border-top: 1.5px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 13px; }

            .terms { font-size: 10.5px; color: #64748b; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
            
            .signature-table { width: 100%; margin-top: 25px; border-collapse: collapse; }
            .signature-table td { width: 50%; text-align: center; vertical-align: bottom; padding: 0 20px; }
            .sig-line { border-bottom: 1px solid #64748b; width: 80%; margin: 40px auto 6px auto; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-title">${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                <div class="brand-sub">${settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 3px;">
                  ที่อยู่: ${settings?.address || 'เรือนโคราชเฉลิมวัฒนา จ.นครราชสีมา'} | โทร: ${settings?.phone || '044-XXXXXX'}
                </div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div class="doc-title">ใบสั่งผลิต & สัดส่วนสั่งตัดพิเศษ</div>
                <div class="doc-title" style="font-size: 11px; font-weight: normal; color: #64748b;">(CUSTOM TAILORING & WORK ORDER)</div>
                <div class="doc-no">เลขที่: ${order.orderNo}</div>
                <div style="font-size: 11px; color: #64748b;">วันที่: ${new Date(order.createdAt).toLocaleDateString('th-TH')}</div>
                <div style="margin-top: 4px; display: flex; justify-content: flex-end;">
                  <img src="${orderBarcodeDataUrl}" style="height: 36px; width: 140px; object-fit: contain;" alt="Order Barcode" />
                </div>
              </td>
            </tr>
          </table>

          <table class="info-grid">
            <tr>
              <td style="width: 50%; padding-right: 8px; vertical-align: top;">
                <div class="info-box">
                  <h4>ข้อมูลลูกค้าผู้สั่ง</h4>
                  <div><b>ชื่อ-นามสกุล:</b> ${order.customerName} (${GENDER_CONFIG[order.customerGender || 'FEMALE'].label})</div>
                  <div><b>เบอร์โทรศัพท์:</b> ${order.customerPhone}</div>
                  <div><b>การรับสินค้า:</b> ${order.deliveryMethod === 'PICKUP_SHOP' ? 'มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)' : 'จัดส่งพัสดุตามที่อยู่'}</div>
                  ${order.shippingAddress ? `<div><b>ที่อยู่จัดส่ง:</b> ${order.shippingAddress}</div>` : ''}
                </div>
              </td>
              <td style="width: 50%; padding-left: 8px; vertical-align: top;">
                <div class="info-box">
                  <h4>ข้อมูลการผลิตและการนัดหมาย</h4>
                  <div><b>ผู้ออกใบสั่ง:</b> ${order.staffName} (สาขาหน้าร้าน)</div>
                  <div><b>กำหนดส่งมอบ / นัดรับ:</b> <span style="font-size: 12.5px; font-weight: 800; color: #b45309;">${order.dueDate ? `${new Date(order.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} (${order.dueDate.split('-').reverse().join('/')})` : '-'}</span></div>
                  <div><b>ประเภทสินค้า:</b> ${CATEGORY_OPTIONS.find(c => c.id === order.categoryType)?.label || 'สั่งตัดพิเศษ'}</div>
                  <div><b>ช่องทางชำระมัดจำ:</b> ${order.depositPaymentMethod === 'PROMPTPAY' ? 'สแกนโอน PromptPay QR' : 'เงินสด'}</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- TAILORING MEASUREMENTS & SPECIFICATIONS -->
          <table class="tailoring-grid">
            <tr>
              <!-- Measurements Table (Left) -->
              <td style="width: 55%; padding-right: 10px;">
                <div style="font-weight: 700; font-size: 11.5px; margin-bottom: 5px; color: #0f172a;">
                  📐 ตารางสัดส่วนการวัดตัว (Body Measurements):
                </div>
                ${measurementRows.length > 0 ? `
                  <table class="measurement-table">
                    <thead>
                      <tr><th>จุดวัดสัดส่วน</th><th>ขนาดที่วัดได้</th></tr>
                    </thead>
                    <tbody>
                      ${measurementRows.join('')}
                    </tbody>
                  </table>
                ` : '<div style="font-style: italic; color: #64748b;">ไม่ได้ระบุสัดส่วนวัดตัว</div>'}

                <div style="margin-top: 8px; font-size: 11px;">
                  ${order.fabricType ? `<div><b>ชนิดผ้า:</b> ${order.fabricType}</div>` : ''}
                  ${order.specialInstructions ? `<div><b>เทคนิค/ตำแหน่งปัก:</b> ${order.specialInstructions}</div>` : ''}
                </div>
              </td>

              <!-- Mockup Image & Vector Mannequin Silhouette (Right) -->
              <td style="width: 48%; text-align: center; vertical-align: top;">
                <div style="font-weight: 700; font-size: 11.5px; margin-bottom: 6px; color: #0f172a; text-align: left;">
                  ${order.referenceImageUrl 
                    ? '🎨 ภาพตัวอย่าง & หุ่นสัดส่วน (Reference & Mannequin):' 
                    : `📐 หุ่นจำลองสัดส่วนวัดตัว (${isFem ? 'สตรี' : 'บุรุษ'}):`}
                </div>

                ${order.referenceImageUrl ? `
                  <!-- กรณีมีภาพถ่าย: แสดงทั้งภาพตัวอย่าง และหุ่นวัดตัวเวกเตอร์ เคียงข้างกันอย่างลงตัว -->
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="width: 46%; vertical-align: top; padding-right: 5px;">
                        <div class="mannequin-container" style="padding: 6px; min-height: 240px; display: flex; flex-direction: column; justify-content: space-between;">
                          <img src="${order.referenceImageUrl}" alt="Mockup" class="media-photo" style="max-height: 190px;" />
                          <div class="media-caption">ภาพแบบอ้างอิง / ลายผ้า</div>
                        </div>
                      </td>
                      <td style="width: 54%; vertical-align: top; padding-left: 5px;">
                        <div class="mannequin-container" style="padding: 6px; min-height: 240px;">
                          <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 3px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;">
                            ${isFem ? '👩 หุ่นสตรี (FEMALE)' : '👨 หุ่นบุรุษ (MALE)'}
                          </div>
                          ${renderMannequinSvgHtml(order.customerGender || 'FEMALE', order.categoryType || 'SHIRT', order.measurements || {}, true)}
                        </div>
                      </td>
                    </tr>
                  </table>
                ` : `
                  <!-- กรณีไม่มีรูปถ่าย ให้แสดงหุ่นวัดตัวเวกเตอร์พร้อมเส้นสัดส่วน เต็มพื้นที่ กว้างขวาง คมชัด 100% -->
                  <div class="mannequin-container" style="padding: 8px;">
                    <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 4px;">
                      ${isFem ? '👩 หุ่นสตรี (FEMALE)' : '👨 หุ่นบุรุษ (MALE)'} - ${order.categoryType === 'PANTS' ? 'เน้นสัดส่วนช่วงล่าง (กางเกง)' : 'เน้นสัดส่วนช่วงบน (เสื้อ/แจ็กเก็ต)'}
                    </div>
                    <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
                      ${renderMannequinSvgHtml(order.customerGender || 'FEMALE', order.categoryType || 'SHIRT', order.measurements || {}, true)}
                    </div>
                  </div>
                `}
              </td>
            </tr>
          </table>

          <!-- ITEMS & PRICE SUMMARY -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ลำดับ</th>
                <th>รายละเอียดงานสั่งผลิต</th>
                <th style="width: 60px; text-align: center;">จำนวน</th>
                <th style="width: 90px; text-align: right;">ราคาต่อหน่วย</th>
                <th style="width: 100px; text-align: right;">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${order.itemDescription}</div>
                  ${order.notes ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">หมายเหตุ: ${order.notes}</div>` : ''}
                </td>
                <td style="text-align: center; font-weight: 700;">${order.qty} ชิ้น</td>
                <td style="text-align: right;">฿${(order.totalPrice / order.qty).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
              <td style="width: 52%; vertical-align: middle; padding-right: 15px;">
                ${printQrUrl ? `
                  <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 12px;">
                    <img src="${printQrUrl}" style="width: 90px; height: 90px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; padding: 3px;" alt="PromptPay QR" />
                    <div style="flex: 1;">
                      <div style="font-weight: 800; font-size: 11px; color: #0f172a;">📱 สแกนชำระเงินผ่าน PromptPay QR</div>
                      <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                        ${order.balanceDue > 0 
                          ? `ยอดค้างชำระคงเหลือวันรับของ: <b style="color: #b91c1c; font-size: 11.5px;">฿${order.balanceDue.toLocaleString()}</b>`
                          : `ยอดชำระมัดจำแล้ว: <b style="color: #15803d; font-size: 11.5px;">฿${order.depositAmount.toLocaleString()}</b>`}
                      </div>
                      <div style="font-size: 9.5px; color: #64748b; font-family: monospace; margin-top: 2px;">
                        พร้อมเพย์: <b>${settings?.promptPayId || '-'}</b> (${settings?.storeName || 'KORAT CAT'})
                      </div>
                      <div style="font-size: 8.5px; color: #94a3b8; margin-top: 2px; line-height: 1.3;">
                        * สแกนผ่าน Mobile Banking ได้ทุกธนาคาร ลูกค้าสามารถนำใบนี้มาสแกนจ่ายยอดคงเหลือในวันรับสินค้าได้ทันที
                      </div>
                    </div>
                  </div>
                ` : `
                  <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px; font-size: 10.5px; color: #64748b;">
                    <b>ช่องทางชำระมัดจำ:</b> ${order.depositPaymentMethod === 'PROMPTPAY' ? 'สแกนโอน PromptPay QR' : 'เงินสด'}
                  </div>
                `}
              </td>
              <td style="width: 48%; vertical-align: top;">
                <table class="summary-table">
                  <tr>
                    <td>ยอดรวมทั้งสิ้น (Total):</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
                  </tr>
                  <tr style="color: #15803d;">
                    <td><b>เงินมัดจำที่ชำระแล้ว (Deposit Paid):</b></td>
                    <td style="text-align: right; font-weight: 700;">฿${order.depositAmount.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row" style="color: #b91c1c;">
                    <td style="font-weight: 700;">ยอดค้างชำระคงเหลือ (Balance Due):</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.balanceDue.toLocaleString()}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="terms">
            <b>เงื่อนไขการสั่งผลิต:</b><br>
            1. ทางร้านขอสงวนสิทธิ์การคืนเงินมัดจำกรณีลูกค้ายกเลิกคำสั่งผลิตหลังจากเริ่มกระบวนการตัดเย็บ/พิมพ์ผ้าแล้ว<br>
            2. กรุณานำใบยืนยันการสั่งซื้อฉบับนี้ หรือภาพถ่าย มาแสดงพร้อมชำระยอดค้างชำระในวันมารับสินค้า<br>
            3. หากมีข้อสงสัยหรือต้องการปรับแก้ขนาด กรุณาติดต่อทางร้านล่วงหน้าอย่างน้อย 3 วันทำการ
          </div>

          <table class="signature-table">
            <tr>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.staffName} )</div>
                <div style="font-size: 10px; color: #64748b;">พนักงานผู้รับคำสั่งผลิต / ช่างวัดตัว</div>
              </td>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.customerName} )</div>
                <div style="font-size: 10px; color: #64748b;">ลูกค้าผู้สั่งผลิต / ผู้ยืนยันสัดส่วน</div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบงานสั่งตัด / สั่งผลิต Haute Couture &amp; มัดจำ 50%</h3>
              <p className="text-[11px] text-slate-400">บันทึกสัดส่วนวัดตัว พร้อมอินโฟกราฟิกหุ่นลายเส้น และออกใบสั่งตัดขนาด A4</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {viewState === 'SUCCESS_VIEW' && savedOrder ? (
            /* SUCCESS VIEW */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-extrabold text-white">บันทึกใบสั่งผลิตสำเร็จเรียบร้อย!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  เลขที่ใบสั่ง: <span className="font-mono font-bold text-amber-400">{savedOrder.orderNo}</span>
                </p>
              </div>

              {/* Order Summary Card */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">ลูกค้า:</span>
                  <span className="font-bold text-white">{savedOrder.customerName} ({savedOrder.customerPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ประเภท / รายละเอียด:</span>
                  <span className="font-bold text-slate-200">{savedOrder.itemDescription}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">วันกำหนดนัดรับ:</span>
                  <span className="font-bold text-amber-400">{savedOrder.dueDate}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between">
                  <span className="text-slate-400">ยอดรวมทั้งสิ้น:</span>
                  <span className="font-bold text-white font-mono">฿{savedOrder.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>มัดจำที่ชำระแล้ว (50%):</span>
                  <span className="font-bold font-mono">฿{savedOrder.depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                  <span>ยอดค้างชำระคงเหลือ:</span>
                  <span className="font-mono">฿{savedOrder.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {/* QR Code Embedded Notice */}
              <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-2xl max-w-md mx-auto text-xs text-sky-200 flex items-center gap-2.5 text-left">
                <QrCode className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white">ระบบแนบ PromptPay QR ลงในใบสั่งตัด A4 ให้เรียบร้อย</span>
                  <p className="text-[11px] text-sky-300/80 mt-0.5">
                    ลูกค้าสามารถนำเอกสาร A4 นี้มาสแกนจ่ายยอดคงเหลือ (฿{savedOrder.balanceDue.toLocaleString()}) ผ่านมือถือในวันรับสินค้าได้ทันที
                  </p>
                </div>
              </div>

              {/* Print Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePrintA4(savedOrder)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ พิมพ์ใบสั่งตัด A4 พร้อมหุ่นวัดตัว &amp; QR ชำระเงิน</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ ออกใบสั่งผลิตใหม่</span>
                </button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSaveOrder} className="space-y-5">
              {!activeShift && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <div className="font-bold text-white">ยังไม่มีกะพนักงานเปิดอยู่!</div>
                      <div className="text-[11px] text-rose-300">จำเป็นต้องเปิดกะก่อนรับเงินมัดจำ เพื่อให้ระบบรวมยอดเงินเข้าลิ้นชัก</div>
                    </div>
                  </div>
                  {onOpenShiftRequired && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onOpenShiftRequired();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                    >
                      ไปเปิดกะรับเงิน
                    </button>
                  )}
                </div>
              )}

              {/* 2-COLUMN LAYOUT: FORM INPUTS (LEFT) vs LIVE MANNEQUIN INFOGRAPHIC (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT COLUMN: 7 Cols */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Member Search / Walk-in Link */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>เลือกลูกค้าสมาชิก หรือ กรอกข้อมูลใหม่:</span>
                      </span>
                      {selectedCustomerId && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                          ✓ ผูกกับสมาชิกแล้ว
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="พิมพ์ค้นหาสมาชิกด้วยเบอร์โทร หรือ ชื่อ..."
                        value={memberSearchQuery}
                        onChange={e => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                      />
                      {memberSearchQuery && (
                        <div className="absolute left-0 right-0 top-9 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-36 overflow-y-auto divide-y divide-slate-700 text-xs">
                          {existingCustomers
                            .filter(c => c.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || c.phone.includes(memberSearchQuery))
                            .map(c => (
                              <div
                                key={c.id}
                                onClick={() => handleSelectMember(c)}
                                className="p-2 hover:bg-slate-700 cursor-pointer flex justify-between items-center"
                              >
                                <span><b>{c.name}</b> ({c.phone})</span>
                                <span className="text-[10px] text-amber-400">{c.tier}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-0.5">ชื่อ-นามสกุล ลูกค้า *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="เช่น คุณวิภาวี นครราช"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-0.5">เบอร์โทรศัพท์ *</label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="08X-XXX-XXXX"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        เพศลูกค้า (เลือกเพื่อสลับหุ่นวัดตัวสตรี/บุรุษ):
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['FEMALE', 'MALE', 'LGBTQ'] as GenderType[]).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setCustomerGender(g)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                              customerGender === g
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md scale-102'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                            }`}
                          >
                            <span>{GENDER_CONFIG[g].icon}</span>
                            <span>{GENDER_CONFIG[g].label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
                    <label className="block text-xs font-bold text-amber-300">
                      ประเภทงานที่ลูกค้าสั่ง (เลือกเพื่อเปิดช่องสัดส่วน):
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {CATEGORY_OPTIONS.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategoryType(cat.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                            categoryType === cat.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                          }`}
                        >
                          <span className="text-base">{cat.icon}</span>
                          <span className="text-[10px] leading-tight text-center">{cat.label.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measurement Inputs based on category */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-amber-400" />
                        <span>กรอกสัดส่วนการวัดตัว (หน่วย: นิ้ว หรือ ซม.):</span>
                      </span>
                      <span className="text-[10px] text-slate-400">พิมพ์แล้วตัวเลขจะขึ้นบนหุ่นขวามือทันที</span>
                    </div>

                    {(categoryType === 'SHIRT' || categoryType === 'JACKET' || categoryType === 'OTHER') && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบอก</label>
                          <input
                            type="text"
                            placeholder='เช่น 36"'
                            value={measurements.chest || ''}
                            onChange={e => updateMeasurement('chest', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบเอว</label>
                          <input
                            type="text"
                            placeholder='เช่น 28"'
                            value={measurements.waist || ''}
                            onChange={e => updateMeasurement('waist', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ไหล่กว้าง</label>
                          <input
                            type="text"
                            placeholder='เช่น 16"'
                            value={measurements.shoulder || ''}
                            onChange={e => updateMeasurement('shoulder', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวเสื้อ</label>
                          <input
                            type="text"
                            placeholder='เช่น 27"'
                            value={measurements.shirtLength || ''}
                            onChange={e => updateMeasurement('shirtLength', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวแขน</label>
                          <input
                            type="text"
                            placeholder='เช่น 22"'
                            value={measurements.armLength || ''}
                            onChange={e => updateMeasurement('armLength', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบวงแขน/ต้นแขน</label>
                          <input
                            type="text"
                            placeholder='เช่น 14"'
                            value={measurements.armHole || ''}
                            onChange={e => updateMeasurement('armHole', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบคอ</label>
                          <input
                            type="text"
                            placeholder='เช่น 15"'
                            value={measurements.neck || ''}
                            onChange={e => updateMeasurement('neck', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบข้อมือ/ปลายแขน</label>
                          <input
                            type="text"
                            placeholder='เช่น 8"'
                            value={measurements.wrist || ''}
                            onChange={e => updateMeasurement('wrist', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {(categoryType === 'PANTS' || categoryType === 'OTHER') && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-800">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">เอวกางเกง</label>
                          <input
                            type="text"
                            placeholder='เช่น 32"'
                            value={measurements.waistPants || ''}
                            onChange={e => updateMeasurement('waistPants', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบสะโพก</label>
                          <input
                            type="text"
                            placeholder='เช่น 38"'
                            value={measurements.hipsPants || ''}
                            onChange={e => updateMeasurement('hipsPants', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวกางเกง</label>
                          <input
                            type="text"
                            placeholder='เช่น 38"'
                            value={measurements.pantsLength || ''}
                            onChange={e => updateMeasurement('pantsLength', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบต้นขา</label>
                          <input
                            type="text"
                            placeholder='เช่น 22"'
                            value={measurements.thigh || ''}
                            onChange={e => updateMeasurement('thigh', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">เป้ากางเกง</label>
                          <input
                            type="text"
                            placeholder='เช่น 12"'
                            value={measurements.crotch || ''}
                            onChange={e => updateMeasurement('crotch', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ปลายขา</label>
                          <input
                            type="text"
                            placeholder='เช่น 14"'
                            value={measurements.legOpening || ''}
                            onChange={e => updateMeasurement('legOpening', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {(categoryType === 'BAG' || categoryType === 'HAT') && (
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-0.5">มิติสัดส่วนพิเศษ (กว้าง x ยาว x สูง หรือ รอบศีรษะ)</label>
                        <input
                          type="text"
                          placeholder="เช่น รอบศีรษะ 58 ซม. หรือ กว้าง 40 x สูง 35 ซม."
                          value={measurements.customDimension || ''}
                          onChange={e => updateMeasurement('customDimension', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fabric & Mockup Attachment */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">ชนิดผ้า / วัสดุที่ใช้:</label>
                        <input
                          type="text"
                          value={fabricType}
                          onChange={e => setFabricType(e.target.value)}
                          placeholder="เช่น ผ้าไหมมัดหมี่, คอตตอน Comb 20"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">เทคนิคพิเศษ / ตำแหน่งปัก:</label>
                        <input
                          type="text"
                          value={specialInstructions}
                          onChange={e => setSpecialInstructions(e.target.value)}
                          placeholder="เช่น ปักด้ายทองที่อกซ้าย, สกรีน DTF ด้านหลัง"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        แนบรูปตัวอย่างลายผ้า หรือ แบบอ้างอิงจากลูกค้า (Reference Mockup):
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-1.5 transition">
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span>เลือกไฟล์ภาพ</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                        {referenceImageUrl ? (
                          <div className="relative group">
                            <img
                              src={referenceImageUrl}
                              alt="Ref"
                              className="w-12 h-12 rounded-lg object-cover border border-amber-400/60 shadow"
                            />
                            <button
                              type="button"
                              onClick={() => setReferenceImageUrl('')}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-0.5"
                              title="ลบรูปภาพ"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">ยังไม่มีรูปแนบ (สามารถแนบภายหลังได้)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-300">วันกำหนดนัดรับสินค้า *</label>
                        {dueDate && (
                          <span className="text-[10px] text-amber-300 font-bold font-mono">
                            {new Date(dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      />
                      {/* Thai Quick Date Presets */}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {[
                          { label: '+3 วัน', days: 3 },
                          { label: '+7 วัน (1 สัปดาห์)', days: 7 },
                          { label: '+14 วัน (2 สัปดาห์)', days: 14 },
                          { label: '+30 วัน (1 เดือน)', days: 30 }
                        ].map(btn => (
                          <button
                            key={btn.days}
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + btn.days);
                              setDueDate(d.toISOString().slice(0, 10));
                            }}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">ช่องทางรับสินค้า *</label>
                      <select
                        value={deliveryMethod}
                        onChange={e => setDeliveryMethod(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-medium"
                      >
                        <option value="PICKUP_SHOP">🏪 มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)</option>
                        <option value="SHIPPING_ADDRESS">🚚 จัดส่งพัสดุตามที่อยู่ลูกค้า</option>
                      </select>
                    </div>

                    {deliveryMethod === 'SHIPPING_ADDRESS' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">ที่อยู่จัดส่งพัสดุ:</label>
                        <textarea
                          rows={2}
                          value={shippingAddress}
                          onChange={e => setShippingAddress(e.target.value)}
                          placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์..."
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Pricing & 50% Deposit */}
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">ยอดราคาผลิตรวมทั้งหมด (บาท) *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={totalPrice === 0 ? '' : totalPrice}
                          onFocus={e => e.target.select()}
                          onChange={e => handlePriceChange(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold font-mono text-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          เงินมัดจำ (50% = ฿{Math.round(totalPrice / 2).toLocaleString()}) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={totalPrice}
                          required
                          value={depositAmount === 0 ? '' : depositAmount}
                          onFocus={e => e.target.select()}
                          onChange={e => setDepositAmount(parseInt(e.target.value, 10) || 0)}
                          placeholder="0"
                          className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold font-mono text-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-400">
                        ช่องทางชำระมัดจำ:
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('PROMPTPAY')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                            paymentMethod === 'PROMPTPAY' ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          PromptPay QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CASH')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                            paymentMethod === 'CASH' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          เงินสด
                        </button>
                      </div>
                    </div>

                    {/* Live PromptPay QR for Deposit scanning directly at counter */}
                    {paymentMethod === 'PROMPTPAY' && depositAmount > 0 && (
                      <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-2xl flex flex-col sm:flex-row items-center gap-3.5 shadow-inner">
                        <div className="bg-white p-2 rounded-xl flex-shrink-0 shadow">
                          {qrImageUrl ? (
                            <img
                              src={qrImageUrl}
                              alt="PromptPay QR"
                              className="w-24 h-24 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 flex flex-col items-center justify-center text-slate-400 text-center p-1">
                              <QrCode className="w-6 h-6 mb-1 text-slate-300" />
                              <span className="text-[9px]">ไม่พบเลขพร้อมเพย์</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10.5px] font-bold border border-sky-500/40">
                            <QrCode className="w-3 h-3" />
                            <span>สแกนจ่ายมัดจำ 50% ทันที (PromptPay)</span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            ยอดมัดจำ: <span className="font-mono text-emerald-400 text-sm font-black">฿{depositAmount.toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            {settings?.promptPayId ? (
                              <>พร้อมเพย์: <b className="font-mono text-slate-200">{settings.promptPayId}</b><br />• สแกนจ่ายที่เคาน์เตอร์นี้ หรือสแกนผ่าน <b>"หน้าจอที่ 2 ของลูกค้า"</b> ได้พร้อมกัน</>
                            ) : (
                              <span className="text-amber-400">* ยังไม่ได้ตั้งค่าเบอร์พร้อมเพย์ในระบบ (ไปที่ เมนูตั้งค่า)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-rose-300 font-bold">ยอดค้างชำระเมื่อรับของ:</span>
                      <span className="font-mono font-black text-rose-400 text-sm">
                        ฿{Math.max(0, totalPrice - depositAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>บันทึกใบสั่งผลิตและรับมัดจำ (฿{depositAmount.toLocaleString()})</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: 5 Cols - LIVE MANNEQUIN INFOGRAPHIC */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-3xl p-4 sticky top-0">
                  <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>อินโฟกราฟิกหุ่นสัดส่วนสด (Live Silhouette):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {customerGender === 'FEMALE' ? 'สตรี' : 'บุรุษ'}
                    </span>
                  </div>

                  <div className="w-full py-2 flex items-center justify-center flex-1 min-h-[360px]">
                    <MannequinFigure
                      gender={customerGender}
                      category={categoryType}
                      measurements={measurements}
                      className="w-full"
                    />
                  </div>

                  {referenceImageUrl && (
                    <div className="w-full pt-3 border-t border-slate-800 flex items-center gap-3">
                      <img
                        src={referenceImageUrl}
                        alt="Fabric Mockup"
                        className="w-12 h-12 rounded-xl object-cover border border-amber-400/50"
                      />
                      <div className="text-[11px] min-w-0">
                        <div className="font-bold text-slate-200 truncate">ตัวอย่างลายผ้า / แบบอ้างอิง</div>
                        <div className="text-slate-400 text-[10px]">จะพิมพ์แนบลงในใบยืนยัน A4 ให้ด้วย</div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6 flex-shrink-0">
          <span>KORAT CAT Haute Couture Atelier</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
