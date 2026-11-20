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
  Check,
  Lock,
  Unlock,
  Key,
  RefreshCw
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
import { AuthService } from '../services/auth';
import { CloudSync } from '../services/cloudSync';

interface PartTimeAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  activeShift?: Shift | null;
  onAttendanceChanged?: () => void;
}

type TabType = 'QR_CHECKIN' | 'PAYROLL_REPORT' | 'STAFF_LIST';
type PeriodFilterType = '15_DAYS_1' | '15_DAYS_2' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

interface StaffPayrollSummaryItem {
  staff: PartTimeStaff;
  daysWorked: Set<string>;
  totalShifts: number;
  totalRawMinutes: number;
  totalBreakMinutes: number;
  totalPayableMinutes: number;
  totalPayableHours: number;
  totalWage: number;
  records: PartTimeAttendance[];
}

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

  // Owner Authentication & Permission Guard
  const isOwnerLoggedIn = currentUser?.role === 'OWNER' || AuthService.isOwner();
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const isOwnerAuthorized = isOwnerLoggedIn || isOwnerUnlocked;

  const [isOwnerPinModalOpen, setIsOwnerPinModalOpen] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState('');
  const [ownerPinError, setOwnerPinError] = useState('');
  const [pendingOwnerAction, setPendingOwnerAction] = useState<(() => void) | null>(null);

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
    // Background pull latest store settings & part-time records from cloud
    if (navigator.onLine) {
      CloudSync.pullStoreSettings().catch(() => {});
    }

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

  // Guard for Owner-only actions
  const executeOwnerAction = (action: () => void) => {
    if (isOwnerAuthorized) {
      action();
    } else {
      setOwnerPinInput('');
      setOwnerPinError('');
      setPendingOwnerAction(() => action);
      setIsOwnerPinModalOpen(true);
    }
  };

  const handleVerifyOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await AuthService.verifyOwnerPin(ownerPinInput.trim());
    if (isValid) {
      setIsOwnerUnlocked(true);
      setIsOwnerPinModalOpen(false);
      SoundEffects.playSuccess();
      if (pendingOwnerAction) {
        pendingOwnerAction();
        setPendingOwnerAction(null);
      }
    } else {
      setOwnerPinError('รหัส PIN เจ้าของร้าน / แอดมินไม่ถูกต้อง');
      SoundEffects.playWarning();
    }
  };

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
    return attendanceRecords.filter(r => (r.status === 'CHECKED_IN' || r.status === 'CLOCKED_IN') && !r.checkOutTime);
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
    if (navigator.onLine) {
      CloudSync.pushPartTimeAttendance(record).catch(() => {});
    }
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
    const rawDurationMinutes = Math.max(0, Math.round((outTime.getTime() - inTime.getTime()) / 60000));
    
    // Auto-deduct 1 hour break if worked >= 6 hours (360 minutes)
    const breakDeductionMinutes = rawDurationMinutes >= 360 ? 60 : 0;
    const payableDurationMinutes = Math.max(0, rawDurationMinutes - breakDeductionMinutes);
    const payableHours = parseFloat((payableDurationMinutes / 60).toFixed(2));
    const hourlyRate = activeRec.hourlyRate || staff.hourlyRate || 40;
    const totalWage = Math.round(payableHours * hourlyRate);

    const confirmMsg = `ยืนยันลงเวลาออกงาน: ${staff.name}\n\n` +
      `• เวลาเข้า: ${inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n` +
      `• เวลาออก: ${outTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}\n` +
      `• เวลาทำงานจริง: ${Math.floor(rawDurationMinutes / 60)} ชม. ${rawDurationMinutes % 60} นาที\n` +
      (breakDeductionMinutes > 0 ? `• หักเวลาพักเบรก: 1 ชั่วโมง (ทำงานเกิน 6 ชม.)\n` : `• ไม่หักเวลาพัก (ทำงานน้อยกว่า 6 ชม.)\n`) +
      `• ชั่วโมงคิดเงินสุทธิ: ${payableHours} ชม.\n` +
      `• รวมค่าจ้างสุทธิ: ฿${totalWage.toLocaleString()} บาท (อัตรา ฿${hourlyRate}/ชม.)`;

    if (!window.confirm(confirmMsg)) return;

    const updatedData = {
      checkOutTime: outTime.toISOString(),
      rawDurationMinutes,
      breakDeductionMinutes,
      payableDurationMinutes,
      payableHours,
      totalWage,
      status: 'CHECKED_OUT' as const,
      updatedAt: outTime.toISOString()
    };

    await db.partTimeAttendance.update(activeRec.id, updatedData);
    if (navigator.onLine) {
      CloudSync.pushPartTimeAttendance({ ...activeRec, ...updatedData }).catch(() => {});
    }

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
    const summaryMap = new Map<string, StaffPayrollSummaryItem>();

    staffList.forEach(s => {
      summaryMap.set(s.id, {
        staff: s,
        daysWorked: new Set<string>(),
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
        const newEntry: StaffPayrollSummaryItem = {
          staff: {
            id: rec.staffId,
            name: rec.staffName || 'พนักงาน',
            phone: '-',
            hourlyRate: rec.hourlyRate || 40,
            isActive: false,
            createdAt: rec.createdAt || new Date().toISOString()
          },
          daysWorked: new Set<string>(),
          totalShifts: 0,
          totalRawMinutes: 0,
          totalBreakMinutes: 0,
          totalPayableMinutes: 0,
          totalPayableHours: 0,
          totalWage: 0,
          records: []
        };
        summaryMap.set(rec.staffId, newEntry);
        entry = newEntry;
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

  // Handle Save Staff (Owner Only)
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

    // Sync updated staff list to cloud immediately so mobile check-in sees it!
    await CloudSync.syncPartTimeStaffToCloud();

    setIsStaffFormOpen(false);
    setEditingStaff(null);
    setStaffFormName('');
    setStaffFormNickname('');
    setStaffFormPhone('');
    setStaffFormHourlyRate('40');
    setStaffFormPin('');
    setStaffFormNotes('');
    SoundEffects.playSuccess();
    await loadAllData();
  };

  // Toggle Active Staff (Owner Only)
  const handleToggleStaffActive = async (staff: PartTimeStaff) => {
    const nextStatus = !staff.isActive;
    await db.partTimeStaff.update(staff.id, { isActive: nextStatus });
    await CloudSync.syncPartTimeStaffToCloud();
    await loadAllData();
  };

  // Delete Staff (Owner Only)
  const handleDeleteStaff = async (staff: PartTimeStaff) => {
    if (!window.confirm(`⚠️ ยืนยันการลบรายชื่อ "${staff.name}" ออกจากระบบ?\n(ประวัติการลงเวลาในอดีตจะยังคงถูกบันทึกไว้ในรายงาน)`)) {
      return;
    }
    await db.partTimeStaff.delete(staff.id);
    await CloudSync.syncPartTimeStaffToCloud();
    SoundEffects.playSuccess();
    await loadAllData();
  };

  // Add Manual Record (บันทึกย้อนหลัง - Owner Only)
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
    const rawDurationMinutes = Math.max(0, Math.round((outTime.getTime() - inTime.getTime()) / 60000));
    
    // Auto-deduct 1 hour break if worked >= 6 hours
    const breakDeductionMinutes = rawDurationMinutes >= 360 ? 60 : 0;
    const payableDurationMinutes = Math.max(0, rawDurationMinutes - breakDeductionMinutes);
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
      status: 'CLOCKED_OUT',
      notes: manualNotes.trim() || undefined,
      verifiedByCashierName: currentUser?.name || 'บันทึกย้อนหลังโดยผู้จัดการ',
      createdAt: new Date().toISOString()
    };

    await db.partTimeAttendance.add(record);
    if (navigator.onLine) {
      CloudSync.pushPartTimeAttendance(record).catch(() => {});
    }
    SoundEffects.playSuccess();
    setIsManualRecordOpen(false);
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  // Delete Attendance Record (Owner Only)
  const handleDeleteAttendance = async (recordId: string) => {
    if (!window.confirm('คุณต้องการลบรายการลงเวลานี้ใช่หรือไม่?')) return;
    await db.partTimeAttendance.delete(recordId);
    await CloudSync.syncPartTimeStaffToCloud();
    await loadAllData();
    if (onAttendanceChanged) onAttendanceChanged();
  };

  /**
   * ระบบพิมพ์เอกสาร A4 แบบแยกกรอบ Iframe อิสระ (ไม่ดึงหน้าจอ POS หรือ Modal เข้ามาปน)
   */
  const printIsolatedHtml = (title: string, htmlContent: string) => {
    try {
      const existingFrame = document.getElementById('print-payroll-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'print-payroll-iframe';
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

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm 15mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 0;
                font-size: 12px;
                line-height: 1.5;
              }
              * { box-sizing: border-box; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .logo { max-height: 48px; margin-bottom: 6px; }
              .store-name { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0; }
              .store-sub { font-size: 11px; color: #475569; margin: 2px 0; }
              .doc-title { font-size: 14px; font-weight: 800; color: #0f766e; margin-top: 6px; text-transform: uppercase; }
              .period-badge { font-size: 11px; font-weight: bold; color: #0f766e; background: #ccfbf1; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
              th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px 8px; font-weight: 700; font-size: 11px; text-align: left; }
              td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11.5px; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
              .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
              .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #f8fafc; }
              .kpi-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
              .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }
              .total-highlight { background: #ecfdf5 !important; font-weight: bold; }
              .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; text-align: center; font-size: 11px; page-break-inside: avoid; }
              .sig-line { border-bottom: 1px dotted #94a3b8; width: 75%; margin: 36px auto 6px auto; }
              .notes-box { font-size: 10px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-top: 12px; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 350);
    } catch (e) {
      console.warn('Iframe print fallback error', e);
      window.print();
    }
  };

  // พิมพ์ใบสรุปรายงานและคำนวณค่าจ้างพาร์ทไทม์ A4 (รวมทุกคน)
  const handlePrintPayrollSummary = () => {
    const storeName = settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา';
    const storeAddress = settings?.address || 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000';
    const storePhone = settings?.phone || '044-123456 / 081-999-8888';
    const printDate = new Date().toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const rowsHtml = staffPayrollSummary.map((item, idx) => `
      <tr>
        <td class="text-center font-mono">${idx + 1}</td>
        <td>
          <strong>${item.staff.name}</strong>
          ${item.staff.nickname ? `<span style="color:#0f766e;font-size:10.5px;"> (${item.staff.nickname})</span>` : ''}
        </td>
        <td class="font-mono text-center">${item.staff.phone || '-'}</td>
        <td class="font-mono text-center">฿${item.staff.hourlyRate || 40}</td>
        <td class="text-center font-bold font-mono">${item.daysWorked.size} วัน</td>
        <td class="text-center font-bold font-mono" style="color:#0f766e;">${parseFloat(item.totalPayableHours.toFixed(2))} ชม.</td>
        <td class="text-right font-mono font-bold" style="color:#047857;font-size:13px;">฿${item.totalWage.toLocaleString()}</td>
        <td style="min-width:110px;height:32px;"></td>
      </tr>
    `).join('');

    const html = `
      <div class="header">
        ${settings?.logoUrl ? `<img src="${settings.logoUrl}" class="logo" alt="Logo" />` : ''}
        <h1 class="store-name">${storeName}</h1>
        <p class="store-sub">${storeAddress} &bull; โทร: ${storePhone}</p>
        <div class="doc-title">ใบสรุปรายงานและคำนวณค่าจ้างพนักงานพาร์ทไทม์</div>
        <div class="period-badge">รอบการคำนวณ: ${periodLabel}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">พิมพ์เมื่อ: ${printDate}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">ยอดจ่ายค่าจ้างสุทธิ</div>
          <div class="kpi-val font-mono" style="color:#047857;">฿${totalKpis.totalWage.toLocaleString()}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">ชั่วโมงทำงานสุทธิรวม</div>
          <div class="kpi-val font-mono" style="color:#0f766e;">${totalKpis.totalHours} ชม.</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">จำนวนกะ/ครั้งที่มาทำ</div>
          <div class="kpi-val font-mono">${totalKpis.totalShifts} ครั้ง</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">จำนวนพนักงานพาร์ทไทม์</div>
          <div class="kpi-val font-mono">${totalKpis.activeWorkers} คน</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="text-center" style="width:40px;">ลำดับ</th>
            <th>ชื่อพนักงาน</th>
            <th class="text-center">เบอร์โทรศัพท์</th>
            <th class="text-center">อัตรา/ชม.</th>
            <th class="text-center">จำนวนวัน</th>
            <th class="text-center">ชั่วโมงสุทธิ</th>
            <th class="text-right">ยอดเงินค่าจ้าง</th>
            <th class="text-center">ลายเซ็นผู้รับเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="8" class="text-center" style="padding:16px;">ไม่พบข้อมูลการลงเวลาในรอบนี้</td></tr>'}
          <tr class="total-highlight">
            <td colspan="4" class="text-right"><strong>รวมทั้งสิ้น</strong></td>
            <td class="text-center font-mono"><strong>${staffPayrollSummary.reduce((acc, i) => acc + i.daysWorked.size, 0)} วัน-คน</strong></td>
            <td class="text-center font-mono"><strong>${totalKpis.totalHours} ชม.</strong></td>
            <td class="text-right font-mono" style="color:#047857;font-size:14px;"><strong>฿${totalKpis.totalWage.toLocaleString()}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="notes-box">
        <strong>หมายเหตุเงื่อนไขการคิดค่าจ้าง:</strong> คำนวณในอัตราเริ่มต้น ฿40/ชม. โดยระบบคำนวณหักเวลาพักเบรก 1 ชั่วโมงโดยอัตโนมัติเมื่อพนักงานปฏิบัติงานกะยาวตั้งแต่ 6 ชั่วโมงขึ้นไป (เช่น กะ 09:00 - 18:00 น. รวม 9 ชม. หักพัก 1 ชม. คิดเงิน 8 ชม. = ฿320)
      </div>

      <div class="signatures">
        <div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div style="font-weight:bold;margin-top:2px;">ผู้จัดทำรายงาน / ผู้จัดการร้าน</div>
          <div style="color:#64748b;font-size:10px;">วันที่: ....../....../......</div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div style="font-weight:bold;margin-top:2px;">ผู้ตรวจสอบ / เจ้าของร้าน (แอดมิน)</div>
          <div style="color:#64748b;font-size:10px;">วันที่: ....../....../......</div>
        </div>
      </div>
    `;

    printIsolatedHtml(`สรุปค่าจ้างพาร์ทไทม์-${periodLabel}`, html);
  };

  // พิมพ์ใบแจ้งค่าจ้างรายบุคคล A4 (Payslip)
  const handlePrintIndividualPayslip = (staff: PartTimeStaff) => {
    const storeName = settings?.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา';
    const storeAddress = settings?.address || 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000';
    const storePhone = settings?.phone || '044-123456 / 081-999-8888';
    const printDate = new Date().toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const staffSummary = staffPayrollSummary.find(s => s.staff.id === staff.id);
    const staffRecords = filteredAttendance.filter(r => r.staffId === staff.id);

    const recordsHtml = staffRecords.map(rec => {
      const inTime = new Date(rec.checkInTime);
      const outTime = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
      const rawText = rec.rawDurationMinutes !== undefined 
        ? `${Math.floor(rec.rawDurationMinutes / 60)} ชม. ${rec.rawDurationMinutes % 60} น.`
        : '-';
      const breakText = rec.breakDeductionMinutes && rec.breakDeductionMinutes > 0 ? '-1 ชม.' : '0';

      return `
        <tr>
          <td class="font-mono">${rec.date}</td>
          <td class="font-mono text-center" style="color:#047857;">${inTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</td>
          <td class="font-mono text-center">${outTime ? outTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : 'กำลังทำ'}</td>
          <td class="font-mono text-center">${rawText}</td>
          <td class="font-mono text-center" style="color:#b45309;">${breakText}</td>
          <td class="font-mono text-center font-bold" style="color:#0f766e;">${rec.payableHours !== undefined ? `${rec.payableHours} ชม.` : '-'}</td>
          <td class="font-mono text-right font-bold" style="color:#047857;">${rec.totalWage !== undefined ? `฿${rec.totalWage.toLocaleString()}` : '-'}</td>
          <td style="font-size:10px;color:#64748b;">${rec.notes || rec.verifiedByCashierName || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div class="header">
        ${settings?.logoUrl ? `<img src="${settings.logoUrl}" class="logo" alt="Logo" />` : ''}
        <h1 class="store-name">${storeName}</h1>
        <p class="store-sub">${storeAddress} &bull; โทร: ${storePhone}</p>
        <div class="doc-title">ใบแจ้งค่าจ้างพนักงานพาร์ทไทม์ (Payslip)</div>
        <div class="period-badge">รอบการคำนวณ: ${periodLabel}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">พิมพ์เมื่อ: ${printDate}</div>
      </div>

      <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11.5px;">
        <div>
          <div>ชื่อพนักงาน: <strong>${staff.name}</strong> ${staff.nickname ? `<span style="color:#0f766e;">(${staff.nickname})</span>` : ''}</div>
          <div style="margin-top:4px;">เบอร์โทรศัพท์: <span class="font-mono">${staff.phone || '-'}</span></div>
        </div>
        <div style="text-align:right;">
          <div>อัตราค่าจ้าง: <strong class="font-mono" style="color:#0f766e;">฿${staff.hourlyRate || 40}</strong> / ชั่วโมง</div>
          <div style="margin-top:4px;">มาทำงานรวม: <strong>${staffSummary?.daysWorked.size || 0} วัน</strong> (${staffSummary?.totalShifts || 0} กะ)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th class="text-center">เวลาเข้า</th>
            <th class="text-center">เวลาออก</th>
            <th class="text-center">เวลาจริง</th>
            <th class="text-center">พักเบรก</th>
            <th class="text-center">ชม.สุทธิ</th>
            <th class="text-right">ค่าจ้าง</th>
            <th>หมายเหตุ / ผู้ตรวจ</th>
          </tr>
        </thead>
        <tbody>
          ${recordsHtml || '<tr><td colspan="8" class="text-center" style="padding:16px;">ไม่พบประวัติการลงเวลาในรอบนี้</td></tr>'}
        </tbody>
      </table>

      <div style="background:#ecfdf5;border:2px solid #a7f3d0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
        <div>
          <div style="font-weight:bold;color:#065f46;font-size:12px;">รวมชั่วโมงทำงานสุทธิ (หลังหักพัก): ${staffSummary?.totalPayableHours || 0} ชั่วโมง</div>
          <div style="font-size:10px;color:#047857;">คำนวณหักพัก 1 ชม. เมื่อทำงานเกิน 6 ชม. เรียบร้อยแล้ว</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px;color:#065f46;font-weight:bold;margin-right:8px;">รวมยอดเงินค่าจ้างสุทธิ:</span>
          <span class="font-mono" style="font-size:22px;font-weight:900;color:#047857;">฿${(staffSummary?.totalWage || 0).toLocaleString()}</span>
        </div>
      </div>

      <div class="signatures">
        <div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div style="font-weight:bold;margin-top:2px;">ผู้จ่ายเงิน / ผู้จัดการร้าน</div>
          <div style="color:#64748b;font-size:10px;">วันที่: ....../....../......</div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div>(......................................................)</div>
          <div style="font-weight:bold;margin-top:2px;">ผู้รับเงิน (${staff.name})</div>
          <div style="color:#64748b;font-size:10px;">วันที่: ....../....../......</div>
        </div>
      </div>
    `;

    printIsolatedHtml(`สลิปค่าจ้าง-${staff.name}-${periodLabel}`, html);
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
            {isOwnerAuthorized ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-400 ml-1" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400 ml-1" />
            )}
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
                        ยังไม่มีรายชื่อพนักงานพาร์ทไทม์ กรุณาให้แอดมินหรือเจ้าของร้านเพิ่มรายชื่อในแท็บ "จัดการรายชื่อพนักงาน"
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
                    onClick={() => executeOwnerAction(() => setIsManualRecordOpen(true))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    title={isOwnerAuthorized ? 'บันทึกประวัติการทำงานย้อนหลัง' : 'สงวนสิทธิ์เฉพาะเจ้าของร้าน (แอดมิน)'}
                  >
                    {!isOwnerAuthorized && <Lock className="w-3 h-3 text-amber-400" />}
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
                                  onClick={() => handlePrintIndividualPayslip(item.staff)}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
                                  title="พิมพ์ใบแจ้งค่าจ้าง (Payslip A4)"
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintIndividualPayslip(selectedStaffForDetail)}
                        className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-amber-500/30 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์สลิปพนักงานคนนี้</span>
                      </button>

                      <button
                        onClick={() => setSelectedStaffForDetail(null)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition"
                      >
                        ปิดหน้านี้
                      </button>
                    </div>
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
                            const isStillIn = rec.status === 'CHECKED_IN' || rec.status === 'CLOCKED_IN' || !rec.checkOutTime;

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
                                    onClick={() => executeOwnerAction(() => handleDeleteAttendance(rec.id))}
                                    className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition"
                                    title={isOwnerAuthorized ? 'ลบรายการนี้' : 'สงวนสิทธิ์เฉพาะเจ้าของร้าน (แอดมิน)'}
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

          {/* TAB 3: STAFF DIRECTORY & MANAGEMENT (OWNER PROTECTED) */}
          {activeTab === 'STAFF_LIST' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>รายชื่อพนักงานพาร์ทไทม์ทั้งหมด ({staffList.length} คน)</span>
                    </h4>
                    {isOwnerAuthorized ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-400" /> สิทธิ์แอดมินเจ้าของร้าน
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" /> มุมมองแคชเชียร์ (อ่านอย่างเดียว)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    กำหนดอัตราค่าจ้าง (฿40/ชม.), รหัส PIN 4 หลักสำหรับสแกนเข้างาน และบันทึกข้อมูล
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isOwnerAuthorized && (
                    <button
                      type="button"
                      onClick={() => executeOwnerAction(() => {})}
                      className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>ปลดล็อคด้วย PIN เจ้าของร้าน</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      executeOwnerAction(() => {
                        setEditingStaff(null);
                        setStaffFormName('');
                        setStaffFormNickname('');
                        setStaffFormPhone('');
                        setStaffFormHourlyRate('40');
                        setStaffFormPin('');
                        setStaffFormNotes('');
                        setIsStaffFormOpen(true);
                      });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มพนักงานใหม่</span>
                  </button>
                </div>
              </div>

              {/* Security Banner if not authorized */}
              {!isOwnerAuthorized && (
                <div className="p-3 bg-slate-950/80 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-300 gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      <strong>ระบบความปลอดภัย:</strong> เฉพาะเจ้าของร้าน (แอดมิน) เท่านั้นที่สามารถเพิ่ม แก้ไข ปรับอัตราค่าจ้าง หรือลบพนักงาน เพื่อป้องกันการกดผิดหรือกลั่นแกล้งกัน
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeOwnerAction(() => {})}
                    className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition whitespace-nowrap flex-shrink-0"
                  >
                    ใส่ PIN ปลดล็อค
                  </button>
                </div>
              )}

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
                        onClick={() => executeOwnerAction(() => handleToggleStaffActive(staff))}
                        className="text-[11px] text-slate-400 hover:text-white transition"
                      >
                        {staff.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            executeOwnerAction(() => {
                              setEditingStaff(staff);
                              setStaffFormName(staff.name);
                              setStaffFormNickname(staff.nickname || '');
                              setStaffFormPhone(staff.phone);
                              setStaffFormHourlyRate(staff.hourlyRate?.toString() || '40');
                              setStaffFormPin(staff.pin || '');
                              setStaffFormNotes(staff.notes || '');
                              setIsStaffFormOpen(true);
                            });
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                          <span>แก้ไข</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => executeOwnerAction(() => handleDeleteStaff(staff))}
                          className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition"
                          title="ลบรายชื่อพนักงานคนนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* SUB-MODAL 1: ADD / EDIT STAFF FORM (OWNER PROTECTED) */}
      {isStaffFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>{editingStaff ? 'แก้ไขข้อมูลพนักงานพาร์ทไทม์' : 'เพิ่มพนักงานพาร์ทไทม์ใหม่'}</span>
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
                  บันทึกข้อมูล (Sync Cloud)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: MANUAL RECORD (บันทึกย้อนหลัง - OWNER ONLY) */}
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

      {/* SUB-MODAL 3: OWNER PIN VERIFICATION MODAL */}
      {isOwnerPinModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Lock className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-bold text-white">ยืนยันสิทธิ์เจ้าของร้าน / แอดมิน</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOwnerPinModalOpen(false);
                  setPendingOwnerAction(null);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              พื้นที่นี้สงวนสิทธิ์เฉพาะ <strong>เจ้าของร้าน (แอดมิน)</strong> เพื่อความปลอดภัย ป้องกันการเพิ่ม แก้ไข ปรับค่าจ้าง หรือลบข้อมูลพนักงานโดยไม่ได้รับอนุญาต
            </p>

            <form onSubmit={handleVerifyOwnerPin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  กรุณากรอกรหัส PIN เจ้าของร้าน 4 หลัก *
                </label>
                <input
                  type="password"
                  maxLength={12}
                  autoFocus
                  required
                  value={ownerPinInput}
                  onChange={(e) => {
                    setOwnerPinInput(e.target.value);
                    setOwnerPinError('');
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-2xl font-mono px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-amber-400 font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {ownerPinError && (
                  <p className="text-xs text-rose-400 font-semibold mt-1 text-center">
                    {ownerPinError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerPinModalOpen(false);
                    setPendingOwnerAction(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow"
                >
                  ยืนยันรหัส PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
