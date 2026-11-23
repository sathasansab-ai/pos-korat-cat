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
  QrCode,
  Download,
  Trash2,
  Camera
} from 'lucide-react';
import { db } from '../db';
import type { 
  CustomMadeOrder, 
  CustomOrderItem,
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

export const STANDARD_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'];

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

  // Multi-item Custom Orders State
  const [orderItems, setOrderItems] = useState<CustomOrderItem[]>([
    {
      id: `item-${Date.now()}-1`,
      categoryType: 'SHIRT',
      itemDescription: 'สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง',
      sizeMode: 'STANDARD',
      standardSize: 'M',
      measurements: {
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
      },
      fabricType: 'ผ้าไหมมัดหมี่ทอมือโคราช',
      specialInstructions: 'ปักลายฉลุทองแมวโคราช x เดินตะเข็บคู่ประณีต',
      referenceImageUrl: '',
      qty: 1,
      unitPrice: 3500,
      lineTotal: 3500
    }
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Category & Tailoring Measurements (for backwards compat and current active item)
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

  // Payment Type: Full (100%) vs Deposit
  const [paymentType, setPaymentType] = useState<'FULL' | 'DEPOSIT'>('DEPOSIT');
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
    setPaymentType('DEPOSIT');
    setDepositAmount(1750);
    setPaymentMethod('PROMPTPAY');
    setDeliveryMethod('PICKUP_SHOP');
    setShippingAddress('');
    setNotes('');
    setViewState('FORM');
    setSavedOrder(null);
    setOrderItems([
      {
        id: `item-${Date.now()}-1`,
        categoryType: 'SHIRT',
        itemDescription: 'สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง',
        sizeMode: 'STANDARD',
        standardSize: 'M',
        measurements: {
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
        },
        fabricType: 'ผ้าไหมมัดหมี่ทอมือโคราช',
        specialInstructions: 'ปักลายฉลุทองแมวโคราช x เดินตะเข็บคู่ประณีต',
        referenceImageUrl: '',
        qty: 1,
        unitPrice: 3500,
        lineTotal: 3500
      }
    ]);
    setActiveItemIndex(0);
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
    if (paymentType === 'FULL') {
      setDepositAmount(val);
    } else {
      setDepositAmount(Math.round(val / 2));
    }
  };

  const handlePaymentTypeToggle = (type: 'FULL' | 'DEPOSIT') => {
    setPaymentType(type);
    if (type === 'FULL') {
      setDepositAmount(totalPrice);
    } else {
      setDepositAmount(Math.round(totalPrice / 2));
    }
  };

  // Multi-item custom order helpers
  const handleAddItem = () => {
    const nextIdx = orderItems.length + 1;
    const newItem: CustomOrderItem = {
      id: `item-${Date.now()}-${nextIdx}`,
      categoryType: 'SHIRT',
      itemDescription: `รายการสั่งตัด #${nextIdx}`,
      sizeMode: 'STANDARD',
      standardSize: 'M',
      measurements: {
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
      },
      fabricType: 'ผ้าไหมมัดหมี่ทอมือโคราช',
      specialInstructions: '',
      referenceImageUrl: '',
      qty: 1,
      unitPrice: 1500,
      lineTotal: 1500
    };
    const nextItems = [...orderItems, newItem];
    setOrderItems(nextItems);
    setActiveItemIndex(nextItems.length - 1);
    const newTotal = nextItems.reduce((acc, it) => acc + (it.lineTotal || (it.qty * it.unitPrice)), 0);
    setTotalPrice(newTotal);
    if (paymentType === 'FULL') {
      setDepositAmount(newTotal);
    } else {
      setDepositAmount(Math.round(newTotal / 2));
    }
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length <= 1) {
      alert('คำสั่งผลิตต้องมีอย่างน้อย 1 รายการ');
      return;
    }
    const nextItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(nextItems);
    setActiveItemIndex(Math.max(0, index - 1));
    const newTotal = nextItems.reduce((acc, it) => acc + (it.lineTotal || (it.qty * it.unitPrice)), 0);
    setTotalPrice(newTotal);
    if (paymentType === 'FULL') {
      setDepositAmount(newTotal);
    } else {
      setDepositAmount(Math.round(newTotal / 2));
    }
  };

  const handleUpdateActiveItem = (updates: Partial<CustomOrderItem>) => {
    setOrderItems(prev => {
      const next = [...prev];
      const cur = next[activeItemIndex];
      if (!cur) return prev;
      const qty = updates.qty !== undefined ? Math.max(1, updates.qty) : cur.qty;
      const unitPrice = updates.unitPrice !== undefined ? Math.max(0, updates.unitPrice) : cur.unitPrice;
      const lineTotal = qty * unitPrice;
      next[activeItemIndex] = {
        ...cur,
        ...updates,
        qty,
        unitPrice,
        lineTotal
      };
      const newTotal = next.reduce((acc, it) => acc + (it.lineTotal || (it.qty * it.unitPrice)), 0);
      setTotalPrice(newTotal);
      if (paymentType === 'FULL') {
        setDepositAmount(newTotal);
      } else {
        setDepositAmount(Math.round(newTotal / 2));
      }
      return next;
    });
  };

  const updateActiveMeasurement = (key: keyof CustomOrderMeasurements, value: string) => {
    setOrderItems(prev => {
      const next = [...prev];
      const cur = next[activeItemIndex];
      if (!cur) return prev;
      next[activeItemIndex] = {
        ...cur,
        measurements: {
          ...(cur.measurements || {}),
          [key]: value
        }
      };
      return next;
    });
  };

  const handleActivePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 800, 800, 0.85);
      handleUpdateActiveItem({ referenceImageUrl: base64 });
    } catch {
      alert('ไม่สามารถประมวลผลรูปภาพได้');
    }
  };

  const updateMeasurement = (key: keyof CustomOrderMeasurements, value: string) => {
    updateActiveMeasurement(key, value);
    setMeasurements(prev => ({ ...prev, [key]: value }));
  };

  // Upload mockup / reference fabric photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await ImageOptimizer.resizeAndCompress(file, 800, 800, 0.85);
      setReferenceImageUrl(base64);
      handleUpdateActiveItem({ referenceImageUrl: base64 });
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
    const effectiveDeposit = paymentType === 'FULL' ? totalPrice : depositAmount;
    const balanceDue = Math.max(0, totalPrice - effectiveDeposit);

    const primaryItem = orderItems[0] || {};
    const effectiveCategory = primaryItem.categoryType || 'SHIRT';
    const effectiveDescription = orderItems.length === 1
      ? (primaryItem.itemDescription || 'สั่งตัดพิเศษ')
      : `${primaryItem.itemDescription || 'สั่งตัดพิเศษ'} (รวม ${orderItems.length} รายการ)`;
    const effectiveTotalQty = orderItems.reduce((sum, it) => sum + (it.qty || 1), 0);

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
      categoryType: effectiveCategory,
      measurements: primaryItem.measurements || measurements,
      referenceImageUrl: primaryItem.referenceImageUrl || referenceImageUrl || undefined,
      fabricType: primaryItem.fabricType || fabricType.trim() || undefined,
      specialInstructions: primaryItem.specialInstructions || specialInstructions.trim() || undefined,
      deliveryMethod,
      shippingAddress: deliveryMethod === 'SHIPPING_ADDRESS' ? shippingAddress.trim() : undefined,
      dueDate,
      itemDescription: effectiveDescription,
      qty: effectiveTotalQty,
      totalPrice,
      depositAmount: effectiveDeposit,
      balanceDue,
      depositPaymentMethod: paymentMethod,
      status: 'PENDING_PRODUCTION',
      notes: notes.trim(),
      items: orderItems,
      paymentType,
      sizeMode: primaryItem.sizeMode || 'STANDARD',
      standardSize: primaryItem.standardSize || 'M'
    };

    // 1. บันทึกลงตารางงานสั่งผลิต
    await db.customOrders.add(newOrder);
    CloudSync.pushCustomOrder(newOrder);

    // 2. นำยอดเงินเข้ากะพนักงาน
    if (effectiveDeposit > 0) {
      const isCash = paymentMethod === 'CASH';
      const updatedShift: Shift = {
        ...activeShift,
        totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? effectiveDeposit : 0),
        totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + (!isCash ? effectiveDeposit : 0),
        totalTransactions: (activeShift.totalTransactions || 0) + 1
      };
      await db.shifts.put(updatedShift);
      CloudSync.pushShift(updatedShift);
      if (onShiftUpdated) onShiftUpdated();

      // 3. สร้างบิลขายลงใน db.orders
      const depositBill: Order = {
        id: `ord-dep-${Date.now()}`,
        localOrderId: `${paymentType === 'FULL' ? 'FULL' : 'DEP'}-${newOrder.orderNo}`,
        timestamp: new Date().toISOString(),
        cashierId: cashierId,
        cashierName: cashierName,
        shiftId: shiftId,
        customerId: selectedCustomerId,
        customerName: newOrder.customerName,
        customerGender,
        branch: activeShift.branch || 'SHOP',
        items: orderItems.map((it, idx) => ({
          variantId: `custom-order-${newOrder.id}-${idx}`,
          productName: `[สั่งตัด] ${it.itemDescription || 'รายการสั่งตัด'}${it.sizeMode === 'STANDARD' && it.standardSize ? ` (${it.standardSize})` : ''}`,
          sku: `${newOrder.orderNo}-${idx + 1}`,
          barcode: newOrder.orderNo,
          attributes: {
            'ประเภท': it.categoryType,
            'ไซส์': it.sizeMode === 'STANDARD' ? (it.standardSize || 'M') : 'วัดตัวเฉพาะบุคคล',
            'ผ้า': it.fabricType || '-'
          },
          qty: it.qty || 1,
          unitPrice: paymentType === 'FULL' ? it.unitPrice : Math.round(((it.unitPrice * (it.qty || 1)) / totalPrice) * effectiveDeposit),
          costPrice: 0,
          lineTotal: paymentType === 'FULL' ? it.lineTotal : Math.round((it.lineTotal / totalPrice) * effectiveDeposit)
        })),
        subtotal: effectiveDeposit,
        promoDiscount: 0,
        netTotal: effectiveDeposit,
        payments: [{
          method: paymentMethod === 'CASH' ? 'CASH' : 'PROMPTPAY',
          amount: effectiveDeposit
        }],
        cashReceived: paymentMethod === 'CASH' ? effectiveDeposit : undefined,
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

  // สร้างเอกสาร HTML ขนาด A4 มาตรฐาน พร้อมอินโฟกราฟิกหุ่นสัดส่วน และ PromptPay QR ชำระเงิน
  const generateA4Html = (order: CustomMadeOrder) => {
    const isFem = order.customerGender === 'FEMALE';
    const itemsList = order.items && order.items.length > 0 ? order.items : [{
      id: 'item-1',
      categoryType: order.categoryType,
      itemDescription: order.itemDescription,
      sizeMode: order.sizeMode || 'STANDARD',
      standardSize: order.standardSize,
      measurements: order.measurements,
      fabricType: order.fabricType,
      specialInstructions: order.specialInstructions,
      referenceImageUrl: order.referenceImageUrl,
      qty: order.qty,
      unitPrice: Math.round(order.totalPrice / (order.qty || 1)),
      lineTotal: order.totalPrice
    }];
    const firstCustomItem = itemsList.find(it => it.sizeMode === 'CUSTOM') || itemsList[0];
    const meas = firstCustomItem.measurements || order.measurements || {};

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
                <th style="width: 120px; text-align: center;">ไซส์ / รูปแบบ</th>
                <th style="width: 60px; text-align: center;">จำนวน</th>
                <th style="width: 90px; text-align: right;">ราคาต่อหน่วย</th>
                <th style="width: 100px; text-align: right;">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((item, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold; vertical-align: top;">${idx + 1}</td>
                  <td style="vertical-align: top;">
                    <div style="font-weight: 700; color: #0f172a;">${item.itemDescription || 'สั่งตัดพิเศษ'}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
                      ${item.fabricType ? `ผ้า: <b>${item.fabricType}</b> ` : ''}
                      ${item.specialInstructions ? `| ปัก/เทคนิค: <i>${item.specialInstructions}</i>` : ''}
                    </div>
                  </td>
                  <td style="text-align: center; vertical-align: top;">
                    ${item.sizeMode === 'STANDARD' ? `
                      <span class="size-badge">ไซส์: ${item.standardSize || 'Free Size'}</span>
                    ` : `
                      <span class="tailoring-badge">📐 วัดตัวตัดเฉพาะ</span>
                    `}
                  </td>
                  <td style="text-align: center; font-weight: 700; vertical-align: top;">${item.qty || 1} ชิ้น</td>
                  <td style="text-align: right; vertical-align: top;">฿${(item.unitPrice || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-weight: 700; vertical-align: top;">฿${(item.lineTotal || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
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
                          : `ยอดชำระแล้ว: <b style="color: #15803d; font-size: 11.5px;">฿${order.depositAmount.toLocaleString()}</b>`}
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
                    <b>ช่องทางชำระเงิน:</b> ${order.depositPaymentMethod === 'PROMPTPAY' ? 'สแกนโอน PromptPay QR' : 'เงินสด'}
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
                    <td><b>${order.balanceDue <= 0 ? '✓ ชำระเต็มจำนวนแล้ว (100%):' : 'เงินมัดจำที่ชำระแล้ว:'}</b></td>
                    <td style="text-align: right; font-weight: 700;">฿${order.depositAmount.toLocaleString()}</td>
                  </tr>
                  <tr class="total-row" style="color: ${order.balanceDue <= 0 ? '#15803d' : '#b91c1c'};">
                    <td style="font-weight: 700;">ยอดค้างชำระคงเหลือ (Balance Due):</td>
                    <td style="text-align: right; font-weight: 800;">
                      ${order.balanceDue <= 0 ? '฿0 (ชำระครบถ้วน)' : `฿${order.balanceDue.toLocaleString()}`}
                    </td>
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
    return printContent;
  };

  const handleDownloadA4Document = (order: CustomMadeOrder) => {
    const htmlContent = generateA4Html(order);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ใบสั่งผลิต-${order.orderNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintA4 = (order: CustomMadeOrder) => {
    const htmlContent = generateA4Html(order);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(htmlContent);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
      return;
    }

    // Fallback if popup blocked by browser
    let iframe = document.getElementById('custom-order-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'custom-order-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
      }, 500);
    }
  };

  const currentItem: CustomOrderItem = orderItems[activeItemIndex] || orderItems[0] || ({
    id: 'item-default',
    categoryType: 'SHIRT',
    itemDescription: 'รายการสั่งตัด #1',
    sizeMode: 'STANDARD',
    standardSize: 'M',
    measurements: {},
    fabricType: '',
    specialInstructions: '',
    referenceImageUrl: '',
    qty: 1,
    unitPrice: 0,
    lineTotal: 0
  } as CustomOrderItem);

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
                {savedOrder.paymentType === 'FULL' || savedOrder.depositAmount >= savedOrder.totalPrice ? (
                  <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1">
                    <span>สถานะการชำระ:</span>
                    <span>✓ ชำระเต็มจำนวนแล้ว (100%)</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-emerald-400">
                      <span>มัดจำที่ชำระแล้ว:</span>
                      <span className="font-bold font-mono">฿{savedOrder.depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold border-t border-slate-800 pt-1">
                      <span>ยอดค้างชำระคงเหลือ:</span>
                      <span className="font-mono">฿{savedOrder.balanceDue.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* QR Code Embedded Notice */}
              <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-2xl max-w-md mx-auto text-xs text-sky-200 flex items-center gap-2.5 text-left">
                <QrCode className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <div>
                  {savedOrder.balanceDue > 0 ? (
                    <>
                      <span className="font-bold text-white">ระบบแนบ PromptPay QR ลงในใบสั่งตัด A4 ให้เรียบร้อย</span>
                      <p className="text-[11px] text-sky-300/80 mt-0.5">
                        ลูกค้าสามารถนำเอกสาร A4 นี้มาสแกนจ่ายยอดคงเหลือ (฿{savedOrder.balanceDue.toLocaleString()}) ผ่านมือถือในวันรับสินค้าได้ทันที
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-emerald-300">ชำระเต็มจำนวนเรียบร้อย 100%</span>
                      <p className="text-[11px] text-sky-300/80 mt-0.5">
                        ไม่มียอดค้างชำระในวันรับสินค้า ระบบระบุสถานะชำระครบถ้วนในเอกสาร A4 แล้ว
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Print & Download Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePrintA4(savedOrder)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ พิมพ์ใบสั่งตัด A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadA4Document(savedOrder)}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border border-emerald-500/40"
                >
                  <Download className="w-4 h-4" />
                  <span>📥 บันทึก PDF / HTML ลงเครื่อง</span>
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

                  {/* Multi-Item Management Tabs */}
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <Scissors className="w-4 h-4 text-amber-400" />
                          <span>รายการสินค้าสั่งตัด ({orderItems.length} รายการ):</span>
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                          1 ลูกค้าสั่งได้หลายชิ้นในใบเดียว
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ เพิ่มรายการสั่งตัด</span>
                      </button>
                    </div>

                    {/* Tab Strip */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                      {orderItems.map((item, idx) => {
                        const isActive = idx === activeItemIndex;
                        return (
                          <div
                            key={item.id || idx}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold cursor-pointer transition flex-shrink-0 ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                            }`}
                            onClick={() => setActiveItemIndex(idx)}
                          >
                            <span>#{idx + 1} {item.itemDescription ? (item.itemDescription.length > 12 ? item.itemDescription.slice(0, 12) + '...' : item.itemDescription) : `รายการ ${idx + 1}`}</span>
                            {item.sizeMode === 'STANDARD' ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isActive ? 'bg-black/20 text-slate-950 font-black' : 'bg-slate-700 text-amber-300'}`}>
                                {item.standardSize || 'M'}
                              </span>
                            ) : (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isActive ? 'bg-black/20 text-slate-950 font-black' : 'bg-slate-700 text-sky-300'}`}>
                                วัดตัว
                              </span>
                            )}
                            {orderItems.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(idx);
                                }}
                                className={`p-0.5 rounded hover:bg-rose-600 hover:text-white transition ml-1 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Item Details */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>กำลังแก้ไข: รายการที่ #{activeItemIndex + 1}</span>
                      </div>
                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(activeItemIndex)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรายการนี้</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-0.5">ชื่อ / รายละเอียดสินค้าสั่งตัด *</label>
                        <input
                          type="text"
                          required
                          value={currentItem.itemDescription || ''}
                          onChange={e => handleUpdateActiveItem({ itemDescription: e.target.value })}
                          placeholder="เช่น เสื้อสูทผ้าไหมโคราชแขนยาวกระดุมทอง, กางเกงสแล็คเข้าชุด"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>

                      {/* Category Pills */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          ประเภทสินค้า:
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {CATEGORY_OPTIONS.map(cat => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleUpdateActiveItem({ categoryType: cat.id })}
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                                (currentItem.categoryType || 'SHIRT') === cat.id
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
                    </div>
                  </div>

                  {/* Sizing Section: Standard Size vs Custom Measurements */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-amber-400" />
                        <span>รูปแบบขนาด / ไซส์:</span>
                      </label>
                      <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveItem({ sizeMode: 'STANDARD' })}
                          className={`px-3 py-1 rounded-lg font-bold transition ${
                            (currentItem.sizeMode || 'STANDARD') === 'STANDARD'
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          👕 ไซส์มาตรฐาน (S-4XL)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateActiveItem({ sizeMode: 'CUSTOM' })}
                          className={`px-3 py-1 rounded-lg font-bold transition ${
                            currentItem.sizeMode === 'CUSTOM'
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          📏 วัดตัวตามสัดส่วน (Custom)
                        </button>
                      </div>
                    </div>

                    {/* If STANDARD SIZE */}
                    {(currentItem.sizeMode || 'STANDARD') === 'STANDARD' ? (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] text-slate-400">เลือกรหัสไซส์สำเร็จรูป (สะดวก รวดเร็ว ไม่ต้องกรอกสัดส่วนทุกช่อง):</div>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                          {STANDARD_SIZES.map(sz => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleUpdateActiveItem({ standardSize: sz })}
                              className={`py-2 px-1 rounded-xl text-xs font-black transition border text-center ${
                                (currentItem.standardSize || 'M') === sz
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          * ไซส์มาตรฐานที่เลือก: <b className="text-amber-300">{currentItem.standardSize || 'M'}</b> (ระบุข้อแนะนำเพิ่มเติมในช่องเทคนิคพิเศษได้)
                        </p>
                      </div>
                    ) : (
                      /* If CUSTOM MEASUREMENTS */
                      <div className="space-y-3 pt-1">
                        <div className="text-[10px] text-slate-400">กรอกสัดส่วนการวัดตัว (หน่วย: นิ้ว หรือ ซม.) - ตัวเลขจะขึ้นบนหุ่นขวามือทันที:</div>
                        {((currentItem.categoryType || 'SHIRT') === 'SHIRT' || currentItem.categoryType === 'JACKET' || currentItem.categoryType === 'OTHER') && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบอก</label>
                              <input
                                type="text"
                                placeholder='เช่น 36"'
                                value={currentItem.measurements?.chest || ''}
                                onChange={e => updateActiveMeasurement('chest', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบเอว</label>
                              <input
                                type="text"
                                placeholder='เช่น 28"'
                                value={currentItem.measurements?.waist || ''}
                                onChange={e => updateActiveMeasurement('waist', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ไหล่กว้าง</label>
                              <input
                                type="text"
                                placeholder='เช่น 16"'
                                value={currentItem.measurements?.shoulder || ''}
                                onChange={e => updateActiveMeasurement('shoulder', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวเสื้อ</label>
                              <input
                                type="text"
                                placeholder='เช่น 27"'
                                value={currentItem.measurements?.shirtLength || ''}
                                onChange={e => updateActiveMeasurement('shirtLength', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวแขน</label>
                              <input
                                type="text"
                                placeholder='เช่น 22"'
                                value={currentItem.measurements?.armLength || ''}
                                onChange={e => updateActiveMeasurement('armLength', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบวงแขน/ต้นแขน</label>
                              <input
                                type="text"
                                placeholder='เช่น 14"'
                                value={currentItem.measurements?.armHole || ''}
                                onChange={e => updateActiveMeasurement('armHole', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบคอ</label>
                              <input
                                type="text"
                                placeholder='เช่น 15"'
                                value={currentItem.measurements?.neck || ''}
                                onChange={e => updateActiveMeasurement('neck', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบข้อมือ/ปลายแขน</label>
                              <input
                                type="text"
                                placeholder='เช่น 8"'
                                value={currentItem.measurements?.wrist || ''}
                                onChange={e => updateActiveMeasurement('wrist', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {((currentItem.categoryType || 'SHIRT') === 'PANTS' || currentItem.categoryType === 'OTHER') && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-800">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">เอวกางเกง</label>
                              <input
                                type="text"
                                placeholder='เช่น 32"'
                                value={currentItem.measurements?.waistPants || ''}
                                onChange={e => updateActiveMeasurement('waistPants', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบสะโพก</label>
                              <input
                                type="text"
                                placeholder='เช่น 38"'
                                value={currentItem.measurements?.hipsPants || ''}
                                onChange={e => updateActiveMeasurement('hipsPants', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ความยาวกางเกง</label>
                              <input
                                type="text"
                                placeholder='เช่น 38"'
                                value={currentItem.measurements?.pantsLength || ''}
                                onChange={e => updateActiveMeasurement('pantsLength', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รอบต้นขา</label>
                              <input
                                type="text"
                                placeholder='เช่น 22"'
                                value={currentItem.measurements?.thigh || ''}
                                onChange={e => updateActiveMeasurement('thigh', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">เป้ากางเกง</label>
                              <input
                                type="text"
                                placeholder='เช่น 12"'
                                value={currentItem.measurements?.crotch || ''}
                                onChange={e => updateActiveMeasurement('crotch', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ปลายขา</label>
                              <input
                                type="text"
                                placeholder='เช่น 14"'
                                value={currentItem.measurements?.legOpening || ''}
                                onChange={e => updateActiveMeasurement('legOpening', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {(currentItem.categoryType === 'BAG' || currentItem.categoryType === 'HAT') && (
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">มิติสัดส่วนพิเศษ (กว้าง x ยาว x สูง หรือ รอบศีรษะ)</label>
                            <input
                              type="text"
                              placeholder="เช่น รอบศีรษะ 58 ซม. หรือ กว้าง 40 x สูง 35 ซม."
                              value={currentItem.measurements?.customDimension || ''}
                              onChange={e => updateActiveMeasurement('customDimension', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fabric, Mockup Attachment & Item Price */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">ชนิดผ้า / วัสดุที่ใช้:</label>
                        <input
                          type="text"
                          value={currentItem.fabricType || ''}
                          onChange={e => handleUpdateActiveItem({ fabricType: e.target.value })}
                          placeholder="เช่น ผ้าไหมมัดหมี่, คอตตอน Comb 20"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">เทคนิคพิเศษ / ตำแหน่งปัก:</label>
                        <input
                          type="text"
                          value={currentItem.specialInstructions || ''}
                          onChange={e => handleUpdateActiveItem({ specialInstructions: e.target.value })}
                          placeholder="เช่น ปักด้ายทองที่อกซ้าย, สกรีน DTF ด้านหลัง"
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Photo Upload with Tablet Camera */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        แนบรูปตัวอย่างลายผ้า หรือ แบบอ้างอิง (ถ่ายรูปด้วยแท็บเล็ต หรือเลือกรูป):
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-1.5 transition">
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>เลือกรูปภาพ</span>
                          <input type="file" accept="image/*" onChange={handleActivePhotoUpload} className="hidden" />
                        </label>

                        <label className="cursor-pointer px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold flex items-center gap-1.5 transition">
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>📸 ถ่ายรูปด้วยกล้องแท็บเล็ต</span>
                          <input type="file" accept="image/*" capture="environment" onChange={handleActivePhotoUpload} className="hidden" />
                        </label>

                        {currentItem.referenceImageUrl ? (
                          <div className="relative group">
                            <img
                              src={currentItem.referenceImageUrl}
                              alt="Ref"
                              className="w-12 h-12 rounded-lg object-cover border border-amber-400/60 shadow"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateActiveItem({ referenceImageUrl: '' })}
                              className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-0.5"
                              title="ลบรูปภาพ"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">ยังไม่มีรูปแนบ</span>
                        )}
                      </div>
                    </div>

                    {/* Item Quantity and Unit Price */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">จำนวน (ชิ้น/ชุด):</label>
                        <input
                          type="number"
                          min={1}
                          value={currentItem.qty || 1}
                          onChange={e => handleUpdateActiveItem({ qty: parseInt(e.target.value, 10) || 1 })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">ราคาต่อหน่วย (บาท):</label>
                        <input
                          type="number"
                          min={0}
                          value={currentItem.unitPrice || 0}
                          onChange={e => handleUpdateActiveItem({ unitPrice: parseInt(e.target.value, 10) || 0 })}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-400 font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">ยอดรวมรายการนี้:</label>
                        <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold">
                          ฿{((currentItem.qty || 1) * (currentItem.unitPrice || 0)).toLocaleString()}
                        </div>
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

                  {/* Pricing & Payment Mode */}
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">รูปแบบการชำระเงิน:</span>
                      <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => handlePaymentTypeToggle('FULL')}
                          className={`px-3 py-1 rounded-lg font-bold transition ${
                            paymentType === 'FULL'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ✓ ชำระเต็มจำนวน 100%
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePaymentTypeToggle('DEPOSIT')}
                          className={`px-3 py-1 rounded-lg font-bold transition ${
                            paymentType === 'DEPOSIT'
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ชำระมัดจำ (Deposit)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          ยอดราคาผลิตรวม ({orderItems.length} รายการ) *
                        </label>
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
                          {paymentType === 'FULL' ? 'ยอดชำระเต็มจำนวน (100%) *' : `เงินมัดจำ (แนะนำ 50% = ฿${Math.round(totalPrice / 2).toLocaleString()}) *`}
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
                        ช่องทางชำระเงิน{paymentType === 'FULL' ? '' : 'มัดจำ'}:
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

                    {/* Live PromptPay QR for Deposit/Full payment scanning directly at counter */}
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
                            <span>สแกนจ่าย{paymentType === 'FULL' ? 'เต็มจำนวน 100%' : 'มัดจำ 50%'} ทันที (PromptPay)</span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            ยอดชำระ: <span className="font-mono text-emerald-400 text-sm font-black">฿{depositAmount.toLocaleString()}</span>
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
                      <span>
                        บันทึกใบสั่งผลิต{paymentType === 'FULL' ? 'และรับชำระเต็มจำนวน' : 'และรับมัดจำ'} (฿{depositAmount.toLocaleString()})
                      </span>
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
                      {customerGender === 'FEMALE' ? 'สตรี' : 'บุรุษ'} • รายการ #{activeItemIndex + 1}
                    </span>
                  </div>

                  <div className="w-full py-2 flex items-center justify-center flex-1 min-h-[360px]">
                    <MannequinFigure
                      gender={customerGender}
                      category={currentItem.categoryType || 'SHIRT'}
                      measurements={currentItem.measurements || {}}
                      className="w-full"
                    />
                  </div>

                  {currentItem.referenceImageUrl && (
                    <div className="w-full pt-3 border-t border-slate-800 flex items-center gap-3">
                      <img
                        src={currentItem.referenceImageUrl}
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
