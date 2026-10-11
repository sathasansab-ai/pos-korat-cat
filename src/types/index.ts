// src/types/index.ts

export type UserRole = 'OWNER' | 'CASHIER';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-6 digit PIN
  isActive?: boolean;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  subTitle: string;
  tagline: string;
  address: string;
  phone: string;
  taxId: string;
  promptPayId: string;
  promptPayType: 'MOBILE' | 'TAX_ID';
  receiptHeader: string;
  receiptFooter: string;
  logoUrl?: string;
  printerPaperWidth: '58mm' | '80mm';
}

export interface Product {
  id: string;
  skuPrefix: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  category: string;
  sku: string;
  barcode: string;
  attributes: Record<string, string>;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  imageUrl?: string;
  supplierName?: string;
  isActive: boolean;
}

export interface PromotionRule {
  id: string;
  name: string;
  type: 'MIX_AND_MATCH' | 'TIERED' | 'DISCOUNT_PERCENT';
  requiredQty: number;
  bundlePrice: number;
  targetAudience: 'ALL' | 'MEMBER_ONLY'; // สิทธิ์โปรโมชั่น: ทั่วไป หรือ เฉพาะสมาชิก
  eligibleCategories?: string[];
  eligibleVariantIds?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CartItem {
  variantId: string;
  productName: string;
  sku: string;
  barcode: string;
  imageUrl?: string;
  attributes: Record<string, string>;
  category: string;
  costPrice: number;
  unitPrice: number;
  qty: number;
}

export interface Customer {
  id: string;
  phone: string;
  name: string; // ชื่อ-นามสกุล
  contactChannel?: string; // LINE ID, Facebook, Email
  address?: string;
  rewardPoints: number;
  totalSpent: number;
  createdAt?: string;
}

export type PaymentMethodType = 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD';

export interface PaymentEntry {
  method: PaymentMethodType;
  amount: number;
}

export interface Order {
  id: string;
  localOrderId: string;
  timestamp: string;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  customerId?: string;
  customerName?: string;
  items: {
    variantId: string;
    productName: string;
    sku: string;
    imageUrl?: string;
    attributes: Record<string, string>;
    qty: number;
    unitPrice: number;
    costPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  promoDiscount: number;
  netTotal: number;
  payments: PaymentEntry[];
  cashReceived?: number;
  changeGiven?: number;
  status: 'COMPLETED' | 'HOLD' | 'VOIDED';
  isSynced: boolean;
}

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  closingCashExpected?: number;
  closingCashActual?: number;
  cashDifference?: number;
  totalCashSales: number;
  totalPromptPaySales: number;
  totalCreditSales: number;
  totalTransactions: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

// หมวดหมู่เริ่มต้นที่รองรับการขยายตัวในอนาคต
export const DEFAULT_PRODUCT_CATEGORIES = [
  'เสื้อผ้าแฟชั่นไฮเอนด์',
  'หมวกและแอคเซสเซอรี่',
  'งานฝีมือ & วิสาหกิจชุมชน',
  'กิจกรรม Workshop ในร้าน',
  'ของที่ระลึก & ของตกแต่ง',
  'กระเป๋าและเครื่องหนัง',
  'เครื่องดื่มและเบเกอรี่',
  'สินค้าอื่นๆ'
];
