// src/types/index.ts

export type UserRole = 'OWNER' | 'CASHIER' | 'INVENTORY';

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
  storeEmail?: string;
  taxId: string;
  promptPayId: string;
  promptPayType: 'MOBILE' | 'TAX_ID';
  receiptHeader: string;
  receiptFooter: string;
  logoUrl?: string;
  printerPaperWidth: '58mm' | '80mm';
  autoPrintReceiptOnComplete?: boolean; // สั่งพิมพ์สลิปความร้อนอัตโนมัติทันทีเมื่อชำระเงินเสร็จสิ้น
  
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
  allowNegativeStock?: boolean; // อนุญาตให้ขายตัดสต็อกติดลบได้ (สำหรับกรณีสินค้ามาถึงหน้าร้านแล้วแต่ยังไม่ได้กดรับเข้าสต็อกในระบบ)

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

  // Free Gifts with Purchase (โปรโมชั่นแจกของสมนาคุณตัดสต็อกฟรี)
  freeGiftTiers?: FreeGiftTier[];

  // Tombstone tracking for deleted variants across devices
  deletedVariantIds?: string[];
}

export interface FreeGiftTier {
  id: string;
  minSpend: number; // ยอดซื้อขั้นต่ำ เช่น 1000 หรือ 2000
  giftVariantId: string;
  giftProductName: string;
  giftSku: string;
  giftBarcode?: string;
  giftQty: number; // จำนวนชิ้นที่แจก เช่น 1
  isActive: boolean;
  description?: string;
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
  updatedAt?: string; // ISO timestamp to prevent Cloud sync conflicts

  // Consignment Fields (ระบบฝากขายสินค้าชุมชน)
  isConsignment?: boolean;
  vendorId?: string;
  vendorName?: string;
  gpPercent?: number; // เปอร์เซ็นต์ที่ร้านหัก เช่น 20 หมายถึง ร้านได้ 20% ผู้ฝากได้ 80%
  vendorPayoutPrice?: number; // ยอดเงินคืนผู้ฝากต่อชิ้น (salePrice - (salePrice * gpPercent / 100))
  lastModifiedBy?: string; // ผู้ที่ทำการแก้ไข/ลงสต็อกล่าสุด (สำหรับตรวจสอบย้อนหลัง)
}

export interface ProductExchangeRecord {
  id: string;
  exchangeNo: string;
  timestamp: string;
  shiftId?: string; // รหัสกะที่ทำรายการเปลี่ยนสินค้า เพื่อสรุปยอดเงินและสต็อกส่งมอบกะ
  originalOrderId?: string;
  originalOrderLocalId?: string;
  cashierId: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  reason: string;
  returnedItems: {
    variantId: string;
    productName: string;
    sku: string;
    barcode: string;
    qty: number;
    unitPrice: number;
  }[];
  newItems: {
    variantId: string;
    productName: string;
    sku: string;
    barcode: string;
    qty: number;
    unitPrice: number;
  }[];
  priceDifference: number; // >0: ลูกค้าจ่ายเพิ่ม, <0: ร้านคืนเงิน, 0: เปลี่ยนไซส์ราคาเท่ากัน
  paymentMethod?: 'CASH' | 'PROMPTPAY';
  notes?: string;
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

export type GenderType = 'FEMALE' | 'MALE' | 'LGBTQ' | 'UNSPECIFIED';

export type AgeRangeType = 
  | 'UNDER_18'  // ต่ำกว่า 18 ปี
  | '18_24'     // 18 - 24 ปี
  | '25_29'     // 25 - 29 ปี
  | '30_34'     // 30 - 34 ปี
  | '35_39'     // 35 - 39 ปี
  | '40_44'     // 40 - 44 ปี
  | '45_49'     // 45 - 49 ปี
  | '50_54'     // 50 - 54 ปี
  | '55_59'     // 55 - 59 ปี
  | '60_PLUS'   // 60 ปีขึ้นไป
  | 'UNSPECIFIED'; // ไม่ระบุ

export const GENDER_CONFIG: Record<GenderType, { label: string; icon: string; badgeColor: string }> = {
  FEMALE: { label: 'หญิง', icon: '👩', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' },
  MALE: { label: 'ชาย', icon: '👨', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' },
  LGBTQ: { label: 'LGBTQ+', icon: '🌈', badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' },
  UNSPECIFIED: { label: 'ไม่ระบุ', icon: '👤', badgeColor: 'bg-slate-100 text-slate-700 border-slate-300' }
};

export const AGE_RANGE_CONFIG: Record<AgeRangeType, { label: string; short: string }> = {
  UNDER_18: { label: 'ต่ำกว่า 18 ปี', short: '<18' },
  '18_24': { label: '18 - 24 ปี', short: '18-24' },
  '25_29': { label: '25 - 29 ปี', short: '25-29' },
  '30_34': { label: '30 - 34 ปี', short: '30-34' },
  '35_39': { label: '35 - 39 ปี', short: '35-39' },
  '40_44': { label: '40 - 44 ปี', short: '40-44' },
  '45_49': { label: '45 - 49 ปี', short: '45-49' },
  '50_54': { label: '50 - 54 ปี', short: '50-54' },
  '55_59': { label: '55 - 59 ปี', short: '55-59' },
  '60_PLUS': { label: '60 ปีขึ้นไป', short: '60+' },
  UNSPECIFIED: { label: 'ไม่ระบุ', short: 'ไม่ระบุ' }
};

export type CustomOrderCategory = 'SHIRT' | 'PANTS' | 'JACKET' | 'BAG' | 'HAT' | 'OTHER';

export interface CustomOrderMeasurements {
  // เสื้อ & แจ็กเก็ต
  chest?: string;       // รอบอก
  waist?: string;       // รอบเอว
  hips?: string;        // รอบสะโพก
  shoulder?: string;    // ไหล่กว้าง
  shirtLength?: string; // ความยาวเสื้อ
  armLength?: string;   // ความยาวแขน
  armHole?: string;     // รอบวงแขน / ต้นแขน
  neck?: string;        // รอบคอ
  wrist?: string;       // ข้อมือ / ปลายแขน

  // กางเกง
  waistPants?: string;  // เอวกางเกง
  hipsPants?: string;   // สะโพก
  pantsLength?: string; // ความยาวกางเกง
  thigh?: string;       // รอบต้นขา
  crotch?: string;      // เป้ากางเกง
  legOpening?: string;  // ปลายขา

  // มิติ / ขนาดอื่นๆ
  customDimension?: string; // เช่น ขนาดหมวก / กระเป๋า / ผ้าพันคอ
}

export interface CustomMadeOrder {
  id: string;
  orderNo: string;
  createdAt: string;
  staffName: string;
  branch: BranchLocation;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerGender?: GenderType;
  categoryType?: CustomOrderCategory;
  measurements?: CustomOrderMeasurements;
  referenceImageUrl?: string; // รูปแบบอ้างอิง หรือ ลายผ้าที่ลูกค้าต้องการ
  fabricType?: string; // ชนิดผ้า เช่น ผ้าไหมมัดหมี่, คอตตอน Comb 20
  specialInstructions?: string; // ตำแหน่งปักลาย หรือ งานสกรีน
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

  // Free Gift with purchase
  isFreeGift?: boolean;
}

export interface Customer {
  id: string;
  memberCode: string; // เช่น KCAT-VIP-7892 รหัสบัตรสมาชิกสุ่มเฉพาะตัว
  tier?: 'SILVER' | 'GOLD' | 'BLACK_WISDOM'; // ระดับสมาชิก Luxury
  phone: string;
  name: string;
  gender?: GenderType;
  ageRange?: AgeRangeType;
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
    isFreeGift?: boolean;
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

  // Sales Channel (ช่องทางการขาย)
  salesChannel?: SalesChannel;
  onlineOrderRef?: string; // เลขที่ออเดอร์ออนไลน์ / เลขพัสดุ (เช่น TikTok Order ID)

  // Customer Demographics (ข้อมูลประชากรผู้ซื้อ)
  customerGender?: GenderType;
  customerAgeRange?: AgeRangeType;

  // Tax Invoice Info
  isTaxInvoiceIssued?: boolean;
  taxInvoiceNo?: string;
  taxInvoiceDate?: string;
  customerTaxInfo?: CustomerTaxInfo;
}

export type SalesChannel = 'STORE_FRONT' | 'TIKTOK' | 'LINE' | 'SHOPEE' | 'LAZADA' | 'FACEBOOK' | 'OTHER_ONLINE';

export const SALES_CHANNEL_CONFIG: Record<SalesChannel, { label: string; icon: string; badgeClass: string }> = {
  STORE_FRONT: { label: 'หน้าร้านเรือนโคราช', icon: '🏪', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  TIKTOK: { label: 'TikTok Shop', icon: '🎵', badgeClass: 'bg-slate-900 text-white border-slate-700' },
  LINE: { label: 'LINE Shopping / แชท', icon: '💬', badgeClass: 'bg-green-100 text-green-800 border-green-300' },
  SHOPEE: { label: 'Shopee', icon: '🛒', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  LAZADA: { label: 'Lazada', icon: '🛍️', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  FACEBOOK: { label: 'Facebook / Inbox', icon: '📘', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
  OTHER_ONLINE: { label: 'ออนไลน์อื่นๆ', icon: '🌐', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' }
};

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface QuotationItem {
  variantId: string;
  productName: string;
  sku: string;
  barcode?: string;
  attributes?: Record<string, string>;
  qty: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
}

export interface QuotationCustomerInfo {
  name: string;
  companyName?: string;
  branch?: string;
  address?: string;
  phone?: string;
  taxId?: string;
  email?: string;
  contactPerson?: string;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  validUntil: string;
  staffName: string;
  customer: QuotationCustomerInfo;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  vatType: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE';
  vatRate: number;
  preTaxAmount: number;
  vatAmount: number;
  netTotal: number;
  notes?: string;
  paymentTerms?: string;
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
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
