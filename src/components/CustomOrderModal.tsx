// src/components/CustomOrderModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Check, 
  X, 
  Printer
} from 'lucide-react';
import { db } from '../db';
import type { CustomMadeOrder, StoreSettings } from '../types';
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
  const [recentOrders, setRecentOrders] = useState<CustomMadeOrder[]>([]);
  const [selectedForPrint, setSelectedForPrint] = useState<CustomMadeOrder | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const loadData = async () => {
    const s = await db.settings.get('current_store_settings');
    if (s) setSettings(s);
    const list = await db.customOrders.orderBy('createdAt').reverse().limit(10).toArray();
    setRecentOrders(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
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

    await db.customOrders.add(newOrder);
    CloudSync.pushCustomOrder(newOrder);

    setSelectedForPrint(newOrder);
    await loadData();
  };

  const handlePrintSlip = (order: CustomMadeOrder) => {
    const printContent = `
      <html>
        <head>
          <title>ใบสั่งผลิตและรับเงินมัดจำ - ${order.orderNo}</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 13px; max-width: 320px; margin: 0 auto; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .flex-between { display: flex; justify-content: space-between; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="text-center bold">${settings?.storeName || 'KORAT CAT x เรือนโคราช'}</div>
          <div class="text-center border-b">ใบสั่งผลิตและรับเงินมัดจำ (50%)</div>
          <div class="flex-between"><span>เลขที่ใบสั่ง:</span><span class="bold">${order.orderNo}</span></div>
          <div class="flex-between"><span>วันที่สั่ง:</span><span>${new Date(order.createdAt).toLocaleDateString('th-TH')}</span></div>
          <div class="flex-between"><span>ผู้ออกบิล:</span><span>${order.staffName}</span></div>
          <div class="flex-between border-b"><span>ลูกค้า:</span><span class="bold">${order.customerName} (${order.customerPhone})</span></div>
          
          <div class="bold" style="margin-top:6px;">รายละเอียดงานสั่งทำ:</div>
          <div style="margin-bottom:8px;">${order.itemDescription}</div>
          <div class="flex-between"><span>จำนวน:</span><span>${order.qty} ชิ้น</span></div>
          <div class="flex-between"><span>วันนัดรับสินค้า:</span><span class="bold">${order.dueDate}</span></div>
          <div class="flex-between border-b"><span>การรับสินค้า:</span><span>${order.deliveryMethod === 'PICKUP_SHOP' ? 'มารับที่หน้าร้าน' : 'จัดส่งตามที่อยู่'}</span></div>
          
          <div class="flex-between bold"><span>ยอดรวมทั้งหมด:</span><span>฿${order.totalPrice.toLocaleString()}</span></div>
          <div class="flex-between bold" style="color:green;"><span>เงินมัดจำที่ชำระแล้ว:</span><span>฿${order.depositAmount.toLocaleString()}</span></div>
          <div class="flex-between bold border-b" style="color:red;"><span>ยอดค้างชำระคงเหลือ:</span><span>฿${order.balanceDue.toLocaleString()}</span></div>
          
          <div class="text-center" style="margin-top:20px; border-top:1px solid #000; padding-top:6px;">
            ลงชื่อผู้สั่งทำ / ลูกค้า
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบงานสั่งทำ / สั่งผลิต &amp; รับเงินมัดจำ 50%</h3>
              <p className="text-[11px] text-slate-400">ออกใบสั่งตัดเย็บ งานโหล งานพิมพ์ผ้า ระบุวันนัดรับ และบันทึกมัดจำ</p>
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
        <div className="p-6 space-y-6">
          
          <form onSubmit={handleSaveOrder} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Customer Info */}
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

              {/* Item Description */}
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

              {/* Price & Deposit Math */}
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

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">วันกำหนดนัดรับสินค้า:</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              {/* Delivery Option */}
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

          {/* Recent Production Orders */}
          {recentOrders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 mb-2">รายการสั่งผลิตล่าสุด:</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {recentOrders.map(co => (
                  <div key={co.id} className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-400 mr-2">{co.orderNo}</span>
                      <span className="text-slate-300 font-medium mr-2">{co.customerName}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[200px] inline-block align-middle">
                        {co.itemDescription}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        มัดจำ ฿{co.depositAmount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrintSlip(co)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200"
                        title="พิมพ์ใบสั่งผลิต"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
