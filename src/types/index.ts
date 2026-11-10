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

export interface CustomerSlideItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  highlight1?: string;
  highlight2?: string;
  highlight3?: string;
  badgeColor?: 'AMBER' | 'EMERALD' | 'SKY' | 'PURPLE' | 'ROSE';
  layoutMode?: 'SPLIT' | 'FULL_IMAGE'; // 'SPLIT' = แบบข้อความ+รูป (ปัจจุบัน), 'FULL_IMAGE' = ภาพโปสเตอร์เต็มกรอบ
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
  
  // Tax / VAT Settings
  vatType: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE'; // ไม่คิด VAT, รวม VAT ในราคาแล้ว, หรือ คิด VAT เพิ่ม 7%
  vatRate: number; // e.g. 7%
  taxInvoiceTitle: string; // เช่น ใบเสร็จรับเงิน / ใบกำกับภาษีแบบเต็มรูป

  // Customer Facing Screen Customization
  customerScreenTheme: CustomerScreenTheme;
  screensaverMode?: 'FULL_POSTER' | 'SLIDESHOW'; // 'FULL_POSTER' = ภาพโปสเตอร์เต็มจอ 100%, 'SLIDESHOW' = สไลด์โชว์หมุนเวียน
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeImageUrl?: string;
  thankYouMessage: string;
  customSlides?: CustomerSlideItem[];

  // POS Display Settings
  showStockQuantityOnPos?: boolean; // แสดง/ซ่อนตัวเลขจำนวนสต็อกบนการ์ดสินค้าหน้าขาย

  // Member Tier Rules & Privilege Settings
  goldPointsThreshold?: number; // e.g. 50
  goldSpentThreshold?: number; // e.g. 5000
  goldDiscountPercent?: number; // e.g. 5
  goldPrivilegeText?: string;

  blackWisdomPointsThreshold?: number; // e.g. 150
  blackWisdomSpentThreshold?: number; // e.g. 15000
  blackWisdomDiscountPercent?: number; // e.g. 10
  blackWisdomPrivilegeText?: string;
  lastResetTimestamp?: string;
  lastResetScope?: string[];
  updatedAt?: string;

  // Cloud Sync for Staff Accounts & Owner Admin PIN
  ownerName?: string;
  ownerPin?: string;
  staffAccounts?: UserAccount[];

  // Consignment Vendors (ผู้ประกอบการ/วิสาหกิจชุมชนที่นำสินค้ามาฝากขาย)
  consignors?: ConsignmentVendor[];
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

export type BranchLocation = 'SHOP' | 'WAREHOUSE';

export interface ConsignmentVendor {
  id: string;
  code: string; // เช่น VND-01, CSG-KORAT
  name: string; // เช่น คุณกอ (กลุ่มหัตถกรรมเครื่องเคลือบดินเผาด่านเกวียน)
  phone: string;
  bankName?: string; // ธนาคาร
  bankAccountNo?: string; // เลขที่บัญชี หรือเบอร์พร้อมเพย์
  bankAccountName?: string; // ชื่อบัญชี
  defaultGpPercent: number; // เปอร์เซ็นต์หักของร้านเริ่มต้น เช่น 20%
  notes?: string;
  createdAt: string;
  isActive: boolean;
}

export interface ConsignmentSettlement {
  id: string;
  settlementNo: string; // เช่น STL-202611-001
  vendorId: string;
  vendorName: string;
  periodStart: string;
  periodEnd: string;
  totalQtySold: number;
  totalGrossSales: number;
  totalStoreFee: number;
  totalVendorPayout: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string;
  paymentMethod?: 'TRANSFER' | 'CASH';
  paymentRef?: string;
  notes?: string;
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
  stockQuantity: number; // ยอดรวมทั้งหมด (warehouseStock + shopStock)
  warehouseStock?: number; // คลังพื้นที่สต็อก / โรงงานผลิต (ร้านเก่า)
  shopStock?: number;      // คลังหน้าร้าน (เรือนโคราชเฉลิมวัฒนา)
  minStockAlert: number;
  imageUrl?: string;
  supplierName?: string;
  isActive: boolean;

  // Consignment Fields (ระบบฝากขายสินค้าชุมชน)
  isConsignment?: boolean;
  vendorId?: string;
  vendorName?: string;
  gpPercent?: number; // เปอร์เซ็นต์ที่ร้านหัก เช่น 20 หมายถึง ร้านได้ 20% ผู้ฝากได้ 80%
  vendorPayoutPrice?: number; // ยอดเงินคืนผู้ฝากต่อชิ้น (salePrice - (salePrice * gpPercent / 100))
}

export interface StockTransferItem {
  variantId: string;
  productName: string;
  sku: string;
  barcode: string;
  qty: number;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  timestamp: string;
  fromBranch: BranchLocation;
  toBranch: BranchLocation;
  items: StockTransferItem[];
  totalQty: number;
  senderName: string;
  receiverName?: string;
  receivedAt?: string;
  status: 'PENDING_RECEIPT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface CustomMadeOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  staffName: string;
  branch: BranchLocation;
  customerName: string;
  customerPhone: string;
  deliveryMethod: 'PICKUP_SHOP' | 'SHIPPING_ADDRESS';
  shippingAddress?: string;
  dueDate: string; // วันนัดรับสินค้า
  itemDescription: string; // รายละเอียดงานสั่งทำ เช่น ปักลาย, สกรีน DTF, งานโหล
  qty: number;
  totalPrice: number;
  depositAmount: number; // เงินมัดจำ
  balanceDue: number; // ยอดค้างชำระ
  depositPaymentMethod: 'CASH' | 'PROMPTPAY';
  status: 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
  finalPaymentMethod?: 'CASH' | 'PROMPTPAY';
  finalPaidAmount?: number;
  finalPaidAt?: string;
  notes?: string;
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

  // Consignment Fields
  isConsignment?: boolean;
  vendorId?: string;
  vendorName?: string;
  gpPercent?: number;
  vendorPayoutPrice?: number;
}

export interface Customer {
  id: string;
  memberCode: string; // เช่น KCAT-VIP-7892 รหัสบัตรสมาชิกสุ่มเฉพาะตัว
  tier?: 'SILVER' | 'GOLD' | 'BLACK_WISDOM'; // ระดับสมาชิก Luxury
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

    // Consignment Fields (บันทึกรายได้ของร้าน vs ยอดที่ต้องจ่ายคืนผู้ฝาก)
    isConsignment?: boolean;
    vendorId?: string;
    vendorName?: string;
    gpPercent?: number; // % GP หักร้าน เช่น 20%
    storeRevenue?: number; // ยอดส่วนแบ่งที่ร้านได้รับ (lineTotal * gpPercent / 100)
    vendorPayout?: number; // ยอดที่ต้องส่งมอบคืนผู้ประกอบการ (lineTotal - storeRevenue)
  }[];
  subtotal: number;
  promoDiscount: number;
  
  // Member tier privilege discount
  memberDiscountAmount?: number;
  memberTier?: string;

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
  branch?: BranchLocation;
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
  branch?: BranchLocation; // 'SHOP' (หน้าร้าน) หรือ 'WAREHOUSE' (โกดัง/พื้นที่สต็อก)
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
