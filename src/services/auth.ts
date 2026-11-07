// src/services/auth.ts
import { db } from '../db';
import type { UserAccount, UserRole } from '../types';

const SESSION_STORAGE_KEY = 'pos_korat_active_user';

export class AuthService {
  /**
   * ดึง User ที่กำลังล็อกอินอยู่
   */
  public static getCurrentUser(): UserAccount | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserAccount;
    } catch {
      return null;
    }
  }

  /**
   * ตั้งค่า User ที่ล็อกอิน
   */
  public static setCurrentUser(user: UserAccount) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  /**
   * ล็อกเอาต์
   */
  public static logout() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * ตรวจสอบสิทธิ์ว่ามีสถานะเป็น OWNER หรือไม่
   */
  public static isOwner(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'OWNER';
  }

  /**
   * ตรวจสอบรหัส PIN เพื่อยืนยันสิทธิ์ Owner (ใช้ตอน Void บิล หรือเข้าหน้าจัดการที่ถูกล็อค)
   */
  public static async verifyOwnerPin(pin: string): Promise<boolean> {
    const settings = await db.settings.get('current_store_settings');
    if (settings?.ownerPin && settings.ownerPin === pin) {
      return true;
    }
    const owner = await db.users.where({ role: 'OWNER' }).first();
    if (!owner) return pin === '9999'; // Default fallback
    return owner.pin === pin;
  }

  /**
   * ตรวจสอบ PIN สำหรับการเข้าใช้งานทั่วไป (รองรับการดึงรหัสที่อัปเดตจาก Cloud อัตโนมัติ)
   */
  public static async loginWithPin(pin: string): Promise<UserAccount | null> {
    // 1. ตรวจสอบกับข้อมูลในเครื่อง IndexedDB ก่อน
    const matched = await db.users.where({ pin }).first();
    if (matched) {
      this.setCurrentUser(matched);
      return matched;
    }

    // 2. ตรวจสอบกับค่าการตั้งค่า StoreSettings ที่ซิงค์มาจาก Cloud
    const settings = await db.settings.get('current_store_settings');
    if (settings) {
      if (settings.ownerPin && settings.ownerPin === pin) {
        const owner = await db.users.where({ role: 'OWNER' }).first();
        if (owner) {
          const updated = { ...owner, pin, name: settings.ownerName || owner.name };
          await db.users.put(updated);
          this.setCurrentUser(updated);
          return updated;
        }
      }

      if (settings.staffAccounts && settings.staffAccounts.length > 0) {
        const staff = settings.staffAccounts.find(s => s.pin === pin && s.isActive !== false);
        if (staff) {
          await db.users.put(staff);
          this.setCurrentUser(staff);
          return staff;
        }
      }
    }

    return null;
  }
}
