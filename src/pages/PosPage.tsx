// src/pages/PosPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  PauseCircle, 
  PlayCircle, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Receipt, 
  Sparkles, 
  User, 
  UserPlus,
  CheckCircle2, 
  RotateCcw,
  Printer,
  Phone,
  MessageSquare,
  Percent,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Tag,
  Eye,
  EyeOff,
  Scissors
} from 'lucide-react';
import { db } from '../db';
import type { 
  ProductVariant, 
  CartItem, 
  UserAccount, 
  Shift, 
  Order, 
  Customer,
  StoreSettings 
} from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../types';
import { PromotionEngine } from '../services/promotionEngine';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { AuthService } from '../services/auth';
import { SoundEffects } from '../services/soundEffects';
import { PinModal } from '../components/PinModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { DigitalPassModal } from '../components/DigitalPassModal';
import { CustomOrderModal } from '../components/CustomOrderModal';
import { CloudSync } from '../services/cloudSync';

interface PosPageProps {
  currentUser: UserAccount;
  activeShift: Shift | null;
  onOpenShiftRequired: () => void;
  onShiftUpdated?: () => void;
}

export const PosPage: React.FC<PosPageProps> = ({
  currentUser,
  activeShift,
  onOpenShiftRequired,
  onShiftUpdated
}) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [quickItems, setQuickItems] = useState<ProductVariant[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<'ALL' | 'BEST_SELLER'>('ALL');
  const [salesStats, setSalesStats] = useState<Record<string, number>>({});
  const [totalSoldSum, setTotalSoldSum] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<{ id: string; time: string; cart: CartItem[]; customer?: Customer; totalAmount?: number }[]>([]);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [holdBillNotice, setHoldBillNotice] = useState<string | null>(null);
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [showCatalogGrid, setShowCatalogGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_show_catalog_grid');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Member & Customer Live Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regContactChannel, setRegContactChannel] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [newlyRegisteredCustomer, setNewlyRegisteredCustomer] = useState<Customer | null>(null);
  const [isDigitalPassOpen, setIsDigitalPassOpen] = useState(false);

  // Custom Discount Modal State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'PROMPTPAY' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitPromptPayAmount, setSplitPromptPayAmount] = useState<number>(0);
  
  // Receipt & Tax Invoice Modals
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTaxInvoiceModalOpen, setIsTaxInvoiceModalOpen] = useState(false);

  // Recent Orders Modal (Cashier can view/reprint or issue tax invoice anytime)
  const [isRecentOrdersModalOpen, setIsRecentOrdersModalOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isCustomOrderModalOpen, setIsCustomOrderModalOpen] = useState(false);

  // Custom Price / Non-Catalog Item Modal (F7)
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemCategory, setCustomItemCategory] = useState<string>('บริการ/สั่งพิเศษ');

  // Security Override
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'VOID_BILL' | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const justPaidRef = useRef(false);

  const loadQuickData = async () => {
    // 1. Calculate actual sales count per variant from real completed orders
    const completedOrders = await db.orders.where({ status: 'COMPLETED' }).toArray();
    const variantSalesCount: Record<string, number> = {};
    let totalSold = 0;

    completedOrders.forEach(ord => {
      ord.items.forEach(it => {
        variantSalesCount[it.variantId] = (variantSalesCount[it.variantId] || 0) + it.qty;
        totalSold += it.qty;
      });
    });
    setSalesStats(variantSalesCount);
    setTotalSoldSum(totalSold);

    // 2. Fetch all active variants
    const items = await db.variants.filter(v => v.isActive !== false).toArray();
    setAllVariants(items);
  };

  useEffect(() => {
    db.settings.get('current_store_settings').then(s => {
      if (s) setSettings(s);
    });

    loadQuickData();
  }, []);

  // Filter & Sort Quick Items dynamically
  useEffect(() => {
    let list = [...allVariants];
    if (selectedCategory !== 'ALL') {
      list = list.filter(v => v.category === selectedCategory);
    }
    if (sortMode === 'BEST_SELLER') {
      list.sort((a, b) => (salesStats[b.id] || 0) - (salesStats[a.id] || 0));
    }
    setQuickItems(list);
  }, [allVariants, selectedCategory, sortMode, salesStats]);

  // Customer Live Search
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setCustomerSearchResults([]);
      return;
    }
    const q = customerSearchQuery.trim().toLowerCase();
    db.customers
      .filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(q))
      .limit(6)
      .toArray()
      .then(setCustomerSearchResults);
  }, [customerSearchQuery]);

  // Product Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    db.variants
      .filter(v => 
        v.isActive && (
          v.barcode.includes(q) || 
          v.sku.toLowerCase().includes(q) || 
          v.productName.toLowerCase().includes(q)
        )
      )
      .limit(8)
      .toArray()
      .then(setSearchResults);
  }, [searchTerm]);

  // Global Barcode Scanner Listener:
  // Catches rapid scanner keystrokes (< 55ms) even if focus was outside the input field
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      // If user is already in the main search input, let standard form submit handle it
      if (activeEl === barcodeInputRef.current) return;
      // If typing in another modal input (e.g. member phone, custom discount), ignore
      if (isInput) return;

      const now = Date.now();
      const char = e.key;

      if (char === 'Enter') {
        if (scanBuffer.length >= 3) {
          e.preventDefault();
          const scanned = scanBuffer.trim();
          scanBuffer = '';

          // 1. Check member
          const memberMatch = await db.customers
            .filter(c => (c.memberCode && c.memberCode.toLowerCase() === scanned.toLowerCase()) || c.phone === scanned)
            .first();

          if (memberMatch) {
            setSelectedCustomer(memberMatch);
            SoundEffects.playSuccess();
            return;
          }

          // 2. Check product variant
          const matched = await db.variants
            .filter(v => v.isActive !== false && (
              v.barcode === scanned || 
              v.sku.toLowerCase() === scanned.toLowerCase()
            ))
            .first();

          if (matched) {
            addToCart(matched);
          } else {
            SoundEffects.playWarning();
            setStockNotice(`ไม่พบสินค้าสำหรับรหัส: "${scanned}"`);
            setTimeout(() => setStockNotice(null), 3500);
          }
        }
        scanBuffer = '';
        return;
      }

      // If interval is longer than 60ms, it's slow manual human typing, discard buffer
      if (now - lastKeyTime > 60) {
        scanBuffer = '';
      }

      if (char.length === 1) {
        scanBuffer += char;
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchTerm.trim();
    if (!raw) return;

    // 1. Check if the scanned barcode matches a Member Code (e.g. KCAT-9842 or Member Phone)
    const memberMatch = await db.customers
      .filter(c => (c.memberCode && c.memberCode.toLowerCase() === raw.toLowerCase()) || c.phone === raw)
      .first();

    if (memberMatch) {
      setSelectedCustomer(memberMatch);
      SoundEffects.playSuccess();
      setSearchTerm('');
      return;
    }

    // 2. Otherwise, check for Product Barcode / SKU
    const matched = await db.variants
      .filter(v => v.isActive !== false && (
        v.barcode === raw || 
        v.sku.toLowerCase() === raw.toLowerCase()
      ))
      .first();

    if (matched) {
      addToCart(matched);
      setSearchTerm('');
    } else if (searchResults.length === 1) {
      addToCart(searchResults[0]);
      setSearchTerm('');
    } else {
      SoundEffects.playWarning();
      setStockNotice(`ไม่พบสินค้าสำหรับรหัสหรือบาร์โค้ด: "${raw}"`);
      setTimeout(() => setStockNotice(null), 3500);
    }
  };

  const addToCart = async (variant: ProductVariant) => {
    // 1. Fetch fresh stock quantity from database to avoid stale data
    const fresh = await db.variants.get(variant.id);
    const availableStock = fresh ? fresh.stockQuantity : variant.stockQuantity;

    // 2. Out of Stock check
    if (availableStock <= 0) {
      SoundEffects.playWarning();
      setStockNotice(`สินค้า "${variant.productName}" หมดสต็อกแล้ว (คงเหลือ 0 ชิ้น) ไม่สามารถเพิ่มลงบิลได้`);
      setTimeout(() => setStockNotice(null), 4000);
      return;
    }

    // 3. Exceeds Stock check
    const existing = cart.find(item => item.variantId === variant.id);
    const currentQtyInCart = existing ? existing.qty : 0;

    if (currentQtyInCart + 1 > availableStock) {
      SoundEffects.playWarning();
      setStockNotice(`สินค้า "${variant.productName}" มีในสต็อกเพียง ${availableStock} ชิ้น (ในบิลมีครบ ${currentQtyInCart} ชิ้นแล้ว ไม่สามารถเพิ่มเกินได้)`);
      setTimeout(() => setStockNotice(null), 4000);
      return;
    }

    SoundEffects.playBeep();
    setCart(prev => {
      const idx = prev.findIndex(item => item.variantId === variant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: variant.productName,
          sku: variant.sku,
          barcode: variant.barcode,
          imageUrl: variant.imageUrl,
          attributes: variant.attributes,
          category: variant.category,
          costPrice: variant.costPrice,
          unitPrice: variant.salePrice,
          qty: 1
        }
      ];
    });
  };

  const updateQty = async (variantId: string, delta: number) => {
    if (delta > 0) {
      const fresh = await db.variants.get(variantId);
      const existing = cart.find(item => item.variantId === variantId);
      const availableStock = fresh ? fresh.stockQuantity : 999;
      const currentQty = existing ? existing.qty : 0;

      if (currentQty + delta > availableStock) {
        SoundEffects.playWarning();
        setStockNotice(`สินค้า "${existing?.productName || ''}" ในคลังมีเพียง ${availableStock} ชิ้น ไม่สามารถเพิ่มเกินจำนวนนี้ได้`);
        setTimeout(() => setStockNotice(null), 4000);
        return;
      }
    }

    SoundEffects.playBeep();
    setCart(prev => {
      return prev
        .map(item => {
          if (item.variantId === variantId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variantId !== variantId));
  };

  // Run Promotion Engine Calculation
  const [promotions, setPromotions] = useState<any[]>([]);
  useEffect(() => {
    db.promotions.where({ isActive: true }).toArray().then(setPromotions);
  }, []);

  const promoResult = PromotionEngine.calculate(cart, promotions, !!selectedCustomer);

  // Member Tier Privilege Discount (configurable via Settings / Members page)
  const memberTier = selectedCustomer?.tier || 'SILVER';
  const goldDiscountPct = settings?.goldDiscountPercent ?? 5;
  const blackWisdomDiscountPct = settings?.blackWisdomDiscountPercent ?? 10;

  let memberDiscountPercent = 0;
  if (selectedCustomer) {
    if (memberTier === 'BLACK_WISDOM') memberDiscountPercent = blackWisdomDiscountPct;
    else if (memberTier === 'GOLD') memberDiscountPercent = goldDiscountPct;
  }
  const memberDiscountAmount = memberDiscountPercent > 0
    ? Math.round((promoResult.netTotal * memberDiscountPercent) / 100)
    : 0;

  // Calculate Custom Discount
  let customDiscountAmount = 0;
  if (discountValue > 0) {
    const baseForDiscount = Math.max(0, promoResult.netTotal - memberDiscountAmount);
    if (discountType === 'PERCENT') {
      customDiscountAmount = (baseForDiscount * discountValue) / 100;
    } else {
      customDiscountAmount = Math.min(baseForDiscount, discountValue);
    }
  }

  // Calculate Tax (VAT)
  const afterDiscountTotal = Math.max(0, promoResult.netTotal - memberDiscountAmount - customDiscountAmount);
  const vatRate = settings?.vatRate || 7;
  let vatAmount = 0;
  let preTaxAmount = afterDiscountTotal;
  let finalNetTotal = afterDiscountTotal;

  if (settings?.vatType === 'EXCLUSIVE') {
    vatAmount = (afterDiscountTotal * vatRate) / 100;
    finalNetTotal = afterDiscountTotal + vatAmount;
  } else if (settings?.vatType === 'INCLUSIVE') {
    preTaxAmount = (afterDiscountTotal * 100) / (100 + vatRate);
    vatAmount = afterDiscountTotal - preTaxAmount;
    finalNetTotal = afterDiscountTotal;
  }

  // Broadcast to Customer-Facing Dual Screen
  useEffect(() => {
    // If an order was just completed and cart is being cleared, preserve the Thank You screen
    if (justPaidRef.current && cart.length === 0) return;
    if (cart.length > 0) {
      justPaidRef.current = false;
    }

    DualMonitorSync.broadcast({
      cart,
      subtotal: promoResult.originalSubtotal,
      promoDiscount: promoResult.discountTotal,
      memberDiscount: memberDiscountAmount,
      memberTier: selectedCustomer ? memberTier : undefined,
      customDiscount: customDiscountAmount,
      vatAmount,
      netTotal: finalNetTotal,
      upsellPrompts: promoResult.upsellPrompts,
      lastScannedItem: cart.length > 0 ? cart[cart.length - 1].productName : undefined,
      isCheckoutStep: isPaymentModalOpen,
      theme: settings?.customerScreenTheme,
      welcomeTitle: settings?.welcomeTitle,
      welcomeSubtitle: settings?.welcomeSubtitle,
      welcomeImageUrl: settings?.welcomeImageUrl,
      thankYouMessage: settings?.thankYouMessage
    });
  }, [cart, promoResult.originalSubtotal, promoResult.discountTotal, memberDiscountAmount, memberTier, customDiscountAmount, finalNetTotal, settings, isPaymentModalOpen]);

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newBill = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      customer: selectedCustomer || undefined,
      totalAmount: finalNetTotal
    };
    setHeldBills(prev => [newBill, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    SoundEffects.playHold();
    setHoldBillNotice(`พักบิล ${newBill.id} สำเร็จแล้ว (มีบิลที่พักไว้ ${heldBills.length + 1} บิล)`);
    setTimeout(() => setHoldBillNotice(null), 3500);
  };

  const handleRecallBill = (billId: string) => {
    const target = heldBills.find(b => b.id === billId);
    if (!target) return;
    setCart(target.cart);
    setSelectedCustomer(target.customer || null);
    setHeldBills(prev => prev.filter(b => b.id !== billId));
    setIsHeldBillsModalOpen(false);
    SoundEffects.playBeep();
  };

  const handleDeleteHeldBill = (billId: string) => {
    setHeldBills(prev => prev.filter(b => b.id !== billId));
  };

  // Keyboard Shortcuts (F6: พักบิล, F7: ขายใส่ราคาเอง, F8: เปิดบิลที่พักไว้, F9: ชำระเงิน)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsCustomItemModalOpen(prev => !prev);
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsHeldBillsModalOpen(prev => !prev);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isPaymentModalOpen) {
          openCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isPaymentModalOpen, heldBills, finalNetTotal, selectedCustomer, activeShift]);

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(customItemPrice) || 0;
    if (price <= 0) {
      alert('กรุณากรอกราคาที่ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }
    const name = customItemName.trim() || 'สินค้ากำหนดราคาเอง / ค่าบริการ';
    const qty = Math.max(1, customItemQty);
    const customId = `custom-${Date.now()}`;
    const customSku = `CUSTOM-${Date.now().toString().slice(-4)}`;

    SoundEffects.playBeep();
    setCart(prev => [
      ...prev,
      {
        variantId: customId,
        sku: customSku,
        barcode: customSku,
        productName: name,
        category: customItemCategory,
        costPrice: 0,
        unitPrice: price,
        qty: qty
      }
    ]);

    setIsCustomItemModalOpen(false);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
  };

  const requestVoidBill = () => {
    if (cart.length === 0) return;
    if (AuthService.isOwner()) {
      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue(0);
    } else {
      setPinAction('VOID_BILL');
      setIsPinModalOpen(true);
    }
  };

  const handlePinOverride = async (pin: string) => {
    const isValid = await AuthService.verifyOwnerPin(pin);
    if (isValid) {
      if (pinAction === 'VOID_BILL') {
        setCart([]);
        setSelectedCustomer(null);
        setDiscountValue(0);
      }
      setIsPinModalOpen(false);
      setPinAction(null);
    } else {
      alert('รหัสแอดมินเจ้าของร้านไม่ถูกต้อง!');
    }
  };

  // Register New Member
  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const memberCode = `KCAT-${randomSuffix}`;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      memberCode,
      tier: 'SILVER', // New members start at entry tier
      name: regName.trim(),
      phone: regPhone.trim(),
      contactChannel: regContactChannel.trim() || undefined,
      address: regAddress.trim() || undefined,
      rewardPoints: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    await db.customers.add(newCust);
    setSelectedCustomer(newCust);
    setNewlyRegisteredCustomer(newCust);
    setIsRegisterMemberOpen(false);
    setCustomerSearchQuery('');
    setRegName('');
    setRegPhone('');
    setRegContactChannel('');
    setRegAddress('');
    SoundEffects.playSuccess();
    // Open the luxury Digital Pass modal right away
    setIsDigitalPassOpen(true);
  };

  // Open Checkout Modal
  const openCheckout = () => {
    if (!activeShift) {
      alert('กรุณาเปิดกะก่อนทำการคิดเงิน');
      onOpenShiftRequired();
      return;
    }
    setPaymentMode('CASH');
    setCashTendered(finalNetTotal.toString());
    setSplitCashAmount(Math.round(finalNetTotal / 2));
    setSplitPromptPayAmount(finalNetTotal - Math.round(finalNetTotal / 2));
    setIsPaymentModalOpen(true);
  };

  // Finalize Checkout with ACCURATE Cash vs Transfer tracking
  const handleCompleteOrder = async () => {
    if (!activeShift) {
      alert('กรุณาเปิดกะก่อนทำการคิดเงิน');
      return;
    }
    if (isSubmittingOrder) return; // Prevent double clicks / repeated deductions

    let finalPayments: { method: 'CASH' | 'PROMPTPAY'; amount: number }[] = [];
    let cashRcv = 0;
    let change = 0;

    if (paymentMode === 'CASH') {
      const val = parseFloat(cashTendered) || 0;
      if (val < finalNetTotal) {
        alert('ยอดเงินสดที่รับมาไม่เพียงพอ');
        return;
      }
      cashRcv = val;
      change = val - finalNetTotal;
      finalPayments = [{ method: 'CASH', amount: finalNetTotal }];
    } else if (paymentMode === 'PROMPTPAY') {
      // 100% Transfer payment
      cashRcv = 0;
      change = 0;
      finalPayments = [{ method: 'PROMPTPAY', amount: finalNetTotal }];
    } else {
      // Split payment
      if (splitCashAmount + splitPromptPayAmount < finalNetTotal) {
        alert('ยอดชำระรวมยังไม่ครบตามยอดสุทธิ');
        return;
      }
      cashRcv = splitCashAmount;
      change = 0;
      finalPayments = [
        { method: 'CASH', amount: splitCashAmount },
        { method: 'PROMPTPAY', amount: splitPromptPayAmount }
      ];
    }

    try {
      setIsSubmittingOrder(true);

      const order: Order = {
        id: `ord-${Date.now()}`,
        localOrderId: `KCAT-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        shiftId: activeShift.id,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        items: cart.map(i => ({
          variantId: i.variantId,
          productName: i.productName,
          sku: i.sku,
          imageUrl: i.imageUrl,
          attributes: i.attributes,
          qty: i.qty,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          lineTotal: i.unitPrice * i.qty
        })),
        subtotal: promoResult.originalSubtotal,
        promoDiscount: promoResult.discountTotal,
        
        memberDiscountAmount: memberDiscountAmount > 0 ? memberDiscountAmount : undefined,
        memberTier: selectedCustomer ? memberTier : undefined,

        customDiscountType: discountValue > 0 ? discountType : undefined,
        customDiscountValue: discountValue > 0 ? discountValue : undefined,
        customDiscountAmount: customDiscountAmount > 0 ? customDiscountAmount : undefined,
        customDiscountReason: discountReason || undefined,

        vatType: settings?.vatType,
        vatRate: settings?.vatRate,
        preTaxAmount,
        vatAmount,

        netTotal: finalNetTotal,
        payments: finalPayments,
        cashReceived: cashRcv,
        changeGiven: change,
        status: 'COMPLETED',
        isSynced: false
      };

      // 1. Save to Database
      await db.orders.add(order);

      // Async Sync to Supabase Cloud
      CloudSync.pushOrder(order);

      // 2. Cut Inventory Stock
      for (const item of cart) {
        const v = await db.variants.get(item.variantId);
        if (v) {
          await db.variants.update(item.variantId, {
            stockQuantity: Math.max(0, v.stockQuantity - item.qty)
          });
        }
      }
      // Refresh Quick Items in real-time immediately after cutting stock (Safe in-memory filter)
      const updatedQuick = await db.variants.filter(v => v.isActive !== false).limit(16).toArray();
      setQuickItems(updatedQuick);

      // 3. Update Shift Totals (Separating Cash vs Transfer accurately!)
      const cashPortion = finalPayments.find(p => p.method === 'CASH')?.amount || 0;
      const promptPayPortion = finalPayments.find(p => p.method === 'PROMPTPAY')?.amount || 0;

      await db.shifts.update(activeShift.id, {
        totalCashSales: (activeShift.totalCashSales || 0) + cashPortion,
        totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + promptPayPortion,
        totalTransactions: (activeShift.totalTransactions || 0) + 1
      });
      if (onShiftUpdated) onShiftUpdated();

      // 4. Update Customer Reward Points & Auto Tier Progression
      if (selectedCustomer) {
        const earnedPoints = Math.floor(finalNetTotal / 100);
        const newPoints = (selectedCustomer.rewardPoints || 0) + earnedPoints;
        const newSpent = (selectedCustomer.totalSpent || 0) + finalNetTotal;

        // Auto Tier Progression based on store settings:
        const bwSpent = settings?.blackWisdomSpentThreshold ?? 15000;
        const bwPoints = settings?.blackWisdomPointsThreshold ?? 150;
        const goldSpent = settings?.goldSpentThreshold ?? 5000;
        const goldPoints = settings?.goldPointsThreshold ?? 50;

        let newTier = selectedCustomer.tier || 'SILVER';
        if (newSpent >= bwSpent || newPoints >= bwPoints) {
          newTier = 'BLACK_WISDOM';
        } else if (newSpent >= goldSpent || newPoints >= goldPoints) {
          if (newTier !== 'BLACK_WISDOM') {
            newTier = 'GOLD';
          }
        }

        await db.customers.update(selectedCustomer.id, {
          rewardPoints: newPoints,
          totalSpent: newSpent,
          tier: newTier
        });
      }

      // 5. Broadcast Completed State & Thank You to Customer Screen
      justPaidRef.current = true;
      setTimeout(() => {
        justPaidRef.current = false;
      }, 10000);

      DualMonitorSync.broadcast({
        cart: [],
        subtotal: 0,
        promoDiscount: 0,
        memberDiscount: 0,
        netTotal: 0,
        upsellPrompts: [],
        isPaid: true,
        changeGiven: change,
        cashReceived: cashRcv,
        thankYouMessage: settings?.thankYouMessage,
        theme: settings?.customerScreenTheme
      });

      setCompletedOrder(order);
      setIsPaymentModalOpen(false);
      // Play celebratory payment success chime
      SoundEffects.playSuccess();
      // Always open the Thermal Receipt modal directly by default
      setIsReceiptModalOpen(true);
      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue(0);
      setDiscountReason('');
      loadQuickData();
    } catch (err) {
      console.error('Checkout error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ: ' + (err as Error).message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleOpenRecentOrders = async () => {
    const list = await db.orders.orderBy('timestamp').reverse().limit(15).toArray();
    setRecentOrders(list);
    setIsRecentOrdersModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-61px)] overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Quick Keys (60%) */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-slate-200">
        {/* Omni Search & Barcode input */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3.5 top-3.5 w-5 h-5 text-amber-500" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ยิงบาร์โค้ดสินค้า / หรือยิงบัตรสมาชิก / พิมพ์ชื่อสินค้า หรือ SKU..."
              autoFocus
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-300 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-2xl font-bold flex items-center gap-1.5 shadow transition"
          >
            <Search className="w-4 h-4" />
            <span>ค้นหา</span>
          </button>
          <button
            type="button"
            onClick={handleOpenRecentOrders}
            className="px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl font-bold flex items-center gap-1.5 shadow-xs transition text-xs whitespace-nowrap"
            title="ดูประวัติสลิปใบเสร็จ / บิลล่าสุด เพื่อพิมพ์ซ้ำ หรือออกใบกำกับภาษี"
          >
            <Receipt className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">🧾 สลิปใบเสร็จ / บิลล่าสุด</span>
          </button>

          {/* Custom Price / Non-Catalog Item Button */}
          <button
            type="button"
            onClick={() => setIsCustomItemModalOpen(true)}
            className="px-3.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-2xl font-bold flex items-center gap-1.5 shadow-xs transition text-xs whitespace-nowrap"
            title="ขายสินค้ากำหนดราคาเอง / ค่าจัดส่ง / บริการพิเศษ (กด F7)"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span className="hidden md:inline">➕ ใส่ราคาเอง (F7)</span>
          </button>

          {/* Custom Order & Deposit Modal Button */}
          <button
            type="button"
            onClick={() => setIsCustomOrderModalOpen(true)}
            className="px-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl font-bold flex items-center gap-1.5 shadow-xs transition text-xs whitespace-nowrap"
            title="ออกใบสั่งผลิตงานสั่งทำ / สั่งตัดเย็บ / งานโหล และรับเงินมัดจำ 50%"
          >
            <Scissors className="w-4 h-4 text-amber-200" />
            <span className="hidden md:inline">✂️ สั่งผลิต/มัดจำ</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHeldBillsModalOpen(true)}
            className={`px-3 py-2 rounded-2xl font-bold flex items-center gap-1.5 transition text-xs whitespace-nowrap border ${
              heldBills.length > 0
                ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-sm animate-pulse'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="บิลที่พักไว้ (กด F8 เพื่อเปิดดู)"
          >
            <PauseCircle className="w-4 h-4 text-amber-600" />
            <span>พักบิล ({heldBills.length})</span>
          </button>

          {/* Minimalist Pro Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !showCatalogGrid;
              setShowCatalogGrid(next);
              localStorage.setItem('pos_show_catalog_grid', String(next));
            }}
            className={`px-3 py-2 rounded-2xl font-bold flex items-center gap-1.5 transition text-xs whitespace-nowrap border ${
              !showCatalogGrid
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="สลับโหมด: แสดงตารางรูปภาพสินค้า หรือซ่อนเพื่อเน้นยิงสแกนบาร์โค้ดหน้าจอคลีน (โหมดโปร)"
          >
            {!showCatalogGrid ? (
              <>
                <Eye className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">โหมดสแกนเนอร์โปร (ซ่อนตาราง)</span>
                <span className="sm:hidden">โปร</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">ซ่อนตารางสินค้า</span>
                <span className="sm:hidden">ซ่อน</span>
              </>
            )}
          </button>
        </form>

        {/* Stock Warning Toast Notification */}
        {stockNotice && (
          <div className="mb-2 p-3 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-white animate-spin" />
              <span>{stockNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setStockNotice(null)}
              className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] font-bold transition"
            >
              ✕ ปิด
            </button>
          </div>
        )}

        {/* Hold Bill Toast Notification */}
        {holdBillNotice && (
          <div className="mb-2 p-2.5 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4" />
              <span>{holdBillNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsHeldBillsModalOpen(true)}
              className="px-2 py-0.5 bg-white text-amber-950 rounded-lg text-[11px] font-bold hover:bg-amber-50"
            >
              ดูบิลที่พัก (F8)
            </button>
          </div>
        )}

        {/* Live Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-300 shadow-xl mb-3 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map(item => {
              const isOut = item.stockQuantity <= 0;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    addToCart(item);
                    if (!isOut) setSearchTerm('');
                  }}
                  className={`p-3 flex items-center justify-between cursor-pointer transition gap-3 ${
                    isOut ? 'bg-rose-50/70 hover:bg-rose-100/70 opacity-80' : 'hover:bg-amber-50/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Tag className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                        <span>{item.productName}</span>
                        {isOut && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded">
                            สินค้าหมด
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SKU: {item.sku} | Barcode: {item.barcode}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-amber-700 font-extrabold text-sm">฿{item.salePrice.toLocaleString()}</div>
                    {(isOut || settings?.showStockQuantityOnPos) && (
                      <div className={`text-[10px] font-bold font-mono ${isOut ? 'text-rose-600' : 'text-slate-500'}`}>
                        {isOut ? 'หมดสต็อก (0)' : `คงเหลือ ${item.stockQuantity} ชิ้น`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Keys / Product Catalog Grid or Minimalist Pro Scanner Mode */}
        {!showCatalogGrid ? (
          /* MINIMALIST PRO SCANNER MODE (หน้าจอคลีน สเปเชียลตี้สำหรับแคชเชียร์มือโปร ยิงบาร์โค้ดอย่างเดียว) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/70 rounded-3xl border border-dashed border-slate-300 backdrop-blur-xs select-none animate-in fade-in">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
              <Barcode className="w-12 h-12 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-800 tracking-wider uppercase">
              โหมดสแกนเนอร์ความเร็วสูง (Pro Minimalist Mode)
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
              หน้าจอสะอาดตา เหมาะกับร้านบูทีคหรูหรา ยิงบาร์โค้ดป้ายห้อยสินค้า สแกนบัตรสมาชิก หรือพิมพ์ค้นหาด้านบนได้ทันที
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-mono font-bold text-slate-700">
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                ⚡ F6: พักบิลด่วน
              </span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                ⚡ F8: บิลที่พักไว้
              </span>
              <span className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                ⚡ F9: เปิดชำระเงิน
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCatalogGrid(true);
                localStorage.setItem('pos_show_catalog_grid', 'true');
              }}
              className="mt-6 text-xs text-amber-700 hover:text-amber-800 underline font-semibold flex items-center gap-1.5 transition"
            >
              <Eye className="w-4 h-4" />
              <span>ต้องการดูตารางรูปภาพสินค้าแคตตาล็อก? คลิกเพื่อเปิดตารางสินค้า</span>
            </button>
          </div>
        ) : (
          /* STANDARD CATALOG GRID */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span>
                    {sortMode === 'BEST_SELLER' && totalSoldSum > 0
                      ? `🏆 สินค้าขายดีประจำร้าน (ตามยอดขายจริง ${totalSoldSum} ชิ้น)`
                      : '🛍️ รายการสินค้าพร้อมขายหน้าร้าน (คอลเลกชันเฉลิมวัฒนา)'}
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    {quickItems.length} รายการ
                  </span>
                </h2>
                {sortMode === 'BEST_SELLER' && totalSoldSum === 0 && (
                  <p className="text-[10px] text-amber-700 mt-0.5 italic">
                    *ยังไม่มียอดขายจริงในระบบ ระบบจึงแสดงรายการสินค้าตามแคตตาล็อกเริ่มต้น
                  </p>
                )}
              </div>

              {/* Sort Mode Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSortMode(prev => prev === 'ALL' ? 'BEST_SELLER' : 'ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
                    sortMode === 'BEST_SELLER'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <span>🏆</span>
                  <span>{sortMode === 'BEST_SELLER' ? 'กำลังเรียง: ยอดขายจริง' : 'เรียงตามยอดขายจริง'}</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-amber-400 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ทั้งหมด ({allVariants.length})
              </button>
              {DEFAULT_PRODUCT_CATEGORIES.slice(0, 5).map(cat => {
                const count = allVariants.filter(v => v.category === cat).length;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-amber-400 shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Grid of Product Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1 overflow-y-auto">
              {quickItems.map((item) => {
                const isOut = item.stockQuantity <= 0;
                const isLowStock = !isOut && item.stockQuantity <= item.minStockAlert;
                const soldQty = salesStats[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`bg-white hover:border-amber-500 active:scale-95 border rounded-2xl p-2.5 flex flex-col justify-between text-left shadow-xs transition group h-36 relative overflow-hidden ${
                      isOut ? 'border-rose-300 opacity-60' : 'border-slate-200'
                    }`}
                  >
                    {isOut && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[0.5px] z-10 flex flex-col items-center justify-center text-white p-2 text-center">
                        <span className="px-2 py-1 bg-rose-600 rounded-lg text-[10px] font-black tracking-wider uppercase shadow">
                          สินค้าหมดสต็อก
                        </span>
                        {settings?.showStockQuantityOnPos && (
                          <span className="text-[9px] text-slate-200 mt-1">คลัง: 0 ชิ้น</span>
                        )}
                      </div>
                    )}

                    {/* Best seller sold count badge */}
                    {soldQty > 0 && (
                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full shadow-md flex items-center gap-0.5">
                        <span>🏆</span>
                        <span>ขายแล้ว {soldQty}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 pr-6">
                        <div className="text-[9px] font-mono text-slate-400 truncate">{item.sku}</div>
                        <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight mt-0.5">
                          {item.productName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-amber-700 font-extrabold text-sm">
                        ฿{item.salePrice.toLocaleString()}
                      </span>
                      {(isOut || isLowStock || settings?.showStockQuantityOnPos) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isOut 
                            ? 'bg-rose-100 text-rose-800 font-extrabold' 
                            : isLowStock 
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isOut ? 'หมด (0)' : isLowStock ? `ใกล้หมด: ${item.stockQuantity}` : `คลัง: ${item.stockQuantity}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upsell Prompt Notification Box */}
        {promoResult.upsellPrompts.length > 0 && (
          <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3 flex items-center space-x-2.5 text-amber-900 shadow-sm animate-bounce">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="text-xs font-semibold leading-relaxed">
              {promoResult.upsellPrompts[0]}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Cart, Member Selector, Calculations & Payments (40%) */}
      <div className="w-[440px] bg-white flex flex-col shadow-xl">
        {/* Customer & Member Live Dropdown Selector */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 relative">
          {selectedCustomer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{selectedCustomer.name}</span>
                    <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">MEMBER</span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-mono">
                    แต้มสะสม: {selectedCustomer.rewardPoints} pt | โทร: {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  type="button"
                  onClick={() => {
                    setNewlyRegisteredCustomer(selectedCustomer);
                    setIsDigitalPassOpen(true);
                  }}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  title="ดูบัตร Digital Pass เพื่อส่งขึ้นหน้าจอลูกค้า"
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>บัตรดิจิทัล</span>
                </button>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-slate-400 hover:text-rose-600 font-semibold p-1"
                >
                  เปลี่ยน
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    placeholder="พิมพ์เบอร์โทร หรือ ชื่อสมาชิก..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setIsRegisterMemberOpen(true)}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition flex-shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ สมัคร</span>
                </button>
              </div>

              {/* Customer Search Dropdown Results */}
              {customerSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-10 mt-1 bg-white border border-amber-300 rounded-2xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {customerSearchResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearchQuery('');
                        setCustomerSearchResults([]);
                      }}
                      className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">โทร: {c.phone} {c.contactChannel ? `(${c.contactChannel})` : ''}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          {c.rewardPoints} pt
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Held Bills Tabs */}
        {heldBills.length > 0 && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> ค้างบิล:
            </span>
            {heldBills.map(b => (
              <button
                key={b.id}
                onClick={() => handleRecallBill(b.id)}
                className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-mono flex items-center gap-1"
              >
                <span>{b.id} ({b.time})</span>
                <PlayCircle className="w-3 h-3 text-amber-700" />
              </button>
            ))}
          </div>
        )}

        {/* Cart Item List with Thumbnail */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <Barcode className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
              <p className="text-sm font-medium">ยังไม่มีรายการสินค้าในบิล</p>
              <p className="text-xs text-slate-400">ยิงบาร์โค้ดหรือแตะเลือกจากรายการด้านซ้าย</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.productName}</h4>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ฿{item.unitPrice.toLocaleString()} x {item.qty}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => updateQty(item.variantId, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.variantId, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-16 text-right font-mono font-bold text-xs text-slate-900">
                  ฿{(item.unitPrice * item.qty).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary & Custom Discount Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>ยอดรวม ({cart.reduce((s, i) => s + i.qty, 0)} ชิ้น):</span>
            <span className="font-mono">฿{promoResult.originalSubtotal.toLocaleString()}</span>
          </div>

          {promoResult.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> ส่วนลดโปรโมชั่น:
              </span>
              <span className="font-mono">-฿{promoResult.discountTotal.toLocaleString()}</span>
            </div>
          )}

          {/* Member Tier Privilege Discount line */}
          {memberDiscountAmount > 0 && selectedCustomer && (
            <div className="flex justify-between text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              <span className="flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>ส่วนลดบัตรสมาชิก ({memberTier === 'BLACK_WISDOM' ? 'BLACK WISDOM 10%' : 'GOLD HERITAGE 5%'}):</span>
              </span>
              <span className="font-mono text-xs">-฿{memberDiscountAmount.toLocaleString()}</span>
            </div>
          )}

          {/* Custom Discount line */}
          <div className="flex justify-between items-center text-slate-600">
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="text-amber-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <Percent className="w-3 h-3" />
              <span>{discountValue > 0 ? `ส่วนลดพิเศษ (${discountType === 'PERCENT' ? `${discountValue}%` : `฿${discountValue}`})` : '+ ให้ส่วนลดเพิ่มเติม'}</span>
            </button>
            <span className="font-mono font-bold text-rose-600">
              {customDiscountAmount > 0 ? `-฿${customDiscountAmount.toLocaleString()}` : '-'}
            </span>
          </div>

          {/* VAT breakdown if enabled */}
          {settings?.vatType !== 'NONE' && (
            <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 text-[11px]">
              <span>ภาษีมูลค่าเพิ่ม VAT ({settings?.vatRate}% {settings?.vatType === 'INCLUSIVE' ? 'รวมในราคา' : 'คิดเพิ่ม'}):</span>
              <span className="font-mono">฿{vatAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-800">ยอดชำระสุทธิ:</span>
            <span className="text-2xl font-black text-amber-600 font-mono">
              ฿{finalNetTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-40 transition relative"
            title="พักบิลปัจจุบันเพื่อรับลูกค้ารายอื่นก่อน (คีย์ลัด F6)"
          >
            <PauseCircle className="w-4 h-4 mb-0.5 text-amber-600" />
            <span>พักบิล (F6)</span>
            {heldBills.length > 0 && (
              <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 bg-amber-600 text-white text-[9px] rounded-full font-bold shadow-xs">
                {heldBills.length}
              </span>
            )}
          </button>

          <button
            onClick={requestVoidBill}
            disabled={cart.length === 0}
            className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-40 transition"
          >
            <RotateCcw className="w-4 h-4 mb-0.5" />
            <span>ยกเลิกบิล</span>
          </button>

          <button
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-1 shadow-lg disabled:opacity-40 transition"
          >
            <span>ชำระเงิน</span>
          </button>
        </div>
      </div>

      {/* CUSTOM DISCOUNT MODAL */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-600" />
              <span>กำหนดส่วนลดเพิ่มเติม</span>
            </h3>

            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDiscountType('PERCENT')}
                className={`flex-1 py-2 rounded-lg transition ${discountType === 'PERCENT' ? 'bg-white shadow text-amber-800' : 'text-slate-600'}`}
              >
                ลดเป็นเปอร์เซ็นต์ (%)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('AMOUNT')}
                className={`flex-1 py-2 rounded-lg transition ${discountType === 'AMOUNT' ? 'bg-white shadow text-amber-800' : 'text-slate-600'}`}
              >
                ลดเป็นบาท (฿)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {discountType === 'PERCENT' ? 'จำนวนเปอร์เซ็นต์ (%)' : 'จำนวนเงินบาท (฿)'}
              </label>
              <input
                type="number"
                min={0}
                max={discountType === 'PERCENT' ? 100 : finalNetTotal}
                value={discountValue || ''}
                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="ระบุตัวเลขส่วนลด..."
                className="w-full text-xl font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                autoFocus
              />
            </div>

            {/* Quick Percent Presets */}
            {discountType === 'PERCENT' && (
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDiscountValue(p)}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-xs"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">เหตุผลของส่วนลด</label>
              <input
                type="text"
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                placeholder="เช่น ส่วนลดลูกค้าคนพิเศษ, ผู้บริหารอนุมัติ..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountValue(0);
                  setDiscountReason('');
                  setIsDiscountModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ยกเลิกส่วนลด
              </button>
              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THREE-WAY PAYMENT MODAL (100% Cash / 100% Transfer / Split) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span>ชำระเงิน / ยอดสุทธิ ฿{finalNetTotal.toLocaleString()}</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* 3 DISTINCT PAYMENT BUTTONS */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('CASH');
                    setCashTendered(finalNetTotal.toString());
                  }}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    paymentMode === 'CASH'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400'
                      : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs">เงินสดเต็มจำนวน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('PROMPTPAY');
                    setCashTendered('0');
                  }}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    paymentMode === 'PROMPTPAY'
                      ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold ring-2 ring-sky-400'
                      : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-sky-600" />
                  <span className="text-xs">สแกน QR เต็มจำนวน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('SPLIT');
                    setSplitCashAmount(Math.round(finalNetTotal / 2));
                    setSplitPromptPayAmount(finalNetTotal - Math.round(finalNetTotal / 2));
                  }}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    paymentMode === 'SPLIT'
                      ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-400'
                      : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">แบ่งชำระ (สด + โอน)</span>
                </button>
              </div>

              {/* CASH MODE */}
              {paymentMode === 'CASH' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เงินสดที่ได้รับจากลูกค้า (บาท) *เข้าลิ้นชักเงินสด
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      className="w-full text-2xl font-mono font-bold text-slate-900 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex gap-2">
                    {[100, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(amt.toString())}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold rounded-lg text-slate-700"
                      >
                        ฿{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashTendered(finalNetTotal.toString())}
                      className="flex-1 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold rounded-lg"
                    >
                      พอดี
                    </button>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl flex justify-between items-center border border-amber-200">
                    <span className="text-xs font-bold text-amber-900">เงินทอนที่ต้องคืนลูกค้า:</span>
                    <span className="text-2xl font-black font-mono text-amber-700">
                      ฿{Math.max(0, (parseFloat(cashTendered) || 0) - finalNetTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* 100% PROMPTPAY TRANSFER MODE */}
              {paymentMode === 'PROMPTPAY' && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sky-900 font-bold text-sm">
                    <QrCode className="w-5 h-5 text-sky-600" />
                    <span>ชำระผ่าน PromptPay QR เต็มจำนวน (100%)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    ลูกค้าสแกน QR Code หน้าจอลูกค้าแล้วยอดเงิน <b>฿{finalNetTotal.toLocaleString()}</b> จะบันทึกเป็นยอดเงินโอนเข้าบัญชี (ไม่คำนวณเข้าลิ้นชักเงินสด)
                  </p>
                </div>
              )}

              {/* SPLIT PAYMENT MODE */}
              {paymentMode === 'SPLIT' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ส่วนที่ 1: รับเงินสด (บาท) *เข้าลิ้นชัก
                    </label>
                    <input
                      type="number"
                      value={splitCashAmount}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSplitCashAmount(val);
                        setSplitPromptPayAmount(Math.max(0, finalNetTotal - val));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ส่วนที่ 2: สแกน PromptPay QR (บาท) *เข้าบัญชี
                    </label>
                    <input
                      type="number"
                      value={splitPromptPayAmount}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setSplitPromptPayAmount(val);
                        setSplitCashAmount(Math.max(0, finalNetTotal - val));
                      }}
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl font-mono font-bold text-amber-800 text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isSubmittingOrder}
                className={`w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 ${
                  isSubmittingOrder ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isSubmittingOrder ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-base">กำลังบันทึกการขายและตัดสต็อก...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span className="text-base">บันทึกการขายและพิมพ์สลิปใบเสร็จ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MEMBER MODAL */}
      {isRegisterMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-600" />
              <span>สมัครสมาชิกใหม่ (KORAT CAT BOUTIQUE)</span>
            </h3>

            <form onSubmit={handleRegisterMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="เช่น คุณวิภาวี นครราช"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ (ใช้เป็นรหัสค้นหาหลัก) *</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ช่องทางติดต่อเพิ่มเติม (LINE ID / Facebook / IG / Email)
                </label>
                <input
                  type="text"
                  value={regContactChannel}
                  onChange={e => setRegContactChannel(e.target.value)}
                  placeholder="เช่น LINE: @vip_cat, FB: Wipavee..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ที่อยู่ (ถ้ามี / สำหรับจัดส่งของขวัญ)</label>
                <textarea
                  rows={2}
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMemberOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
                >
                  ยืนยันการสมัคร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT MODAL */}
      {settings && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          order={completedOrder}
          settings={settings}
          onClose={() => setIsReceiptModalOpen(false)}
          onOpenTaxInvoice={() => {
            setIsReceiptModalOpen(false);
            setIsTaxInvoiceModalOpen(true);
          }}
        />
      )}

      {/* FULL TAX INVOICE MODAL */}
      {settings && (
        <TaxInvoiceModal
          isOpen={isTaxInvoiceModalOpen}
          order={completedOrder}
          settings={settings}
          onClose={() => setIsTaxInvoiceModalOpen(false)}
        />
      )}

      {/* RECENT ORDERS MODAL (For Cashier Reprint / Tax Invoice) */}
      {isRecentOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">ประวัติบิลล่าสุด (พิมพ์สลิปซ้ำ / ออกใบกำกับภาษี)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecentOrdersModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ยังไม่มีประวัติการขายในระบบ
                </div>
              ) : (
                recentOrders.map(ord => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{ord.localOrderId}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ord.timestamp).toLocaleTimeString('th-TH')} ({new Date(ord.timestamp).toLocaleDateString('th-TH')})
                        </span>
                        {ord.customerName && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-medium">
                            {ord.customerName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-md truncate">
                        {ord.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                      </div>
                      <div className="text-xs font-mono font-extrabold text-amber-800 mt-0.5">
                        ฿{ord.netTotal.toLocaleString()}
                        <span className="text-[10px] font-sans text-slate-400 font-normal ml-2">
                          (ชำระ: {ord.payments.map(p => p.method).join(' + ')})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedOrder(ord);
                          setIsRecentOrdersModalOpen(false);
                          setIsReceiptModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>สลิป</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedOrder(ord);
                          setIsRecentOrdersModalOpen(false);
                          setIsTaxInvoiceModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>ใบกำกับภาษี (A4)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* HELD BILLS MODAL (บิลที่พักไว้) */}
      {isHeldBillsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">รายการบิลที่พักไว้ (Held Bills)</h3>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {heldBills.length} บิล
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldBillsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {heldBills.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    <PauseCircle className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-600">ไม่มีบิลที่พักไว้ในขณะนี้</p>
                  <p className="text-[11px] text-slate-400">
                    ขณะคิดเงินหน้าร้าน สามารถกดปุ่ม "พักบิล" หรือกดคีย์ลัด <b>F6</b> เพื่อพักบิลให้ลูกค้ารายอื่นก่อนได้
                  </p>
                </div>
              ) : (
                heldBills.map(b => {
                  const billSubtotal = b.cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
                  const itemCount = b.cart.reduce((s, i) => s + i.qty, 0);
                  return (
                    <div key={b.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                            {b.id}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            เวลาพัก: {b.time} น. ({itemCount} ชิ้น)
                          </span>
                          {b.customer && (
                            <span className="text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-500" /> {b.customer.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-md truncate">
                          {b.cart.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                        </div>
                        <div className="text-xs font-mono font-extrabold text-amber-800 mt-0.5">
                          ฿{billSubtotal.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldBill(b.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="ลบบิลนี้ทิ้ง"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRecallBill(b.id)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>เรียกคืนบิล (คิดเงินต่อ)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right no-print">
              <button
                type="button"
                onClick={() => setIsHeldBillsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Wisdom Pass Modal */}
      {isDigitalPassOpen && newlyRegisteredCustomer && (
        <DigitalPassModal
          isOpen={isDigitalPassOpen}
          customer={newlyRegisteredCustomer}
          settings={settings}
          onClose={() => {
            setIsDigitalPassOpen(false);
          }}
        />
      )}

      {/* Owner PIN Modal for Void Bill */}
      <PinModal
        isOpen={isPinModalOpen}
        title="ต้องใช้สิทธิ์เจ้าของร้าน (Owner PIN)"
        subtitle="พนักงานไม่สามารถยกเลิกบิลได้ กรุณาให้เจ้าของร้านใส่ PIN ยืนยัน"
        onSuccess={handlePinOverride}
        onClose={() => { setIsPinModalOpen(false); setPinAction(null); }}
      />

      {/* Custom Made Order & 50% Deposit Modal */}
      <CustomOrderModal
        isOpen={isCustomOrderModalOpen}
        onClose={() => setIsCustomOrderModalOpen(false)}
        staffName={currentUser.name}
      />

      {/* Custom Price / Non-Catalog Item Modal */}
      {isCustomItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">ขายสินค้าใส่ราคาเอง (Manual Price)</h3>
                  <p className="text-xs text-slate-500">สำหรับสินค้าไม่มีในระบบ, ค่าจัดส่ง หรือบริการสั่งพิเศษ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อสินค้า / รายการ *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  placeholder="เช่น ค่าจัดส่งด่วน, งานซ่อม, เสื้อสั่งทำพิเศษ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ราคาต่อหน่วย (บาท) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={customItemPrice}
                    onChange={e => setCustomItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวน (ชิ้น/ครั้ง) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customItemQty}
                    onChange={e => setCustomItemQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมวดหมู่
                </label>
                <select
                  value={customItemCategory}
                  onChange={e => setCustomItemCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                >
                  <option value="บริการ/สั่งพิเศษ">บริการ / สั่งพิเศษ</option>
                  <option value="ค่าจัดส่งพัสดุ">ค่าจัดส่งพัสดุ</option>
                  <option value="ของที่ระลึกพิเศษ">ของที่ระลึกพิเศษ</option>
                  <option value="สินค้าทั่วไป">สินค้าทั่วไป</option>
                </select>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 font-semibold flex justify-between">
                <span>ยอดรวมรายการนี้:</span>
                <span className="font-bold font-mono text-sm">
                  ฿{(((parseFloat(customItemPrice) || 0) * customItemQty)).toLocaleString()}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomItemModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  ยกเลิก (Esc)
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                >
                  + เพิ่มลงบิล (Enter)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
