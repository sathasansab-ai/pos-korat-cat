// src/types/index.ts

export type UserRole = 'OWNER' | 'CASHIER';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-6 digit PIN for fast cashier lock/unlock
}

export interface Product {
  id: string;
  skuPrefix: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  category: string;
  sku: string;
  barcode: string;
  // Attributes: e.g. { size: "XL", color: "Black", technique: "DTF", pattern: "Korat Cat 01" }
  attributes: Record<string, string>;
  costPrice: number; // Only visible to OWNER
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  supplierName?: string;
  isActive: boolean;
}

export interface PromotionRule {
  id: string;
  name: string;
  type: 'MIX_AND_MATCH' | 'TIERED' | 'DISCOUNT_PERCENT';
  requiredQty: number; // e.g. 3 pieces
  bundlePrice: number; // e.g. 500 baht
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
  rewardPoints: number;
  totalSpent: number;
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
