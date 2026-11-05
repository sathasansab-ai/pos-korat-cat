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
  User
} from 'lucide-react';
import { db } from '../db';
import type { CustomMadeOrder, StoreSettings, Order } from '../types';
import { CloudSync } from '../services/cloudSync';

interface CustomOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
}

export const CustomOrderModal: React.FC<CustomOrderModalProps> = ({
  isOpen,
  onClose,
  staffName
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง');
  const [qty, setQty] = useState(1);
  const [totalPrice, setTotalPrice] = useState(3000);
  const [depositAmount, setDepositAmount] = useState(1500); // 50% default
  const [paymentMethod, setPaymentMethod] = useState<'PROMPTPAY' | 'CASH'>('PROMPTPAY');
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP_SHOP' | 'SHIPPING_ADDRESS'>('PICKUP_SHOP');
  const [shippingAddress, setShippingAddress] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default 7 days
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  
  // View state: 'FORM' | 'SUCCESS_VIEW'
  const [viewState, setViewState] = useState<'FORM' | 'SUCCESS_VIEW'>('FORM');
  const [savedOrder, setSavedOrder] = useState<CustomMadeOrder | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setItemDescription('สั่งตัดเสื้อผ้าไหมลายอัตลักษณ์แมวโคราช x ปักลายฉลุเรือนทอง');
    setQty(1);
    setTotalPrice(3000);
    setDepositAmount(1500);
    setPaymentMethod('PROMPTPAY');
    setDeliveryMethod('PICKUP_SHOP');
    setShippingAddress('');
    setNotes('');
    setViewState('FORM');
    setSavedOrder(null);
  };

  useEffect(() => {
    if (isOpen) {
      db.settings.get('current_store_settings').then(s => {
        if (s) setSettings(s);
      });
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePriceChange = (val: number) => {
    setTotalPrice(val);
    setDepositAmount(Math.round(val / 2)); // Auto 50%
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || totalPrice <= 0) {
      alert('กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์ และยอดเงินสั่งผลิต');
      return;
    }

    const orderNo = `CUST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const balanceDue = Math.max(0, totalPrice - depositAmount);

    const newOrder: CustomMadeOrder = {
      id: `co-${Date.now()}`,
      orderNo,
      createdAt: new Date().toISOString(),
      staffName,
      branch: 'SHOP',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
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

    // 2. นำยอดเงินมัดจำเข้ากะพนักงาน และบันทึกเป็นบิลขายเพื่อรวมเข้ายอดขายหน้าร้านทันที
    if (depositAmount > 0) {
      const activeShift = await db.shifts.where({ status: 'OPEN' }).last();
      const shiftId = activeShift ? activeShift.id : 'NO_SHIFT';

      if (activeShift) {
        const isCash = paymentMethod === 'CASH';
        const updatedShift = {
          ...activeShift,
          totalCashSales: (activeShift.totalCashSales || 0) + (isCash ? depositAmount : 0),
          totalPromptPaySales: (activeShift.totalPromptPaySales || 0) + (!isCash ? depositAmount : 0),
          totalTransactions: (activeShift.totalTransactions || 0) + 1
        };
        await db.shifts.update(activeShift.id, updatedShift);
        CloudSync.pushShift(updatedShift);
      }

      // 3. สร้างบิลขายมัดจำลงใน db.orders เพื่อให้ปรากฏในรายงานยอดขายและสมุดรายวัน
      const depositBill: Order = {
        id: `ord-dep-${Date.now()}`,
        localOrderId: `DEP-${newOrder.orderNo}`,
        timestamp: new Date().toISOString(),
        cashierId: staffName,
        cashierName: staffName,
        shiftId: shiftId,
        customerName: newOrder.customerName,
        items: [{
          variantId: `custom-order-${newOrder.id}`,
          productName: `เงินมัดจำสั่งผลิต (50%): ${newOrder.itemDescription}`,
          sku: newOrder.orderNo,
          attributes: {
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
    setViewState('SUCCESS_VIEW'); // สลับไปหน้าสำเร็จทันที ไม่ค้างที่ฟอร์มเดิม
  };

  // พิมพ์ใบสั่งผลิตและยืนยันการสั่งซื้อ ขนาด A4 มาตรฐาน พร้อมช่องลงชื่อ 2 ฝ่าย
  const handlePrintA4 = (order: CustomMadeOrder) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบสั่งผลิตและยืนยันการสั่งซื้อ - ${order.orderNo}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #b45309; padding-bottom: 15px; margin-bottom: 20px; }
            .brand-title { font-size: 20px; font-weight: 800; color: #78350f; text-transform: uppercase; }
            .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .doc-title { font-size: 16px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-no { font-family: monospace; font-size: 13px; font-weight: bold; color: #b45309; text-align: right; }
            
            .info-grid { width: 100%; margin-bottom: 20px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
            .info-box h4 { margin: 0 0 8px 0; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            
            table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table.items-table th, table.items-table td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
            table.items-table th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 12px; }
            
            .summary-table { width: 45%; margin-left: auto; margin-bottom: 25px; border-collapse: collapse; }
            .summary-table td { padding: 6px 10px; }
            .summary-table .bold { font-weight: 700; }
            .total-row { border-top: 1.5px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 14px; }

            .terms { font-size: 11px; color: #64748b; background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px 14px; margin-bottom: 30px; border-radius: 0 6px 6px 0; }
            
            .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            .signature-table td { width: 50%; text-align: center; vertical-align: bottom; padding: 0 20px; }
            .sig-line { border-bottom: 1px solid #64748b; width: 80%; margin: 50px auto 8px auto; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-title">${settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}</div>
                <div class="brand-sub">${settings?.subTitle || 'Haute Couture & Heritage Craft Boutique'}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                  ที่อยู่: ${settings?.address || 'เรือนโคราชเฉลิมวัฒนา จ.นครราชสีมา'} | โทร: ${settings?.phone || '044-XXXXXX'}
                </div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div class="doc-title">ใบสั่งผลิตและยืนยันการสั่งซื้อ</div>
                <div class="doc-title" style="font-size: 12px; font-weight: normal; color: #64748b;">(CUSTOM PRODUCTION ORDER CONFIRMATION)</div>
                <div class="doc-no">เลขที่: ${order.orderNo}</div>
                <div style="font-size: 12px; color: #64748b;">วันที่: ${new Date(order.createdAt).toLocaleDateString('th-TH')}</div>
              </td>
            </tr>
          </table>

          <table class="info-grid">
            <tr>
              <td style="width: 50%; padding-right: 10px; vertical-align: top;">
                <div class="info-box">
                  <h4>ข้อมูลลูกค้าผู้สั่งผลิต</h4>
                  <div><b>ชื่อ-นามสกุล:</b> ${order.customerName}</div>
                  <div><b>เบอร์โทรศัพท์:</b> ${order.customerPhone}</div>
                  <div><b>การรับสินค้า:</b> ${order.deliveryMethod === 'PICKUP_SHOP' ? 'มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)' : 'จัดส่งพัสดุตามที่อยู่'}</div>
                  ${order.shippingAddress ? `<div><b>ที่อยู่จัดส่ง:</b> ${order.shippingAddress}</div>` : ''}
                </div>
              </td>
              <td style="width: 50%; padding-left: 10px; vertical-align: top;">
                <div class="info-box">
                  <h4>ข้อมูลการผลิตและการนัดหมาย</h4>
                  <div><b>ผู้ออกใบสั่ง:</b> ${order.staffName} (สาขาหน้าร้าน)</div>
                  <div><b>กำหนดส่งมอบ / วันนัดรับ:</b> <span style="font-size: 13px; font-weight: 800; color: #b45309;">${order.dueDate}</span></div>
                  <div><b>สถานะคำสั่ง:</b> รอดำเนินการผลิตที่โรงงาน/โกดัง</div>
                  <div><b>ช่องทางชำระมัดจำ:</b> ${order.depositPaymentMethod === 'PROMPTPAY' ? 'สแกนโอน PromptPay QR' : 'เงินสด'}</div>
                </div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">ลำดับ</th>
                <th>รายละเอียดงานสั่งผลิต / ข้อกำหนดสินค้า</th>
                <th style="width: 70px; text-align: center;">จำนวน</th>
                <th style="width: 100px; text-align: right;">ราคาต่อหน่วย</th>
                <th style="width: 110px; text-align: right;">รวมเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${order.itemDescription}</div>
                  ${order.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">ข้อกำหนดเพิ่มเติม: ${order.notes}</div>` : ''}
                </td>
                <td style="text-align: center; font-weight: 700;">${order.qty} ชิ้น</td>
                <td style="text-align: right;">฿${(order.totalPrice / order.qty).toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700;">฿${order.totalPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td>ยอดรวมทั้งสิ้น (Total):</td>
              <td style="text-align: right;" class="bold">฿${order.totalPrice.toLocaleString()}</td>
            </tr>
            <tr style="color: #15803d;">
              <td><b>เงินมัดจำที่ชำระแล้ว (Deposit Paid):</b></td>
              <td style="text-align: right;" class="bold">฿${order.depositAmount.toLocaleString()}</td>
            </tr>
            <tr class="total-row" style="color: #b91c1c;">
              <td class="bold">ยอดค้างชำระคงเหลือ (Balance Due):</td>
              <td style="text-align: right;" class="bold">฿${order.balanceDue.toLocaleString()}</td>
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
                <div style="font-size: 11px; color: #64748b;">พนักงานผู้รับคำสั่งผลิต / แคชเชียร์</div>
              </td>
              <td>
                <div class="sig-line"></div>
                <div style="font-weight: 700;">( ${order.customerName} )</div>
                <div style="font-size: 11px; color: #64748b;">ลูกค้าผู้สั่งผลิต / ผู้ยืนยันคำสั่งซื้อ</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบงานสั่งทำ / สั่งผลิต &amp; รับเงินมัดจำ 50%</h3>
              <p className="text-[11px] text-slate-400">ออกใบสั่งตัดเย็บ งานโหล งานพิมพ์ผ้า พร้อมพิมพ์ใบยืนยัน A4 ให้ลูกค้า</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {viewState === 'SUCCESS_VIEW' && savedOrder ? (
            /* SUCCESS VIEW: ไม่ค้างที่ฟอร์ม แสดงผลสำเร็จและปุ่มพิมพ์ */
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
                  <span className="text-slate-400">รายละเอียด:</span>
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

              {/* Print Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handlePrintA4(savedOrder)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ พิมพ์ใบยืนยันการสั่งผลิต A4 (พร้อมช่องเซ็น)</span>
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
            <form onSubmit={handleSaveOrder} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ชื่อ-นามสกุล ลูกค้าผู้สั่ง:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณวิภาวี นครราช"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">เบอร์โทรศัพท์ลูกค้า:</label>
                  <input
                    type="text"
                    required
                    placeholder="08X-XXX-XXXX"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">รายละเอียดงานสั่งผลิต / สั่งทำ:</label>
                  <textarea
                    rows={2}
                    required
                    value={itemDescription}
                    onChange={e => setItemDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ยอดราคาผลิตรวมทั้งหมด (บาท):</label>
                  <input
                    type="number"
                    min={1}
                    value={totalPrice}
                    onChange={e => handlePriceChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold font-mono text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    เงินมัดจำ (มัดจำ 50% = ฿{Math.round(totalPrice / 2).toLocaleString()}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalPrice}
                    value={depositAmount}
                    onChange={e => setDepositAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold font-mono text-emerald-400"
                  />
                  <span className="text-[10px] text-rose-300 mt-1 block">
                    ยอดค้างชำระเมื่อรับของ: <b>฿{Math.max(0, totalPrice - depositAmount).toLocaleString()}</b>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">วันกำหนดนัดรับสินค้า:</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ช่องทางรับสินค้า:</label>
                  <select
                    value={deliveryMethod}
                    onChange={e => setDeliveryMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-medium"
                  >
                    <option value="PICKUP_SHOP">มารับเองที่หน้าร้าน (เรือนโคราชเฉลิมวัฒนา)</option>
                    <option value="SHIPPING_ADDRESS">จัดส่งพัสดุตามที่อยู่ลูกค้า</option>
                  </select>
                </div>

                {deliveryMethod === 'SHIPPING_ADDRESS' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">ที่อยู่จัดส่งพัสดุ:</label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={e => setShippingAddress(e.target.value)}
                      placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์..."
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                )}

              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกใบสั่งผลิตและรับมัดจำ (฿{depositAmount.toLocaleString()})</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>KORAT CAT Custom Production</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
