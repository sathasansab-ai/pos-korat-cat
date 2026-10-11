// src/db/index.ts
import Dexie, { type Table } from 'dexie';
import type { 
  Product, 
  ProductVariant, 
  PromotionRule, 
  Customer, 
  Order, 
  Shift, 
  UserAccount 
} from '../types';

export class PosDatabase extends Dexie {
  users!: Table<UserAccount, string>;
  products!: Table<Product, string>;
  variants!: Table<ProductVariant, string>;
  promotions!: Table<PromotionRule, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  shifts!: Table<Shift, string>;

  constructor() {
    super('PosKoratCatDB');
    this.version(1).stores({
      users: 'id, role, pin',
      products: 'id, skuPrefix, category, isActive',
      variants: 'id, productId, sku, barcode, category, isActive',
      promotions: 'id, type, isActive',
      customers: 'id, phone',
      orders: 'id, localOrderId, shiftId, cashierId, status, timestamp, isSynced',
      shifts: 'id, cashierId, status, startTime'
    });
  }
}

export const db = new PosDatabase();

/**
 * ฟังก์ชันสำหรับ Seed ข้อมูลตั้งต้นเมื่อเปิดใช้งานครั้งแรก
 */
export async function seedInitialData() {
  const userCount = await db.users.count();
  if (userCount > 0) return; // เคย seed แล้ว ข้ามได้เลย

  // 1. Initial Users (Admin หลัก และ แคชเชียร์)
  const users: UserAccount[] = [
    {
      id: 'usr-owner-01',
      name: 'คุณนพดล (เจ้าของร้าน)',
      role: 'OWNER',
      pin: '9999' // รหัสแอดมินหลัก
    },
    {
      id: 'usr-cashier-01',
      name: 'น้องเนม (แคชเชียร์ 1)',
      role: 'CASHIER',
      pin: '1234' // รหัสแอดมินรอง (พนักงานกะ)
    }
  ];
  await db.users.bulkAdd(users);

  // 2. Initial Products & Variants (ตัวอย่างเสื้อผ้าแฟชั่น แมวโคราช DTF & Flex)
  const sampleProducts: Product[] = [
    {
      id: 'prod-001',
      skuPrefix: 'KCAT-TSHIRT',
      name: 'เสื้อยืดลายแมวโคราช รุ่น Signature',
      category: 'เสื้อผ้าแฟชั่น',
      description: 'ผ้าคอตตอน 100% สกรีนลายแมวโคราชพรีเมียม',
      isActive: true
    },
    {
      id: 'prod-002',
      skuPrefix: 'KCAT-CAP',
      name: 'หมวกแก๊ปลายแมวโคราช รีดร้อน',
      category: 'หมวกและแอคเซสเซอรี่',
      description: 'หมวกแก๊ปปรับขนาดได้ รีดสติ๊กเกอร์ลายพิเศษ',
      isActive: true
    },
    {
      id: 'prod-003',
      skuPrefix: 'KCAT-TOTE',
      name: 'กระเป๋าผ้าแคนวาส แมวโคราช',
      category: 'กระเป๋า',
      description: 'กระเป๋าผ้าแคนวาส 14 ออนซ์ ทนทาน',
      isActive: true
    }
  ];
  await db.products.bulkAdd(sampleProducts);

  const sampleVariants: ProductVariant[] = [
    // เสื้อยืด DTF - สีดำ ไซส์ M
    {
      id: 'var-001',
      productId: 'prod-001',
      productName: 'เสื้อยืดลายแมวโคราช - ดำ/M (DTF)',
      category: 'เสื้อผ้าแฟชั่น',
      sku: 'KCAT-TSHIRT-BLK-M-DTF',
      barcode: '8850001001',
      attributes: { color: 'ดำ', size: 'M', technique: 'DTF', pattern: 'แมวโคราชคลาสสิก' },
      costPrice: 120,
      salePrice: 290,
      stockQuantity: 25,
      minStockAlert: 5,
      supplierName: 'โรงทอผ้าโคราชเท็กซ์ไทล์',
      isActive: true
    },
    // เสื้อยืด DTF - สีดำ ไซส์ L
    {
      id: 'var-002',
      productId: 'prod-001',
      productName: 'เสื้อยืดลายแมวโคราช - ดำ/L (DTF)',
      category: 'เสื้อผ้าแฟชั่น',
      sku: 'KCAT-TSHIRT-BLK-L-DTF',
      barcode: '8850001002',
      attributes: { color: 'ดำ', size: 'L', technique: 'DTF', pattern: 'แมวโคราชคลาสสิก' },
      costPrice: 120,
      salePrice: 290,
      stockQuantity: 18,
      minStockAlert: 5,
      supplierName: 'โรงทอผ้าโคราชเท็กซ์ไทล์',
      isActive: true
    },
    // เสื้อยืด Flex สะท้อนแสง - สีขาว ไซส์ L
    {
      id: 'var-003',
      productId: 'prod-001',
      productName: 'เสื้อยืดลายแมวโคราช - ขาว/L (Flex นีออน)',
      category: 'เสื้อผ้าแฟชั่น',
      sku: 'KCAT-TSHIRT-WHT-L-FLEX',
      barcode: '8850001003',
      attributes: { color: 'ขาว', size: 'L', technique: 'Flex', pattern: 'แมวโคราชนีออน' },
      costPrice: 140,
      salePrice: 350,
      stockQuantity: 12,
      minStockAlert: 3,
      supplierName: 'โรงทอผ้าโคราชเท็กซ์ไทล์',
      isActive: true
    },
    // หมวกแก๊ป Flex
    {
      id: 'var-004',
      productId: 'prod-002',
      productName: 'หมวกแก๊ปแมวโคราช - ดำ (Flex นูน)',
      category: 'หมวกและแอคเซสเซอรี่',
      sku: 'KCAT-CAP-BLK-FLEX',
      barcode: '8850002001',
      attributes: { color: 'ดำ', technique: 'Flex', pattern: 'ตราประทับแมวโคราช' },
      costPrice: 85,
      salePrice: 199,
      stockQuantity: 30,
      minStockAlert: 8,
      supplierName: 'สยามแค็ป แมนูแฟคเจอริ่ง',
      isActive: true
    },
    // กระเป๋าผ้า DTF
    {
      id: 'var-005',
      productId: 'prod-003',
      productName: 'กระเป๋าผ้าแคนวาส - ครีม (DTF ลายใหญ่)',
      category: 'กระเป๋า',
      sku: 'KCAT-TOTE-CRM-DTF',
      barcode: '8850003001',
      attributes: { color: 'ครีม', technique: 'DTF', pattern: 'แผนที่เมืองโคราชและแมว' },
      costPrice: 65,
      salePrice: 159,
      stockQuantity: 40,
      minStockAlert: 10,
      supplierName: 'กลุ่มวิสาหกิจชุมชนกระเป๋าผ้า',
      isActive: true
    }
  ];
  await db.variants.bulkAdd(sampleVariants);

  // 3. Initial Promotion: Mix & Match (เสื้อผ้าแฟชั่น 3 ชิ้น เพียง 750 บาท จากปกติ 870+)
  const samplePromotions: PromotionRule[] = [
    {
      id: 'promo-001',
      name: '🎉 Mix & Match เสื้อยืดและหมวก 3 ชิ้น 699.- (ประหยัดสูงสุด 200+)',
      type: 'MIX_AND_MATCH',
      requiredQty: 3,
      bundlePrice: 699,
      eligibleCategories: ['เสื้อผ้าแฟชั่น', 'หมวกและแอคเซสเซอรี่'],
      startDate: '2025-01-01',
      endDate: '2027-12-31',
      isActive: true
    }
  ];
  await db.promotions.bulkAdd(samplePromotions);

  // 4. Sample Customers
  const sampleCustomers: Customer[] = [
    {
      id: 'cust-001',
      phone: '0812345678',
      name: 'คุณสมชาย สายแฟชั่น',
      rewardPoints: 120,
      totalSpent: 3500
    },
    {
      id: 'cust-002',
      phone: '0899887766',
      name: 'คุณวิภาวี นักสะสมหมวก',
      rewardPoints: 45,
      totalSpent: 990
    }
  ];
  await db.customers.bulkAdd(sampleCustomers);
}
