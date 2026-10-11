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
  Printer,
  Image as ImageIcon
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
import { PromptPayService } from '../services/promptPay';

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
  
  // Member & Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [promptPayAmount, setPromptPayAmount] = useState<number>(0);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  
  // Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
      alert('รหัสแอดมินเจ้าของร้านไม่ถูกต้อง!');
    }
  };

  const handleLookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    const cust = await db.customers.where({ phone: customerPhone.trim() }).first();
    if (cust) {
      setSelectedCustomer(cust);
    } else {
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

  // Finalize Checkout, Cut Inventory Stock, and Open Receipt Modal
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

    // 3. Update Shift Totals
    const cashPortion = isSplitPayment ? cashVal : net;
    const promptPayPortion = isSplitPayment ? promptPayVal : 0;
    await db.shifts.update(activeShift.id, {
      totalCashSales: (activeShift.totalCashSales || 0) + cashPortion,
      totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + promptPayPortion,
      totalTransactions: (activeShift.totalTransactions || 0) + 1
    });

    // 4. Update Customer Reward Points
    if (selectedCustomer) {
      const earnedPoints = Math.floor(net / 100);
      await db.customers.update(selectedCustomer.id, {
        rewardPoints: selectedCustomer.rewardPoints + earnedPoints,
        totalSpent: selectedCustomer.totalSpent + net
      });
    }

    // 5. Broadcast to Customer Screen
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      isPaid: true,
      changeGiven: change
    });

    setCompletedOrder(order);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true); // Open Thermal Receipt dialog
    setCart([]);
    setSelectedCustomer(null);
    setCashTendered('');
    setPromptPayAmount(0);
  };

  return (
    <div className="flex h-[calc(100vh-61px)] overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Quick Keys with Images (60%) */}
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

        {/* Quick Keys (สินค้าขายดีพร้อมรูปภาพเพื่อความแม่นยำ) */}
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
                    {/* Thumbnail Image */}
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

      {/* RIGHT: Cart, Calculations, Hold Bills & Payment (40%) */}
      <div className="w-[440px] bg-white flex flex-col shadow-xl">
        {/* Customer & Member Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          {selectedCustomer ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{selectedCustomer.name}</div>
                  <div className="text-[11px] text-amber-700 font-mono">แต้มสะสม: {selectedCustomer.rewardPoints} pt</div>
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
                placeholder="ค้นหาเบอร์โทรสมาชิกสะสมแต้ม..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                onClick={handleLookupCustomer}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold"
              >
                ค้นหา
              </button>
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

                {/* Qty controller */}
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

        {/* Calculation Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span>ยอดรวม ({cart.reduce((s, i) => s + i.qty, 0)} ชิ้น):</span>
            <span className="font-mono">฿{promoResult.originalSubtotal.toLocaleString()}</span>
          </div>

          {promoResult.discountTotal > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-bold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> ส่วนลดโปรโมชั่น:
              </span>
              <span className="font-mono">-฿{promoResult.discountTotal.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-800">ยอดชำระสุทธิ:</span>
            <span className="text-2xl font-black text-amber-600 font-mono">
              ฿{promoResult.netTotal.toLocaleString()}
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
            className="py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-1 shadow-lg disabled:opacity-40 transition"
          >
            <span>ชำระเงิน</span>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span>ชำระเงิน / ยอดสุทธิ ฿{promoResult.netTotal.toLocaleString()}</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${!isSplitPayment ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
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
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${isSplitPayment ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                >
                  ⚡ Split Payment (สด + โอน)
                </button>
              </div>

              {!isSplitPayment ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เงินสดที่ได้รับจากลูกค้า (บาท)
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full text-2xl font-mono font-bold text-slate-900 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
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
                      className="flex-1 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold rounded-lg"
                    >
                      พอดี
                    </button>
                  </div>

                  {/* Change Calculator */}
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl flex justify-between items-center border border-amber-200">
                    <span className="text-xs font-bold text-amber-900">เงินทอนที่ต้องคืนลูกค้า:</span>
                    <span className="text-2xl font-black font-mono text-amber-700">
                      ฿{Math.max(0, (parseFloat(cashTendered) || 0) - promoResult.netTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ส่วนที่ 2: สแกน PromptPay QR (บาท)
                    </label>
                    <input
                      type="number"
                      value={promptPayAmount}
                      readOnly
                      className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl font-mono font-bold text-amber-800 text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleCompleteOrder}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>บันทึกการขายและพิมพ์ใบเสร็จสลิป</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {settings && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          order={completedOrder}
          settings={settings}
          onClose={() => setIsReceiptModalOpen(false)}
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
