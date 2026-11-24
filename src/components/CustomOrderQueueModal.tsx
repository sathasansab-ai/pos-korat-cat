// src/components/CustomOrderQueueModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  X, 
  ChevronRight, 
  Phone, 
  User, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Layers, 
  Plus, 
  Sparkles, 
  Check, 
  Eye, 
  Truck,
  RefreshCw,
  FileText,
  Download,
  Edit3,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { db } from '../db';
import type { 
  CustomMadeOrder, 
  CustomOrderItem,
  StoreSettings, 
  Shift, 
  UserAccount, 
  Order,
  GenderType
} from '../types';
import { GENDER_CONFIG } from '../types';
import { CloudSync } from '../services/cloudSync';
import { PromptPayService } from '../services/promptPay';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { BarcodeGenerator } from '../services/barcodeGenerator';
import { SoundEffects } from '../services/soundEffects';
import { renderMannequinSvgHtml } from './MannequinFigure';
import { lookupThaiPostalCode } from '../services/thaiPostalCode';
import { CustomOrderReceiptModal } from './CustomOrderReceiptModal';

const CATEGORY_OPTIONS = [
  { id: 'SHIRT', label: 'เสื้อ (Shirt)', icon: '👔' },
  { id: 'PANTS', label: 'กางเกง (Pants)', icon: '👖' },
  { id: 'SET', label: 'ชุดเซ็ท (เสื้อ + กางเกง)', icon: '✨' },
  { id: 'DRESS', label: 'เดรส / ชุดกระโปรง', icon: '👗' },
  { id: 'JACKET', label: 'สูท / แจ็กเก็ต', icon: '🧥' },
  { id: 'BAG', label: 'กระเป๋าผ้าไหม', icon: '👜' },
  { id: 'HAT', label: 'หมวก / อื่นๆ', icon: '🧢' },
  { id: 'OTHER', label: 'งานสั่งตัดอื่นๆ', icon: '✂️' }
];

const defaultQueueStoreSettings: StoreSettings = {
  storeName: 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
  subTitle: 'Haute Couture & Heritage Craft Boutique',
  address: 'เรือนโคราชเฉลิมวัฒนา ถ.จอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000',
  phone: '044-123456 / 081-999-8888',
  taxId: '0305566001234',
  promptPayId: '1509900443202',
  vatRate: 7,
  isVatEnabled: false,
  vatType: 'INCLUSIVE',
  printerPaperWidth: '80mm'
};

interface CustomOrderQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  activeShift?: Shift | null;
  settings?: StoreSettings | null;
  onOpenShiftRequired?: () => void;
  onShiftUpdated?: () => void;
  onOpenNewCustomOrder?: () => void;
  initialSelectedOrder?: CustomMadeOrder | null;
}

export const CustomOrderQueueModal: React.FC<CustomOrderQueueModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeShift,
  settings,
  onOpenShiftRequired,
  onShiftUpdated,
  onOpenNewCustomOrder,
  initialSelectedOrder
}) => {
  const [orders, setOrders] = useState<CustomMadeOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'AR'>('ALL');
  
  // Settlement modal state (when customer picks up and pays balance due)
  const [selectedOrderForSettlement, setSelectedOrderForSettlement] = useState<CustomMadeOrder | null>(null);
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [settlementSuccessOrder, setSettlementSuccessOrder] = useState<CustomMadeOrder | null>(null);

  // Thermal Receipt Modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<CustomMadeOrder | null>(null);
  const [receiptPhase, setReceiptPhase] = useState<'DEPOSIT' | 'FINAL_PICKUP' | 'FULL'>('DEPOSIT');

  // Edit Order modal state
  const [editingOrder, setEditingOrder] = useState<CustomMadeOrder | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerGender, setEditCustomerGender] = useState<GenderType>('FEMALE');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDeliveryMethod, setEditDeliveryMethod] = useState<'PICKUP_SHOP' | 'SHIPPING_ADDRESS'>('PICKUP_SHOP');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editShippingPostalCode, setEditShippingPostalCode] = useState('');
  const [editShippingProvince, setEditShippingProvince] = useState('');
  const [editShippingDistrict, setEditShippingDistrict] = useState('');
  const [editShippingSubdistrict, setEditShippingSubdistrict] = useState('');
  const [editShippingHouseDetails, setEditShippingHouseDetails] = useState('');
  const [editSubdistrictOptions, setEditSubdistrictOptions] = useState<string[]>([]);
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editFabricType, setEditFabricType] = useState('');
  const [editSpecialInstructions, setEditSpecialInstructions] = useState('');
  const [editSizeMode, setEditSizeMode] = useState<'STANDARD' | 'CUSTOM'>('STANDARD');
  const [editStandardSize, setEditStandardSize] = useState('M');
  const [editMeasurements, setEditMeasurements] = useState<CustomOrderMeasurements>({});
  const [editTotalPrice, setEditTotalPrice] = useState<number>(0);
  const [editDepositAmount, setEditDepositAmount] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  const handleStartEditOrder = (order: CustomMadeOrder) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditCustomerPhone(order.customerPhone);
    setEditCustomerGender(order.customerGender || 'FEMALE');
    setEditDueDate(order.dueDate || '');
    setEditDeliveryMethod(order.deliveryMethod);
    setEditShippingAddress(order.shippingAddress || '');
    setEditItemDescription(order.itemDescription);
    setEditFabricType(order.fabricType || '');
    setEditSpecialInstructions(order.specialInstructions || '');
    setEditSizeMode(order.sizeMode || 'STANDARD');
    setEditStandardSize(order.standardSize || 'M');
    setEditMeasurements(order.measurements || order.items?.[0]?.measurements || {});
    setEditTotalPrice(order.totalPrice);
    setEditDepositAmount(order.depositAmount);
    setEditNotes(order.notes || '');

    setEditShippingPostalCode('');
    setEditShippingProvince('');
    setEditShippingDistrict('');
    setEditShippingSubdistrict('');
    setEditShippingHouseDetails(order.shippingAddress || '');
    setEditSubdistrictOptions([]);
  };

  const handleEditPostalCodeChange = (zip: string) => {
    setEditShippingPostalCode(zip);
    const info = lookupThaiPostalCode(zip);
    if (info) {
      setEditShippingProvince(info.province);
      setEditShippingDistrict(info.district);
      setEditShippingSubdistrict(info.subdistrict);
      setEditSubdistrictOptions(info.subdistricts || [info.subdistrict]);
      const house = editShippingHouseDetails.trim();
      const composed = `${house ? `${house} ` : ''}ต.${info.subdistrict} อ.${info.district} จ.${info.province} ${info.zipCode}`.trim();
      setEditShippingAddress(composed);
    }
  };

  const handleEditHouseDetailsChange = (house: string) => {
    setEditShippingHouseDetails(house);
    if (editShippingProvince || editShippingDistrict || editShippingSubdistrict || editShippingPostalCode) {
      const parts = [];
      if (house.trim()) parts.push(house.trim());
      if (editShippingSubdistrict) parts.push(`ต.${editShippingSubdistrict}`);
      if (editShippingDistrict) parts.push(`อ.${editShippingDistrict}`);
      if (editShippingProvince) parts.push(`จ.${editShippingProvince}`);
      if (editShippingPostalCode) parts.push(editShippingPostalCode);
      setEditShippingAddress(parts.join(' '));
    } else {
      setEditShippingAddress(house);
    }
  };

  const handleEditSubdistrictSelect = (sub: string) => {
    setEditShippingSubdistrict(sub);
    const house = editShippingHouseDetails.trim();
    const parts = [];
    if (house) parts.push(house);
    parts.push(`ต.${sub}`);
    if (editShippingDistrict) parts.push(`อ.${editShippingDistrict}`);
    if (editShippingProvince) parts.push(`จ.${editShippingProvince}`);
    if (editShippingPostalCode) parts.push(editShippingPostalCode);
    setEditShippingAddress(parts.join(' '));
  };

  const updateEditComposedAddress = (house: string, sub: string, dist: string, prov: string, zip: string) => {
    const parts = [];
    if (house.trim()) parts.push(house.trim());
    if (sub.trim()) parts.push(`ต.${sub.trim()}`);
    if (dist.trim()) parts.push(`อ.${dist.trim()}`);
    if (prov.trim()) parts.push(`จ.${prov.trim()}`);
    if (zip.trim()) parts.push(zip.trim());
    setEditShippingAddress(parts.join(' '));
  };

  const handleSaveEditedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editCustomerName.trim() || !editCustomerPhone.trim() || editTotalPrice <= 0) {
      alert('กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์ และยอดเงินสั่งผลิตให้ครบถ้วน');
      return;
    }

    const effectiveBalanceDue = Math.max(0, editTotalPrice - editDepositAmount);
    const updatedItems = (editingOrder.items && editingOrder.items.length > 0)
      ? editingOrder.items.map((it, idx) => idx === 0 ? {
          ...it,
          itemDescription: editItemDescription.trim(),
          sizeMode: editSizeMode,
          standardSize: editSizeMode === 'STANDARD' ? editStandardSize : undefined,
          measurements: editSizeMode === 'CUSTOM' ? editMeasurements : undefined,
          fabricType: editFabricType.trim() || undefined,
          specialInstructions: editSpecialInstructions.trim() || undefined,
          unitPrice: editTotalPrice,
          lineTotal: editTotalPrice
        } : it)
      : [{
          id: 'item-1',
          categoryType: editingOrder.categoryType || 'SHIRT',
          itemDescription: editItemDescription.trim(),
          sizeMode: editSizeMode,
          standardSize: editSizeMode === 'STANDARD' ? editStandardSize : undefined,
          measurements: editSizeMode === 'CUSTOM' ? editMeasurements : undefined,
          fabricType: editFabricType.trim() || undefined,
          specialInstructions: editSpecialInstructions.trim() || undefined,
          qty: editingOrder.qty || 1,
          unitPrice: editTotalPrice,
          lineTotal: editTotalPrice
        }];

    const updatedOrder: CustomMadeOrder = {
      ...editingOrder,
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      customerGender: editCustomerGender,
      dueDate: editDueDate,
      deliveryMethod: editDeliveryMethod,
      shippingAddress: editDeliveryMethod === 'SHIPPING_ADDRESS' ? editShippingAddress.trim() : undefined,
      itemDescription: editItemDescription.trim(),
      fabricType: editFabricType.trim() || undefined,
      specialInstructions: editSpecialInstructions.trim() || undefined,
      sizeMode: editSizeMode,
      standardSize: editSizeMode === 'STANDARD' ? editStandardSize : undefined,
      measurements: editSizeMode === 'CUSTOM' ? editMeasurements : undefined,
      totalPrice: editTotalPrice,
      depositAmount: editDepositAmount,
      balanceDue: effectiveBalanceDue,
      notes: editNotes.trim(),
      items: updatedItems
    };

    await db.customOrders.put(updatedOrder);
    CloudSync.pushCustomOrder(updatedOrder);
    SoundEffects.playSuccess();
    setEditingOrder(null);
    await loadOrders();
    alert('บันทึกการแก้ไขข้อมูลใบสั่งตัดเรียบร้อยแล้ว');
  };

  // Measurement detail modal
  const [viewingMeasurementOrder, setViewingMeasurementOrder] = useState<CustomMadeOrder | null>(null);

  const loadOrders = async () => {
    const list = await db.customOrders.reverse().toArray();
    setOrders(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
      if (initialSelectedOrder) {
        setSelectedOrderForSettlement(initialSelectedOrder);
      }
    } else {
      setSelectedOrderForSettlement(null);
      setSettlementSuccessOrder(null);
      setViewingMeasurementOrder(null);
      setSearchTerm('');
    }
  }, [isOpen, initialSelectedOrder]);

  // Synchronize with Customer-Facing Dual Screen during balance settlement
  useEffect(() => {
    if (!isOpen || !selectedOrderForSettlement) return;

    const balanceDue = selectedOrderForSettlement.balanceDue;
    const promptPayPayload = (settings?.promptPayId && balanceDue > 0)
      ? PromptPayService.generatePayload(settings.promptPayId, balanceDue)
      : '';
    const qrImageUrl = promptPayPayload
      ? PromptPayService.getQrImageUrl(promptPayPayload, 260)
      : '';

    DualMonitorSync.broadcast({
      cart: [],
      subtotal: selectedOrderForSettlement.totalPrice,
      promoDiscount: 0,
      netTotal: balanceDue,
      upsellPrompts: [],
      theme: settings?.customerScreenTheme,
      welcomeTitle: settings?.welcomeTitle,
      welcomeSubtitle: settings?.welcomeSubtitle,
      welcomeImageUrl: settings?.welcomeImageUrl,
      thankYouMessage: settings?.thankYouMessage,
      customOrderPayment: {
        orderNo: selectedOrderForSettlement.orderNo,
        customerName: selectedOrderForSettlement.customerName,
        customerPhone: selectedOrderForSettlement.customerPhone,
        itemDescription: `รับสินค้า: ${selectedOrderForSettlement.itemDescription}`,
        totalAmount: selectedOrderForSettlement.totalPrice,
        depositAmount: balanceDue, // Show balance due as current payment
        balanceDue: 0,
        dueDate: selectedOrderForSettlement.dueDate,
        qrImageUrl: qrImageUrl,
        promptPayId: settings?.promptPayId,
        paymentMethod: settlementPaymentMethod,
        status: settlementSuccessOrder ? 'DEPOSIT_PAID' : 'PENDING_DEPOSIT'
      }
    });
  }, [isOpen, selectedOrderForSettlement, settlementPaymentMethod, settlementSuccessOrder, settings]);

  if (!isOpen) return null;

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

  // AR (Accounts Receivable / ลูกหนี้การค้า) calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalArAmount = orders
    .filter(o => o.balanceDue > 0 && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.balanceDue, 0);
  const totalArCount = orders.filter(o => o.balanceDue > 0 && o.status !== 'CANCELLED').length;
  const overdueArCount = orders.filter(o => o.balanceDue > 0 && o.status !== 'CANCELLED' && o.dueDate && o.dueDate < todayStr).length;

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'AR') {
      if (o.balanceDue <= 0 || o.status === 'CANCELLED') return false;
    } else if (statusFilter !== 'ALL' && o.status !== statusFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.itemDescription.toLowerCase().includes(q)
    );
  });

  // Status counts
  const pendingCount = orders.filter(o => o.status === 'PENDING_PRODUCTION').length;
  const inProdCount = orders.filter(o => o.status === 'IN_PRODUCTION').length;
  const readyCount = orders.filter(o => o.status === 'READY_FOR_PICKUP').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  // Quick Status Transition
  const handleUpdateStatus = async (orderId: string, newStatus: CustomMadeOrder['status']) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const updated = { ...target, status: newStatus };
    await db.customOrders.put(updated);
    CloudSync.pushCustomOrder(updated);
    SoundEffects.playBeep();
    loadOrders();
  };

  // Confirm Final Balance Settlement & Deliver Item
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForSettlement) return;

    if (!activeShift) {
      alert('⚠️ ไม่สามารถรับชำระยอดคงเหลือหรือส่งมอบสินค้าได้!\nเนื่องจาก "ยังไม่ได้เปิดกะทำงาน"\n\nกรุณาเปิดกะก่อนรับเงิน เพื่อให้ระบบรวมยอดเงินเข้าลิ้นชักอย่างถูกต้อง');
      if (onOpenShiftRequired) onOpenShiftRequired();
      return;
    }

    const order = selectedOrderForSettlement;
    const balanceDue = order.balanceDue;
    const isCash = settlementPaymentMethod === 'CASH';

    setIsSubmittingSettlement(true);

    try {
      const cashierId = currentUser?.id || activeShift.cashierId;
      const cashierName = currentUser?.name || activeShift.cashierName;
      const shiftId = activeShift.id;

      // 1. Update Custom Order to COMPLETED
      const updatedOrder: CustomMadeOrder = {
        ...order,
        balanceDue: 0,
        status: 'COMPLETED',
        finalPaymentMethod: settlementPaymentMethod,
        finalPaidAmount: balanceDue,
        finalPaidAt: new Date().toISOString()
      };
      await db.customOrders.put(updatedOrder);
      CloudSync.pushCustomOrder(updatedOrder);

      // 2. Add collected balance to shift totals
      if (balanceDue > 0) {
        const updatedShift: Shift = {
          ...activeShift,
          totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? balanceDue : 0),
          totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + (!isCash ? balanceDue : 0),
          totalTransactions: (activeShift.totalTransactions || 0) + 1
        };
        await db.shifts.put(updatedShift);
        CloudSync.pushShift(updatedShift);
        if (onShiftUpdated) onShiftUpdated();

        // 3. Record order bill in db.orders for accounting and sales reports
        const settlementBill: Order = {
          id: `ord-fin-${Date.now()}`,
          localOrderId: `FIN-${order.orderNo}`,
          timestamp: new Date().toISOString(),
          cashierId,
          cashierName,
          shiftId,
          customerId: order.customerId,
          customerName: order.customerName,
          customerGender: order.customerGender,
          items: [{
            variantId: `custom-settle-${order.id}`,
            productName: `ชำระยอดคงเหลือรับสินค้า: ${order.itemDescription}`,
            sku: order.orderNo,
            attributes: {
              'ประเภท': order.categoryType || 'สั่งตัดพิเศษ',
              'ลูกค้า': order.customerName,
              'โทร': order.customerPhone,
              'ยอดสั่งผลิตเต็ม': `฿${order.totalPrice.toLocaleString()}`,
              'มัดจำที่จ่ายแล้ว': `฿${order.depositAmount.toLocaleString()}`,
              'สถานะ': 'ส่งมอบสินค้า & ชำระครบถ้วน 100%'
            },
            qty: order.qty,
            unitPrice: balanceDue,
            costPrice: 0,
            lineTotal: balanceDue
          }],
          subtotal: balanceDue,
          promoDiscount: 0,
          netTotal: balanceDue,
          payments: [{
            method: settlementPaymentMethod,
            amount: balanceDue
          }],
          cashReceived: isCash ? (parseFloat(cashTendered) || balanceDue) : undefined,
          changeGiven: isCash ? Math.max(0, (parseFloat(cashTendered) || balanceDue) - balanceDue) : 0,
          status: 'COMPLETED',
          isSynced: false
        };

        await db.orders.add(settlementBill);
        CloudSync.pushOrder(settlementBill);
      }

      SoundEffects.playSuccess();
      setSettlementSuccessOrder(updatedOrder);
      await loadOrders();
    } catch (err) {
      console.error('Failed to complete custom order settlement', err);
      alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Print Completed Work Order & Receipt (A4)
  const handlePrintCompletedA4 = (order: CustomMadeOrder) => {
    const isFem = order.customerGender === 'FEMALE';
    const meas = order.measurements || {};
    const orderBarcodeDataUrl = BarcodeGenerator.generateDataUrl(order.orderNo, { height: 40, showText: false });

    const measurementRows: string[] = [];
    if (meas.chest) measurementRows.push(`<tr><td>รอบอก</td><td class="bold">${meas.chest}</td></tr>`);
    if (meas.waist || meas.waistPants) measurementRows.push(`<tr><td>รอบเอว</td><td class="bold">${meas.waist || meas.waistPants}</td></tr>`);
    if (meas.hips || meas.hipsPants) measurementRows.push(`<tr><td>รอบสะโพก</td><td class="bold">${meas.hips || meas.hipsPants}</td></tr>`);
    if (meas.shoulder) measurementRows.push(`<tr><td>ไหล่กว้าง</td><td class="bold">${meas.shoulder}</td></tr>`);
    if (meas.shirtLength) measurementRows.push(`<tr><td>ความยาวเสื้อ</td><td class="bold">${meas.shirtLength}</td></tr>`);
    if (meas.armLength) measurementRows.push(`<tr><td>ความยาวแขน</td><td class="bold">${meas.armLength}</td></tr>`);
    if (meas.pantsLength) measurementRows.push(`<tr><td>ความยาวกางเกง</td><td class="bold">${meas.pantsLength}</td></tr>`);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบเสร็จรับเงิน & ส่งมอบสินค้า Haute Couture - ${order.orderNo}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; margin: 0; padding: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #15803d; padding-bottom: 12px; margin-bottom: 15px; }
            .brand-title { font-size: 18px; font-weight: 800; color: #15803d; text-transform: uppercase; }
            .brand-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
            .doc-title { font-size: 15px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-no { font-family: monospace; font-size: 12px; font-weight: bold; color: #15803d; text-align: right; }
            
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; }
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            table.items-table th, table.items-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            table.items-table th { background: #f1f5f9; font-weight: 700; color: #334155; }
            
            .paid-stamp { border: 3px solid #16a34a; color: #16a34a; font-size: 16px; font-weight: 900; text-transform: uppercase; padding: 6px 14px; border-radius: 8px; display: inline-block; transform: rotate(-5deg); margin-top: 5px; }
            .summary-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .summary-table td { padding: 5px 8px; }
            .total-row { border-top: 1.5px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 13px; }
            .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            .signature-table td { width: 50%; text-align: center; vertical-align: bottom; }
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
                <div class="doc-title">ใบเสร็จรับเงิน & ใบส่งมอบสินค้า</div>
                <div class="doc-title" style="font-size: 11px; font-weight: normal; color: #16a34a;">(COMPLETED ORDER RECEIPT)</div>
                <div class="doc-no">เลขที่: ${order.orderNo}</div>
                <div style="font-size: 11px; color: #64748b;">วันที่ส่งมอบ: ${new Date().toLocaleDateString('th-TH')}</div>
                <div style="margin-top: 4px; display: flex; justify-content: flex-end;">
                  <img src="${orderBarcodeDataUrl}" style="height: 36px; width: 140px; object-fit: contain;" alt="Order Barcode" />
                </div>
              </td>
            </tr>
          </table>

          <div class="info-box">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <b>ลูกค้าผู้รับสินค้า:</b> ${order.customerName} (${order.customerPhone})<br>
                <b>การรับมอบ:</b> ${order.deliveryMethod === 'PICKUP_SHOP' ? 'รับสินค้าเรียบร้อยที่หน้าร้าน' : 'จัดส่งพัสดุ: ' + (order.shippingAddress || '')}
              </div>
              <div style="text-align: right;">
                <div class="paid-stamp">✓ ชำระครบถ้วน 100%</div>
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ลำดับ</th>
                <th>รายละเอียดสินค้าสั่งผลิต</th>
                <th style="width: 60px; text-align: center;">จำนวน</th>
                <th style="width: 100px; text-align: right;">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${order.itemDescription}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ชนิดผ้า: ${order.fabricType || '-'} | นัดรับ: ${order.dueDate}</div>
                </td>
                <td style="text-align: center; font-weight: 700;">${order.qty} ชิ้น</td>
                <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 10px; font-size: 11px; color: #166534;">
                  <b>ประวัติการชำระเงิน:</b><br>
                  • เงินมัดจำ (50%): ฿${order.depositAmount.toLocaleString()} (${order.depositPaymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์ QR' : 'เงินสด'})<br>
                  • ยอดคงเหลือวันรับของ: ฿${(order.finalPaidAmount ?? order.balanceDue).toLocaleString()} (${order.finalPaymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์ QR' : 'เงินสด'})<br>
                  <b>สถานะ: ส่งมอบและชำระครบถ้วนสมบูรณ์แล้ว</b>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                <table class="summary-table">
                  <tr>
                    <td>ยอดรวมทั้งสิ้น (Total):</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
                  </tr>
                  <tr style="color: #15803d;">
                    <td>มัดจำที่ชำระแล้ว:</td>
                    <td style="text-align: right; font-weight: 700;">฿${order.depositAmount.toLocaleString()}</td>
                  </tr>
                  <tr style="color: #15803d;">
                    <td>ชำระยอดคงเหลือวันรับของ:</td>
                    <td style="text-align: right; font-weight: 700;">฿${(order.finalPaidAmount ?? order.balanceDue).toLocaleString()}</td>
                  </tr>
                  <tr class="total-row" style="color: #15803d;">
                    <td style="font-weight: 800;">ยอดค้างชำระคงเหลือ (Balance Due):</td>
                    <td style="text-align: right; font-weight: 800;">฿0 (ครบถ้วน)</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="signature-table">
            <tr>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.staffName} )</div>
                <div style="font-size: 10px; color: #64748b;">พนักงานผู้ส่งมอบสินค้า / แคชเชียร์</div>
              </td>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.customerName} )</div>
                <div style="font-size: 10px; color: #64748b;">ลูกค้าผู้รับสินค้า / ตรวจรับของเรียบร้อย</div>
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

  // Generate A4 Work Order HTML
  const generateWorkOrderA4Html = (order: CustomMadeOrder) => {
    const isFem = order.customerGender === 'FEMALE';
    const itemsList: CustomOrderItem[] = order.items && order.items.length > 0 ? order.items : [{
      id: 'item-1',
      categoryType: order.categoryType || 'SHIRT',
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
    const hasMeasurements = Boolean(
      meas.chest || meas.waist || meas.waistPants || meas.hips || meas.hipsPants ||
      meas.shoulder || meas.shirtLength || meas.armLength || meas.pantsLength ||
      meas.thigh || meas.crotch || meas.legOpening || meas.customDimension
    );

    const printAmount = order.balanceDue > 0 ? order.balanceDue : (order.depositAmount > 0 ? order.depositAmount : order.totalPrice);
    const printPromptPayPayload = settings?.promptPayId
      ? PromptPayService.generatePayload(settings.promptPayId, printAmount)
      : '';
    const printQrUrl = printPromptPayPayload
      ? PromptPayService.getQrImageUrl(printPromptPayPayload, 260)
      : '';

    const orderBarcodeDataUrl = BarcodeGenerator.generateDataUrl(order.orderNo, { height: 40, showText: false });

    // Generate Measurement rows - แยกสัดส่วนเสื้อ กับ กางเกง ออกจากกันอย่างชัดเจน ป้องกันการจำสลับ
    const shirtRows: string[] = [];
    const pantsRows: string[] = [];
    const otherRows: string[] = [];

    if (meas.chest) shirtRows.push(`<tr><td>รอบอก (Chest)</td><td class="bold">${meas.chest}</td></tr>`);
    if (meas.shirtLength) shirtRows.push(`<tr><td>ความยาวเสื้อ (Length)</td><td class="bold">${meas.shirtLength}</td></tr>`);
    if (meas.shoulder) shirtRows.push(`<tr><td>ไหล่กว้าง (Shoulder)</td><td class="bold">${meas.shoulder}</td></tr>`);
    if (meas.armLength) shirtRows.push(`<tr><td>ความยาวแขน (Arm Length)</td><td class="bold">${meas.armLength}</td></tr>`);
    if (meas.armHole) shirtRows.push(`<tr><td>รอบวงแขน/ต้นแขน (Armhole)</td><td class="bold">${meas.armHole}</td></tr>`);
    if (meas.waist) shirtRows.push(`<tr><td>รอบเอวเสื้อ (Shirt Waist)</td><td class="bold">${meas.waist}</td></tr>`);
    if (meas.neck) shirtRows.push(`<tr><td>รอบคอ (Neck)</td><td class="bold">${meas.neck}</td></tr>`);
    if (meas.wrist) shirtRows.push(`<tr><td>รอบปลายแขน/ข้อมือ (Wrist)</td><td class="bold">${meas.wrist}</td></tr>`);
    if (meas.hips) shirtRows.push(`<tr><td>สะโพก/ชายเสื้อ (Hips)</td><td class="bold">${meas.hips}</td></tr>`);

    if (meas.waistPants) pantsRows.push(`<tr><td>รอบเอวกางเกง (Pants Waist)</td><td class="bold">${meas.waistPants}</td></tr>`);
    if (meas.pantsLength) pantsRows.push(`<tr><td>ความยาวกางเกง (Length)</td><td class="bold">${meas.pantsLength}</td></tr>`);
    if (meas.hipsPants) pantsRows.push(`<tr><td>รอบสะโพกกางเกง (Hips)</td><td class="bold">${meas.hipsPants}</td></tr>`);
    if (meas.thigh) pantsRows.push(`<tr><td>รอบต้นขา (Thigh)</td><td class="bold">${meas.thigh}</td></tr>`);
    if (meas.crotch) pantsRows.push(`<tr><td>เป้ากางเกง (Crotch)</td><td class="bold">${meas.crotch}</td></tr>`);
    if (meas.legOpening) pantsRows.push(`<tr><td>ปลายขากางเกง (Leg Opening)</td><td class="bold">${meas.legOpening}</td></tr>`);

    if (meas.customDimension) otherRows.push(`<tr><td>มิติสัดส่วนพิเศษ</td><td class="bold">${meas.customDimension}</td></tr>`);

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>ใบสั่งผลิตและวัดตัว Haute Couture - ${order.orderNo}</title>
    <style>
      @page { size: A4 portrait; margin: 6mm 10mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; line-height: 1.35; color: #1e293b; margin: 0; padding: 0; }
      @media print {
        html, body { height: 100%; max-height: 297mm; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; }
      }
      .header-table { width: 100%; border-bottom: 2px solid #b45309; padding-bottom: 6px; margin-bottom: 8px; }
      .brand-title { font-size: 15px; font-weight: 800; color: #78350f; text-transform: uppercase; }
      .brand-sub { font-size: 9px; color: #64748b; margin-top: 1px; }
      .doc-title { font-size: 13px; font-weight: 800; color: #0f172a; text-align: right; }
      .doc-no { font-family: monospace; font-size: 11px; font-weight: bold; color: #b45309; text-align: right; }
      
      .info-grid { width: 100%; margin-bottom: 8px; }
      .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10.5px; }
      .info-box h4 { margin: 0 0 4px 0; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
      
      .tailoring-grid { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .tailoring-grid td { vertical-align: top; }

      .measurement-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .measurement-table th, .measurement-table td { border: 1px solid #cbd5e1; padding: 3px 6px; text-align: left; }
      .measurement-table th { background: #f1f5f9; font-weight: 700; color: #334155; }
      .bold { font-weight: bold; color: #b45309; }

      .mannequin-container { width: 100%; text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; }
      .media-photo { max-height: 130px; width: 100%; object-fit: contain; border-radius: 4px; display: block; margin: 0 auto; }
      .media-caption { font-size: 9px; font-weight: 700; color: #475569; margin-top: 3px; border-top: 1px dashed #e2e8f0; padding-top: 2px; }
      
      table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      table.items-table th, table.items-table td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
      table.items-table th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 10px; }
      
      .summary-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
      .summary-table td { padding: 3px 6px; }
      .total-row { border-top: 1.5px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 11.5px; }

      .terms { font-size: 9px; color: #64748b; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 5px 8px; margin-bottom: 8px; border-radius: 0 4px 4px 0; line-height: 1.3; }
      
      .signature-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
      .signature-table td { width: 50%; text-align: center; vertical-align: bottom; padding: 0 15px; }
      .sig-line { border-bottom: 1px solid #64748b; width: 75%; margin: 22px auto 4px auto; }
      .size-badge { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #fcd34d; font-size: 10px; }
      .tailoring-badge { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #bae6fd; font-size: 10px; }
    </style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="brand-title">${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
          <div class="brand-sub">${settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">
            ที่อยู่: ${settings?.address || 'เรือนโคราชเฉลิมวัฒนา จ.นครราชสีมา'} | โทร: ${settings?.phone || '044-XXXXXX'}
          </div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div class="doc-title">ใบสั่งผลิต &amp; สัดส่วนสั่งตัดพิเศษ</div>
          <div class="doc-title" style="font-size: 10px; font-weight: normal; color: #64748b;">(CUSTOM TAILORING &amp; WORK ORDER)</div>
          <div class="doc-no">เลขที่: ${order.orderNo}</div>
          <div style="font-size: 10px; color: #64748b;">วันที่: ${new Date(order.createdAt).toLocaleDateString('th-TH')}</div>
          <div style="margin-top: 2px; display: flex; justify-content: flex-end;">
            <img src="${orderBarcodeDataUrl}" style="height: 32px; width: 130px; object-fit: contain;" alt="Order Barcode" />
          </div>
        </td>
      </tr>
    </table>

    <table class="info-grid">
      <tr>
        <td style="width: 50%; padding-right: 6px; vertical-align: top;">
          <div class="info-box">
            <h4>ข้อมูลลูกค้าผู้สั่ง</h4>
            <div><b>ชื่อ-นามสกุล:</b> ${order.customerName} (${GENDER_CONFIG[order.customerGender || 'FEMALE'].label})</div>
            <div><b>เบอร์โทรศัพท์:</b> ${order.customerPhone}</div>
            <div><b>การรับสินค้า:</b> ${order.deliveryMethod === 'PICKUP_SHOP' ? 'มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)' : 'จัดส่งพัสดุตามที่อยู่'}</div>
            ${order.shippingAddress ? `<div><b>ที่อยู่จัดส่ง:</b> ${order.shippingAddress}</div>` : ''}
          </div>
        </td>
        <td style="width: 50%; padding-left: 6px; vertical-align: top;">
          <div class="info-box">
            <h4>ข้อมูลการผลิตและการนัดหมาย</h4>
            <div><b>ผู้ออกใบสั่ง:</b> ${order.staffName} (สาขาหน้าร้าน)</div>
            <div><b>กำหนดส่งมอบ / นัดรับ:</b> <span style="font-size: 11.5px; font-weight: 800; color: #b45309;">${order.dueDate ? `${new Date(order.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} (${order.dueDate.split('-').reverse().join('/')})` : '-'}</span></div>
            <div><b>ประเภทสินค้า:</b> ${CATEGORY_OPTIONS.find(c => c.id === order.categoryType)?.label || 'สั่งตัดพิเศษ'}</div>
            <div><b>ช่องทางชำระมัดจำ:</b> ${order.depositPaymentMethod === 'PROMPTPAY' ? 'สแกนโอน PromptPay QR' : 'เงินสด'}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- TAILORING MEASUREMENTS & SPECIFICATIONS -->
    <table class="tailoring-grid">
      <tr>
        ${hasMeasurements ? `
          <!-- กรณีมีสัดส่วนวัดตัวเฉพาะบุคคล: แสดงตารางสัดส่วนด้านซ้าย (แยกเสื้อ/กางเกง) และหุ่นจำลองด้านขวา -->
          <td style="width: 54%; padding-right: 8px; vertical-align: top;">
            <div style="font-weight: 700; font-size: 10.5px; margin-bottom: 4px; color: #0f172a;">
              📐 ตารางสัดส่วนการวัดตัว (Body Measurements):
            </div>

            ${shirtRows.length > 0 && pantsRows.length > 0 ? `
              <!-- แสดงแยกตารางเสื้อ และ กางเกง ออกจากกันอย่างชัดเจน ป้องกันจำสลับ -->
              <table class="measurement-table" style="margin-bottom: 5px;">
                <thead>
                  <tr style="background: #fef3c7; color: #92400e;">
                    <th colspan="2" style="padding: 2.5px 6px; font-weight: 800; font-size: 10px; border: 1px solid #fcd34d;">
                      👔 สัดส่วนเสื้อ / ท่อนบน (SHIRT)
                    </th>
                  </tr>
                  <tr><th style="width: 55%;">จุดวัดสัดส่วน</th><th>ขนาดที่วัดได้</th></tr>
                </thead>
                <tbody>
                  ${shirtRows.join('')}
                </tbody>
              </table>

              <table class="measurement-table" style="margin-bottom: 4px;">
                <thead>
                  <tr style="background: #ecfdf5; color: #065f46;">
                    <th colspan="2" style="padding: 2.5px 6px; font-weight: 800; font-size: 10px; border: 1px solid #a7f3d0;">
                      👖 สัดส่วนกางเกง / ท่อนล่าง (PANTS)
                    </th>
                  </tr>
                  <tr><th style="width: 55%;">จุดวัดสัดส่วน</th><th>ขนาดที่วัดได้</th></tr>
                </thead>
                <tbody>
                  ${pantsRows.join('')}
                </tbody>
              </table>
            ` : shirtRows.length > 0 ? `
              <table class="measurement-table" style="margin-bottom: 4px;">
                <thead>
                  <tr style="background: #fef3c7; color: #92400e;">
                    <th colspan="2" style="padding: 2.5px 6px; font-weight: 800; font-size: 10px; border: 1px solid #fcd34d;">
                      👔 สัดส่วนเสื้อ / ท่อนบน (SHIRT)
                    </th>
                  </tr>
                  <tr><th style="width: 55%;">จุดวัดสัดส่วน</th><th>ขนาดที่วัดได้</th></tr>
                </thead>
                <tbody>
                  ${shirtRows.join('')}
                </tbody>
              </table>
            ` : pantsRows.length > 0 ? `
              <table class="measurement-table" style="margin-bottom: 4px;">
                <thead>
                  <tr style="background: #ecfdf5; color: #065f46;">
                    <th colspan="2" style="padding: 2.5px 6px; font-weight: 800; font-size: 10px; border: 1px solid #a7f3d0;">
                      👖 สัดส่วนกางเกง / ท่อนล่าง (PANTS)
                    </th>
                  </tr>
                  <tr><th style="width: 55%;">จุดวัดสัดส่วน</th><th>ขนาดที่วัดได้</th></tr>
                </thead>
                <tbody>
                  ${pantsRows.join('')}
                </tbody>
              </table>
            ` : ''}

            ${otherRows.length > 0 ? `
              <table class="measurement-table" style="margin-top: 4px;">
                <thead>
                  <tr><th>จุดวัดสัดส่วนพิเศษ</th><th>ขนาด</th></tr>
                </thead>
                <tbody>
                  ${otherRows.join('')}
                </tbody>
              </table>
            ` : ''}

            <div style="margin-top: 5px; font-size: 9.5px;">
              ${order.fabricType ? `<div><b>ชนิดผ้า:</b> ${order.fabricType}</div>` : ''}
              ${order.specialInstructions ? `<div><b>เทคนิค/ตำแหน่งปัก:</b> ${order.specialInstructions}</div>` : ''}
            </div>
          </td>

          <td style="width: 46%; text-align: center; vertical-align: top;">
            <div style="font-weight: 700; font-size: 10.5px; margin-bottom: 4px; color: #0f172a; text-align: left;">
              ${order.referenceImageUrl 
                ? '🎨 ภาพตัวอย่าง &amp; หุ่นสัดส่วน:' 
                : `📐 หุ่นจำลองสัดส่วนวัดตัว (${isFem ? 'สตรี' : 'บุรุษ'}):`}
            </div>

            ${order.referenceImageUrl ? `
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 48%; vertical-align: top; padding-right: 4px;">
                    <div class="mannequin-container" style="padding: 4px; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between;">
                      <img src="${order.referenceImageUrl}" alt="Mockup" class="media-photo" style="max-height: 115px;" />
                      <div class="media-caption">ภาพแบบอ้างอิง / ลายผ้า</div>
                    </div>
                  </td>
                  <td style="width: 52%; vertical-align: top; padding-left: 4px;">
                    <div class="mannequin-container" style="padding: 4px; min-height: 140px;">
                      <div style="font-size: 9.5px; font-weight: bold; color: #334155; margin-bottom: 2px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px;">
                        ${isFem ? '👩 หุ่นสตรี (FEMALE)' : '👨 หุ่นบุรุษ (MALE)'}
                      </div>
                      ${renderMannequinSvgHtml(order.customerGender || 'FEMALE', order.categoryType || 'SHIRT', order.measurements || {}, true)}
                    </div>
                  </td>
                </tr>
              </table>
            ` : `
              <div class="mannequin-container" style="padding: 4px;">
                <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 2px;">
                  ${isFem ? '👩 หุ่นสตรี (FEMALE)' : '👨 หุ่นบุรุษ (MALE)'} - ${order.categoryType === 'PANTS' ? 'สัดส่วนกางเกง' : 'สัดส่วนเสื้อ/สูท'}
                </div>
                <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
                  ${renderMannequinSvgHtml(order.customerGender || 'FEMALE', order.categoryType || 'SHIRT', order.measurements || {}, true)}
                </div>
              </div>
            `}
          </td>
        ` : `
          <!-- กรณีสั่งตัดไซส์มาตรฐาน (ไม่มีข้อมูลวัดตัว): ไม่แสดงหุ่นจำลอง เพื่อให้จัดหน้า A4 ได้พอดี 1 แผ่น -->
          <td style="width: 50%; padding-right: 8px; vertical-align: top;">
            <div class="info-box" style="height: 100%;">
              <h4>รายละเอียดผ้าและเทคนิคการตัดเย็บ</h4>
              <div><b>รูปแบบไซส์:</b> ไซส์มาตรฐานสำเร็จรูป</div>
              ${order.fabricType ? `<div><b>ชนิดผ้า / วัสดุ:</b> ${order.fabricType}</div>` : ''}
              ${order.specialInstructions ? `<div><b>เทคนิคพิเศษ / ตำแหน่งปัก:</b> ${order.specialInstructions}</div>` : ''}
              ${order.notes ? `<div><b>หมายเหตุเพิ่มเติม:</b> ${order.notes}</div>` : ''}
            </div>
          </td>
          <td style="width: 50%; padding-left: 8px; vertical-align: top;">
            <div class="info-box" style="background: #ffffff; border: 1.5px solid #cbd5e1; height: 100%;">
              <div style="font-size: 10.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px;">
                👕 สเปกงานไซส์มาตรฐานสำเร็จรูป (Standard Size Specification)
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;">
                <span style="background: #b45309; color: #ffffff; font-size: 12px; font-weight: 900; padding: 2px 10px; border-radius: 5px;">
                  ไซส์: ${firstCustomItem.standardSize || order.standardSize || 'Free Size'}
                </span>
                <span style="font-size: 10px; color: #64748b;">(ทรงสำเร็จรูปมาตรฐาน ไม่ต้องใช้ข้อมูลวัดตัว)</span>
              </div>
              ${order.referenceImageUrl ? `
                <div style="margin-top: 4px; text-align: center;">
                  <img src="${order.referenceImageUrl}" alt="Mockup" style="max-height: 100px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1;" />
                  <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">ภาพแบบอ้างอิง / ลายผ้า</div>
                </div>
              ` : `
                <div style="font-size: 9.5px; color: #64748b; line-height: 1.35; margin-top: 3px;">
                  ผลิตตามแพทเทิร์นไซส์มาตรฐานห้องเสื้อ KORAT CAT x เรือนโคราชเฉลิมวัฒนา ตรวจสอบขนาดก่อนตัดเย็บจริง
                </div>
              `}
            </div>
          </td>
        `}
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
      <b>เงื่อนไขการบริการงานสั่งตัด (Terms of Service):</b><br>
      1. กรุณานำใบสั่งผลิตนี้ หรือภาพถ่ายบาร์โค้ดมาแสดงเมื่อติดต่อรับสินค้าที่หน้าร้าน<br>
      2. กำหนดการรับสินค้าอาจมีการปรับเปลี่ยนเล็กน้อยตามความประณีตของงานช่างศิลป์ ทางร้านจะติดต่อแจ้งล่วงหน้า<br>
      3. สามารถสแกนชำระเงินส่วนที่เหลือผ่าน QR Code บนเอกสารนี้ล่วงหน้าได้ หรือชำระที่เคาน์เตอร์ในวันรับมอบสินค้า
    </div>

    <table class="signature-table">
      <tr>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700;">( ${order.staffName} )</div>
          <div style="font-size: 10px; color: #64748b;">พนักงานผู้รับงานสั่งผลิต</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-weight: 700;">( ${order.customerName} )</div>
          <div style="font-size: 10px; color: #64748b;">ลูกค้าผู้สั่งผลิต / ตรวจสอบสัดส่วน</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  };

  const handleDownloadWorkOrderA4 = (order: CustomMadeOrder) => {
    try {
      const htmlContent = generateWorkOrderA4Html(order);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ใบสั่งผลิต-${order.orderNo}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download work order error:', err);
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  const handlePrintWorkOrderA4 = (order: CustomMadeOrder) => {
    const htmlContent = generateWorkOrderA4Html(order);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(htmlContent);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    } else {
      let iframe = document.getElementById('print-workorder-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-workorder-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">คิวงานสั่งผลิต &amp; ส่งมอบสินค้า (Custom Tailoring Queue)</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {orders.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">ติดตามสถานะตัดเย็บ, สแกนบาร์โค้ดใบสั่งผลิต, และรับชำระยอดคงเหลือเมื่อลูกค้ามารับของ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenNewCustomOrder && (
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenNewCustomOrder();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ออกใบสั่งตัดใหม่</span>
              </button>
            )}

            <button 
              type="button" 
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Barcode Scanner Bar */}
        <div className="p-4 px-6 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          {/* Barcode / Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-amber-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 สแกนบาร์โค้ดใบสั่ง A4 / ค้นหาเบอร์โทร, ชื่อ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ทั้งหมด ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING_PRODUCTION')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'PENDING_PRODUCTION'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ⏳ รอดำเนินการ ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PRODUCTION')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'IN_PRODUCTION'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              🧵 กำลังตัดเย็บ ({inProdCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY_FOR_PICKUP')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'READY_FOR_PICKUP'
                  ? 'bg-purple-500 text-white border-purple-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ✨ พร้อมรับสินค้า ({readyCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ✓ รับของครบแล้ว ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('AR')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border flex items-center gap-1.5 ${
                statusFilter === 'AR'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
              }`}
            >
              <span>📋 ยอดค้างชำระ (AR)</span>
              {totalArCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  statusFilter === 'AR' ? 'bg-white text-rose-700' : 'bg-rose-500/30 text-rose-200'
                }`}>
                  {totalArCount} ใบ (฿{totalArAmount.toLocaleString()})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Accounts Receivable (AR) Summary KPI Banner */}
        {totalArAmount > 0 && (
          <div className="mx-6 mt-3 p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950/40 border border-rose-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>ยอดลูกหนี้การค้ารอเก็บเงิน (Accounts Receivable / AR):</span>
                  <span className="font-mono font-black text-rose-400 text-sm">฿{totalArAmount.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  ค้างชำระทั้งหมด <b className="text-white">{totalArCount}</b> รายการ
                  {overdueArCount > 0 && (
                    <span className="text-rose-400 font-bold ml-2">⚠️ เกินกำหนดนัดรับ {overdueArCount} รายการ</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'AR' ? 'ALL' : 'AR')}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <span>{statusFilter === 'AR' ? 'ดูคิวงานทั้งหมด' : 'กรองเฉพาะรายการค้างชำระ ➔'}</span>
            </button>
          </div>
        )}

        {/* Content Body: Order Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Scissors className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
              <h4 className="text-sm font-bold text-slate-300">ไม่พบรายการสั่งตัดตามเงื่อนไขที่เลือก</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                สามารถสแกนบาร์โค้ดบนใบ A4 หรือคลิกปุ่ม "+ ออกใบสั่งตัดใหม่" ด้านบนเพื่อเริ่มสั่งตัด
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map(order => {
                const isPaidFull = order.balanceDue <= 0 || order.status === 'COMPLETED';
                const isReady = order.status === 'READY_FOR_PICKUP';
                const isPending = order.status === 'PENDING_PRODUCTION';
                const isInProd = order.status === 'IN_PRODUCTION';

                // Due date urgency check
                const todayStr = new Date().toISOString().slice(0, 10);
                const isDueToday = order.dueDate === todayStr;
                const isOverdue = order.dueDate < todayStr && !isPaidFull;

                return (
                  <div 
                    key={order.id}
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                      isPaidFull 
                        ? 'bg-slate-950/40 border-slate-800' 
                        : isOverdue 
                        ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30' 
                        : isReady 
                        ? 'bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    {/* Top Row: Order No, Date, Status Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-amber-400">{order.orderNo}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              order.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              order.status === 'READY_FOR_PICKUP' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse' :
                              order.status === 'IN_PRODUCTION' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                              'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {order.status === 'COMPLETED' ? '✓ ส่งมอบแล้ว' :
                               order.status === 'READY_FOR_PICKUP' ? '✨ พร้อมรับสินค้า' :
                               order.status === 'IN_PRODUCTION' ? '🧵 กำลังตัดเย็บ' : '⏳ รอดำเนินการ'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ออกใบสั่ง: {new Date(order.createdAt).toLocaleDateString('th-TH')} • โดย {order.staffName}
                          </p>
                        </div>

                        {/* Due Date Indicator */}
                        <div className="text-right">
                          <div className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                            isOverdue ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-bounce' :
                            isDueToday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>นัดรับ: {order.dueDate ? `${new Date(order.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} (${order.dueDate.split('-').reverse().join('/')})` : '-'}</span>
                          </div>
                          {isOverdue && (
                            <span className="text-[9px] text-rose-400 font-bold block mt-0.5">🚨 เกินกำหนดรับ</span>
                          )}
                          {isDueToday && (
                            <span className="text-[9px] text-amber-400 font-bold block mt-0.5">⚠️ ครบกำหนดวันนี้</span>
                          )}
                        </div>
                      </div>

                      {/* Customer & Item Description */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>{order.customerName}</span>
                          </span>
                          <a 
                            href={`tel:${order.customerPhone}`}
                            className="font-mono text-slate-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                          {order.referenceImageUrl ? (
                            <img 
                              src={order.referenceImageUrl} 
                              alt="Mockup" 
                              className="w-12 h-12 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <Scissors className="w-5 h-5 text-amber-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white text-xs truncate">
                              {order.itemDescription}
                            </div>
                            <div className="text-[10px] text-amber-300 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                              <span>ผ้า: {order.fabricType || 'ตามที่กำหนด'} • {order.qty} ชิ้น</span>
                              {order.sizeMode === 'STANDARD' && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                                  ไซส์ {order.standardSize || 'Free Size'}
                                </span>
                              )}
                              {order.items && order.items.length > 1 && (
                                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.2 rounded font-bold">
                                  {order.items.length} รายการ
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              รับมอบ: {order.deliveryMethod === 'PICKUP_SHOP' ? '🏪 หน้าร้าน' : `🚚 พัสดุ: ${order.shippingAddress || ''}`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment Summary Box */}
                      <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>ยอดสั่งผลิตรวม:</span>
                          <span className="font-mono text-slate-200">฿{order.totalPrice.toLocaleString()}</span>
                        </div>
                        {order.paymentType === 'FULL' || order.depositAmount >= order.totalPrice ? (
                          <div className="flex justify-between text-emerald-400 text-[11px]">
                            <span>สถานะการชำระ:</span>
                            <span className="font-mono font-bold">✓ ชำระเต็ม 100% ({order.depositPaymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'})</span>
                          </div>
                        ) : (
                          <div className="flex justify-between text-emerald-400 text-[11px]">
                            <span>เงินมัดจำ (ชำระแล้ว):</span>
                            <span className="font-mono font-bold">฿{order.depositAmount.toLocaleString()} ({order.depositPaymentMethod === 'PROMPTPAY' ? 'PromptPay' : 'เงินสด'})</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline pt-1 border-t border-slate-800 font-bold">
                          <span className={isPaidFull ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPaidFull ? '✓ ชำระครบถ้วน 100%' : 'ยอดค้างชำระคงเหลือ:'}
                          </span>
                          <span className={`text-base font-mono font-black ${isPaidFull ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ฿{order.balanceDue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
                      {/* Status pipeline selector */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400 text-[9px] mr-1">สถานะงาน:</span>
                        {order.status !== 'COMPLETED' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'IN_PRODUCTION')}
                              className={`px-2 py-1 rounded-lg font-bold transition border ${
                                isInProd ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              🧵 กำลังตัดเย็บ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')}
                              className={`px-2 py-1 rounded-lg font-bold transition border ${
                                isReady ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              ✨ พร้อมรับ
                            </button>
                          </>
                        ) : (
                          <span className="text-emerald-400 font-bold">✓ งานเสร็จสมบูรณ์แล้ว</span>
                        )}
                      </div>

                      {/* Print, Download & Edit Work Order Row */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditOrder(order)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition border border-slate-700 shadow-xs"
                          title="แก้ไขรายละเอียดใบสั่งตัด / ที่อยู่จัดส่ง / ยอดเงิน"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>✏️ แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintWorkOrderA4(order)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition border border-slate-700"
                          title="พิมพ์ใบสั่งตัดขนาด A4"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>🖨️ ใบ A4</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReceiptOrder(order);
                            setReceiptPhase(
                              order.status === 'COMPLETED' ? 'FINAL_PICKUP' :
                              (order.paymentType === 'FULL' || order.depositAmount >= order.totalPrice ? 'FULL' : 'DEPOSIT')
                            );
                            setIsReceiptModalOpen(true);
                          }}
                          className="flex-1 py-1.5 px-2 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition border border-sky-600/40"
                          title="พิมพ์สลิปใบเสร็จรับเงิน (58/80mm) แนบพร้อมใบสั่งตัดหรือให้ลูกค้า"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>🧾 สลิป</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadWorkOrderA4(order)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-[11px] font-bold flex items-center justify-center transition border border-slate-700"
                          title="บันทึก PDF / HTML"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Main Action Buttons */}
                      <div className="flex items-center gap-2 pt-0.5">
                        {order.balanceDue > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForSettlement(order);
                              setSettlementSuccessOrder(null);
                              setSettlementPaymentMethod('PROMPTPAY');
                              setCashTendered(order.balanceDue.toString());
                            }}
                            className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-lg transition active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>💰 ชำระยอดคงเหลือ (฿{order.balanceDue.toLocaleString()}) &amp; ส่งมอบ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePrintCompletedA4(order)}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>🖨️ พิมพ์ใบเสร็จส่งมอบ (A4)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewingMeasurementOrder(order)}
                          title="ดูสัดส่วนวัดตัว & หุ่นจำลอง"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6 flex-shrink-0">
          <span>KORAT CAT Haute Couture Atelier Queue Management</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. MODAL: FINAL PAYMENT & BALANCE DUE SETTLEMENT POPUP   */}
      {/* ======================================================== */}
      {selectedOrderForSettlement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-white my-auto flex flex-col">
            
            {/* Header */}
            <div className="p-4 px-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">รับชำระยอดค้างชำระ &amp; ส่งมอบสินค้า</h4>
                  <p className="text-[11px] text-amber-300 font-mono">เลขที่สั่ง: {selectedOrderForSettlement.orderNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForSettlement(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {settlementSuccessOrder ? (
                /* SUCCESS VIEW */
                <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">รับชำระยอดคงเหลือและส่งมอบสำเร็จ!</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      ออเดอร์ <span className="font-mono font-bold text-amber-300">{settlementSuccessOrder.orderNo}</span> ได้รับการบันทึกสถานะเป็น <b>"ชำระครบถ้วน 100%"</b> และรวมยอดเงินเข้ากะพนักงานแล้ว
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs max-w-sm mx-auto">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ลูกค้า:</span>
                      <span className="font-bold text-white">{settlementSuccessOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ยอดชำระส่วนที่เหลือ:</span>
                      <span className="font-mono font-bold text-emerald-400">฿{(settlementSuccessOrder.finalPaidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ช่องทางชำระ:</span>
                      <span className="font-bold text-white">{settlementSuccessOrder.finalPaymentMethod === 'PROMPTPAY' ? 'PromptPay QR' : 'เงินสด'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptOrder(settlementSuccessOrder);
                        setReceiptPhase('FINAL_PICKUP');
                        setIsReceiptModalOpen(true);
                      }}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>🧾 พิมพ์สลิปใบเสร็จ (58/80mm)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintCompletedA4(settlementSuccessOrder)}
                      className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/30"
                    >
                      <Printer className="w-4 h-4" />
                      <span>🖨️ พิมพ์ใบเสร็จส่งมอบ A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForSettlement(null);
                        setSettlementSuccessOrder(null);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              ) : (
                /* PAYMENT FORM VIEW */
                <form onSubmit={handleConfirmSettlement} className="space-y-4">
                  {/* Order Overview */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ลูกค้า:</span>
                      <span className="font-bold text-white">{selectedOrderForSettlement.customerName} ({selectedOrderForSettlement.customerPhone})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">รายการสั่งผลิต:</span>
                      <span className="font-bold text-slate-200 truncate">{selectedOrderForSettlement.itemDescription}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5">
                      <span className="text-slate-400">ยอดสั่งผลิตรวม:</span>
                      <span className="font-mono text-slate-300">฿{selectedOrderForSettlement.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>มัดจำ 50% ที่ชำระแล้ว:</span>
                      <span className="font-mono">฿{selectedOrderForSettlement.depositAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Huge Balance Due Display */}
                  <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl text-center space-y-1">
                    <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                      ยอดเงินที่ต้องเรียกเก็บจากลูกค้าทันที (Balance Due):
                    </span>
                    <div className="text-3xl font-black font-mono text-rose-400">
                      ฿{selectedOrderForSettlement.balanceDue.toLocaleString()}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300">เลือกช่องทางรับเงิน:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettlementPaymentMethod('PROMPTPAY')}
                        className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                          settlementPaymentMethod === 'PROMPTPAY'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>PromptPay QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettlementPaymentMethod('CASH')}
                        className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                          settlementPaymentMethod === 'CASH'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>เงินสด (Cash)</span>
                      </button>
                    </div>
                  </div>

                  {/* Method Details: PromptPay vs Cash */}
                  {settlementPaymentMethod === 'PROMPTPAY' ? (
                    <div className="p-3 bg-slate-950 border border-sky-500/40 rounded-2xl flex items-center gap-3">
                      {(() => {
                        const payload = settings?.promptPayId
                          ? PromptPayService.generatePayload(settings.promptPayId, selectedOrderForSettlement.balanceDue)
                          : '';
                        const qrUrl = payload ? PromptPayService.getQrImageUrl(payload, 200) : '';

                        return (
                          <>
                            <div className="bg-white p-1.5 rounded-xl flex-shrink-0 shadow">
                              {qrUrl ? (
                                <img src={qrUrl} alt="PromptPay QR" className="w-20 h-20 object-contain rounded-lg" />
                              ) : (
                                <div className="w-20 h-20 flex items-center justify-center text-slate-400">
                                  <QrCode className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded-full font-bold">
                                QR ส่งขึ้นหน้าจอที่ 2 ฝั่งลูกค้าแล้ว
                              </span>
                              <div className="font-bold text-white text-xs">
                                สแกนจ่ายยอดคงเหลือ: <span className="font-mono text-emerald-400">฿{selectedOrderForSettlement.balanceDue.toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                พร้อมเพย์: <b className="font-mono text-slate-200">{settings?.promptPayId || '-'}</b>
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-2xl space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          เงินสดที่รับจากลูกค้า (บาท) *เข้าลิ้นชัก:
                        </label>
                        <input
                          type="number"
                          autoFocus
                          value={cashTendered}
                          onChange={e => setCashTendered(e.target.value)}
                          className="w-full text-lg font-mono font-bold text-emerald-400 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl"
                        />
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl text-xs font-bold">
                        <span className="text-slate-400">เงินทอนที่ต้องคืน:</span>
                        <span className="font-mono text-amber-400 text-base">
                          ฿{Math.max(0, (parseFloat(cashTendered) || 0) - selectedOrderForSettlement.balanceDue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingSettlement}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xl transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ ยืนยันรับเงิน ฿{selectedOrderForSettlement.balanceDue.toLocaleString()} &amp; บันทึกส่งมอบสินค้า</span>
                  </button>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: MEASUREMENT & SILHOUETTE DETAIL POPUP           */}
      {/* ======================================================== */}
      {viewingMeasurementOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-white my-auto flex flex-col max-h-[85vh]">
            <div className="p-4 px-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-300">
                สัดส่วนการวัดตัว &amp; แบบอ้างอิง: {viewingMeasurementOrder.orderNo}
              </h4>
              <button
                type="button"
                onClick={() => setViewingMeasurementOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Multi-item breakdown if available */}
              {viewingMeasurementOrder.items && viewingMeasurementOrder.items.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-300 text-xs">
                    รายการสินค้าที่สั่งผลิต ({viewingMeasurementOrder.items.length} รายการ):
                  </div>
                  <div className="divide-y divide-slate-800 text-xs">
                    {viewingMeasurementOrder.items.map((it, idx) => (
                      <div key={it.id || idx} className="py-2 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">#{idx + 1} {it.itemDescription}</div>
                          <div className="text-[10px] text-slate-400">
                            ผ้า: {it.fabricType || '-'} • {it.specialInstructions ? `ปัก: ${it.specialInstructions} • ` : ''}จำนวน {it.qty} ชิ้น
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {it.sizeMode === 'STANDARD' ? `ไซส์ ${it.standardSize || 'Free Size'}` : '📐 วัดตัวตัดเฉพาะ'}
                          </span>
                          <div className="font-mono text-emerald-400 font-bold mt-0.5">
                            ฿{(it.lineTotal || (it.qty * it.unitPrice)).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const vm = viewingMeasurementOrder.measurements || {};
                const shirtEntries = [
                  { label: 'รอบอก (Chest)', val: vm.chest },
                  { label: 'ความยาวเสื้อ (Length)', val: vm.shirtLength },
                  { label: 'ไหล่กว้าง (Shoulder)', val: vm.shoulder },
                  { label: 'ความยาวแขน (Arm)', val: vm.armLength },
                  { label: 'รอบวงแขน (Armhole)', val: vm.armHole },
                  { label: 'รอบเอวเสื้อ (Shirt Waist)', val: vm.waist },
                  { label: 'รอบคอ (Neck)', val: vm.neck },
                  { label: 'รอบปลายแขน (Wrist)', val: vm.wrist },
                  { label: 'สะโพก/ชายเสื้อ (Hips)', val: vm.hips },
                ].filter(e => Boolean(e.val));

                const pantsEntries = [
                  { label: 'รอบเอวกางเกง (Pants Waist)', val: vm.waistPants },
                  { label: 'ความยาวกางเกง (Length)', val: vm.pantsLength },
                  { label: 'รอบสะโพกกางเกง (Hips)', val: vm.hipsPants },
                  { label: 'รอบต้นขา (Thigh)', val: vm.thigh },
                  { label: 'เป้ากางเกง (Crotch)', val: vm.crotch },
                  { label: 'ปลายขากางเกง (Leg Opening)', val: vm.legOpening },
                ].filter(e => Boolean(e.val));

                const otherEntries = [
                  { label: 'มิติสัดส่วนพิเศษ', val: vm.customDimension }
                ].filter(e => Boolean(e.val));

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {shirtEntries.length > 0 && (
                        <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
                          <h6 className="font-bold text-amber-300 text-[11px] pb-1 border-b border-amber-500/20 flex items-center gap-1.5">
                            👔 สัดส่วนเสื้อ / ท่อนบน (Shirt)
                          </h6>
                          {shirtEntries.map(e => (
                            <div key={e.label} className="flex justify-between py-0.5 border-b border-slate-800/40 text-xs">
                              <span className="text-slate-400">{e.label}:</span>
                              <span className="font-bold font-mono text-amber-300">{e.val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pantsEntries.length > 0 && (
                        <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                          <h6 className="font-bold text-emerald-300 text-[11px] pb-1 border-b border-emerald-500/20 flex items-center gap-1.5">
                            👖 สัดส่วนกางเกง / ท่อนล่าง (Pants)
                          </h6>
                          {pantsEntries.map(e => (
                            <div key={e.label} className="flex justify-between py-0.5 border-b border-slate-800/40 text-xs">
                              <span className="text-slate-400">{e.label}:</span>
                              <span className="font-bold font-mono text-emerald-300">{e.val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {otherEntries.length > 0 && (
                        <div className="p-2.5 bg-slate-800/40 border border-slate-700 rounded-xl space-y-1">
                          {otherEntries.map(e => (
                            <div key={e.label} className="flex justify-between py-0.5 text-xs">
                              <span className="text-slate-400">{e.label}:</span>
                              <span className="font-bold font-mono text-white">{e.val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {viewingMeasurementOrder.specialInstructions && (
                        <div className="pt-1 text-xs">
                          <span className="text-slate-400 block font-bold">เทคนิค/ตำแหน่งปัก:</span>
                          <span className="text-slate-200">{viewingMeasurementOrder.specialInstructions}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      {viewingMeasurementOrder.referenceImageUrl ? (
                        <div>
                          <img
                            src={viewingMeasurementOrder.referenceImageUrl}
                            alt="Mockup"
                            className="max-h-48 rounded-xl object-contain border border-slate-700 shadow"
                          />
                          <span className="text-[10px] text-slate-400 block text-center mt-1">ภาพแบบอ้างอิงจากลูกค้า</span>
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 py-8">
                          <Scissors className="w-8 h-8 mx-auto opacity-40 mb-1" />
                          <span>ไม่มีรูปแนบ</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const o = viewingMeasurementOrder;
                    setReceiptOrder(o);
                    setReceiptPhase(
                      o.status === 'COMPLETED' ? 'FINAL_PICKUP' :
                      (o.paymentType === 'FULL' || o.depositAmount >= o.totalPrice ? 'FULL' : 'DEPOSIT')
                    );
                    setIsReceiptModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>🧾 พิมพ์สลิป</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const o = viewingMeasurementOrder;
                    setViewingMeasurementOrder(null);
                    handleStartEditOrder(o);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>✏️ แก้ไขข้อมูล</span>
                </button>

                {viewingMeasurementOrder.balanceDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const o = viewingMeasurementOrder;
                      setViewingMeasurementOrder(null);
                      setSelectedOrderForSettlement(o);
                      setSettlementSuccessOrder(null);
                      setSettlementPaymentMethod('PROMPTPAY');
                      setCashTendered(o.balanceDue.toString());
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>💰 ชำระยอดคงเหลือเข้ากะ (฿{viewingMeasurementOrder.balanceDue.toLocaleString()})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintWorkOrderA4(viewingMeasurementOrder)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>🖨️ พิมพ์ใบสั่งตัด (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadWorkOrderA4(viewingMeasurementOrder)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-emerald-500/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>📥 บันทึก PDF / HTML ลงเครื่อง</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingMeasurementOrder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: EDIT CUSTOM ORDER POPUP (แก้ไขข้อมูลใบสั่งตัด)   */}
      {/* ======================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-white my-auto flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 px-6 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">แก้ไขข้อมูลใบสั่งผลิต / สั่งตัด</h4>
                  <p className="text-[11px] text-sky-300 font-mono">เลขที่สั่ง: {editingOrder.orderNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEditedOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Customer Info Section */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-amber-300 block">ข้อมูลลูกค้า:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ชื่อ-นามสกุล ลูกค้า *</label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={e => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">เบอร์โทรศัพท์ *</label>
                    <input
                      type="tel"
                      required
                      value={editCustomerPhone}
                      onChange={e => setEditCustomerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">เพศลูกค้า:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['FEMALE', 'MALE', 'LGBTQ'] as GenderType[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditCustomerGender(g)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                          editCustomerGender === g
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
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

              {/* Garment Details Section */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-amber-300 block">รายละเอียดงานสั่งตัด &amp; สเปก:</span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">รายละเอียดสินค้าสั่งตัด:</label>
                  <input
                    type="text"
                    value={editItemDescription}
                    onChange={e => setEditItemDescription(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ชนิดผ้า / วัสดุ:</label>
                    <input
                      type="text"
                      value={editFabricType}
                      onChange={e => setEditFabricType(e.target.value)}
                      placeholder="เช่น ผ้าไหมมัดหมี่โคราช"
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">เทคนิคพิเศษ / ตำแหน่งปัก:</label>
                    <input
                      type="text"
                      value={editSpecialInstructions}
                      onChange={e => setEditSpecialInstructions(e.target.value)}
                      placeholder="เช่น ปักด้ายทองที่อกซ้าย"
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                {/* Sizing Mode & Standard Size */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-300">รูปแบบไซส์:</label>
                    <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setEditSizeMode('STANDARD')}
                        className={`px-3 py-0.5 rounded-md text-xs font-bold transition ${
                          editSizeMode === 'STANDARD' ? 'bg-amber-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        ไซส์มาตรฐาน
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditSizeMode('CUSTOM')}
                        className={`px-3 py-0.5 rounded-md text-xs font-bold transition ${
                          editSizeMode === 'CUSTOM' ? 'bg-amber-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        วัดตัวเฉพาะ
                      </button>
                    </div>
                  </div>

                  {editSizeMode === 'STANDARD' && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'Free Size'].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setEditStandardSize(sz)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                            editStandardSize === sz
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}

                  {editSizeMode === 'CUSTOM' && (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400">กรอก/แก้ไขสัดส่วนการวัดตัว (แยกเสื้อ และกางเกง ออกจากกันชัดเจน):</div>

                      {/* เสื้อ */}
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="text-amber-300 font-bold text-xs flex items-center justify-between pb-1 border-b border-amber-500/20">
                          <span>👔 สัดส่วนเสื้อ / ท่อนบน (Shirt)</span>
                          <span className="text-[10px] text-amber-400/80">วัดตัวท่อนบน</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] text-amber-200 font-bold mb-0.5">รอบอก (Chest)</label>
                            <input
                              type="text"
                              placeholder='เช่น 30" หรือ 36"'
                              value={editMeasurements.chest || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, chest: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-amber-300 font-extrabold mb-0.5">รอบเอวเสื้อ (Shirt Waist)</label>
                            <input
                              type="text"
                              placeholder='เช่น 28"'
                              value={editMeasurements.waist || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, waist: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-amber-500/50 rounded-lg text-amber-200 font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">ไหล่กว้าง (Shoulder)</label>
                            <input
                              type="text"
                              placeholder='เช่น 16"'
                              value={editMeasurements.shoulder || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, shoulder: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-amber-200 font-bold mb-0.5">ความยาวเสื้อ (Length)</label>
                            <input
                              type="text"
                              placeholder='เช่น 16" หรือ 27"'
                              value={editMeasurements.shirtLength || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, shirtLength: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">ความยาวแขน (Arm Length)</label>
                            <input
                              type="text"
                              placeholder='เช่น 22"'
                              value={editMeasurements.armLength || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, armLength: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบวงแขน/ต้นแขน</label>
                            <input
                              type="text"
                              placeholder='เช่น 14"'
                              value={editMeasurements.armHole || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, armHole: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบคอ (Neck)</label>
                            <input
                              type="text"
                              placeholder='เช่น 15"'
                              value={editMeasurements.neck || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, neck: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบข้อมือ/ปลายแขน</label>
                            <input
                              type="text"
                              placeholder='เช่น 8"'
                              value={editMeasurements.wrist || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, wrist: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* กางเกง */}
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                        <div className="text-emerald-300 font-bold text-xs flex items-center justify-between pb-1 border-b border-emerald-500/20">
                          <span>👖 สัดส่วนกางเกง / ท่อนล่าง (Pants)</span>
                          <span className="text-[10px] text-emerald-400/80">วัดตัวท่อนล่าง</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] text-emerald-300 font-extrabold mb-0.5">รอบเอวกางเกง (Pants Waist)</label>
                            <input
                              type="text"
                              placeholder='เช่น 19" หรือ 32"'
                              value={editMeasurements.waistPants || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, waistPants: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-emerald-500/50 rounded-lg text-emerald-200 font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-emerald-200 font-bold mb-0.5">ความยาวกางเกง (Length)</label>
                            <input
                              type="text"
                              placeholder='เช่น 10" หรือ 38"'
                              value={editMeasurements.pantsLength || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, pantsLength: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบสะโพกกางเกง (Hips)</label>
                            <input
                              type="text"
                              placeholder='เช่น 38"'
                              value={editMeasurements.hipsPants || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, hipsPants: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบต้นขา (Thigh)</label>
                            <input
                              type="text"
                              placeholder='เช่น 22"'
                              value={editMeasurements.thigh || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, thigh: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">เป้ากางเกง (Crotch)</label>
                            <input
                              type="text"
                              placeholder='เช่น 12"'
                              value={editMeasurements.crotch || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, crotch: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-300 font-bold mb-0.5">รอบปลายขา (Leg Opening)</label>
                            <input
                              type="text"
                              placeholder='เช่น 14"'
                              value={editMeasurements.legOpening || ''}
                              onChange={e => setEditMeasurements(prev => ({ ...prev, legOpening: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery & Due Date Section */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-amber-300 block">การนัดหมายและการส่งมอบ:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">กำหนดส่งมอบ / วันนัดรับ *</label>
                    <input
                      type="date"
                      required
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[
                        { label: '+3 วัน', days: 3 },
                        { label: '+7 วัน', days: 7 },
                        { label: '+14 วัน', days: 14 },
                        { label: '+30 วัน', days: 30 }
                      ].map(btn => (
                        <button
                          key={btn.days}
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + btn.days);
                            setEditDueDate(d.toISOString().slice(0, 10));
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
                      value={editDeliveryMethod}
                      onChange={e => setEditDeliveryMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-medium"
                    >
                      <option value="PICKUP_SHOP">🏪 มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)</option>
                      <option value="SHIPPING_ADDRESS">🚚 จัดส่งพัสดุตามที่อยู่ลูกค้า</option>
                    </select>
                  </div>
                </div>

                {/* Shipping Address with Postal Code Auto-Lookup */}
                {editDeliveryMethod === 'SHIPPING_ADDRESS' && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2 mt-2">
                    <span className="text-[11px] font-bold text-amber-300 block">
                      📮 ป้อนรหัสไปรษณีย์เพื่อค้นหาที่อยู่อัตโนมัติ:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400">รหัสไปรษณีย์:</label>
                        <input
                          type="text"
                          maxLength={5}
                          value={editShippingPostalCode}
                          onChange={e => handleEditPostalCodeChange(e.target.value)}
                          placeholder="เช่น 30000"
                          className="w-full px-2.5 py-1 bg-slate-800 border border-amber-500/50 rounded-lg text-xs text-white font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">จังหวัด:</label>
                        <input
                          type="text"
                          value={editShippingProvince}
                          onChange={e => {
                            setEditShippingProvince(e.target.value);
                            updateEditComposedAddress(editShippingHouseDetails, editShippingSubdistrict, editShippingDistrict, e.target.value, editShippingPostalCode);
                          }}
                          className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">อำเภอ/เขต:</label>
                        <input
                          type="text"
                          value={editShippingDistrict}
                          onChange={e => {
                            setEditShippingDistrict(e.target.value);
                            updateEditComposedAddress(editShippingHouseDetails, editShippingSubdistrict, e.target.value, editShippingProvince, editShippingPostalCode);
                          }}
                          className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400">ตำบล/แขวง:</label>
                        {editSubdistrictOptions.length > 1 ? (
                          <select
                            value={editShippingSubdistrict}
                            onChange={e => handleEditSubdistrictSelect(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                          >
                            {editSubdistrictOptions.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editShippingSubdistrict}
                            onChange={e => {
                              setEditShippingSubdistrict(e.target.value);
                              updateEditComposedAddress(editShippingHouseDetails, e.target.value, editShippingDistrict, editShippingProvince, editShippingPostalCode);
                            }}
                            className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400">บ้านเลขที่, ซอย, ถนน:</label>
                      <input
                        type="text"
                        value={editShippingHouseDetails}
                        onChange={e => handleEditHouseDetailsChange(e.target.value)}
                        placeholder="เช่น 123/45 ซ.มิตรภาพ 4 ถ.มิตรภาพ"
                        className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400">ที่อยู่จัดส่งเต็ม:</label>
                      <textarea
                        rows={2}
                        value={editShippingAddress}
                        onChange={e => setEditShippingAddress(e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-amber-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Price & Deposit Adjustment */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="font-bold text-amber-300 block">ยอดเงินและการชำระ:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ยอดรวมทั้งสิ้น (บาท) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editTotalPrice === 0 ? '' : editTotalPrice}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setEditTotalPrice(val);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-amber-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">เงินมัดจำที่รับแล้ว (บาท) *</label>
                    <input
                      type="number"
                      min={0}
                      max={editTotalPrice}
                      required
                      value={editDepositAmount === 0 ? '' : editDepositAmount}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setEditDepositAmount(val);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <span className="font-bold text-rose-300">ยอดค้างชำระคงเหลือ (Balance Due):</span>
                  <span className="font-mono font-black text-rose-400 text-base">
                    ฿{Math.max(0, editTotalPrice - editDepositAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">หมายเหตุเพิ่มเติม:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="เช่น ลูกค้าขอปรับความยาวกระโปรงเพิ่ม 1 นิ้ว..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>✓ บันทึกการแก้ไขข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptOrder && (
        <CustomOrderReceiptModal
          isOpen={isReceiptModalOpen}
          order={receiptOrder}
          settings={settings || defaultQueueStoreSettings}
          paymentPhase={receiptPhase}
          paidAmountThisTime={
            receiptPhase === 'FINAL_PICKUP'
              ? (receiptOrder.finalPaidAmount ?? receiptOrder.balanceDue)
              : (receiptPhase === 'FULL' ? receiptOrder.totalPrice : receiptOrder.depositAmount)
          }
          paymentMethodThisTime={
            receiptPhase === 'FINAL_PICKUP'
              ? (receiptOrder.finalPaymentMethod || 'PROMPTPAY')
              : (receiptOrder.depositPaymentMethod || 'PROMPTPAY')
          }
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptOrder(null);
          }}
        />
      )}

    </div>
  );
};
