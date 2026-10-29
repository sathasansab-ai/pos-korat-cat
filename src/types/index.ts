// src/types/index.ts

export type UserRole = 'OWNER' | 'CASHIER';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-12 alphanumeric characters
  isActive?: boolean;
}

export type CustomerScreenTheme = 'BLACK_GOLD' | 'BROWN_GOLD' | 'WHITE_GOLD' | 'EMERALD_GOLD';

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
  
  // Tax / VAT Settings
  vatType: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'; // ไม่คิด VAT, รวม VAT ในราคาแล้ว, หรือ คิด VAT เพิ่ม 7%
  vatRate: number; // e.g. 7%
  taxInvoiceTitle: string; // เช่น ใบเสร็จรับเงิน / ใบกำกับภาษีแบบเต็มรูป

  // Customer Facing Screen Customization
  customerScreenTheme: CustomerScreenTheme;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeImageUrl?: string;
  thankYouMessage: string;
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
  targetAudience: 'ALL' | 'MEMBER_ONLY';
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
  name: string;
  contactChannel?: string; // LINE, FB, Email
  address?: string;
  taxId?: string;
  rewardPoints: number;
  totalSpent: number;
  createdAt?: string;
}

export type PaymentMethodType = 'CASH' | 'PROMPTPAY' | 'CREDIT_CARD';

export interface PaymentEntry {
  method: PaymentMethodType;
  amount: number;
}

export interface CustomerTaxInfo {
  name: string;
  taxId: string;
  branch: string; // สำนักงานใหญ่ หรือ สาขาที่...
  address: string;
  phone?: string;
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
  
  // Custom discount
  customDiscountType?: 'PERCENT' | 'AMOUNT';
  customDiscountValue?: number;
  customDiscountAmount?: number;
  customDiscountReason?: string;
  
  // VAT breakdown
  vatType?: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE';
  vatRate?: number;
  preTaxAmount?: number;
  vatAmount?: number;

  netTotal: number;
  payments: PaymentEntry[];
  cashReceived?: number;
  changeGiven?: number;
  status: 'COMPLETED' | 'HOLD' | 'VOIDED';
  isSynced: boolean;

  // Tax Invoice Info
  isTaxInvoiceIssued?: boolean;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
  customerTaxInfo?: CustomerTaxInfo;
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
