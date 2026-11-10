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
  StoreSettings,
  StockTransfer,
  CustomMadeOrder,
  ConsignmentVendor,
  ConsignmentSettlement
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
  transfers!: Table<StockTransfer, string>;
  customOrders!: Table<CustomMadeOrder, string>;
  consignors!: Table<ConsignmentVendor, string>;
  settlements!: Table<ConsignmentSettlement, string>;

  constructor() {
    super('PosKoratCatDB');
    this.version(4).stores({
      users: 'id, role, pin, isActive',
      products: 'id, skuPrefix, category, isActive',
      variants: 'id, productId, sku, barcode, category, isActive, isConsignment, vendorId',
      promotions: 'id, type, isActive',
      customers: 'id, phone, memberCode',
      orders: 'id, localOrderId, shiftId, cashierId, status, timestamp, isSynced, branch',
      shifts: 'id, cashierId, status, startTime, branch',
      settings: 'id',
      transfers: 'id, transferNo, fromBranch, toBranch, status, timestamp',
      customOrders: 'id, orderNo, branch, status, createdAt, customerPhone',
      consignors: 'id, code, name, phone, isActive',
      settlements: 'id, settlementNo, vendorId, status, periodStart, periodEnd'
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
      thankYouMessage: 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
      showStockQuantityOnPos: false, // Default to clean boutique look without showing numbers
      goldPointsThreshold: 50,
      goldSpentThreshold: 5000,
      goldDiscountPercent: 5,
      goldPrivilegeText: 'สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ',
      blackWisdomPointsThreshold: 150,
      blackWisdomSpentThreshold: 15000,
      blackWisdomDiscountPercent: 10,
      blackWisdomPrivilegeText: 'สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี'
    };
    await db.settings.put(defaultSettings);
  } else {
    // Backfill any missing fields on existing database
    const updated: StoreSettings = {
      ...existingSettings,
      vatType: existingSettings.vatType || 'NONE',
      vatRate: existingSettings.vatRate ?? 7,
      taxInvoiceTitle: existingSettings.taxInvoiceTitle || 'ใบกำกับภาษี / ใบเสร็จรับเงิน (ต้นฉบับ)',
      customerScreenTheme: existingSettings.customerScreenTheme || 'BLACK_GOLD',
      welcomeTitle: existingSettings.welcomeTitle || 'ยินดีต้อนรับสู่ KORAT CAT',
      welcomeSubtitle: existingSettings.welcomeSubtitle || 'สินค้าแฟชั่นอัตลักษณ์แมวโคราช x เรือนโคราชเฉลิมวัฒนา จะแสดงขึ้นที่นี่เมื่อสแกนบาร์โค้ด',
      welcomeImageUrl: existingSettings.welcomeImageUrl || '',
      thankYouMessage: existingSettings.thankYouMessage || 'ขอบคุณที่อุดหนุน KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
      showStockQuantityOnPos: existingSettings.showStockQuantityOnPos ?? false,
      goldPointsThreshold: existingSettings.goldPointsThreshold ?? 50,
      goldSpentThreshold: existingSettings.goldSpentThreshold ?? 5000,
      goldDiscountPercent: existingSettings.goldDiscountPercent ?? 5,
      goldPrivilegeText: existingSettings.goldPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 5% ทุกยอดซื้อ + รับแต้มสะสมพิเศษ',
      blackWisdomPointsThreshold: existingSettings.blackWisdomPointsThreshold ?? 150,
      blackWisdomSpentThreshold: existingSettings.blackWisdomSpentThreshold ?? 15000,
      blackWisdomDiscountPercent: existingSettings.blackWisdomDiscountPercent ?? 10,
      blackWisdomPrivilegeText: existingSettings.blackWisdomPrivilegeText || 'สิทธิพิเศษ: ส่วนลด 10% ทุกยอดซื้อ + เชิญร่วมกิจกรรม Workshop ฟรี',
      customSlides: (existingSettings.customSlides && existingSettings.customSlides.length > 0)
        ? existingSettings.customSlides
        : [
            {
              id: 'heritage',
              tag: 'HERITAGE BOUTIQUE • ผสานอัตลักษณ์เมืองโคราช',
              badgeColor: 'AMBER',
              layoutMode: 'SPLIT',
              title: existingSettings.storeName || 'KORAT CAT x เรือนโคราชเฉลิมวัฒนา',
              subtitle: existingSettings.subTitle || 'ผสานศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา และแฟชั่นอัตลักษณ์แมวสีสวาด',
              description: 'งานหัตถศิลป์ทรงคุณค่า เอกลักษณ์เมืองนครราชสีมา เสื้อยืดพรีเมียมลิมิเต็ด ลายฉลุทองคำประณีต สกรีน DTF & Flex นูนเมทัลลิกชั้นสูง',
              highlight1: '✨ สกรีน DTF สีสวาดทองคำ ลิขสิทธิ์แท้',
              highlight2: '🏛️ มนต์เสน่ห์ศิลปวัฒนธรรมเรือนโคราชเฉลิมวัฒนา',
              highlight3: '🧵 เส้นใย Premium Comb Cotton 100% สวมใส่สบาย'
            },
            {
              id: 'mix_match',
              tag: 'SPECIAL PRIVILEGE • เซ็ตสุดคุ้ม',
              badgeColor: 'EMERALD',
              layoutMode: 'SPLIT',
              title: 'โปรโมชั่นพิเศษ "Mix & Match 3 ชิ้น ฿1,000"',
              subtitle: 'จับคู่ความคุ้มค่า ซื้อเสื้อยืดหรือของที่ระลึก 3 ชิ้น ประหยัดทันที 170 บาท',
              description: 'สามารถเลือกคละสี คละไซส์ (S, M, L, XL, 2XL) และคละลายพิมพ์ฉลุได้ตามใจชอบ ระบบจะคำนวณราคาโปรโมชั่นให้อัตโนมัติที่หน้าเคาน์เตอร์',
              highlight1: '🏷️ คละสี คละไซส์ คละลายพิมพ์ได้อิสระ',
              highlight2: '⚡ ระบบคำนวณส่วนลดให้อัตโนมัติบนหน้าจอ',
              highlight3: '🎁 เหมาะสำหรับเป็นของขวัญและของฝากพรีเมียม'
            },
            {
              id: 'digital_pass',
              tag: 'VIP MEMBERSHIP • บัตรสมาชิกดิจิทัล',
              badgeColor: 'SKY',
              layoutMode: 'SPLIT',
              title: 'Digital Wisdom Pass สมาชิกทรงเกียรติ',
              subtitle: 'สมัครสมาชิกฟรีเพียงแจ้งเบอร์โทรศัพท์ รับส่วนลด 5% - 10% ทุกยอดซื้อ',
              description: 'ยกระดับประสบการณ์ช้อปปิ้งสู่ระดับ Luxury บัตรสมาชิกดิจิทัล SILVER, GOLD และ BLACK WISDOM สแกน QR บัตรเก็บไว้ในสมาร์ทโฟนได้ทันที',
              highlight1: '💎 บัตรสมาชิกดิจิทัลหรูหรา สแกน QR เก็บเข้ามือถือได้',
              highlight2: '🎁 รับส่วนลด 5% สำหรับ GOLD และ 10% สำหรับ BLACK WISDOM',
              highlight3: '🎨 สิทธิ์เข้าร่วมกิจกรรม Workshop หัตถศิลป์เรือนโคราชฟรี'
            },
            {
              id: 'custom_made',
              tag: 'HAUTE COUTURE SERVICES • งานสั่งตัด',
              badgeColor: 'PURPLE',
              layoutMode: 'SPLIT',
              title: 'บริการสั่งตัดเย็บ & สกรีนสั่งผลิตพิเศษ',
              subtitle: 'รับทำเสื้อทีม ลายปักประณีต และของที่ระลึกองค์กร วางมัดจำเพียง 50%',
              description: 'สร้างสรรค์ชิ้นงานเฉพาะบุคคลโดยกลุ่มวิสาหกิจชุมชนหัตถศิลป์โคราช พร้อมออกใบสั่งผลิตดิจิทัลและนัดรับสินค้าได้ที่หน้าร้าน',
              highlight1: '✂️ งานปักตราสัญลักษณ์ และงานสกรีนตามแบบเฉพาะคุณ',
              highlight2: '📜 ใบสั่งผลิตและใบรับมัดจำดิจิทัลพร้อมกำหนดวันนัดรับ',
              highlight3: '🏪 นัดรับสินค้าได้ที่หน้าร้านเรือนโคราช หรือจัดส่งถึงบ้าน'
            }
          ]
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
        memberCode: 'KCAT-8891',
        tier: 'GOLD',
        phone: '0812345678',
        name: 'คุณสมชาย สายสะสมผ้าไหม',
        rewardPoints: 150,
        totalSpent: 5500
      },
      {
        id: 'cust-002',
        memberCode: 'KCAT-4512',
        tier: 'SILVER',
        phone: '0899887766',
        name: 'คุณวิภาวี นครราช',
        rewardPoints: 20,
        totalSpent: 1200
      }
    ];
    await db.customers.bulkAdd(customers);
  }

  // 6. Seed Initial Consignment Vendors (ผู้ประกอบการชุมชนฝากขาย)
  const vendorCount = await db.consignors.count();
  if (vendorCount === 0) {
    const initialVendors: ConsignmentVendor[] = [
      {
        id: 'vnd-001',
        code: 'VND-01',
        name: 'คุณกอ (วิสาหกิจเครื่องเคลือบดินเผาด่านเกวียน)',
        phone: '081-999-1111',
        bankName: 'กสิกรไทย (KBANK)',
        bankAccountNo: '045-2-12345-6',
        bankAccountName: 'วิสาหกิจชุมชนด่านเกวียน',
        defaultGpPercent: 20, // ร้านหัก 20%
        notes: 'สินค้าประเภทแก้วเซรามิก ของที่ระลึกแมวโคราชดินเผา',
        createdAt: new Date().toISOString(),
        isActive: true
      },
      {
        id: 'vnd-002',
        code: 'VND-02',
        name: 'กลุ่มหัตถกรรมผ้าไหมมัดหมี่และฝ้ายทอมือปักธงชัย',
        phone: '089-888-2222',
        bankName: 'กรุงไทย (KTB)',
        bankAccountNo: '301-0-98765-4',
        bankAccountName: 'กลุ่มทอผ้าไหมปักธงชัย',
        defaultGpPercent: 15, // ร้านหัก 15%
        notes: 'ผ้าพันคอไหม สร้อยข้อมือสายไหมแท้ลายอัตลักษณ์',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    ];
    await db.consignors.bulkAdd(initialVendors);
  }
}
