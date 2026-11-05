// src/pages/ShiftPage.tsx
import React, { useState, useEffect } from 'react';
import { Clock, Banknote, ShieldAlert, CheckCircle2, History, AlertTriangle, QrCode, Printer, Calculator, RefreshCw } from 'lucide-react';
import { db } from '../db';
import type { Shift, UserAccount } from '../types';
import { CloudSync } from '../services/cloudSync';

interface ShiftPageProps {
  currentUser: UserAccount;
  activeShift: Shift | null;
  onShiftUpdated: () => void;
}

export const ShiftPage: React.FC<ShiftPageProps> = ({
  currentUser,
  activeShift,
  onShiftUpdated
}) => {
  const [startingCash, setStartingCash] = useState<string>('1000');
  const [closingCash, setClosingCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [printedShift, setPrintedShift] = useState<Shift | null>(null);

  // Live real-time shift stats queried directly from actual orders
  const [liveShift, setLiveShift] = useState<Shift | null>(activeShift);
  const [liveCashSales, setLiveCashSales] = useState(0);
  const [livePromptPaySales, setLivePromptPaySales] = useState(0);
  const [liveTxCount, setLiveTxCount] = useState(0);
  const [pastShifts, setPastShifts] = useState<Shift[]>([]);

  const loadPastShifts = async () => {
    const list = await db.shifts.orderBy('startTime').reverse().limit(10).toArray();
    setPastShifts(list);
  };

  const refreshLiveShift = async () => {
    const shift = (await db.shifts.where({ status: 'OPEN' }).last()) || activeShift;
    setLiveShift(shift || null);
    await loadPastShifts();

    if (shift) {
      // Query completed orders for this shift to get 100% exact sales
      const orders = await db.orders.where('shiftId').equals(shift.id).toArray();
      let cash = 0;
      let promptpay = 0;
      let count = 0;

      orders.forEach(o => {
        if (o.status === 'COMPLETED') {
          count++;
          o.payments.forEach(p => {
            if (p.method === 'CASH') cash += p.amount;
            if (p.method === 'PROMPTPAY') promptpay += p.amount;
          });
        }
      });

      setLiveCashSales(cash);
      setLivePromptPaySales(promptpay);
      setLiveTxCount(count);
    }
  };

  useEffect(() => {
    refreshLiveShift();
  }, [activeShift]);

  // Open Shift
  const handleOpenShift = async () => {
    const floatAmount = parseFloat(startingCash) || 0;
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      startTime: new Date().toISOString(),
      startingCash: floatAmount,
      totalCashSales: 0,
      totalPromptPaySales: 0,
      totalCreditSales: 0,
      totalTransactions: 0,
      status: 'OPEN'
    };

    await db.shifts.add(newShift);
    CloudSync.pushShift(newShift);
    onShiftUpdated();
    refreshLiveShift();
  };

  const currentShift = liveShift || activeShift;
  const expectedCashInDrawer = currentShift ? currentShift.startingCash + liveCashSales : 0;
  const countedCash = parseFloat(closingCash) || 0;
  const liveDifference = countedCash - expectedCashInDrawer;

  // Close Shift
  const handleCloseShift = async () => {
    if (!currentShift) return;

    const actual = parseFloat(closingCash) || 0;
    const expected = currentShift.startingCash + liveCashSales;
    const diff = actual - expected;

    const updated: Shift = {
      ...currentShift,
      totalCashSales: liveCashSales,
      totalPromptPaySales: livePromptPaySales,
      totalTransactions: liveTxCount,
      endTime: new Date().toISOString(),
      closingCashExpected: expected,
      closingCashActual: actual,
      cashDifference: diff,
      notes: closingNotes,
      status: 'CLOSED'
    };

    await db.shifts.update(currentShift.id, updated);
    CloudSync.pushShift(updated);

    setPrintedShift(updated);
    setIsClosingShift(false);
    setClosingCash('');
    setClosingNotes('');
    onShiftUpdated();
    refreshLiveShift();
  };

  const handlePrintSlip = () => {
    const printEl = document.getElementById('printable-shift-handover');
    if (!printEl) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-shift-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-shift-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ใบสรุปส่งมอบกะ - ${printedShift?.cashierName || 'Shift'}</title>
            ${styles}
            <style>
              @page { size: A4 portrait; margin: 12mm 15mm; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { 
                background: #ffffff !important; 
                color: #000000 !important; 
                padding: 10px !important; 
                margin: 0 !important; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
              }
              #printable-shift-handover { 
                width: 100% !important; 
                max-width: 520px !important; 
                border: 2px solid #0f172a !important; 
                border-radius: 16px !important; 
                padding: 28px !important; 
                background: #ffffff !important; 
                font-size: 13px !important; 
                line-height: 1.6 !important;
                box-shadow: none !important; 
                margin: 0 auto !important;
              }
              .no-print { display: none !important; }
            </style>
          </head>
          <body>
            ${printEl.outerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 350);
    } catch (e) {
      window.print();
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            <span>ระบบจัดการกะ & ตรวจนับเงินสดแคชเชียร์ (Shift Control)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            คำนวณแยกยอดเงินสดในลิ้นชัก และยอดโอน PromptPay บัญชีธนาคารอย่างแม่นยำ ป้องกันเงินผิดพลาด
          </p>
        </div>

        {currentShift && (
          <button
            type="button"
            onClick={refreshLiveShift}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>รีเฟรชยอดเงิน</span>
          </button>
        )}
      </div>

      {/* Active Shift Card or Open Shift Form */}
      {currentShift ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200 no-print">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                กำลังเปิดกะใช้งาน
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                ผู้รับผิดชอบกะ: {currentShift.cashierName}
              </h2>
              <p className="text-xs text-slate-500">
                เริ่มกะเวลา: {new Date(currentShift.startTime).toLocaleString('th-TH')}
              </p>
            </div>
            <button
              onClick={() => {
                refreshLiveShift();
                setIsClosingShift(true);
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow transition"
            >
              ตรวจนับและปิดกะ
            </button>
          </div>

          {/* Current Shift Stats - Clearly Separating Cash vs Transfer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">1. เงินทอนตั้งต้น (Float)</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                ฿{currentShift.startingCash.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">เงินก้นลิ้นชักตอนเปิดกะ</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> 2. ยอดขายเงินสดรวม
              </span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                +฿{liveCashSales.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600">เงินสดที่รับเพิ่มเข้าลิ้นชัก</span>
            </div>

            <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
              <span className="text-xs text-sky-800 font-semibold flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> ยอดขาย PromptPay
              </span>
              <div className="text-lg font-bold font-mono text-sky-700 mt-1">
                ฿{livePromptPaySales.toLocaleString()}
              </div>
              <span className="text-[10px] text-sky-600">เข้าบัญชีธนาคาร (ไม่เข้าลิ้นชัก)</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">จำนวนบิลที่ขายได้</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {liveTxCount} บิล
              </div>
              <span className="text-[10px] text-slate-400">
                รวมยอดขาย: ฿{(liveCashSales + livePromptPaySales).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-amber-700" />
                <span>รวมเงินสดที่ต้องมีในลิ้นชัก ณ ขณะนี้ (Expected Cash):</span>
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                คำนวณจาก: เงินทอนตั้งต้น (฿{currentShift.startingCash.toLocaleString()}) + ยอดขายสดสุทธิ (+฿{liveCashSales.toLocaleString()})
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-amber-800">
                ฿{expectedCashInDrawer.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">(*ไม่นับรวมยอดโอน PromptPay)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 max-w-lg mx-auto no-print">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">ยังไม่มีการเปิดกะ</h2>
            <p className="text-xs text-slate-500">กรุณาระบุเงินทอนตั้งต้นเพื่อเริ่มรับชำระเงินหน้าร้าน</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                พนักงานผู้เปิดกะ
              </label>
              <input
                type="text"
                value={currentUser.name}
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เงินทอนตั้งต้นในลิ้นชัก (บาท)
              </label>
              <input
                type="number"
                value={startingCash}
                onChange={e => setStartingCash(e.target.value)}
                className="w-full text-xl font-mono font-bold px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <button
              onClick={handleOpenShift}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ยืนยันเปิดกะและเริ่มขาย</span>
            </button>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT CALCULATOR MODAL */}
      {isClosingShift && currentShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              <span>ปิดกะและตรวจนับเงินสดในลิ้นชัก</span>
            </h3>

            {/* Shift Breakdown */}
            <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2.5 border border-slate-200">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                สูตรคำนวณเงินสดที่ต้องมีในลิ้นชัก:
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>(ก) เงินทอนตั้งต้น (Float):</span>
                  <span className="font-bold">฿{currentShift.startingCash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>(ข) + ยอดขายเงินสดในกะ:</span>
                  <span className="font-bold">+฿{liveCashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-300 font-bold text-sm text-slate-900">
                  <span>= ยอดรวมในลิ้นชักที่ต้องนับได้ (ก + ข):</span>
                  <span className="text-amber-700 text-base">฿{expectedCashInDrawer.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between text-sky-800 pt-1 text-[11px]">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  <span>ยอดโอน PromptPay (เข้าบัญชีธนาคาร ไม่เข้าลิ้นชัก):</span>
                </span>
                <span className="font-mono font-bold">฿{livePromptPaySales.toLocaleString()}</span>
              </div>
            </div>

            {/* Input actual counted cash */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  ใส่ยอดเงินสดที่นับได้จริงจากลิ้นชัก (บาท) *
                </label>
                <button
                  type="button"
                  onClick={() => setClosingCash(expectedCashInDrawer.toString())}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold rounded-lg transition"
                >
                  ⚡ นับได้ตรงพอดี (฿{expectedCashInDrawer.toLocaleString()})
                </button>
              </div>

              <input
                type="number"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                placeholder={`กรอกยอดรวม เช่น ${expectedCashInDrawer}`}
                autoFocus
                className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-slate-50 border-2 border-amber-400 rounded-2xl outline-none focus:bg-white"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                * ต้องนับรวมทั้งเงินทอนเดิม ({currentShift.startingCash.toLocaleString()} บ.) + เงินสดที่ขายได้ ({liveCashSales.toLocaleString()} บ.)
              </span>
            </div>

            {/* Real-Time Live Variance Calculation */}
            {closingCash !== '' && (
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                liveDifference === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : liveDifference < 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}>
                <span>ผลต่างการตรวจนับ:</span>
                <span className="text-base font-mono">
                  {liveDifference === 0 
                    ? '✓ ยอดตรงพอดี ครบถ้วน (0 บาท)' 
                    : liveDifference > 0 
                    ? `+฿${liveDifference.toLocaleString()} (เงินเกิน)` 
                    : `-฿${Math.abs(liveDifference).toLocaleString()} (เงินขาด)`}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุส่งต่อกะ / ส่งเงิน</label>
              <textarea
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="เช่น ส่งเงินให้เจ้าของร้าน 450 บาท เหลือก้นลิ้นชัก 1,000 บาท..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClosingShift(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                disabled={closingCash === ''}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow transition"
              >
                ยืนยันปิดกะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE SHIFT HANDOVER REPORT SLIP (ใบปิดกะ / ส่งมอบกะ เดิมที่สมบูรณ์) */}
      {printedShift && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>สรุปปิดกะสำเร็จแล้ว! ต้องการพิมพ์ใบส่งมอบกะหรือไม่?</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrintedShift(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handlePrintSlip}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบส่งมอบกะ (A4)</span>
              </button>
            </div>
          </div>

          <div
            id="printable-shift-handover"
            className="text-xs font-mono p-6 bg-slate-50 rounded-2xl space-y-1.5 max-w-sm mx-auto border border-slate-200"
          >
            <div className="text-center font-bold text-sm uppercase tracking-wide">=== ใบสรุปส่งมอบกะแคชเชียร์ ===</div>
            <div className="text-center text-[10px] text-slate-500 font-sans">KORAT CAT x เรือนโคราชเฉลิมวัฒนา</div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div>แคชเชียร์: {printedShift.cashierName}</div>
            <div>เปิดกะ: {new Date(printedShift.startTime).toLocaleString('th-TH')}</div>
            <div>ปิดกะ: {printedShift.endTime ? new Date(printedShift.endTime).toLocaleString('th-TH') : '-'}</div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="flex justify-between">
              <span>เงินทอนตั้งต้น (Float):</span>
              <span>฿{printedShift.startingCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>ยอดขายเงินสด:</span>
              <span>฿{(printedShift.totalCashSales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sky-700">
              <span>ยอดขาย PromptPay (เข้าบัญชี):</span>
              <span>฿{(printedShift.totalPromptPaySales || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>ยอดขายรวมกะนี้:</span>
              <span>฿{((printedShift.totalCashSales || 0) + (printedShift.totalPromptPaySales || 0)).toLocaleString()}</span>
            </div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="flex justify-between font-bold">
              <span>รวมเงินสดที่ต้องมีในลิ้นชัก:</span>
              <span>฿{(printedShift.closingCashExpected || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>เงินสดที่นับได้จริง:</span>
              <span>฿{(printedShift.closingCashActual || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-800">
              <span>ผลต่าง (ขาด/เกิน):</span>
              <span>
                {(printedShift.cashDifference || 0) === 0
                  ? '✓ ยอดตรงพอดี (0)'
                  : (printedShift.cashDifference || 0) > 0
                  ? `+฿${(printedShift.cashDifference || 0).toLocaleString()} (เงินเกิน)`
                  : `-฿${Math.abs(printedShift.cashDifference || 0).toLocaleString()} (เงินขาด)`}
              </span>
            </div>
            {printedShift.notes && (
              <div className="mt-2 text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                หมายเหตุ: {printedShift.notes}
              </div>
            )}
            <div className="border-b border-dashed border-slate-400 my-3"></div>
            <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-4 font-sans text-slate-700">
              <div>
                ลงชื่อ............................<br />
                ( ผู้ส่งมอบกะ )
              </div>
              <div>
                ลงชื่อ............................<br />
                ( ผู้รับมอบกะ / แอดมิน )
              </div>
            </div>
          </div>
        </div>
      )}
      {/* RECENT SHIFTS HISTORY TABLE */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 no-print space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base text-slate-900">
              ประวัติการเปิด-ปิดกะล่าสุด ({pastShifts.length} รายการล่าสุด)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadPastShifts}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชประวัติ
          </button>
        </div>

        {pastShifts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            ยังไม่มีประวัติการเปิดกะในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3">แคชเชียร์</th>
                  <th className="p-3">เวลาเปิดกะ</th>
                  <th className="p-3">เวลาปิดกะ</th>
                  <th className="p-3 text-right">เงินทอนตั้งต้น</th>
                  <th className="p-3 text-right">ยอดขายสด</th>
                  <th className="p-3 text-right">ยอดขายโอน</th>
                  <th className="p-3 text-right">เงินนับได้จริง</th>
                  <th className="p-3 text-right">ผลต่าง</th>
                  <th className="p-3 text-center">ใบส่งมอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastShifts.map(s => {
                  const diff = s.cashDifference || 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.status === 'OPEN' ? '🟢 กำลังเปิดกะ' : '🔒 ปิดกะแล้ว'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{s.cashierName}</td>
                      <td className="p-3 text-slate-500">{new Date(s.startTime).toLocaleString('th-TH')}</td>
                      <td className="p-3 text-slate-500">{s.endTime ? new Date(s.endTime).toLocaleString('th-TH') : '-'}</td>
                      <td className="p-3 text-right font-mono">฿{s.startingCash.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-bold">฿{(s.totalCashSales || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-sky-700">฿{(s.totalPromptPaySales || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">
                        {s.closingCashActual !== undefined ? `฿${s.closingCashActual.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {s.closingCashActual !== undefined ? (
                          <span className={diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            {diff > 0 ? `+฿${diff.toLocaleString()}` : diff < 0 ? `-฿${Math.abs(diff).toLocaleString()}` : '✓ พอดี (0)'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPrintedShift(s)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border border-amber-200"
                        >
                          <Printer className="w-3 h-3" /> พิมพ์ A4
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
