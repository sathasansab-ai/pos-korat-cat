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
    const owner = await db.users.where({ role: 'OWNER' }).first();
    if (!owner) return pin === '9999'; // Default fallback
    return owner.pin === pin;
  }

  /**
   * ตรวจสอบ PIN สำหรับการเข้าใช้งานทั่วไป
   */
  public static async loginWithPin(pin: string): Promise<UserAccount | null> {
    const matched = await db.users.where({ pin }).first();
    if (matched) {
      this.setCurrentUser(matched);
      return matched;
    }
    return null;
  }
}
