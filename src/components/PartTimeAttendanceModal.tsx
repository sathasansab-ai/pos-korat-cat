// src/components/PartTimeAttendanceModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  QrCode, 
  Users, 
  Coins, 
  Calendar, 
  CheckCircle2, 
  LogOut, 
  LogIn, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Copy, 
  ExternalLink, 
  Monitor, 
  Coffee, 
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { db } from '../db';
import type { 
  PartTimeStaff, 
  PartTimeAttendance, 
  UserAccount, 
  Shift, 
  StoreSettings 
} from '../types';
import { DualMonitorSync } from '../services/dualMonitorSync';
import { SoundEffects } from '../services/soundEffects';

interface PartTimeAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  activeShift?: Shift | null;
  onAttendanceChanged?: () => void;
}

type TabType = 'QR_CHECKIN' | 'PAYROLL_REPORT' | 'STAFF_LIST';
type PeriodFilterType = '15_DAYS_1' | '15_DAYS_2' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export const PartTimeAttendanceModal: React.FC<PartTimeAttendanceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeShift,
  onAttendanceChanged
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('QR_CHECKIN');
  const [staffList, setStaffList] = useState<PartTimeStaff[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<PartTimeAttendance[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Broadcast to 2nd screen state
  const [isBroadcastTo2ndScreen, setIsBroadcastTo2ndScreen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Payroll Filter states
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('15_DAYS_1');
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<PartTimeStaff | null>(null);

  // Staff Form Modal State
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<PartTimeStaff | null>(null);
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormNickname, setStaffFormNickname] = useState('');
  const [staffFormPhone, setStaffFormPhone] = useState('');
  const [staffFormHourlyRate, setStaffFormHourlyRate] = useState('40');
  const [staffFormPin, setStaffFormPin] = useState('');
  const [staffFormNotes, setStaffFormNotes] = useState('');

  // Manual Attendance Record Modal State
  const [isManualRecordOpen, setIsManualRecordOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualInTime, setManualInTime] = useState('09:00');
  const [manualOutTime, setManualOutTime] = useState('18:00');
  const [manualNotes, setManualNotes] = useState('บันทึกเวลาโดยแคชเชียร์/ผู้จัดการ');

  // Print Mode State
  const [printingPayslipStaff, setPrintingPayslipStaff] = useState<PartTimeStaff | null>(null);

  // Mobile check-in URL
  const mobileCheckinUrl = useMemo(() => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?staff_checkin=true#/checkin`;
  }, []);

  const loadAllData = async () => {
    const [staff, attendance, s] = await Promise.all([
      db.partTimeStaff.toArray(),
      db.partTimeAttendance.orderBy('checkInTime').reverse().toArray(),
      db.settings.get('current_store_settings')
    ]);
    setStaffList(staff);
    setAttendanceRecords(attendance);
    if (s) setSettings(s);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    } else {
      // Clear 2nd screen broadcast on close if it was active
      if (isBroadcastTo2ndScreen) {
        DualMonitorSync.broadcast({
          cart: [],
          subtotal: 0,
          promoDiscount: 0,
          netTotal: 0,
          upsellPrompts: [],
          staffCheckinQr: null
        });
        setIsBroadcastTo2ndScreen(false);
      }
    }
  }, [isOpen]);

  // Toggle broadcast QR to 2nd screen
  const handleToggle2ndScreen = (enable: boolean) => {
    setIsBroadcastTo2ndScreen(enable);
    DualMonitorSync.broadcast({
      cart: [],
      subtotal: 0,
      promoDiscount: 0,
      netTotal: 0,
      upsellPrompts: [],
      staffCheckinQr: enable
        ? {
            show: true,
            qrUrl: mobileCheckinUrl,
            storeName: settings?.storeName
          }
        : null
    });
  };

  // Currently active checked-in records
  const activeAttendances = useMemo(() => {
    return attendanceRecords.filter(r => r.status === 'CHECKED_IN' && !r.checkOutTime);
  }, [attendanceRecords]);

  // Map of staffId -> active attendance
  const activeStaffMap = useMemo(() => {
    const map = new Map<string, PartTimeAttendance>();
    activeAttendances.forEach(a => map.set(a.staffId, a));
    return map;
  }, [activeAttendances]);

  // Quick Cashier Manual Check-in
  const handleCashierClockIn = async (staff: PartTimeStaff) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Check if already checked in
    const existing = activeStaffMap.get(staff.id);
    if (existing) {
      alert(`⚠️ ${staff.name} ได้ลงเวลาเข้างานไว้แล้วตั้งแต่ ${new Date(existing.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`);
      return;
    }

    const record: PartTimeAttendance = {
      id: `pt-att-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      date: dateStr,
      checkInTime: now.toISOString(),
      hourlyRate: staff.hourlyRate || 40,
      status: 'CHECKED_IN',
      verifiedByShiftId: activeShift?.id,
      verifiedByCashierName: currentUser?.name || 'แคชเชียร์หน้าร้าน',
      createdAt: now.toISOString()
    };

    await db.partTimeAttendance.add(record);
    SoundEffects.playSuccess();
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  // Quick Cashier Manual Check-out
  const handleCashierClockOut = async (staff: PartTimeStaff) => {
    const activeRec = activeStaffMap.get(staff.id);
    if (!activeRec) {
      alert(`⚠️ ไม่พบข้อมูลการเข้างานของ ${staff.name}`);
      return;
    }

    const inTime = new Date(activeRec.checkInTime);
    const outTime = new Date();
    const rawMinutes = Math.max(0, Math.round((outTime.getTime() - inTime.getTime()) / 60000));
    
    // Auto-deduct 1 hour break if worked >= 6 hours (360 minutes)
    const breakDeductionMinutes = rawMinutes >= 360 ? 60 : 0;
    const payableDurationMinutes = Math.max(0, rawMinutes - breakDeductionMinutes);
    const payableHours = parseFloat((payableDurationMinutes / 60).toFixed(2));
    const hourlyRate = activeRec.hourlyRate || staff.hourlyRate || 40;
    const totalWage = Math.round(payableHours * hourlyRate);

    const confirmMsg = `ยืนยันลงเวลาออกงาน: ${staff.name}\n\n` +
      `• เวลาเข้า: ${inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n` +
      `• เวลาออก: ${outTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n` +
      `• เวลาทำงานจริง: ${Math.floor(rawMinutes / 60)} ชม. ${rawMinutes % 60} นาที\n` +
      (breakDeductionMinutes > 0 ? `• หักเวลาพักเบรก: 1 ชั่วโมง (ทำงานเกิน 6 ชม.)\n` : `• ไม่หักเวลาพัก (ทำงานน้อยกว่า 6 ชม.)\n`) +
      `• ชั่วโมงคิดเงินสุทธิ: ${payableHours} ชม.\n` +
      `• รวมค่าจ้างสุทธิ: ฿${totalWage.toLocaleString()} บาท (อัตรา ฿${hourlyRate}/ชม.)`;

    if (!window.confirm(confirmMsg)) return;

    await db.partTimeAttendance.update(activeRec.id, {
      checkOutTime: outTime.toISOString(),
      rawDurationMinutes,
      breakDeductionMinutes,
      payableDurationMinutes,
      payableHours,
      totalWage,
      status: 'CHECKED_OUT',
      updatedAt: outTime.toISOString()
    });

    SoundEffects.playSuccess();
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  // Copy mobile check-in URL
  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileCheckinUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Date Range calculation for Payroll
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const [yearStr, monthStr] = filterMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    if (periodFilter === '15_DAYS_1') {
      const s = new Date(year, month, 1);
      const e = new Date(year, month, 15, 23, 59, 59);
      return {
        startDate: s.toISOString().split('T')[0],
        endDate: e.toISOString().split('T')[0],
        periodLabel: `รอบ 1-15 ${s.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}`
      };
    } else if (periodFilter === '15_DAYS_2') {
      const s = new Date(year, month, 16);
      const lastDay = new Date(year, month + 1, 0).getDate();
      const e = new Date(year, month, lastDay, 23, 59, 59);
      return {
        startDate: s.toISOString().split('T')[0],
        endDate: e.toISOString().split('T')[0],
        periodLabel: `รอบ 16-${lastDay} ${s.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}`
      };
    } else if (periodFilter === 'WEEKLY') {
      const now = new Date();
      const s = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        startDate: s.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        periodLabel: `รอบ 7 วันล่าสุด (${s.toLocaleDateString('th-TH')} - ${now.toLocaleDateString('th-TH')})`
      };
    } else if (periodFilter === 'MONTHLY') {
      const s = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0).getDate();
      const e = new Date(year, month, lastDay, 23, 59, 59);
      return {
        startDate: s.toISOString().split('T')[0],
        endDate: e.toISOString().split('T')[0],
        periodLabel: `รอบทั้งเดือน ${s.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}`
      };
    } else {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        periodLabel: `ช่วง ${customStartDate} ถึง ${customEndDate}`
      };
    }
  }, [periodFilter, filterMonth, customStartDate, customEndDate]);

  // Filtered Attendance for Payroll period
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (r.status === 'CANCELLED') return false;
      const d = r.date || r.checkInTime.split('T')[0];
      return d >= startDate && d <= endDate;
    });
  }, [attendanceRecords, startDate, endDate]);

  // Aggregate Payroll per Staff
  const staffPayrollSummary = useMemo(() => {
    const summaryMap = new Map<string, {
      staff: PartTimeStaff;
      daysWorked: Set<string>;
      totalShifts: number;
      totalRawMinutes: number;
      totalBreakMinutes: number;
      totalPayableMinutes: number;
      totalPayableHours: number;
      totalWage: number;
      records: PartTimeAttendance[];
    }>();

    staffList.forEach(s => {
      summaryMap.set(s.id, {
        staff: s,
        daysWorked: new Set(),
        totalShifts: 0,
        totalRawMinutes: 0,
        totalBreakMinutes: 0,
        totalPayableMinutes: 0,
        totalPayableHours: 0,
        totalWage: 0,
        records: []
      });
    });

    filteredAttendance.forEach(rec => {
      let entry = summaryMap.get(rec.staffId);
      if (!entry) {
        // Staff might be deleted or unlisted
        entry = {
          staff: {
            id: rec.staffId,
            name: rec.staffName || 'พนักงาน',
            phone: '-',
            hourlyRate: rec.hourlyRate || 40,
            isActive: false,
            createdAt: rec.createdAt
          },
          daysWorked: new Set(),
          totalShifts: 0,
          totalRawMinutes: 0,
          totalBreakMinutes: 0,
          totalPayableMinutes: 0,
          totalPayableHours: 0,
          totalWage: 0,
          records: []
        };
        summaryMap.set(rec.staffId, entry);
      }

      entry.daysWorked.add(rec.date);
      entry.totalShifts += 1;
      entry.totalRawMinutes += rec.rawDurationMinutes || 0;
      entry.totalBreakMinutes += rec.breakDeductionMinutes || 0;
      entry.totalPayableMinutes += rec.payableDurationMinutes || 0;
      entry.totalPayableHours += rec.payableHours || 0;
      entry.totalWage += rec.totalWage || 0;
      entry.records.push(rec);
    });

    return Array.from(summaryMap.values()).filter(item => item.totalShifts > 0 || item.staff.isActive);
  }, [staffList, filteredAttendance]);

  // Total KPIs
  const totalKpis = useMemo(() => {
    let wage = 0;
    let hours = 0;
    let shifts = 0;
    let activeWorkers = 0;

    staffPayrollSummary.forEach(item => {
      if (item.totalShifts > 0) {
        wage += item.totalWage;
        hours += item.totalPayableHours;
        shifts += item.totalShifts;
        activeWorkers += 1;
      }
    });

    return {
      totalWage: wage,
      totalHours: parseFloat(hours.toFixed(2)),
      totalShifts: shifts,
      activeWorkers
    };
  }, [staffPayrollSummary]);

  // Handle Save Staff (Add or Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName.trim()) {
      alert('กรุณากรอกชื่อพนักงาน');
      return;
    }
    const rate = parseFloat(staffFormHourlyRate) || 40;

    if (editingStaff) {
      await db.partTimeStaff.update(editingStaff.id, {
        name: staffFormName.trim(),
        nickname: staffFormNickname.trim() || undefined,
        phone: staffFormPhone.trim() || '-',
        hourlyRate: rate,
        pin: staffFormPin.trim() || undefined,
        notes: staffFormNotes.trim() || undefined
      });
    } else {
      const newStaff: PartTimeStaff = {
        id: `pt-${Date.now()}`,
        name: staffFormName.trim(),
        nickname: staffFormNickname.trim() || undefined,
        phone: staffFormPhone.trim() || '-',
        hourlyRate: rate,
        pin: staffFormPin.trim() || undefined,
        isActive: true,
        notes: staffFormNotes.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      await db.partTimeStaff.add(newStaff);
    }

    setIsStaffFormOpen(false);
    setEditingStaff(null);
    setStaffFormName('');
    setStaffFormNickname('');
    setStaffFormPhone('');
    setStaffFormHourlyRate('40');
    setStaffFormPin('');
    setStaffFormNotes('');
    await loadAllData();
  };

  // Toggle Active Staff
  const handleToggleStaffActive = async (staff: PartTimeStaff) => {
    const nextStatus = !staff.isActive;
    await db.partTimeStaff.update(staff.id, { isActive: nextStatus });
    await loadAllData();
  };

  // Add Manual Record (บันทึกย้อนหลัง)
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStaffId) {
      alert('กรุณาเลือกพนักงาน');
      return;
    }
    const staff = staffList.find(s => s.id === manualStaffId);
    if (!staff) return;

    const inTime = new Date(`${manualDate}T${manualInTime}:00`);
    const outTime = new Date(`${manualDate}T${manualOutTime}:00`);
    const rawMinutes = Math.max(0, Math.round((outTime.getTime() - inTime.getTime()) / 60000));
    
    // Auto-deduct 1 hour break if worked >= 6 hours
    const breakDeductionMinutes = rawMinutes >= 360 ? 60 : 0;
    const payableDurationMinutes = Math.max(0, rawMinutes - breakDeductionMinutes);
    const payableHours = parseFloat((payableDurationMinutes / 60).toFixed(2));
    const hourlyRate = staff.hourlyRate || 40;
    const totalWage = Math.round(payableHours * hourlyRate);

    const record: PartTimeAttendance = {
      id: `pt-att-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      date: manualDate,
      checkInTime: inTime.toISOString(),
      checkOutTime: outTime.toISOString(),
      rawDurationMinutes,
      breakDeductionMinutes,
      payableDurationMinutes,
      payableHours,
      hourlyRate,
      totalWage,
      status: 'CHECKED_OUT',
      notes: manualNotes.trim() || undefined,
      verifiedByCashierName: currentUser?.name || 'บันทึกย้อนหลังโดยผู้จัดการ',
      createdAt: new Date().toISOString()
    };

    await db.partTimeAttendance.add(record);
    SoundEffects.playSuccess();
    setIsManualRecordOpen(false);
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  // Delete Attendance Record
  const handleDeleteAttendance = async (recordId: string) => {
    if (!window.confirm('คุณต้องการลบรายการลงเวลานี้ใช่หรือไม่?')) return;
    await db.partTimeAttendance.delete(recordId);
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  // Print Full Payroll Summary Sheet
  const handlePrintPayrollSummary = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  ระบบลงเวลา & คำนวณค่าจ้างพนักงานพาร์ทไทม์
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold">
                  อัตรา ฿40/ชม.
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                KORAT CAT x เรือนโคราชเฉลิมวัฒนา &bull; แยกสถิติชัดเจนจากพนักงานประจำตามกะ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeAttendances.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                กำลังปฏิบัติงาน {activeAttendances.length} คน
              </span>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('QR_CHECKIN')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
              activeTab === 'QR_CHECKIN'
                ? 'bg-slate-900 border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>จุดสแกน QR เข้า-ออกงาน</span>
            {activeAttendances.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px]">
                {activeAttendances.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('PAYROLL_REPORT')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
              activeTab === 'PAYROLL_REPORT'
                ? 'bg-slate-900 border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>รายงาน & คำนวณค่าจ้าง (Payroll)</span>
          </button>

          <button
            onClick={() => setActiveTab('STAFF_LIST')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
              activeTab === 'STAFF_LIST'
                ? 'bg-slate-900 border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            <span>จัดการรายชื่อพนักงาน ({staffList.length})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: QR CHECK-IN & CASHIER QUICK ACTIONS */}
          {activeTab === 'QR_CHECKIN' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: QR Code Display Card */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/30">
                    SCAN WITH SMARTPHONE
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">
                    QR Code สำหรับพนักงานสแกน
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    พนักงานเปิดกล้องมือถือสแกน เพื่อเลือกชื่อและใส่รหัส PIN เข้างาน
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl shadow-xl inline-block border-2 border-teal-500/40">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(mobileCheckinUrl)}`}
                    alt="Part-Time Check-In QR"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg mx-auto"
                  />
                </div>

                {/* Secondary Screen Broadcast Toggle */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">แสดง QR บนจอที่ 2 ของลูกค้า</p>
                      <p className="text-[10px] text-slate-400">ให้พนักงานสแกนจากหน้าจอด้านหน้าเคาน์เตอร์</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle2ndScreen(!isBroadcastTo2ndScreen)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                      isBroadcastTo2ndScreen
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isBroadcastTo2ndScreen ? '🟢 กำลังแสดง' : '📡 ส่งขึ้นจอ'}
                  </button>
                </div>

                {/* Quick Link Actions */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                  </button>
                  <a
                    href={mobileCheckinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดหน้าสแกน (แท็บใหม่)</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Quick Cashier Manual Clock-In / Out & Active List */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Rule Reminder Banner */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                  <Coffee className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>กติกาการคำนวณชั่วโมง & เวลาพัก:</strong> ค่าจ้าง <strong>฿40/ชม.</strong> หากทำงานตั้งแต่เปิดร้านจนปิดร้าน (เกิน 6 ชั่วโมงขึ้นไป เช่น 09:00 - 18:00 รวม 9 ชม.) ระบบจะ <strong>หักเวลาพัก 1 ชั่วโมง</strong> โดยอัตโนมัติ เหลือคิดค่าจ้างสุทธิ 8 ชม. (฿320)
                  </div>
                </div>

                {/* Cashier One-Click Attendance Table */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-3xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>ลงเวลาด่วนโดยแคชเชียร์ (กรณีพนักงานไม่ได้พกมือถือ)</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      พนักงานทั้งหมด {staffList.filter(s => s.isActive).length} คน
                    </span>
                  </div>

                  <div className="space-y-2">
                    {staffList.filter(s => s.isActive).length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        ยังไม่มีรายชื่อพนักงานพาร์ทไทม์ กรุณาไปที่แท็บ "จัดการรายชื่อพนักงาน" เพื่อเพิ่มข้อมูล
                      </div>
                    ) : (
                      staffList.filter(s => s.isActive).map(staff => {
                        const activeRec = activeStaffMap.get(staff.id);
                        const isWorking = !!activeRec;
                        const inTimeStr = isWorking ? new Date(activeRec.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';

                        return (
                          <div
                            key={staff.id}
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                              isWorking
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isWorking ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {staff.nickname ? staff.nickname.slice(0, 2) : staff.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-white truncate">{staff.name}</span>
                                  {staff.nickname && (
                                    <span className="text-xs text-amber-300">({staff.nickname})</span>
                                  )}
                                  <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/30">
                                    ฿{staff.hourlyRate || 40}/ชม.
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {isWorking ? (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      เข้างานแล้วเมื่อ {inTimeStr} น.
                                    </span>
                                  ) : (
                                    <span>โทร: {staff.phone}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {isWorking ? (
                                <button
                                  type="button"
                                  onClick={() => handleCashierClockOut(staff)}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  <span>ออกงาน</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCashierClockIn(staff)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                                >
                                  <LogIn className="w-3.5 h-3.5" />
                                  <span>เข้างาน</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Today's Active Working Staff List */}
                {activeAttendances.length > 0 && (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                    <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>พนักงานที่กำลังปฏิบัติงานอยู่ในขณะนี้ ({activeAttendances.length} คน)</span>
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {activeAttendances.map(att => (
                        <div key={att.id} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs flex items-center gap-2">
                          <span className="font-bold text-white">{att.staffName}</span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            เข้า {new Date(att.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PAYROLL & TIMESHEET REPORTS */}
          {activeTab === 'PAYROLL_REPORT' && (
            <div className="space-y-6">
              
              {/* Filter Bar */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Period Selector Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setPeriodFilter('15_DAYS_1')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodFilter === '15_DAYS_1'
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📅 งวด 1-15 (15 วันแรก)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodFilter('15_DAYS_2')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodFilter === '15_DAYS_2'
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    📅 งวด 16-สิ้นเดือน (15 วันหลัง)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodFilter('WEEKLY')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodFilter === 'WEEKLY'
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    7 วันล่าสุด
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodFilter('MONTHLY')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodFilter === 'MONTHLY'
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    รายเดือน
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodFilter('CUSTOM')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      periodFilter === 'CUSTOM'
                        ? 'bg-teal-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ระบุเอง
                  </button>
                </div>

                {/* Sub-Filters: Month or Date Range */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {periodFilter !== 'CUSTOM' ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400">เลือกเดือน:</span>
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white font-mono"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsManualRecordOpen(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึกย้อนหลัง</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border border-emerald-500/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    ยอดค่าจ้างรวมสุทธิ
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1">
                    ฿{totalKpis.totalWage.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{periodLabel}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    ชั่วโมงทำงานรวมสุทธิ
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
                    {totalKpis.totalHours} <span className="text-xs font-normal text-slate-400">ชม.</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">หักเวลาพัก 1 ชม./กะเรียบร้อย</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    จำนวนกะ/ครั้งที่มาทำงาน
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-blue-300 mt-1">
                    {totalKpis.totalShifts} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">ในรอบที่เลือก</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    พนักงานที่ปฏิบัติงาน
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-purple-300 mt-1">
                    {totalKpis.activeWorkers} <span className="text-xs font-normal text-slate-400">คน</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">พนักงานพาร์ทไทม์</span>
                </div>
              </div>

              {/* Staff Payroll Table */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-teal-400" />
                      <span>สรุปเงินค่าจ้างรายบุคคล ({periodLabel})</span>
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintPayrollSummary}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>พิมพ์ใบสรุปค่าจ้าง (A4)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-semibold">พนักงาน</th>
                        <th className="py-3 px-3 font-semibold">เบอร์โทร</th>
                        <th className="py-3 px-3 font-semibold text-center">อัตรา/ชม.</th>
                        <th className="py-3 px-3 font-semibold text-center">จำนวนวัน</th>
                        <th className="py-3 px-3 font-semibold text-center">ชั่วโมงสุทธิ</th>
                        <th className="py-3 px-4 font-semibold text-right">รวมเงินค่าจ้าง</th>
                        <th className="py-3 px-4 font-semibold text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {staffPayrollSummary.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            ไม่พบข้อมูลการลงเวลาในรอบ {periodLabel}
                          </td>
                        </tr>
                      ) : (
                        staffPayrollSummary.map(item => (
                          <tr key={item.staff.id} className="hover:bg-slate-900/50 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{item.staff.name}</div>
                              {item.staff.nickname && (
                                <div className="text-[11px] text-amber-400 font-medium">ชื่อเล่น: {item.staff.nickname}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300">{item.staff.phone}</td>
                            <td className="py-3 px-3 text-center font-mono text-teal-300">฿{item.staff.hourlyRate || 40}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-200">{item.daysWorked.size} วัน</td>
                            <td className="py-3 px-3 text-center font-bold font-mono text-amber-300">
                              {parseFloat(item.totalPayableHours.toFixed(2))} ชม.
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono text-emerald-400 text-sm">
                              ฿{item.totalWage.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStaffForDetail(item.staff)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold transition"
                                  title="ดูประวัติการลงเวลาแต่ละวัน"
                                >
                                  ดูบันทึก
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPrintingPayslipStaff(item.staff)}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                                  title="พิมพ์สลิปค่าจ้างพนักงานรายบุคคล"
                                >
                                  สลิปเงิน
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Staff Timesheet Detail Drawer / Modal */}
              {selectedStaffForDetail && (
                <div className="bg-slate-950/80 border border-teal-500/40 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <span>ประวัติการลงเวลารายวัน: {selectedStaffForDetail.name}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {periodLabel} &bull; อัตรา ฿{selectedStaffForDetail.hourlyRate || 40}/ชม.
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedStaffForDetail(null)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition"
                    >
                      ปิดหน้านี้
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">วันที่</th>
                          <th className="py-2.5 px-3">เวลาเข้า</th>
                          <th className="py-2.5 px-3">เวลาออก</th>
                          <th className="py-2.5 px-3 text-center">เวลาจริง</th>
                          <th className="py-2.5 px-3 text-center">พักเบรก</th>
                          <th className="py-2.5 px-3 text-center">ชม.สุทธิ</th>
                          <th className="py-2.5 px-3 text-right">ค่าจ้าง</th>
                          <th className="py-2.5 px-3">หมายเหตุ</th>
                          <th className="py-2.5 px-2 text-center">ลบ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-sans">
                        {filteredAttendance
                          .filter(r => r.staffId === selectedStaffForDetail.id)
                          .map(rec => {
                            const inTime = new Date(rec.checkInTime);
                            const outTime = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
                            const isStillIn = rec.status === 'CHECKED_IN';

                            return (
                              <tr key={rec.id} className="hover:bg-slate-900/40">
                                <td className="py-2.5 px-3 font-mono">{rec.date}</td>
                                <td className="py-2.5 px-3 font-mono text-emerald-400">
                                  {inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                </td>
                                <td className="py-2.5 px-3 font-mono">
                                  {outTime ? (
                                    <span className="text-rose-400">
                                      {outTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 animate-pulse font-bold">กำลังทำงาน</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                                  {rec.rawDurationMinutes !== undefined ? `${Math.floor(rec.rawDurationMinutes / 60)} ชม. ${rec.rawDurationMinutes % 60} น.` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">
                                  {rec.breakDeductionMinutes && rec.breakDeductionMinutes > 0 ? (
                                    <span className="text-amber-400 font-semibold">-1 ชม.</span>
                                  ) : (
                                    <span className="text-slate-500">0</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-300">
                                  {rec.payableHours !== undefined ? `${rec.payableHours} ชม.` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">
                                  {rec.totalWage !== undefined ? `฿${rec.totalWage.toLocaleString()}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                                  {rec.notes || rec.verifiedByCashierName || '-'}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttendance(rec.id)}
                                    className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STAFF DIRECTORY & MANAGEMENT */}
          {activeTab === 'STAFF_LIST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>รายชื่อพนักงานพาร์ทไทม์ทั้งหมด ({staffList.length} คน)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    กำหนดอัตราค่าจ้าง (฿40/ชม.), รหัส PIN 4 หลักสำหรับสแกนเข้างาน และบันทึกข้อมูล
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff(null);
                    setStaffFormName('');
                    setStaffFormNickname('');
                    setStaffFormPhone('');
                    setStaffFormHourlyRate('40');
                    setStaffFormPin('');
                    setStaffFormNotes('');
                    setIsStaffFormOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มพนักงานใหม่</span>
                </button>
              </div>

              {/* Staff Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {staffList.map(staff => (
                  <div
                    key={staff.id}
                    className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                      staff.isActive
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-sm text-white">{staff.name}</h5>
                            {staff.nickname && (
                              <span className="text-xs font-semibold text-amber-300">({staff.nickname})</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">โทร: {staff.phone}</p>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          staff.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {staff.isActive ? 'เปิดใช้งาน' : 'พักงาน'}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">อัตราค่าจ้าง:</span>
                        <span className="font-black font-mono text-teal-300">฿{staff.hourlyRate || 40} / ชม.</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400">รหัส PIN ยืนยัน:</span>
                        <span className="font-mono text-slate-300">
                          {staff.pin ? '•••• (' + staff.pin + ')' : '<span className="text-slate-500">ไม่ได้ตั้ง</span>'}
                        </span>
                      </div>

                      {staff.notes && (
                        <p className="text-[11px] text-slate-500 mt-2 bg-slate-900/60 p-2 rounded-xl">
                          {staff.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffActive(staff)}
                        className="text-[11px] text-slate-400 hover:text-white transition"
                      >
                        {staff.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff(staff);
                          setStaffFormName(staff.name);
                          setStaffFormNickname(staff.nickname || '');
                          setStaffFormPhone(staff.phone);
                          setStaffFormHourlyRate(staff.hourlyRate?.toString() || '40');
                          setStaffFormPin(staff.pin || '');
                          setStaffFormNotes(staff.notes || '');
                          setIsStaffFormOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                        <span>แก้ไข</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between flex-shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>คำนวณหักเวลาพัก 1 ชั่วโมงอัตโนมัติเมื่อทำกะยาว (&gt;= 6 ชม.)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* SUB-MODAL 1: ADD / EDIT STAFF FORM */}
      {isStaffFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white">
                {editingStaff ? 'แก้ไขข้อมูลพนักงานพาร์ทไทม์' : 'เพิ่มพนักงานพาร์ทไทม์ใหม่'}
              </h4>
              <button
                type="button"
                onClick={() => setIsStaffFormOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={staffFormName}
                  onChange={(e) => setStaffFormName(e.target.value)}
                  placeholder="เช่น น้องบี ศรีนคร"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={staffFormNickname}
                    onChange={(e) => setStaffFormNickname(e.target.value)}
                    placeholder="เช่น บี"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    required
                    value={staffFormPhone}
                    onChange={(e) => setStaffFormPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">อัตราค่าจ้าง (บาท/ชม.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={staffFormHourlyRate}
                    onChange={(e) => setStaffFormHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">รหัส PIN 4 หลัก (สำหรับสแกน)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={staffFormPin}
                    onChange={(e) => setStaffFormPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="เช่น 1234"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">หมายเหตุ / รอบเวลาปฏิบัติงาน</label>
                <textarea
                  rows={2}
                  value={staffFormNotes}
                  onChange={(e) => setStaffFormNotes(e.target.value)}
                  placeholder="เช่น กะเสาร์-อาทิตย์, ประจำหน้าร้านเรือนโคราช"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffFormOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold rounded-xl shadow hover:from-teal-600 hover:to-emerald-700"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: MANUAL RECORD (บันทึกย้อนหลัง) */}
      {isManualRecordOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                <span>บันทึกประวัติการทำงานย้อนหลัง</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsManualRecordOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualRecord} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">เลือกพนักงานพาร์ทไทม์ *</label>
                <select
                  required
                  value={manualStaffId}
                  onChange={(e) => setManualStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- กรุณาเลือกพนักงาน --</option>
                  {staffList.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nickname ? `(${s.nickname})` : ''} - ฿{s.hourlyRate || 40}/ชม.
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">วันที่ทำงาน *</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">เวลาเข้างาน *</label>
                  <input
                    type="time"
                    required
                    value={manualInTime}
                    onChange={(e) => setManualInTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">เวลาออกงาน *</label>
                  <input
                    type="time"
                    required
                    value={manualOutTime}
                    onChange={(e) => setManualOutTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="เช่น ลืมสแกนออกงาน / เพิ่มเติมกะพิเศษ"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                ระบบจะคำนวณหักเวลาพัก 1 ชั่วโมงอัตโนมัติหากเวลาทำงานรวม &gt;= 6 ชม.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualRecordOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold rounded-xl shadow hover:from-teal-600 hover:to-emerald-700"
                >
                  บันทึกประวัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: PRINTABLE INDIVIDUAL PAYSLIP */}
      {printingPayslipStaff && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-600" />
                <span>ใบแจ้งค่าจ้างพนักงานพาร์ทไทม์ (Payslip)</span>
              </h4>
              <button
                type="button"
                onClick={() => setPrintingPayslipStaff(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Payslip Content Container */}
            <div id="printable-payslip" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
              <div className="text-center pb-2 border-b border-slate-200">
                <h3 className="font-black text-sm text-slate-900 uppercase">
                  {settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา'}
                </h3>
                <p className="text-[11px] text-slate-500">ใบสรุปค่าจ้างพนักงานพาร์ทไทม์ (Part-Time Payslip)</p>
                <p className="text-[11px] font-semibold text-teal-700 mt-0.5">{periodLabel}</p>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>ชื่อพนักงาน:</span>
                  <span className="font-bold text-slate-900">
                    {printingPayslipStaff.name} {printingPayslipStaff.nickname ? `(${printingPayslipStaff.nickname})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>เบอร์โทร:</span>
                  <span className="font-mono">{printingPayslipStaff.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>อัตราค่าจ้าง:</span>
                  <span className="font-mono font-bold text-slate-900">฿{printingPayslipStaff.hourlyRate || 40} / ชั่วโมง</span>
                </div>
              </div>

              {(() => {
                const staffSummary = staffPayrollSummary.find(s => s.staff.id === printingPayslipStaff.id);
                return (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span>จำนวนวันที่มาทำงาน:</span>
                      <span className="font-bold">{staffSummary?.daysWorked.size || 0} วัน</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ชั่วโมงทำงานสุทธิ (หลังหักพัก):</span>
                      <span className="font-mono font-bold">{staffSummary?.totalPayableHours || 0} ชั่วโมง</span>
                    </div>
                    <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex justify-between items-baseline mt-2">
                      <span className="font-bold text-emerald-950 text-sm">รวมยอดเงินค่าจ้างสุทธิ:</span>
                      <span className="text-2xl font-black font-mono text-emerald-700">
                        ฿{(staffSummary?.totalWage || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
                <div>
                  <div className="h-8 border-b border-slate-300" />
                  <p className="mt-1">ผู้จ่ายเงิน / ผู้จัดการ</p>
                </div>
                <div>
                  <div className="h-8 border-b border-slate-300" />
                  <p className="mt-1">ผู้รับเงิน (พนักงาน)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintingPayslipStaff(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-semibold text-xs"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl shadow hover:bg-teal-700 text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ใบแจ้งค่าจ้าง (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
