// src/pages/ShiftPage.tsx
import React, { useState } from 'react';
import { Clock, Banknote, ShieldAlert, CheckCircle2, History, AlertTriangle, QrCode, Printer, Calculator } from 'lucide-react';
import { db } from '../db';
import type { Shift, UserAccount } from '../types';

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
    onShiftUpdated();
  };

  // Close Shift
  const handleCloseShift = async () => {
    if (!activeShift) return;

    const actual = parseFloat(closingCash) || 0;
    const expected = activeShift.startingCash + (activeShift.totalCashSales || 0);
    const diff = actual - expected;

    const updated: Shift = {
      ...activeShift,
      endTime: new Date().toISOString(),
      closingCashExpected: expected,
      closingCashActual: actual,
      cashDifference: diff,
      notes: closingNotes,
      status: 'CLOSED'
    };

    await db.shifts.update(activeShift.id, updated);

    setPrintedShift(updated);
    setIsClosingShift(false);
    setClosingCash('');
    setClosingNotes('');
    onShiftUpdated();
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Live calculation values
  const expectedCashInDrawer = activeShift ? activeShift.startingCash + (activeShift.totalCashSales || 0) : 0;
  const countedCash = parseFloat(closingCash) || 0;
  const liveDifference = countedCash - expectedCashInDrawer;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            <span>ระบบจัดการกะ & ตรวจนับเงินสดแคชเชียร์ (Shift Control)</span>
          </h1>
          <p className="text-xs text-slate-500">
            คำนวณแยกยอดเงินสดในลิ้นชัก และยอดโอน PromptPay บัญชีธนาคารอย่างแม่นยำ ป้องกันเงินผิดพลาด
          </p>
        </div>
      </div>

      {/* Active Shift Card or Open Shift Form */}
      {activeShift ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                🟢 กำลังเปิดกะใช้งาน
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                ผู้รับผิดชอบกะ: {activeShift.cashierName}
              </h2>
              <p className="text-xs text-slate-500">
                เริ่มกะเวลา: {new Date(activeShift.startTime).toLocaleString('th-TH')}
              </p>
            </div>
            <button
              onClick={() => setIsClosingShift(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow transition"
            >
              🔒 ตรวจนับและปิดกะ
            </button>
          </div>

          {/* Current Shift Stats - Clearly Separating Cash vs Transfer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">เงินทอนตั้งต้น (Float)</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                ฿{activeShift.startingCash.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">เงินสดตอนเปิดกะ</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> ยอดขายเงินสด
              </span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                ฿{(activeShift.totalCashSales || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600">เข้าลิ้นชักเงินสด</span>
            </div>

            <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
              <span className="text-xs text-sky-800 font-semibold flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> ยอดขาย PromptPay
              </span>
              <div className="text-lg font-bold font-mono text-sky-700 mt-1">
                ฿{(activeShift.totalPromptPaySales || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-sky-600">เข้าบัญชีธนาคาร (ไม่เข้าลิ้นชัก)</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">จำนวนบิลทั้งหมด</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {activeShift.totalTransactions || 0} บิล
              </div>
              <span className="text-[10px] text-slate-400">
                รวมยอด: ฿{((activeShift.totalCashSales || 0) + (activeShift.totalPromptPaySales || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900">
                💵 ยอดเงินสดที่ควรมีในลิ้นชัก ณ ขณะนี้:
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                (เงินทอนตั้งต้น ฿{activeShift.startingCash.toLocaleString()} + ยอดขายเงินสด ฿{(activeShift.totalCashSales || 0).toLocaleString()} *ไม่รวมยอดโอน)
              </p>
            </div>
            <span className="text-2xl font-black font-mono text-amber-700">
              ฿{expectedCashInDrawer.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 max-w-lg mx-auto">
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
      {isClosingShift && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              <span>ปิดกะและตรวจนับเงินสดในลิ้นชัก</span>
            </h3>

            {/* Shift Breakdown */}
            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">เงินทอนตั้งต้น (Float):</span>
                <span className="font-mono">฿{activeShift.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>+ ยอดขายเงินสด:</span>
                <span className="font-mono">฿{(activeShift.totalCashSales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sky-700">
                <span>📱 ยอดโอนเข้าบัญชี (ไม่นับรวมในลิ้นชัก):</span>
                <span className="font-mono">฿{(activeShift.totalPromptPaySales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>ยอดเงินสดที่ระบบคาดหมายในลิ้นชัก:</span>
                <span className="font-mono text-base text-amber-700">
                  ฿{expectedCashInDrawer.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Input actual counted cash */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                ยอดเงินสดที่นับได้จริงจากลิ้นชัก (บาท) *
              </label>
              <input
                type="number"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                placeholder="นับเหรียญและธนบัตรจริงแล้วใส่ยอดที่นี่..."
                autoFocus
                className="w-full text-2xl font-mono font-bold px-4 py-2.5 bg-slate-50 border-2 border-amber-400 rounded-2xl outline-none focus:bg-white"
              />
            </div>

            {/* Real-Time Live Variance Calculation */}
            {closingCash !== '' && (
              <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                liveDifference === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : liveDifference < 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}>
                <span>ผลต่างเงินในลิ้นชัก:</span>
                <span className="text-base font-mono">
                  {liveDifference === 0 ? '✓ ยอดตรงพอดี (0 บาท)' : liveDifference > 0 ? `+฿${liveDifference.toLocaleString()} (เงินเกิน)` : `-฿${Math.abs(liveDifference).toLocaleString()} (เงินขาด)`}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุส่งต่อกะ / ส่งเงิน</label>
              <textarea
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="เช่น ส่งเงินให้เจ้าของร้าน 3,000 บาท เหลือก้นลิ้นชัก 1,000 บาท..."
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
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow transition"
              >
                ยืนยันการปิดกะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE SHIFT HANDOVER REPORT SLIP */}
      {printedShift && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>สรุปปิดกะสำเร็จแล้ว! ต้องการพิมพ์ใบส่งมอบกะหรือไม่?</span>
            </div>
            <button
              onClick={handlePrintSlip}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบส่งมอบกะ (Shift Z-Report)</span>
            </button>
          </div>

          <div id="printable-thermal-receipt" className="text-xs font-mono p-4 bg-slate-50 rounded-2xl space-y-1">
            <div className="text-center font-bold text-sm">=== ใบสรุปส่งมอบกะแคชเชียร์ ===</div>
            <div className="text-center text-[10px] text-slate-500">KORAT CAT x เรือนโคราชเฉลิมวัฒนา</div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div>แคชเชียร์: {printedShift.cashierName}</div>
            <div>เปิดกะ: {new Date(printedShift.startTime).toLocaleString('th-TH')}</div>
            <div>ปิดกะ: {printedShift.endTime ? new Date(printedShift.endTime).toLocaleString('th-TH') : '-'}</div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="flex justify-between"><span>เงินทอนตั้งต้น:</span><span>฿{printedShift.startingCash.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>ยอดขายสด:</span><span>฿{printedShift.totalCashSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>ยอดขาย PromptPay:</span><span>฿{printedShift.totalPromptPaySales.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold"><span>ยอดขายรวม:</span><span>฿{(printedShift.totalCashSales + printedShift.totalPromptPaySales).toLocaleString()}</span></div>
            <div className="border-b border-dashed border-slate-400 my-2"></div>
            <div className="flex justify-between"><span>เงินสดที่ควรมี:</span><span>฿{(printedShift.closingCashExpected || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span>เงินสดนับได้จริง:</span><span>฿{(printedShift.closingCashActual || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold">
              <span>ผลต่าง (ขาด/เกิน):</span>
              <span>{(printedShift.cashDifference || 0) === 0 ? '✓ พอดี' : `฿${printedShift.cashDifference?.toLocaleString()}`}</span>
            </div>
            {printedShift.notes && <div className="mt-2 text-[10px]">หมายเหตุ: {printedShift.notes}</div>}
            <div className="border-b border-dashed border-slate-400 my-3"></div>
            <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-4">
              <div>ลงชื่อ............................<br/>( ผู้ส่งมอบกะ )</div>
              <div>ลงชื่อ............................<br/>( ผู้รับมอบกะ / แอดมิน )</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
