// src/components/StockTransferModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  ArrowRight, 
  Check, 
  X,
  PackageCheck,
  Clock,
  Printer,
  FileText
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, StockTransfer } from '../types';
import { CloudSync } from '../services/cloudSync';

interface StockTransferModalProps {
  isOpen: boolean;
  initialTab?: 'TRANSFER_OUT' | 'RECEIVE_IN';
  onClose: () => void;
  onTransferComplete?: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  initialTab = 'TRANSFER_OUT',
  onClose,
  onTransferComplete
}) => {
  const [activeTab, setActiveTab] = useState<'TRANSFER_OUT' | 'RECEIVE_IN'>(initialTab);
  const [transferDirection, setTransferDirection] = useState<'WAREHOUSE_TO_SHOP' | 'SHOP_TO_WAREHOUSE'>('WAREHOUSE_TO_SHOP');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [transferQty, setTransferQty] = useState(10);
  const [senderName, setSenderName] = useState('ผู้ส่งมอบสินค้า');
  const [receiverName, setReceiverName] = useState('ผู้รับมอบสินค้า');
  const [notes, setNotes] = useState('');
  const [pendingTransfers, setPendingTransfers] = useState<StockTransfer[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<StockTransfer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadData = async () => {
    const list = await db.variants.filter(v => v.isActive !== false).toArray();
    setVariants(list);
    if (list.length > 0 && !selectedVariantId) {
      setSelectedVariantId(list[0].id);
    }
    const all = await db.transfers.orderBy('timestamp').reverse().toArray();
    setPendingTransfers(all.filter(t => t.status === 'PENDING_RECEIPT'));
    setRecentTransfers(all.slice(0, 15));
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      loadData();
      setSuccessNotice(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentVariant = variants.find(v => v.id === selectedVariantId);
  const currentWarehouseStock = currentVariant?.warehouseStock ?? (currentVariant?.stockQuantity || 0);
  const currentShopStock = currentVariant?.shopStock ?? 0;

  // ตรวจสอบสต็อกต้นทางตามทิศทางที่เลือก
  const isWarehouseSource = transferDirection === 'WAREHOUSE_TO_SHOP';
  const availableSourceStock = isWarehouseSource ? currentWarehouseStock : currentShopStock;
  const sourceBranchName = isWarehouseSource ? 'โกดัง/โรงงานผลิต' : 'หน้าร้านเรือนโคราชเฉลิมวัฒนา';
  const targetBranchName = isWarehouseSource ? 'หน้าร้านเรือนโคราชเฉลิมวัฒนา' : 'โกดัง/โรงงานผลิต';

  // Step 1: สร้างใบส่งของและตัดสต็อกต้นทางทันที (สถานะ PENDING_RECEIPT)
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVariant || transferQty <= 0) return;

    if (transferQty > availableSourceStock) {
      alert(`สต็อกที่${sourceBranchName} มีเพียง ${availableSourceStock} ชิ้น ไม่สามารถโอนเกินจำนวนนี้ได้`);
      return;
    }

    setIsSubmitting(true);
    try {
      const transferNo = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      
      const newTransfer: StockTransfer = {
        id: `tr-${Date.now()}`,
        transferNo,
        timestamp: new Date().toISOString(),
        fromBranch: isWarehouseSource ? 'WAREHOUSE' : 'SHOP',
        toBranch: isWarehouseSource ? 'SHOP' : 'WAREHOUSE',
        items: [
          {
            variantId: currentVariant.id,
            productName: currentVariant.productName,
            sku: currentVariant.sku,
            barcode: currentVariant.barcode,
            qty: transferQty
          }
        ],
        totalQty: transferQty,
        senderName: senderName.trim() || (isWarehouseSource ? 'ฝ่ายคลัง/โรงงาน' : 'แคชเชียร์หน้าร้าน'),
        receiverName: receiverName.trim() || (isWarehouseSource ? 'แคชเชียร์หน้าร้าน' : 'ฝ่ายคลัง/โรงงาน'),
        status: 'PENDING_RECEIPT', // รอปลายทางตรวจรับ
        notes: notes.trim()
      };

      // 1. บันทึกประวัติใบส่ง
      await db.transfers.add(newTransfer);

      // 2. ตัดสต็อกต้นทางออกทันที (สต็อกปลายทางยังไม่เพิ่มจนกว่าจะกดตรวจรับ)
      let newWarehouse = currentWarehouseStock;
      let newShop = currentShopStock;
      if (isWarehouseSource) {
        newWarehouse = Math.max(0, currentWarehouseStock - transferQty);
      } else {
        newShop = Math.max(0, currentShopStock - transferQty);
      }

      const updatedVariant = {
        ...currentVariant,
        warehouseStock: newWarehouse,
        shopStock: newShop,
        stockQuantity: newWarehouse + newShop
      };
      await db.variants.put(updatedVariant);

      // 3. ส่งขึ้น Cloud (ทั้งใบโอนและสต็อกสินค้าที่ตัดแล้ว)
      CloudSync.pushTransfer(newTransfer);
      CloudSync.pushVariant(updatedVariant);

      setSuccessNotice(`สร้างใบส่งของ ${transferNo} สำเร็จ! ตัดสต็อก${sourceBranchName}ออก ${transferQty} ชิ้นแล้ว (สถานะ: รอ${targetBranchName}ตรวจรับ)`);
      await loadData();
      if (onTransferComplete) onTransferComplete();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกการโอนสินค้า: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: ปลายทางตรวจรับสินค้า (เพิ่มสต็อกเข้าปลายทางจริง และเปลี่ยนสถานะเป็น COMPLETED)
  const handleConfirmReceive = async (transfer: StockTransfer) => {
    const defaultPerson = transfer.toBranch === 'SHOP' ? 'แคชเชียร์หน้าร้าน' : 'ฝ่ายคลังสินค้า';
    const person = prompt(`กรุณากรอกชื่อผู้ตรวจรับสินค้า (${transfer.toBranch === 'SHOP' ? 'หน้าร้านเรือนโคราช' : 'โกดัง/โรงงาน'}):`, defaultPerson);
    if (!person) return;

    try {
      // 1. เพิ่มสต็อกสินค้าแต่ละรายการเข้าคลังปลายทาง
      for (const item of transfer.items) {
        const v = await db.variants.get(item.variantId);
        if (v) {
          let currentShop = v.shopStock ?? 0;
          let currentWh = v.warehouseStock ?? 0;
          if (transfer.toBranch === 'SHOP') {
            currentShop += item.qty;
          } else {
            currentWh += item.qty;
          }

          const updatedV = {
            ...v,
            shopStock: currentShop,
            warehouseStock: currentWh,
            stockQuantity: currentWh + currentShop
          };
          await db.variants.put(updatedV);
          CloudSync.pushVariant(updatedV);
        }
      }

      // 2. อัปเดตสถานะใบโอนเป็น COMPLETED
      const updatedTransfer: StockTransfer = {
        ...transfer,
        receiverName: person.trim(),
        receivedAt: new Date().toISOString(),
        status: 'COMPLETED'
      };
      await db.transfers.put(updatedTransfer);

      // 3. ซิงค์ Cloud
      CloudSync.pushTransfer(updatedTransfer);

      setSuccessNotice(`ตรวจรับสินค้าใบโอน ${transfer.transferNo} เรียบร้อยแล้ว! สต็อกเข้า${transfer.toBranch === 'SHOP' ? 'หน้าร้าน' : 'โกดัง'}สำเร็จ (+${transfer.totalQty} ชิ้น)`);
      await loadData();
      if (onTransferComplete) onTransferComplete();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการตรวจรับสินค้า: ' + err.message);
    }
  };

  const handlePrintSlip = (t: StockTransfer) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ใบโอนย้ายและส่งมอบสินค้าข้ามคลัง - ${t.transferNo}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 20mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 18px; }
            .brand-title { font-size: 20px; font-weight: 800; color: #78350f; text-transform: uppercase; }
            .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .doc-title { font-size: 16px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-no { font-family: monospace; font-size: 13px; font-weight: bold; color: #b45309; text-align: right; }
            
            .info-grid { width: 100%; margin-bottom: 18px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
            .info-label { color: #64748b; font-weight: 600; }
            .info-val { font-weight: 700; color: #0f172a; }

            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
            .items-table th { background: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; text-align: left; }
            .items-table td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
            .items-table tr:nth-child(even) { background: #fafafa; }

            .summary-box { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .summary-title { font-weight: 700; color: #92400e; font-size: 13px; }
            .summary-total { font-size: 18px; font-weight: 800; color: #78350f; font-family: monospace; }

            .signature-section { width: 100%; margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
            .sig-card { width: 45%; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; }
            .sig-line { margin: 40px auto 8px auto; width: 80%; border-bottom: 1px solid #94a3b8; }
            .sig-name { font-weight: bold; font-size: 12px; color: #1e293b; }
            .sig-role { font-size: 11px; color: #64748b; margin-top: 2px; }
            
            .footer-note { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-title">KORAT CAT x เรือนโคราชเฉลิมวัฒนา</div>
                <div class="brand-sub">Haute Couture & Heritage Craft Boutique • ถนนจอมพล อ.เมือง จ.นครราชสีมา</div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div class="doc-title">ใบโอนย้ายและส่งมอบสินค้าข้ามคลัง</div>
                <div class="brand-sub">STOCK TRANSFER NOTE (A4)</div>
                <div class="doc-no">เลขที่: ${t.transferNo}</div>
              </td>
            </tr>
          </table>

          <table class="info-grid">
            <tr>
              <td style="width: 48%; vertical-align: top;">
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">วันที่ทำรายการ:</span>
                    <span class="info-val">${new Date(t.timestamp).toLocaleDateString('th-TH')} ${new Date(t.timestamp).toLocaleTimeString('th-TH')} น.</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">คลังต้นทาง (ผู้ตัดส่ง):</span>
                    <span class="info-val">${t.fromBranch === 'WAREHOUSE' ? '🏭 โกดัง/โรงงานผลิต' : '🏪 หน้าร้านเรือนโคราช'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">เจ้าหน้าที่ผู้ส่งมอบ:</span>
                    <span class="info-val">${t.senderName}</span>
                  </div>
                </div>
              </td>
              <td style="width: 4%;"></td>
              <td style="width: 48%; vertical-align: top;">
                <div class="info-box">
                  <div class="info-row">
                    <span class="info-label">สถานะเอกสาร:</span>
                    <span class="info-val" style="color: ${t.status === 'COMPLETED' ? '#059669' : '#d97706'};">
                      ${t.status === 'COMPLETED' ? '✅ ตรวจรับเข้าสต็อกสำเร็จแล้ว' : '⏳ กำลังจัดส่ง (รอหน้าร้านตรวจรับ)'}
                    </span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">คลังปลายทาง (ผู้รับของ):</span>
                    <span class="info-val">${t.toBranch === 'SHOP' ? '🏪 หน้าร้านเรือนโคราชเฉลิมวัฒนา' : '🏭 โกดัง/โรงงานผลิต'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">เจ้าหน้าที่ผู้ตรวจรับ:</span>
                    <span class="info-val">${t.receiverName ? `${t.receiverName} (${t.receivedAt ? new Date(t.receivedAt).toLocaleTimeString('th-TH') + ' น.' : ''})` : 'รอดำเนินการตรวจรับ'}</span>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">ลำดับ</th>
                <th style="width: 140px;">รหัสสินค้า (SKU)</th>
                <th>รายการสินค้าและรายละเอียด</th>
                <th style="width: 90px; text-align: center;">จำนวนที่โอน</th>
                <th style="width: 90px; text-align: center;">สถานะตรวจนับ</th>
              </tr>
            </thead>
            <tbody>
              ${t.items.map((it, idx) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td style="font-family: monospace; font-weight: bold; color: #b45309;">${it.sku}</td>
                  <td><b>${it.productName}</b></td>
                  <td style="text-align: center; font-weight: 800; font-size: 13px;">${it.qty} ชิ้น</td>
                  <td style="text-align: center; color: ${t.status === 'COMPLETED' ? '#059669' : '#d97706'}; font-weight: bold;">
                    ${t.status === 'COMPLETED' ? 'ครบถ้วน' : 'รอตรวจ'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-box">
            <span class="summary-title">รวมจำนวนสินค้าที่โอนย้ายทั้งหมด:</span>
            <span class="summary-total">${t.totalQty} ชิ้น</span>
          </div>

          ${t.notes ? `
            <div style="font-size: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px;">
              <b>หมายเหตุการจัดส่ง:</b> ${t.notes}
            </div>
          ` : ''}

          <div class="signature-section">
            <div class="sig-card">
              <div class="sig-line"></div>
              <div class="sig-name">( ${t.senderName} )</div>
              <div class="sig-role">ผู้ส่งมอบสินค้า (คลัง/โรงงานผลิต)</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">วันที่: _____/_____/_________</div>
            </div>

            <div class="sig-card">
              <div class="sig-line"></div>
              <div class="sig-name">( ${t.receiverName || '________________________'} )</div>
              <div class="sig-role">ผู้ตรวจรับสินค้า (แคชเชียร์หน้าร้าน)</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">วันที่: _____/_____/_________</div>
            </div>
          </div>

          <div class="footer-note">
            เอกสารฉบับนี้ใช้สำหรับควบคุมการโอนย้ายสต็อกภายใน KORAT CAT x เรือนโคราชเฉลิมวัฒนา ข้อมูลจะถูกบันทึกและซิงค์กับ Cloud อัตโนมัติ
          </div>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-white my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบโอนย้ายและตรวจรับสินค้า 2 คลัง</h3>
              <p className="text-[11px] text-slate-400">ขั้นตอนที่ 1: โกดังตัดส่ง ➔ ขั้นตอนที่ 2: หน้าร้านตรวจนับและกดยืนยันรับของ</p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSFER_OUT')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'TRANSFER_OUT'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>1. โกดังส่งสินค้า (Transfer Out)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECEIVE_IN')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 relative ${
              activeTab === 'RECEIVE_IN'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>2. หน้าร้านตรวจรับสินค้า</span>
            {pendingTransfers.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {pendingTransfers.length} ใบรอรับ
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {successNotice && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between">
              <span>{successNotice}</span>
              <button type="button" onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
            </div>
          )}

          {activeTab === 'TRANSFER_OUT' ? (
            /* TAB 1: สร้างใบส่งของและโอนย้ายสต็อก */
            <>
              {/* Direction Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-900 rounded-2xl border border-slate-800 gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 ml-2">
                  <Truck className="w-4 h-4 text-amber-400" /> ทิศทางการโอนย้ายสต็อก:
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTransferDirection('WAREHOUSE_TO_SHOP')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      transferDirection === 'WAREHOUSE_TO_SHOP'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🏭 โกดัง ➔ 🏪 หน้าร้านเรือนโคราช</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferDirection('SHOP_TO_WAREHOUSE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      transferDirection === 'SHOP_TO_WAREHOUSE'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🏪 หน้าร้าน ➔ 🏭 ส่งคืนโกดัง</span>
                  </button>
                </div>
              </div>

              {/* Visual Stock Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
                  <span className="text-[10px] font-black text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    ต้นทาง: {isWarehouseSource ? 'โกดัง/โรงงานผลิต' : 'หน้าร้านเรือนโคราช'}
                  </span>
                  <div className="text-sm font-bold text-white mt-2">
                    {isWarehouseSource ? 'คลังผลิตร้านเดิม' : 'เรือนโคราชเฉลิมวัฒนา'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    สต็อกพร้อมโอน: <span className="font-bold text-amber-300">{availableSourceStock}</span> ชิ้น
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 mt-1">
                    โอนย้าย {transferQty} ชิ้น
                  </span>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
                  <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ปลายทาง: {isWarehouseSource ? 'หน้าร้านเรือนโคราช' : 'โกดัง/โรงงานผลิต'}
                  </span>
                  <div className="text-sm font-bold text-white mt-2">
                    {isWarehouseSource ? 'เรือนโคราชเฉลิมวัฒนา' : 'คลังผลิตร้านเดิม'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    สต็อกเดิมปลายทาง: <span className="font-bold text-emerald-300">
                      {isWarehouseSource ? currentShopStock : currentWarehouseStock}
                    </span> ชิ้น
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTransfer} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      เลือกสินค้าและไซส์/สี ที่ต้องการโอนส่ง:
                    </label>
                    <select
                      value={selectedVariantId}
                      onChange={e => setSelectedVariantId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.productName} ({v.sku}) — โกดัง: {v.warehouseStock ?? v.stockQuantity} ชิ้น
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      จำนวนชิ้นที่ต้องการส่ง:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={currentWarehouseStock}
                        value={transferQty}
                        onChange={e => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono text-sm text-center text-white font-bold"
                      />
                      <div className="flex gap-1">
                        {[10, 20, 50].map(n => (
                          <button
                            type="button"
                            key={n}
                            onClick={() => setTransferQty(Math.min(currentWarehouseStock, n))}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300"
                          >
                            +{n}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setTransferQty(currentWarehouseStock)}
                          className="px-2.5 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-lg text-xs text-amber-300 font-bold"
                        >
                          ทั้งหมด ({currentWarehouseStock})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ผู้ตัดส่ง (นาง ก. คลัง/โรงงาน):</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">ผู้รับปลายทาง (นาง ข. หน้าร้าน):</label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={e => setReceiverName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || currentWarehouseStock <= 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>ตัดสต็อกโกดัง {transferQty} ชิ้น และส่งใบโอนไปหน้าร้าน</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* TAB 2: หน้าร้านตรวจรับสินค้า */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300">
                  รายการสินค้าที่โกดังส่งมา (รอหน้าร้านตรวจรับจริง):
                </h4>
                <span className="text-[11px] text-slate-400">
                  ตรวจนับสินค้าจริงแล้วกดปุ่มเพื่อรับเข้าสต็อกหน้าร้าน
                </span>
              </div>

              {pendingTransfers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400">
                  <PackageCheck className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-300">ไม่มีรายการค้างตรวจรับในขณะนี้</p>
                  <p className="text-[11px] text-slate-500 mt-1">สินค้าทุกรายการถูกตรวจรับเข้าหน้าร้านเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTransfers.map(t => (
                    <div key={t.id} className="p-4 bg-slate-950/70 border border-amber-500/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-amber-400 text-xs">{t.transferNo}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🚚 กำลังจัดส่ง (รอตรวจรับ)
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white">
                          {t.items.map(it => `${it.productName} (${it.qty} ชิ้น)`).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          ผู้ส่ง: <b>{t.senderName}</b> • ส่งเมื่อ: {new Date(t.timestamp).toLocaleDateString('th-TH')} {new Date(t.timestamp).toLocaleTimeString('th-TH')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintSlip(t)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ใบส่ง</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmReceive(t)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition active:scale-95"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>✅ ยืนยันตรวจรับ ({t.totalQty} ชิ้น)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Log */}
          {recentTransfers.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 mb-2">ประวัติการโอนย้ายสินค้าทั้งหมด:</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {recentTransfers.map(t => (
                  <div key={t.id} className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-400 mr-2">{t.transferNo}</span>
                      <span className="text-slate-300 font-medium">
                        {t.items[0]?.productName} ({t.items[0]?.qty} ชิ้น)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'COMPLETED' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {t.status === 'COMPLETED' ? 'ตรวจรับสำเร็จแล้ว' : 'รอตรวจรับ'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrintSlip(t)}
                        className="p-1 hover:text-white"
                        title="พิมพ์ใบส่งของ"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
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
          <span>KORAT CAT 2-Step Handover &amp; Receipt</span>
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
