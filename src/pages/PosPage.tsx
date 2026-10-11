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
  CheckCircle2, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { db } from '../db';
import type { 
  ProductVariant, 
  CartItem, 
  UserAccount, 
  Shift, 
  Order, 
  Customer 
} from '../types';
import { PromotionEngine } from '../services/promotionEngine';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { AuthService } from '../services/auth';
import { PinModal } from '../components/PinModal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariant[]>([]);
  const [quickItems, setQuickItems] = useState<ProductVariant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<{ id: string; time: string; cart: CartItem[]; customer?: Customer }[]>([]);
  
  // Member & Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [promptPayAmount, setPromptPayAmount] = useState<number>(0);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);

  // Security Override
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'VOID_BILL' | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load quick-access items
  useEffect(() => {
    const loadQuick = async () => {
      const items = await db.variants.where({ isActive: true }).limit(12).toArray();
      setQuickItems(items);
    };
    loadQuick();
  }, []);

  // Search filter
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

  // Handle Barcode Scanned directly or Enter pressed
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

  const promoResult = PromotionEngine.calculate(cart, promotions);

  // Broadcast to Customer-Facing Dual Screen
  useEffect(() => {
    DualMonitorSync.broadcast({
      cart,
      subtotal: promoResult.originalSubtotal,
      promoDiscount: promoResult.discountTotal,
      netTotal: promoResult.netTotal,
      upsellPrompts: promoResult.upsellPrompts,
      lastScannedItem: cart.length > 0 ? cart[cart.length - 1].productName : undefined
    });
  }, [cart, promoResult.originalSubtotal, promoResult.discountTotal, promoResult.netTotal]);

  // Hold Bill (พักบิล)
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

  // Recall Bill (เรียกบิลกลับมาคิดเงิน)
  const handleRecallBill = (billId: string) => {
    const target = heldBills.find(b => b.id === billId);
    if (!target) return;
    setCart(target.cart);
    setSelectedCustomer(target.customer || null);
    setHeldBills(prev => prev.filter(b => b.id !== billId));
  };

  // Void Bill (ถ้าเป็นแคชเชียร์ ต้องขอ PIN แอดมิน)
  const requestVoidBill = () => {
    if (cart.length === 0) return;
    if (AuthService.isOwner()) {
      setCart([]);
      setSelectedCustomer(null);
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
      }
      setIsPinModalOpen(false);
      setPinAction(null);
    } else {
      alert('รหัสแอดมินไม่ถูกต้อง!');
    }
  };

  // Lookup Customer
  const handleLookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    const cust = await db.customers.where({ phone: customerPhone.trim() }).first();
    if (cust) {
      setSelectedCustomer(cust);
    } else {
      // ถามสร้างลูกค้าใหม่
      const name = prompt('ไม่พบข้อมูลสมาชิก ต้องการเพิ่มใหม่หรือไม่? กรุณาใส่ชื่อลูกค้า:');
      if (name) {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          phone: customerPhone.trim(),
          name,
          rewardPoints: 0,
          totalSpent: 0
        };
        await db.customers.add(newCust);
        setSelectedCustomer(newCust);
      }
    }
  };

  // Finalize Checkout & Cut Stock
  const handleCompleteOrder = async () => {
    if (!activeShift) {
      alert('กรุณาเปิดกะก่อนทำการคิดเงิน');
      onOpenShiftRequired();
      return;
    }

    const net = promoResult.netTotal;
    const cashVal = parseFloat(cashTendered) || 0;
    const promptPayVal = promptPayAmount;

    let change = 0;
    if (!isSplitPayment) {
      if (cashVal < net) {
        alert('ยอดเงินสดที่รับมาไม่เพียงพอ');
        return;
      }
      change = cashVal - net;
    }

    // Build Order Record
    const order: Order = {
      id: `ord-${Date.now()}`,
      localOrderId: `ORD-${Date.now().toString().slice(-6)}`,
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
        attributes: i.attributes,
        qty: i.qty,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice,
        lineTotal: i.unitPrice * i.qty
      })),
      subtotal: promoResult.originalSubtotal,
      promoDiscount: promoResult.discountTotal,
      netTotal: net,
      payments: isSplitPayment
        ? [
            { method: 'CASH', amount: cashVal },
            { method: 'PROMPTPAY', amount: promptPayVal }
          ]
        : [{ method: 'CASH', amount: net }],
      cashReceived: isSplitPayment ? cashVal : cashVal,
      changeGiven: change,
      status: 'COMPLETED',
      isSynced: false
    };

    // Save to DB and cut stock
    await db.orders.add(order);
    for (const item of cart) {
      const v = await db.variants.get(item.variantId);
      if (v) {
        await db.variants.update(item.variantId, {
          stockQuantity: Math.max(0, v.stockQuantity - item.qty)
        });
      }
    }

    // Update shift totals
    const cashPortion = isSplitPayment ? cashVal : net;
    const promptPayPortion = isSplitPayment ? promptPayVal : 0;
    await db.shifts.update(activeShift.id, {
      totalCashSales: (activeShift.totalCashSales || 0) + cashPortion,
      totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + promptPayPortion,
      totalTransactions: (activeShift.totalTransactions || 0) + 1
    });

    // Update customer points (100 บาท = 1 แต้ม)
    if (selectedCustomer) {
      const earnedPoints = Math.floor(net / 100);
      await db.customers.update(selectedCustomer.id, {
        rewardPoints: selectedCustomer.rewardPoints + earnedPoints,
        totalSpent: selectedCustomer.totalSpent + net
      });
    }

    // Broadcast paid status to dual screen
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      isPaid: true,
      changeGiven: change
    });

    setLastCompletedOrder(order);
    setIsPaymentModalOpen(false);
    setCart([]);
    setSelectedCustomer(null);
    setCashTendered('');
    setPromptPayAmount(0);
  };

  return (
    <div className="flex h-[calc(100vh-61px)] overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Quick Keys (60%) */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-slate-200">
        {/* Omni Search & Barcode input */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ยิงบาร์โค้ด หรือพิมพ์ชื่อสินค้า / SKU แล้วกด Enter..."
              autoFocus
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-1.5 shadow transition"
          >
            <Search className="w-4 h-4" />
            <span>ค้นหา</span>
          </button>
        </form>

        {/* Live Search Results Dropdown/List */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl border border-emerald-300 shadow-xl mb-3 max-h-48 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map(item => (
              <div
                key={item.id}
                onClick={() => { addToCart(item); setSearchTerm(''); }}
                className="p-2.5 hover:bg-emerald-50 flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{item.productName}</div>
                  <div className="text-xs text-slate-500 font-mono">SKU: {item.sku} | Barcode: {item.barcode}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-sm">฿{item.salePrice.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">คงเหลือ {item.stockQuantity}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Keys (หมวดหมู่ & สินค้าขายดี) */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ⚡ Quick Keys (สินค้าขายดี & ไม่มีบาร์โค้ด)
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
                  className="bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 hover:border-emerald-400 rounded-xl p-3 flex flex-col justify-between text-left shadow-sm transition h-28 relative group"
                >
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">{item.sku}</div>
                    <div className="font-semibold text-slate-800 text-xs line-clamp-2 leading-tight mt-0.5">
                      {item.productName}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2 pt-1 border-t border-slate-100">
                    <span className="text-emerald-700 font-bold text-sm">
                      ฿{item.salePrice.toLocaleString()}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isLowStock ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'
                    }`}>
                      สต็อก: {item.stockQuantity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upsell Prompt Notification Box */}
        {promoResult.upsellPrompts.length > 0 && (
          <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3 flex items-center space-x-2.5 text-amber-900 shadow-sm animate-bounce">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="text-xs font-semibold leading-relaxed">
              {promoResult.upsellPrompts[0]}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Cart, Calculations, Hold Bills & Payment (40%) */}
      <div className="w-[440px] bg-white flex flex-col shadow-xl">
        {/* Customer & Member Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          {selectedCustomer ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{selectedCustomer.name}</div>
                  <div className="text-[11px] text-emerald-600 font-mono">แต้มสะสม: {selectedCustomer.rewardPoints} pt</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-slate-400 hover:text-rose-600"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="เบอร์โทรสมาชิก..."
                className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                onClick={handleLookupCustomer}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                ค้นหา
              </button>
            </div>
          )}
        </div>

        {/* Held Bills Tabs (พักบิล) */}
        {heldBills.length > 0 && (
          <div className="px-3 py-2 bg-amber-50/70 border-b border-amber-200 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> ค้างบิล:
            </span>
            {heldBills.map(b => (
              <button
                key={b.id}
                onClick={() => handleRecallBill(b.id)}
                className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-md font-mono flex items-center gap-1 shadow-xs"
              >
                <span>{b.id} ({b.time})</span>
                <PlayCircle className="w-3 h-3 text-amber-700" />
              </button>
            ))}
          </div>
        )}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <Barcode className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
              <p className="text-sm font-medium">ยังไม่มีรายการสินค้า</p>
              <p className="text-xs text-slate-400">ยิงบาร์โค้ดหรือกดเลือกจากรายการด้านซ้าย</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 truncate">{item.productName}</h4>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ฿{item.unitPrice.toLocaleString()} x {item.qty}
                  </div>
                </div>

                {/* Qty controller */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => updateQty(item.variantId, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.variantId, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
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

                <div className="w-16 text-right font-mono font-bold text-xs text-slate-800">
                  ฿{(item.unitPrice * item.qty).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span>ยอดรวม ({cart.reduce((s, i) => s + i.qty, 0)} ชิ้น):</span>
            <span className="font-mono">฿{promoResult.originalSubtotal.toLocaleString()}</span>
          </div>

          {promoResult.discountTotal > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> ส่วนลดโปรโมชั่น:
              </span>
              <span className="font-mono">-฿{promoResult.discountTotal.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-800">ยอดชำระสุทธิ:</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">
              ฿{promoResult.netTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom Actions: Hold, Void, Pay */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-3 gap-2">
          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0}
            className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-40 transition"
          >
            <PauseCircle className="w-4 h-4 mb-0.5" />
            <span>พักบิล</span>
          </button>

          <button
            onClick={requestVoidBill}
            disabled={cart.length === 0}
            className="py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-40 transition"
          >
            <RotateCcw className="w-4 h-4 mb-0.5" />
            <span>ยกเลิกบิล</span>
          </button>

          <button
            onClick={() => {
              if (!activeShift) {
                alert('กรุณาเปิดกะก่อนทำการคิดเงิน');
                onOpenShiftRequired();
                return;
              }
              setCashTendered(promoResult.netTotal.toString());
              setIsPaymentModalOpen(true);
            }}
            disabled={cart.length === 0}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-1 shadow-lg disabled:opacity-40 transition"
          >
            <span>ชำระเงิน</span>
          </button>
        </div>
      </div>

      {/* Payment Modal (Multi-payment & Split payment) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>ชำระเงิน / ยอดสุทธิ ฿{promoResult.netTotal.toLocaleString()}</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Payment Mode Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${!isSplitPayment ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                  💵 ชำระเต็มจำนวน (เงินสด)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitPayment(true);
                    setPromptPayAmount(Math.floor(promoResult.netTotal / 2));
                    setCashTendered((promoResult.netTotal - Math.floor(promoResult.netTotal / 2)).toString());
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${isSplitPayment ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                  ⚡ Split Payment (สด + โอน)
                </button>
              </div>

              {!isSplitPayment ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    เงินสดที่ได้รับจากลูกค้า (บาท)
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full text-2xl font-mono font-bold text-slate-800 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />

                  {/* Quick Cash Buttons */}
                  <div className="flex gap-2 mt-2">
                    {[100, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCashTendered(amt.toString())}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold rounded-lg text-slate-700"
                      >
                        ฿{amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setCashTendered(promoResult.netTotal.toString())}
                      className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg"
                    >
                      พอดี
                    </button>
                  </div>

                  {/* Change Calculator */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">เงินทอนที่ต้องคืน:</span>
                    <span className="text-xl font-bold font-mono text-emerald-600">
                      ฿{Math.max(0, (parseFloat(cashTendered) || 0) - promoResult.netTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ส่วนที่ 1: เงินสด (บาท)
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setCashTendered(e.target.value);
                        setPromptPayAmount(Math.max(0, promoResult.netTotal - val));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ส่วนที่ 2: สแกน PromptPay QR (บาท)
                    </label>
                    <input
                      type="number"
                      value={promptPayAmount}
                      readOnly
                      className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                    />
                  </div>

                  {/* Simulated PromptPay QR */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center space-x-3">
                    <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-slate-800" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">PromptPay QR Code</div>
                      <div className="text-slate-500">ยอดชำระโอน: ฿{promptPayAmount.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-600 mt-1">✓ สแกนผ่านโมบายแบงก์กิ้งได้ทุกธนาคาร</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCompleteOrder}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>บันทึกการขายและพิมพ์ใบเสร็จ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner PIN Modal for Void Bill override */}
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
