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
  ChevronDown
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
import { PromotionEngine } from '../services/promotionEngine';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { AuthService } from '../services/auth';
import { PinModal } from '../components/PinModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';

interface PosPageProps {
  currentUser: UserAccount;
  activeShift: Shift | null;
  onOpenShiftRequired: () => void;
}

export const PosPage: React.FC<PosPageProps> = ({
  currentUser,
  activeShift,
  onOpenShiftRequired
}) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);
  const [quickItems, setQuickItems] = useState<ProductVariant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<{ id: string; time: string; cart: CartItem[]; customer?: Customer }[]>([]);
  
  // Member & Customer Live Search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regContactChannel, setRegContactChannel] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Custom Discount Modal State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'PROMPTPAY' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitPromptPayAmount, setSplitPromptPayAmount] = useState<number>(0);
  
  // Receipt & Tax Invoice Modals
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTaxInvoiceModalOpen, setIsTaxInvoiceModalOpen] = useState(false);

  // Security Override
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'VOID_BILL' | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.settings.get('current_store_settings').then(s => {
      if (s) setSettings(s);
    });

    const loadQuick = async () => {
      const items = await db.variants.where({ isActive: true }).limit(16).toArray();
      setQuickItems(items);
    };
    loadQuick();
  }, []);

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

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const matched = await db.variants.where({ barcode: searchTerm.trim() }).first();
    if (matched) {
      addToCart(matched);
      setSearchTerm('');
    } else if (searchResults.length === 1) {
      addToCart(searchResults[0]);
      setSearchTerm('');
    }
  };

  const addToCart = (variant: ProductVariant) => {
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

  const updateQty = (variantId: string, delta: number) => {
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

  // Calculate Custom Discount
  let customDiscountAmount = 0;
  if (discountValue > 0) {
    const baseForDiscount = Math.max(0, promoResult.originalSubtotal - promoResult.discountTotal);
    if (discountType === 'PERCENT') {
      customDiscountAmount = (baseForDiscount * discountValue) / 100;
    } else {
      customDiscountAmount = Math.min(baseForDiscount, discountValue);
    }
  }

  // Calculate Tax (VAT)
  const afterDiscountTotal = Math.max(0, promoResult.netTotal - customDiscountAmount);
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
    DualMonitorSync.broadcast({
      cart,
      subtotal: promoResult.originalSubtotal,
      promoDiscount: promoResult.discountTotal,
      customDiscount: customDiscountAmount,
      vatAmount,
      netTotal: finalNetTotal,
      upsellPrompts: promoResult.upsellPrompts,
      lastScannedItem: cart.length > 0 ? cart[cart.length - 1].productName : undefined,
      theme: settings?.customerScreenTheme,
      welcomeTitle: settings?.welcomeTitle,
      welcomeSubtitle: settings?.welcomeSubtitle,
      welcomeImageUrl: settings?.welcomeImageUrl,
      thankYouMessage: settings?.thankYouMessage
    });
  }, [cart, promoResult.originalSubtotal, promoResult.discountTotal, customDiscountAmount, finalNetTotal, settings]);

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newBill = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      customer: selectedCustomer || undefined
    };
    setHeldBills(prev => [newBill, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleRecallBill = (billId: string) => {
    const target = heldBills.find(b => b.id === billId);
    if (!target) return;
    setCart(target.cart);
    setSelectedCustomer(target.customer || null);
    setHeldBills(prev => prev.filter(b => b.id !== billId));
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

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
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
    setIsRegisterMemberOpen(false);
    setCustomerSearchQuery('');
    setRegName('');
    setRegPhone('');
    setRegContactChannel('');
    setRegAddress('');
    alert(`สมัครสมาชิกคุณ ${newCust.name} สำเร็จเรียบร้อย!`);
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
    if (!activeShift) return;

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

    // 2. Cut Inventory Stock
    for (const item of cart) {
      const v = await db.variants.get(item.variantId);
      if (v) {
        await db.variants.update(item.variantId, {
          stockQuantity: Math.max(0, v.stockQuantity - item.qty)
        });
      }
    }

    // 3. Update Shift Totals (Separating Cash vs Transfer accurately!)
    const cashPortion = finalPayments.find(p => p.method === 'CASH')?.amount || 0;
    const promptPayPortion = finalPayments.find(p => p.method === 'PROMPTPAY')?.amount || 0;

    await db.shifts.update(activeShift.id, {
      totalCashSales: (activeShift.totalCashSales || 0) + cashPortion,
      totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + promptPayPortion,
      totalTransactions: (activeShift.totalTransactions || 0) + 1
    });

    // 4. Update Customer Reward Points
    if (selectedCustomer) {
      const earnedPoints = Math.floor(finalNetTotal / 100);
      await db.customers.update(selectedCustomer.id, {
        rewardPoints: selectedCustomer.rewardPoints + earnedPoints,
        totalSpent: selectedCustomer.totalSpent + finalNetTotal
      });
    }

    // 5. Broadcast Completed State & Thank You to Customer Screen
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
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
    setIsReceiptModalOpen(true);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue(0);
    setDiscountReason('');
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
              placeholder="ยิงบาร์โค้ด หรือพิมพ์ชื่อสินค้า / SKU / ลายพิมพ์ แล้วกด Enter..."
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
        </form>

        {/* Live Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-300 shadow-xl mb-3 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map(item => (
              <div
                key={item.id}
                onClick={() => { addToCart(item); setSearchTerm(''); }}
                className="p-3 hover:bg-amber-50/60 flex items-center justify-between cursor-pointer transition gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg">👕</div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{item.productName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SKU: {item.sku} | Barcode: {item.barcode}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-amber-700 font-extrabold text-sm">฿{item.salePrice.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">คงเหลือ {item.stockQuantity}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Keys */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>⚡ สินค้าขายดี & คอลเลกชันเฉลิมวัฒนา</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                มีรูปภาพเช็คตัวจริง
              </span>
            </h2>
            <span className="text-xs text-slate-400">{quickItems.length} รายการ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {quickItems.map((item) => {
              const isLowStock = item.stockQuantity <= item.minStockAlert;
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white hover:border-amber-500 active:scale-95 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between text-left shadow-xs transition group h-36 relative overflow-hidden"
                >
                  <div className="flex gap-2">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                        ✨
                      </div>
                    )}
                    <div className="min-w-0">
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isLowStock ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      คลัง: {item.stockQuantity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

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
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-slate-400 hover:text-rose-600 font-semibold"
              >
                เปลี่ยน
              </button>
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
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs flex-shrink-0">👕</div>
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
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-40 transition"
          >
            <PauseCircle className="w-4 h-4 mb-0.5" />
            <span>พักบิล</span>
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
                  <span className="text-xs">💵 เงินสด 100%</span>
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
                  <span className="text-xs">📱 โอน/QR 100%</span>
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
                  <span className="text-xs">⚡ สด + โอน</span>
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
                onClick={handleCompleteOrder}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>บันทึกการขายและพิมพ์สลิป</span>
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

      {/* Owner PIN Modal for Void Bill */}
      <PinModal
        isOpen={isPinModalOpen}
        title="🔒 ต้องใช้สิทธิ์เจ้าของร้าน"
        subtitle="พนักงานไม่สามารถยกเลิกบิลได้ กรุณาให้เจ้าของร้านใส่ PIN ยืนยัน"
        onSuccess={handlePinOverride}
        onClose={() => { setIsPinModalOpen(false); setPinAction(null); }}
      />
    </div>
  );
};
