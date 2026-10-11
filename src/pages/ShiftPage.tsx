// src/pages/ShiftPage.tsx
import React, { useState } from 'react';
import { Clock, Banknote, ShieldAlert, CheckCircle2, History, AlertTriangle } from 'lucide-react';
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

    await db.shifts.update(activeShift.id, {
      endTime: new Date().toISOString(),
      closingCashExpected: expected,
      closingCashActual: actual,
      cashDifference: diff,
      notes: closingNotes,
      status: 'CLOSED'
    });

    setIsClosingShift(false);
    setClosingCash('');
    setClosingNotes('');
    onShiftUpdated();
    alert(`ปิดกะเรียบร้อยแล้ว!\nยอดเงินที่ควรมี: ฿${expected.toLocaleString()}\nยอดที่นับได้: ฿${actual.toLocaleString()}\nผลต่าง: ฿${diff.toLocaleString()}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            <span>ระบบจัดการกะแคชเชียร์ (Shift Control)</span>
          </h1>
          <p className="text-xs text-slate-500">บันทึกเงินทอนตั้งต้น และตรวจนับเงินสดในลิ้นชักเพื่อป้องกันเงินสูญหาย</p>
        </div>
      </div>

      {/* Active Shift Card or Open Shift Form */}
      {activeShift ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                🟢 กำลังเปิดกะใช้งาน
              </span>
              <h2 className="text-lg font-bold text-slate-800 mt-2">
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
              🔒 สรุปและปิดกะ
            </button>
          </div>

          {/* Current Shift Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-500">เงินทอนตั้งต้น (Float)</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                ฿{activeShift.startingCash.toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-500">ยอดขายเงินสด</span>
              <div className="text-lg font-bold font-mono text-emerald-600 mt-1">
                ฿{(activeShift.totalCashSales || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-500">ยอดขาย PromptPay</span>
              <div className="text-lg font-bold font-mono text-sky-600 mt-1">
                ฿{(activeShift.totalPromptPaySales || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-500">จำนวนบิลทั้งหมด</span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-1">
                {activeShift.totalTransactions || 0} บิล
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              💵 ยอดเงินสดที่ควรมีในลิ้นชัก ณ ขณะนี้ (เงินทอน + ยอดขายสด):
            </span>
            <span className="text-xl font-black font-mono text-emerald-700">
              ฿{(activeShift.startingCash + (activeShift.totalCashSales || 0)).toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">ยังไม่มีการเปิดกะ</h2>
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
                className="w-full text-xl font-mono font-bold px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={handleOpenShift}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ยืนยันเปิดกะและเริ่มขาย</span>
            </button>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isClosingShift && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>ปิดกะและนับเงินสดในลิ้นชัก</span>
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">เงินทอนตั้งต้น:</span>
                <span className="font-mono">฿{activeShift.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดขายเงินสด:</span>
                <span className="font-mono">฿{(activeShift.totalCashSales || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                <span>ยอดเงินสดที่ระบบคาดหมาย:</span>
                <span className="font-mono text-emerald-600">
                  ฿{(activeShift.startingCash + (activeShift.totalCashSales || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ยอดเงินสดที่นับได้จริงจากลิ้นชัก (บาท)
              </label>
              <input
                type="number"
                value={closingCash}
                onChange={e => setClosingCash(e.target.value)}
                placeholder="นับเหรียญและธนบัตรจริงแล้วใส่ยอดที่นี่..."
                autoFocus
                className="w-full text-xl font-mono font-bold px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุเพิ่มเติม</label>
              <textarea
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="เช่น ส่งเงินให้เจ้าของร้าน 3,000 บาท..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsClosingShift(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCloseShift}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow transition"
              >
                ยืนยันการปิดกะ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
