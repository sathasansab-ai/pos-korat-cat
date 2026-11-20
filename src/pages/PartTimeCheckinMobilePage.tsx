// src/pages/PartTimeCheckinMobilePage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Calendar, 
  Sparkles, 
  Coffee, 
  Coins, 
  History, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { db, seedInitialData } from '../db';
import type { PartTimeStaff, PartTimeAttendance, StoreSettings } from '../types';
import { SoundEffects } from '../services/soundEffects';
import { CloudSync } from '../services/cloudSync';

export const PartTimeCheckinMobilePage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [staffList, setStaffList] = useState<PartTimeStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Active attendance state
  const [activeAttendance, setActiveAttendance] = useState<PartTimeAttendance | null>(null);
  const [recentRecords, setRecentRecords] = useState<PartTimeAttendance[]>([]);
  const [completedSummary, setCompletedSummary] = useState<PartTimeAttendance | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setIsSyncingCloud(true);
    try {
      // 1. ตรวจสอบข้อมูลในเครื่องก่อน
      let [s, st] = await Promise.all([
        db.settings.get('current_store_settings'),
        db.partTimeStaff.filter(p => p.isActive !== false).toArray()
      ]);

      if (st.length === 0) {
        await seedInitialData();
        st = await db.partTimeStaff.filter(p => p.isActive !== false).toArray();
      }

      if (s) setSettings(s);
      setStaffList(st);
      if (st.length > 0 && !selectedStaffId) {
        setSelectedStaffId(st[0].id);
      }

      // 2. ดึงข้อมูลพนักงานและการลงเวลาล่าสุดจาก Supabase Cloud
      if (navigator.onLine) {
        const cloudSettings = await CloudSync.pullStoreSettings();
        if (cloudSettings) {
          setSettings(cloudSettings);
          const freshStaff = await db.partTimeStaff.filter(p => p.isActive !== false).toArray();
          setStaffList(freshStaff);
          if (freshStaff.length > 0) {
            setSelectedStaffId(prev => prev || freshStaff[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Error loading staff data on mobile', err);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selected staff changes, check their attendance status
  const checkStaffStatus = async (staffId: string) => {
    if (!staffId) {
      setActiveAttendance(null);
      setRecentRecords([]);
      return;
    }

    // 1. Check for open clock-in record
    const openRecord = await db.partTimeAttendance
      .where({ staffId })
      .filter(a => (a.status === 'CLOCKED_IN' || a.status === 'CHECKED_IN') && !a.checkOutTime)
      .last();
    setActiveAttendance(openRecord || null);

    // 2. Fetch last 5 records
    const recents = await db.partTimeAttendance
      .where({ staffId })
      .reverse()
      .limit(5)
      .toArray();
    setRecentRecords(recents);
  };

  useEffect(() => {
    if (selectedStaffId) {
      setPinError('');
      setEnteredPin('');
      setCompletedSummary(null);
      checkStaffStatus(selectedStaffId);
    }
  }, [selectedStaffId]);

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  // Handle Clock-In
  const handleClockIn = async () => {
    if (!selectedStaff) return;

    // Check PIN if required
    if (selectedStaff.pin && selectedStaff.pin !== enteredPin.trim()) {
      setPinError('รหัส PIN 4 หลักไม่ถูกต้อง');
      SoundEffects.playWarning();
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const newAttendance: PartTimeAttendance = {
        id: `att-${Date.now()}`,
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        date: now.toISOString().slice(0, 10),
        checkInTime: now.toISOString(),
        hourlyRate: selectedStaff.hourlyRate || 40,
        status: 'CHECKED_IN',
        checkInMethod: 'QR_MOBILE'
      };

      await db.partTimeAttendance.add(newAttendance);
      if (navigator.onLine) {
        CloudSync.pushPartTimeAttendance(newAttendance).catch(() => {});
      }
      SoundEffects.playSuccess();
      setCompletedSummary(null);
      await checkStaffStatus(selectedStaff.id);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกเวลา');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Clock-Out
  const handleClockOut = async () => {
    if (!selectedStaff || !activeAttendance) return;

    // Check PIN if required
    if (selectedStaff.pin && selectedStaff.pin !== enteredPin.trim()) {
      setPinError('รหัส PIN 4 หลักไม่ถูกต้อง');
      SoundEffects.playWarning();
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const inTime = new Date(activeAttendance.checkInTime);
      const rawDurationMinutes = Math.max(0, Math.round((now.getTime() - inTime.getTime()) / 60000));
      
      // Rule: If worked >= 6 hours (360 mins), deduct 1 hour break (60 mins)
      const breakDeductionMinutes = rawDurationMinutes >= 360 ? 60 : 0;
      const payableDurationMinutes = Math.max(0, rawDurationMinutes - breakDeductionMinutes);
      const payableHours = parseFloat((payableDurationMinutes / 60).toFixed(2));
      const rate = activeAttendance.hourlyRate || selectedStaff.hourlyRate || 40;
      const totalWage = Math.round(payableHours * rate);

      const updatedRecord: PartTimeAttendance = {
        ...activeAttendance,
        checkOutTime: now.toISOString(),
        rawDurationMinutes,
        breakDeductionMinutes,
        payableDurationMinutes,
        payableHours,
        totalWage,
        status: 'CHECKED_OUT',
        checkOutMethod: 'QR_MOBILE'
      };

      await db.partTimeAttendance.put(updatedRecord);
      if (navigator.onLine) {
        CloudSync.pushPartTimeAttendance(updatedRecord).catch(() => {});
      }
      SoundEffects.playSuccess();
      setCompletedSummary(updatedRecord);
      setActiveAttendance(null);
      await checkStaffStatus(selectedStaff.id);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกเวลาออกงาน');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Elapsed Live Time
  const getElapsedString = (isoStart: string) => {
    const start = new Date(isoStart).getTime();
    const diff = Math.max(0, currentTime.getTime() - start);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${hrs} ชม. ${mins} นาที ${secs} วิ`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0d1117] to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans select-none">
      
      {/* Top Header */}
      <div className="text-center space-y-2 pt-2 pb-4 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>KORAT CAT BOUTIQUE • ระบบลงเวลาพาร์ทไทม์</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          {settings?.storeName || 'เรือนโคราชเฉลิมวัฒนา'}
        </h1>
        <p className="text-xs text-slate-400">
          สแกน QR Code เข้า-ออกงาน และคำนวณชั่วโมงค่าจ้างรายวัน
        </p>
      </div>

      {/* Main Body */}
      <div className="my-auto py-4 max-w-md mx-auto w-full space-y-4">
        
        {/* Live Clock Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-1 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            {currentTime.toLocaleDateString('th-TH', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight">
            {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            เวลาเปิดร้าน: 09:00 - 18:00 น. • ค่าจ้างเริ่มต้น ฿40/ชม.
          </p>
        </div>

        {/* Staff Selection Dropdown */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>เลือกชื่อพนักงานพาร์ทไทม์:</span>
            </label>

            <button
              type="button"
              onClick={loadData}
              disabled={isSyncingCloud}
              className="text-[11px] text-teal-300 hover:text-teal-200 flex items-center gap-1 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'ดึง Cloud...' : 'รีเฟรช'}</span>
            </button>
          </div>

          {staffList.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
              <p className="text-xs font-bold text-amber-300">
                ยังไม่พบรายชื่อพนักงานพาร์ทไทม์ในระบบ
              </p>
              <p className="text-[11px] text-slate-400">
                กรุณาให้แอดมินหรือเจ้าของร้านเพิ่มรายชื่อที่เครื่อง POS หน้าร้าน แล้วกดปุ่มดึงข้อมูล
              </p>
              <button
                type="button"
                onClick={loadData}
                disabled={isSyncingCloud}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>กดดึงข้อมูลพนักงานจาก Cloud ทันที</span>
              </button>
            </div>
          ) : (
            <>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-amber-400"
              >
                {staffList.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} {st.nickname ? `(${st.nickname})` : ''} - ฿{st.hourlyRate || 40}/ชม.
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Optional PIN Input if staff has PIN configured */}
          {selectedStaff?.pin && (
            <div className="space-y-1 pt-1">
              <label className="block text-[11px] font-bold text-slate-400">
                รหัสยืนยัน PIN 4 หลัก:
              </label>
              <input
                type="password"
                maxLength={4}
                value={enteredPin}
                onChange={e => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                placeholder="กรอก PIN 4 หลัก"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-amber-400"
              />
              {pinError && (
                <p className="text-[11px] text-rose-400 font-bold text-center mt-1">
                  ⚠️ {pinError}
                </p>
              )}
            </div>
          )}

          {/* Check-In / Check-Out Action Button */}
          {activeAttendance ? (
            /* ACTIVE: ALREADY CLOCKED IN -> SHOW CLOCK OUT BUTTON */
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl text-center space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                  กำลังทำงานอยู่ (Clocked In)
                </span>
                <div className="text-xs text-slate-300 mt-1">
                  เข้างานเมื่อ: <b>{new Date(activeAttendance.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</b>
                </div>
                <div className="text-lg font-black font-mono text-emerald-400 pt-0.5">
                  ทำงานมาแล้ว: {getElapsedString(activeAttendance.checkInTime)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleClockOut}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-500 hover:to-rose-700 active:scale-98 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-5 h-5" />
                <span>🔴 สแกนออกงาน (Check-Out)</span>
              </button>
            </div>
          ) : (
            /* NOT CLOCKED IN -> SHOW CLOCK IN BUTTON */
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClockIn}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-98 text-white rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-2 transition"
              >
                <LogIn className="w-5 h-5" />
                <span>🟢 สแกนเข้างาน (Check-In)</span>
              </button>
            </div>
          )}

          {/* Break Deduction Policy Hint */}
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Coffee className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <b>เงื่อนไขเวลาพัก:</b> เมื่อทำงานตั้งแต่ 6 ชั่วโมงขึ้นไป ระบบจะคำนวณหักเวลาพัก 1 ชั่วโมงโดยอัตโนมัติ (เช่น 09:00 - 18:00 = 8 ชม. สุทธิ)
            </span>
          </div>
        </div>

        {/* SUMMARY CARD (Appears immediately after clock-out) */}
        {completedSummary && (
          <div className="p-4 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-3xl space-y-2.5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-extrabold text-sm text-white">บันทึกเวลาออกงานสำเร็จเรียบร้อย!</h3>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400">พนักงาน:</span>
                <span className="font-bold text-white">{completedSummary.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เวลาเข้า - ออก:</span>
                <span className="font-mono text-slate-200">
                  {new Date(completedSummary.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(completedSummary.checkOutTime || '').toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เวลาปฏิบัติงานจริง:</span>
                <span className="font-mono text-slate-200">
                  {Math.floor((completedSummary.rawDurationMinutes || 0) / 60)} ชม. {(completedSummary.rawDurationMinutes || 0) % 60} นาที
                </span>
              </div>
              {completedSummary.breakDeductionMinutes ? (
                <div className="flex justify-between text-amber-400">
                  <span>หักเวลาพัก (กะยาว ≥ 6 ชม.):</span>
                  <span className="font-mono font-bold">-1 ชม.</span>
                </div>
              ) : null}
              <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold">
                <span className="text-slate-300">ชั่วโมงคิดค่าจ้างสุทธิ:</span>
                <span className="font-mono text-emerald-300">{completedSummary.payableHours} ชม.</span>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-800">
                <span className="text-sm font-black text-amber-300">ค่าจ้างวันนี้ (฿40/ชม.):</span>
                <span className="text-xl font-black font-mono text-amber-400">
                  ฿{completedSummary.totalWage?.toLocaleString()} บาท
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              ขอบคุณสำหรับการทำงานอย่างเต็มที่ในวันนี้ครับ ✨
            </p>
          </div>
        )}

        {/* Recent Attendance History (Last 5 records) */}
        {recentRecords.length > 0 && (
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>ประวัติการลงเวลาล่าสุด ({recentRecords.length} วัน)</span>
            </h4>

            <div className="divide-y divide-slate-800 text-xs">
              {recentRecords.map(rec => (
                <div key={rec.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-200 block">
                      {new Date(rec.checkInTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rec.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ยังไม่ออก'}
                    </span>
                  </div>

                  <div className="text-right">
                    {(rec.status === 'CHECKED_OUT' || rec.status === 'CLOCKED_OUT') ? (
                      <>
                        <span className="text-emerald-400 font-bold font-mono block">
                          ฿{rec.totalWage?.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rec.payableHours} ชม.
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        กำลังทำกะ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 pt-4 border-t border-slate-800">
        KORAT CAT Haute Couture Atelier • แฟชั่นและงานหัตถศิลป์เมืองโคราช
      </div>

    </div>
  );
};
