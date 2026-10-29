// src/db/index.ts
import Dexie, { type Table } from 'dexie';
import type { 
  Product, 
  ProductVariant, 
  PromotionRule, 
  Customer, 
  Order, 
  Shift, 
  UserAccount,
  StoreSettings 
} from '../types';

export class PosDatabase extends Dexie {
  users!: Table<UserAccount, string>;
  products!: Table<Product, string>;
  variants!: Table<ProductVariant, string>;
  promotions!: Table<PromotionRule, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  shifts!: Table<Shift, string>;
  settings!: Table<StoreSettings, string>;

  constructor() {
    super('PosKoratCatDB');
    this.version(2).stores({
      users: 'id, role, pin, isActive',
      products: 'id, skuPrefix, category, isActive',
      variants: 'id, productId, sku, barcode, category, isActive',
      promotions: 'id, type, isActive',
      customers: 'id, phone',
      orders: 'id, localOrderId, shiftId, cashierId, status, timestamp, isSynced',
      shifts: 'id, cashierId, status, startTime',
      settings: 'id'
    });
  }
}

export const db = new PosDatabase();

/**
 * Seed initial data with high-end "Korat Cat x เรือนโคราชเฉลิมวัฒนา" branding
 */
export async function seedInitialData() {
  // 1. Initial Settings
  const existingSettings = await db.settings.get('current_store_settings');
  if (!existingSettings) {
    const defaultSettings: StoreSettings = {
      id: 'current_store_settings',
      storeName: 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
      subTitle: 'Haute Couture & Heritage Craft Boutique',
      tagline: 'ยกระดับแฟชั่นอัตลักษณ์แมวโคราช ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา และวิสาหกิจชุมชน',
      address: 'ถนนจอมพล ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000',
      phone: '044-123456 / 081-999-8888',
      taxId: '0305566001234',
      promptPayId: '0819998888',
      promptPayType: 'MOBILE',
      receiptHeader: 'ยินดีต้อนรับสู่ KORAT CAT x เรือนโคราชเฉลิมวัฒนา\nขอบคุณที่สนับสนุนงานหัตถศิลป์และแฟชั่นท้องถิ่นโคราช',
      receiptFooter: 'สินค้าซื้อแล้วสามารถเปลี่ยนไซส์ได้ภายใน 7 วัน (สภาพสมบูรณ์)\nติดตามกิจกรรม Workshop และคอลเลกชันใหม่ได้ที่ FB/IG: @KoratCatHeritage',
      logoUrl: '',
      printerPaperWidth: '80mm',
      vatType: 'NONE',
      vatRate: 7,
      taxInvoiceTitle: 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)',
      customerScreenTheme: 'BLACK_GOLD',
      welcomeTitle: 'ยินดีต้อนรับสู่ KORAT CAT',
      welcomeSubtitle: 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด',
      welcomeImageUrl: '',
      thankYouMessage: 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา'
    };
    await db.settings.put(defaultSettings);
  } else {
    // Backfill any missing fields on existing database
    const updated = {
      ...existingSettings,
      vatType: existingSettings.vatType || 'NONE',
      vatRate: existingSettings.vatRate ?? 7,
      taxInvoiceTitle: existingSettings.taxInvoiceTitle || 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)',
      customerScreenTheme: existingSettings.customerScreenTheme || 'BLACK_GOLD',
      welcomeTitle: existingSettings.welcomeTitle || 'ยินดีต้อนรับสู่ KORAT CAT',
      welcomeSubtitle: existingSettings.welcomeSubtitle || 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด',
      welcomeImageUrl: existingSettings.welcomeImageUrl || '',
      thankYouMessage: existingSettings.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา'
    };
    await db.settings.put(updated);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    // 2. Staff & Owner Accounts
    const users: UserAccount[] = [
      {
        id: 'usr-owner-01',
        name: 'คุณนพดล (เจ้าของร้าน / ผู้ดูแลโครงการ)',
        role: 'OWNER',
        pin: '9999',
        isActive: true
      },
      {
        id: 'usr-cashier-01',
        name: 'น้องเนม (แคชเชียร์ 1 - กะเช้า)',
        role: 'CASHIER',
        pin: '1234',
        isActive: true
      },
      {
        id: 'usr-cashier-02',
        name: 'น้องฟ้า (แคชเชียร์ 2 - ประจำเรือนโคราช)',
        role: 'CASHIER',
        pin: '5678',
        isActive: true
      }
    ];
    await db.users.bulkAdd(users);
  }

  const productCount = await db.products.count();
  if (productCount === 0) {
    // 3. Products
    const products: Product[] = [
      {
        id: 'prod-001',
        skuPrefix: 'KCAT-HERITAGE',
        name: 'เสื้อยืดลิมิเต็ด KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
        category: 'เสื้อผ้าแฟชั่นไฮเอนด์',
        description: 'ผ้าคอตตอนพรีเมียม Combed 20 ลายอัตลักษณ์แมวสีสวาด ผสานลายฉลุเรือนโคราช',
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
        isActive: true
      },
      {
        id: 'prod-002',
        skuPrefix: 'KCAT-CAP',
        name: 'หมวกแก๊ปพรีเมียม โลโก้โลหะนูน Flex แมวโคราช',
        category: 'หมวกและแอคเซสเซอรี่',
        description: 'หมวกแก๊ปทรงสปอร์ต ผ้าวูลผสม สติ๊กเกอร์รีดร้อน Flex นีออนสะท้อนแสง',
        imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80',
        isActive: true
      },
      {
        id: 'prod-003',
        skuPrefix: 'KCAT-SILK',
        name: 'ผ้าพันคอไหมมัดหมี่ ลายแมวโคราช (วิสาหกิจชุมชน)',
        category: 'งานฝีมือ & วิสาหกิจชุมชน',
        description: 'ทอมือจากกลุ่มวิสาหกิจชุมชนทอผ้าไหม จ.นครราชสีมา 100%',
        imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&q=80',
        isActive: true
      },
      {
        id: 'prod-004',
        skuPrefix: 'KCAT-WORKSHOP',
        name: 'บัตรกิจกรรม Workshop: สกรีนลายแมวโคราช DIY บนผืนผ้า',
        category: 'กิจกรรม Workshop ในร้าน',
        description: 'ร่วมเวิร์กช็อปลงสีและสกรีน DTF/Flex บนกระเป๋าผ้า พร้อมอาจารย์ช่างศิลป์เรือนโคราช',
        imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&q=80',
        isActive: true
      }
    ];
    await db.products.bulkAdd(products);

    // 4. Variants with Attributes & Images
    const variants: ProductVariant[] = [
      {
        id: 'var-001',
        productId: 'prod-001',
        productName: 'เสื้อยืด KORAT CAT x เรือนโคราช - ดำ/M (DTF สีสวาดทอง)',
        category: 'เสื้อผ้าแฟชั่นไฮเอนด์',
        sku: 'KCAT-HERITAGE-BLK-M-DTF',
        barcode: '88501001',
        attributes: { color: 'ดำ Obsidian', size: 'M', technique: 'DTF คุณภาพสูง', pattern: 'แมวโคราชลายฉลุเรือนทอง' },
        costPrice: 220,
        salePrice: 590,
        stockQuantity: 30,
        minStockAlert: 5,
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
        supplierName: 'โรงทอพรีเมียมโคราชคราฟต์',
        isActive: true
      },
      {
        id: 'var-002',
        productId: 'prod-001',
        productName: 'เสื้อยืด KORAT CAT x เรือนโคราช - ดำ/L (DTF สีสวาดทอง)',
        category: 'เสื้อผ้าแฟชั่นไฮเอนด์',
        sku: 'KCAT-HERITAGE-BLK-L-DTF',
        barcode: '88501002',
        attributes: { color: 'ดำ Obsidian', size: 'L', technique: 'DTF คุณภาพสูง', pattern: 'แมวโคราชลายฉลุเรือนทอง' },
        costPrice: 220,
        salePrice: 590,
        stockQuantity: 25,
        minStockAlert: 5,
        imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80',
        supplierName: 'โรงทอพรีเมียมโคราชคราฟต์',
        isActive: true
      },
      {
        id: 'var-003',
        productId: 'prod-001',
        productName: 'เสื้อยืด KORAT CAT x เรือนโคราช - ขาว/XL (Flex นูนเมทัลลิก)',
        category: 'เสื้อผ้าแฟชั่นไฮเอนด์',
        sku: 'KCAT-HERITAGE-WHT-XL-FLEX',
        barcode: '88501003',
        attributes: { color: 'ขาว Ivory', size: 'XL', technique: 'Flex เมทัลลิกนูน', pattern: 'สัญลักษณ์แมวและเรือนเฉลิมวัฒนา' },
        costPrice: 260,
        salePrice: 690,
        stockQuantity: 15,
        minStockAlert: 3,
        imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80',
        supplierName: 'โรงทอพรีเมียมโคราชคราฟต์',
        isActive: true
      },
      {
        id: 'var-004',
        productId: 'prod-002',
        productName: 'หมวกแก๊ปแมวโคราช - ดำ (Flex ทองคำเปลว)',
        category: 'หมวกและแอคเซสเซอรี่',
        sku: 'KCAT-CAP-BLK-FLEX',
        barcode: '88502001',
        attributes: { color: 'ดำ', technique: 'Flex ทองคำเปลว', pattern: 'ตราประทับเรือนโคราช' },
        costPrice: 150,
        salePrice: 450,
        stockQuantity: 20,
        minStockAlert: 5,
        imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80',
        supplierName: 'สยามแค็ป แมนูแฟคเจอริ่ง',
        isActive: true
      },
      {
        id: 'var-005',
        productId: 'prod-003',
        productName: 'ผ้าพันคอไหมมัดหมี่ - สีกรมท่า ลายอัตลักษณ์แมวโคราช',
        category: 'งานฝีมือ & วิสาหกิจชุมชน',
        sku: 'KCAT-SILK-NVY',
        barcode: '88503001',
        attributes: { color: 'ครามธรรมชาติ', technique: 'ทอมือโบราณ', pattern: 'มัดหมี่แมวโคราชมงคล' },
        costPrice: 450,
        salePrice: 1290,
        stockQuantity: 10,
        minStockAlert: 2,
        imageUrl: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&q=80',
        supplierName: 'กลุ่มวิสาหกิจชุมชนทอผ้าไหมเฉลิมวัฒนา',
        isActive: true
      },
      {
        id: 'var-006',
        productId: 'prod-004',
        productName: 'บัตร DIY Workshop สกรีนกระเป๋าผ้าแมวโคราช (1 ที่นั่ง)',
        category: 'กิจกรรม Workshop ในร้าน',
        sku: 'KCAT-WS-TICKET',
        barcode: '88504001',
        attributes: { format: 'กิจกรรม 2 ชม.', include: 'รวมกระเป๋าผ้าและอุปกรณ์ DIY' },
        costPrice: 120,
        salePrice: 490,
        stockQuantity: 50,
        minStockAlert: 10,
        imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&q=80',
        supplierName: 'ฝ่ายกิจกรรมและศิลปวัฒนธรรมเรือนโคราช',
        isActive: true
      }
    ];
    await db.variants.bulkAdd(variants);
  }

  const promoCount = await db.promotions.count();
  if (promoCount === 0) {
    const defaultPromos: PromotionRule[] = [
      {
        id: 'promo-001',
        name: '✨ แพ็กเกจสุดคุ้ม: เสื้อยืดลิมิเต็ด + หมวกแก๊ป Flex เพียง 899.- (จากปกติ 1,040.-)',
        type: 'MIX_AND_MATCH',
        requiredQty: 2,
        bundlePrice: 899,
        targetAudience: 'ALL',
        eligibleCategories: ['เสื้อผ้าแฟชั่นไฮเอนด์', 'หมวกและแอคเซสเซอรี่'],
        startDate: '2025-01-01',
        endDate: '2028-12-31',
        isActive: true
      }
    ];
    await db.promotions.bulkAdd(defaultPromos);
  }

  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    const customers: Customer[] = [
      {
        id: 'cust-001',
        phone: '0812345678',
        name: 'คุณสมชาย สายสะสมผ้าไหม',
        rewardPoints: 150,
        totalSpent: 4500
      },
      {
        id: 'cust-002',
        phone: '0899887766',
        name: 'คุณวิภาวี นคราช',
        rewardPoints: 60,
        totalSpent: 1200
      }
    ];
    await db.customers.bulkAdd(customers);
  }
}
