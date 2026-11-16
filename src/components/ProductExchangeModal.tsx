// src/components/ProductExchangeModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Printer, 
  Tag, 
  Receipt,
  User,
  ShieldAlert,
  ShoppingBag
} from 'lucide-react';
import { db } from '../db';
import type { Order, ProductVariant, ProductExchangeRecord, UserAccount, Shift, StoreSettings } from '../types';
import { CloudSync } from '../services/cloudSync';
import { SoundEffects } from '../services/soundEffects';

interface ProductExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  activeShift: Shift | null;
  settings: StoreSettings | null;
  onExchangeSuccess?: () => void;
}

export const ProductExchangeModal: React.FC<ProductExchangeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeShift,
  settings,
  onExchangeSuccess
}) => {
  // Step 1: Order Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Step 2: Return Item Selection & Reason
  const [selectedReturnItem, setSelectedReturnItem] = useState<Order['items'][0] | null>(null);
  const [returnReason, setReturnReason] = useState<string>('ใส่ไม่ได้ / ผิดไซส์ (เปลี่ยนไซส์)');
  const [customReason, setCustomReason] = useState<string>('');

  // Step 3: New Exchange Item Selection
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [newSearchQuery, setNewSearchQuery] = useState('');
  const [selectedNewItem, setSelectedNewItem] = useState<ProductVariant | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'PROMPTPAY'>('CASH');

  // Step 4: Submission & Slip State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<ProductExchangeRecord | null>(null);

  // Load recent orders (within 7 days) and catalog variants on mount
  useEffect(() => {
    if (!isOpen) return;

    // Reset Form
    setSelectedOrder(null);
    setSelectedReturnItem(null);
    setSelectedNewItem(null);
    setCompletedRecord(null);
    setSearchQuery('');
    setNewSearchQuery('');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    db.orders
      .where('status')
      .equals('COMPLETED')
      .reverse()
      .limit(20)
      .toArray()
      .then(orders => {
        setRecentOrders(orders);
      });

    db.variants
      .filter(v => v.isActive !== false)
      .toArray()
      .then(setAllVariants);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered orders matching query
  const filteredOrders = recentOrders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      o.localOrderId.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.customerId && o.customerId.includes(q)) ||
      o.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  });

  // Filtered variants for new replacement item
  const filteredNewVariants = allVariants.filter(v => {
    if (!newSearchQuery.trim()) return (v.stockQuantity || 0) > 0;
    const q = newSearchQuery.trim().toLowerCase();
    return (
      v.productName.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      v.barcode.includes(q)
    );
  });

  // Price calculations
  const returnPrice = selectedReturnItem ? selectedReturnItem.unitPrice : 0;
  const newPrice = selectedNewItem ? selectedNewItem.salePrice : 0;
  const priceDifference = newPrice - returnPrice; // >0: customer pays, <0: refund, 0: even

  // Handle Complete Exchange
  const handleConfirmExchange = async () => {
    if (!selectedReturnItem) {
      alert('กรุณาเลือกสินค้าที่ลูกค้านำมาคืน');
      return;
    }
    if (!selectedNewItem) {
      alert('กรุณาเลือกสินค้าชิ้นใหม่ที่ต้องการเปลี่ยนให้ลูกค้า');
      return;
    }
    if ((selectedNewItem.stockQuantity || 0) <= 0) {
      alert('สินค้าชิ้นใหม่ที่เลือกหมดสต็อก ไม่สามารถเปลี่ยนได้');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const staffName = currentUser ? currentUser.name : 'แคชเชียร์หน้าร้าน';

      // 1. เพิ่มสต็อกสินค้าที่ลูกค้านำมาคืน (+1 ชิ้น)
      let retVar = await db.variants.get(selectedReturnItem.variantId);
      if (!retVar && selectedReturnItem.sku) {
        retVar = await db.variants.where({ sku: selectedReturnItem.sku }).first();
      }
      if (retVar) {
        const curShop = retVar.shopStock !== undefined ? retVar.shopStock : retVar.stockQuantity;
        const updatedRet: ProductVariant = {
          ...retVar,
          shopStock: curShop + 1,
          stockQuantity: (retVar.stockQuantity || 0) + 1,
          lastModifiedBy: `รับคืนสินค้า (${staffName})`,
          updatedAt: nowIso
        };
        await db.variants.put(updatedRet);
        CloudSync.pushVariant(updatedRet).catch(() => {});
      }

      // 2. ตัดสต็อกสินค้าชิ้นใหม่ที่ลูกค้าเปลี่ยนไป (-1 ชิ้น)
      let newVar = await db.variants.get(selectedNewItem.id);
      if (newVar) {
        const curTotal = newVar.stockQuantity || 0;
        const curShop = newVar.shopStock !== undefined ? newVar.shopStock : curTotal;
        const curWh = newVar.warehouseStock || 0;

        const updatedTotal = Math.max(0, curTotal - 1);
        let updatedShop = curShop;
        let updatedWh = curWh;

        if (updatedShop >= 1) {
          updatedShop -= 1;
        } else {
          updatedShop = 0;
          updatedWh = Math.max(0, updatedWh - 1);
        }

        const updatedNew: ProductVariant = {
          ...newVar,
          stockQuantity: updatedTotal,
          shopStock: updatedShop,
          warehouseStock: updatedWh,
          lastModifiedBy: `เปลี่ยนสินค้า (${staffName})`,
          updatedAt: nowIso
        };
        await db.variants.put(updatedNew);
        CloudSync.pushVariant(updatedNew).catch(() => {});
      }

      // 3. บันทึกประวัติการเปลี่ยนคืนสินค้า (Exchange Record)
      const exRecord: ProductExchangeRecord = {
        id: `ex-${Date.now()}`,
        exchangeNo: `EX-${Date.now().toString().slice(-6)}`,
        timestamp: nowIso,
        originalOrderId: selectedOrder?.id,
        originalOrderLocalId: selectedOrder?.localOrderId,
        cashierId: currentUser?.id || 'cashier',
        cashierName: staffName,
        customerName: selectedOrder?.customerName,
        customerPhone: selectedOrder?.customerId,
        reason: returnReason === 'อื่นๆ' ? (customReason.trim() || 'อื่นๆ') : returnReason,
        returnedItems: [{
          variantId: selectedReturnItem.variantId,
          productName: selectedReturnItem.productName,
          sku: selectedReturnItem.sku,
          barcode: retVar?.barcode || selectedReturnItem.sku,
          qty: 1,
          unitPrice: selectedReturnItem.unitPrice
        }],
        newItems: [{
          variantId: selectedNewItem.id,
          productName: selectedNewItem.productName,
          sku: selectedNewItem.sku,
          barcode: selectedNewItem.barcode,
          qty: 1,
          unitPrice: selectedNewItem.salePrice
        }],
        priceDifference,
        paymentMethod: priceDifference > 0 ? paymentMethod : undefined,
        notes: `เปลี่ยนคืนตามเงื่อนไข 7 วัน: คืน [${selectedReturnItem.productName}] ➔ รับ [${selectedNewItem.productName}]`
      };

      await db.exchanges.add(exRecord);
      CloudSync.pushExchange(exRecord).catch(() => {});

      // 4. หากลูกค้าต้องจ่ายเงินส่วนต่างเพิ่ม ให้บันทึกยอดเงินเข้ากะปัจจุบัน
      if (priceDifference > 0 && activeShift) {
        if (paymentMethod === 'CASH') {
          await db.shifts.update(activeShift.id, {
            totalCashSales: (activeShift.totalCashSales || 0) + priceDifference
          });
        } else {
          await db.shifts.update(activeShift.id, {
            totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + priceDifference
          });
        }
      }

      SoundEffects.playSuccess();
      setCompletedRecord(exRecord);
      if (onExchangeSuccess) onExchangeSuccess();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนคืนสินค้า: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Thermal Printing for Exchange Slip
  const handlePrintExchangeSlip = () => {
    const el = document.getElementById('printable-exchange-slip');
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    const paperWidth = settings?.printerPaperWidth === '80mm' ? '72mm' : '48mm';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ใบเปลี่ยนสินค้า - ${completedRecord?.exchangeNo}</title>
          <style>
            @page { size: auto; margin: 0; }
            body { font-family: monospace; width: ${paperWidth}; margin: 0 auto; padding: 8px 4px; font-size: 11px; color: #000; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
                <span>ระบบเปลี่ยน / สลับคืนสินค้าตามเงื่อนไข 7 วัน</span>
                <span className="text-[10px] bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold">
                  AUTO STOCK SYNC
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                สลับไซส์/สี/แบบ โดยระบบจะตัดสต็อกชิ้นใหม่ และเพิ่มสต็อกชิ้นที่นำมาคืนให้อัตโนมัติ 100%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* SUCCESS VIEW (SLIP READY) */}
          {completedRecord ? (
            <div className="space-y-4 max-w-md mx-auto text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                ทำการเปลี่ยนและปรับสต็อกสำเร็จแล้ว!
              </h3>
              <p className="text-xs text-slate-500">
                ระบบได้เพิ่มสต็อกสินค้าที่คืนเข้าคลัง และตัดสต็อกสินค้าใหม่เรียบร้อยแล้ว
              </p>

              {/* Printable Exchange Slip Preview */}
              <div
                id="printable-exchange-slip"
                className="p-5 bg-slate-50 rounded-2xl border border-slate-300 text-left font-mono text-xs space-y-2 shadow-xs"
              >
                <div className="text-center font-bold text-sm">=== ใบเปลี่ยนสินค้า (EXCHANGE SLIP) ===</div>
                <div className="text-center text-[10px] text-slate-500">{settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                <div className="border-t border-dashed border-slate-400 my-2" />
                <div className="flex justify-between">
                  <span>เลขที่เปลี่ยน:</span>
                  <span className="font-bold">{completedRecord.exchangeNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>อ้างอิงบิลเดิม:</span>
                  <span className="font-bold">{completedRecord.originalOrderLocalId || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>วันที่/เวลา:</span>
                  <span>{new Date(completedRecord.timestamp).toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between">
                  <span>พนักงาน:</span>
                  <span>{completedRecord.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>สาเหตุ:</span>
                  <span className="font-sans">{completedRecord.reason}</span>
                </div>
                <div className="border-t border-dashed border-slate-400 my-2" />

                {/* Returned Item */}
                <div className="text-[11px] font-bold text-rose-700">(-) สินค้าที่ลูกค้านำมาคืน (+1 คืนสต็อก):</div>
                {completedRecord.returnedItems.map((ri, i) => (
                  <div key={i} className="flex justify-between pl-2 text-slate-700">
                    <span className="truncate pr-1">{ri.productName}</span>
                    <span className="font-bold">฿{ri.unitPrice.toLocaleString()}</span>
                  </div>
                ))}

                {/* New Item */}
                <div className="text-[11px] font-bold text-emerald-700 mt-2">(+) สินค้าชิ้นใหม่ที่เปลี่ยนไป (-1 ตัดสต็อก):</div>
                {completedRecord.newItems.map((ni, i) => (
                  <div key={i} className="flex justify-between pl-2 text-slate-700">
                    <span className="truncate pr-1">{ni.productName}</span>
                    <span className="font-bold">฿{ni.unitPrice.toLocaleString()}</span>
                  </div>
                ))}

                <div className="border-t border-dashed border-slate-400 my-2" />
                <div className="flex justify-between font-bold text-sm">
                  <span>ส่วนต่างราคา:</span>
                  <span>
                    {completedRecord.priceDifference === 0
                      ? '฿0 (เปลี่ยนไซส์ราคาเท่ากัน)'
                      : completedRecord.priceDifference > 0
                      ? `+฿${completedRecord.priceDifference.toLocaleString()} (ลูกค้าชำระเพิ่ม)`
                      : `-฿${Math.abs(completedRecord.priceDifference).toLocaleString()} (ร้านคืนเงิน)`}
                  </span>
                </div>
                {completedRecord.paymentMethod && (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>ชำระส่วนต่างด้วย:</span>
                    <span>{completedRecord.paymentMethod === 'CASH' ? 'เงินสด' : 'PromptPay'}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-slate-400 my-3" />
                <div className="text-center text-[10px] text-slate-400 font-sans">
                  ขอบคุณที่ไว้วางใจ KORAT CAT<br />
                  สินค้ารับเปลี่ยนคืนเฉพาะกรณีไม่ผ่านการซัก/ใช้งานภายใน 7 วัน
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={handlePrintExchangeSlip}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ใบเปลี่ยนสินค้า (สลิป)</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: ค้นหาและเลือกบิลเดิมของลูกค้า */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>ขั้นตอนที่ 1: เลือกบิลเดิมของลูกค้า (ภายใน 7 วัน)</span>
                  </span>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="พิมพ์เลขที่บิล / เบอร์โทร / ชื่อสินค้า..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {selectedOrder ? (
                  <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-950">
                          {selectedOrder.localOrderId}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          วันที่ซื้อ: {new Date(selectedOrder.timestamp).toLocaleDateString('th-TH')} ({new Date(selectedOrder.timestamp).toLocaleTimeString('th-TH')})
                        </span>
                        {selectedOrder.customerName && (
                          <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded font-bold">
                            {selectedOrder.customerName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        ยอดบิล: ฿{selectedOrder.netTotal.toLocaleString()} ({selectedOrder.items.length} รายการสินค้า)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(null);
                        setSelectedReturnItem(null);
                      }}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline"
                    >
                      เปลี่ยนบิล
                    </button>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 bg-white rounded-xl border border-slate-200">
                    {filteredOrders.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        ไม่พบบิลการขายที่ตรงกับคำค้นหา
                      </div>
                    ) : (
                      filteredOrders.map(ord => (
                        <div
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className="p-2.5 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span className="font-mono text-indigo-900">{ord.localOrderId}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(ord.timestamp).toLocaleDateString('th-TH')}
                              </span>
                              {ord.customerName && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1 rounded font-medium">
                                  {ord.customerName}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-md">
                              {ord.items.map(i => `${i.productName} (x${i.qty})`).join(', ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-800">฿{ord.netTotal.toLocaleString()}</span>
                            <div className="text-[10px] text-indigo-600 font-bold">แตะเพื่อเลือก ➔</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: เลือกสินค้าที่ลูกค้านำมาคืน & ระบุสาเหตุ */}
              {selectedOrder && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Return Item */}
                  <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                    <div className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-rose-600" />
                      <span>ขั้นตอนที่ 2: เลือกสินค้าที่ลูกค้านำมาคืน (+1 สต็อก)</span>
                    </div>

                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => {
                        const isSelected = selectedReturnItem?.variantId === item.variantId;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedReturnItem(item)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold shadow-xs'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div>
                              <div className="truncate">{item.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {item.sku} | ซื้อไป: {item.qty} ชิ้น
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono text-rose-800 font-extrabold">฿{item.unitPrice.toLocaleString()}</div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}>
                                {isSelected ? 'เลือกชิ้นนี้ ✓' : 'แตะเพื่อคืน'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Return Reason Selector */}
                    {selectedReturnItem && (
                      <div className="pt-2 border-t border-rose-200 space-y-2 text-xs">
                        <label className="block font-bold text-slate-700">สาเหตุการเปลี่ยน/คืน:</label>
                        <select
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                        >
                          <option value="ใส่ไม่ได้ / ผิดไซส์ (เปลี่ยนไซส์)">ใส่ไม่ได้ / ผิดไซส์ (เปลี่ยนไซส์)</option>
                          <option value="สินค้าชำรุด / มีตำหนิหลังการซื้อ">สินค้าชำรุด / มีตำหนิหลังการซื้อ</option>
                          <option value="ลูกค้าขอเปลี่ยนสี / เปลี่ยนลาย">ลูกค้าขอเปลี่ยนสี / เปลี่ยนลาย</option>
                          <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
                        </select>
                        {returnReason === 'อื่นๆ' && (
                          <input
                            type="text"
                            value={customReason}
                            onChange={e => setCustomReason(e.target.value)}
                            placeholder="ระบุสาเหตุเพิ่มเติม..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: New Item to Exchange */}
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span>ขั้นตอนที่ 3: เลือกสินค้าชิ้นใหม่ที่จะให้ลูกค้า (-1 สต็อก)</span>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={newSearchQuery}
                        onChange={e => setNewSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อสินค้าใหม่ / ไซส์ / บาร์โค้ด..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {selectedNewItem ? (
                      <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-emerald-950">{selectedNewItem.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SKU: {selectedNewItem.sku} | สต็อกคงเหลือ: {selectedNewItem.stockQuantity} ชิ้น
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-extrabold text-emerald-900">฿{selectedNewItem.salePrice.toLocaleString()}</div>
                          <button
                            type="button"
                            onClick={() => setSelectedNewItem(null)}
                            className="text-[10px] text-rose-600 font-bold underline"
                          >
                            เปลี่ยนชิ้นใหม่
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 text-xs">
                        {filteredNewVariants.length === 0 ? (
                          <div className="p-4 text-center text-slate-400">
                            ไม่พบสินค้าหรือสินค้าหมดสต็อก
                          </div>
                        ) : (
                          filteredNewVariants.slice(0, 15).map(v => (
                            <div
                              key={v.id}
                              onClick={() => setSelectedNewItem(v)}
                              className="p-2.5 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between transition"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{v.productName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  SKU: {v.sku} | คงเหลือ: {v.stockQuantity} ชิ้น
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="font-mono font-extrabold text-emerald-800">฿{v.salePrice.toLocaleString()}</div>
                                <span className="text-[10px] text-emerald-600 font-bold">เลือกชิ้นนี้ ➔</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: ส่วนสรุปราคาต่าง & ปุ่มยืนยันการเปลี่ยน */}
              {selectedReturnItem && selectedNewItem && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-xs text-slate-400">สรุปการสลับเปลี่ยนสินค้า:</div>
                      <div className="text-sm font-bold flex items-center gap-2 mt-0.5">
                        <span className="text-rose-400">คืน: {selectedReturnItem.productName} (฿{returnPrice.toLocaleString()})</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="text-emerald-400">รับ: {selectedNewItem.productName} (฿{newPrice.toLocaleString()})</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">ส่วนต่างที่ต้องชำระ:</div>
                      <div className="text-lg font-black font-mono">
                        {priceDifference === 0 ? (
                          <span className="text-emerald-400">฿0 (ราคาเท่ากันพอดี)</span>
                        ) : priceDifference > 0 ? (
                          <span className="text-amber-400">+฿{priceDifference.toLocaleString()} (ลูกค้าจ่ายเพิ่ม)</span>
                        ) : (
                          <span className="text-rose-400">-฿{Math.abs(priceDifference).toLocaleString()} (ร้านคืนเงิน)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {priceDifference > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">ช่องทางรับเงินส่วนต่างเพิ่ม:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CASH')}
                          className={`px-3 py-1 rounded-xl font-bold transition ${
                            paymentMethod === 'CASH' ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          💵 เงินสด
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('PROMPTPAY')}
                          className={`px-3 py-1 rounded-xl font-bold transition ${
                            paymentMethod === 'PROMPTPAY' ? 'bg-sky-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          📱 สแกน QR (PromptPay)
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmExchange}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>กำลังปรับสต็อกและบันทึก...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-white" />
                          <span>
                            ยืนยันการเปลี่ยนสินค้า (ตัดสต็อกชิ้นใหม่ + เพิ่มสต็อกชิ้นที่คืน)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
