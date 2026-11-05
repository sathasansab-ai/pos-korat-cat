-- ====================================================================
-- SUPABASE SCHEMA FOR POS KORAT CAT x เรือนโคราชเฉลิมวัฒนา
-- คัดลอกโค้ดทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด RUN
-- ====================================================================

-- 1. ตารางสินค้าตัวหลัก (Products)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku_prefix TEXT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ตารางสต็อกสินค้าและไซส์/สี (Product Variants & Multi-Location Stock)
CREATE TABLE IF NOT EXISTS public.variants (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  sku TEXT UNIQUE,
  barcode TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  cost_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,    -- สต็อกรวม
  warehouse_stock INTEGER DEFAULT 0,   -- สต็อกโกดัง/โรงงานผลิต (ร้านเก่า)
  shop_stock INTEGER DEFAULT 0,        -- สต็อกหน้าร้าน (เรือนโคราชเฉลิมวัฒนา)
  min_stock_alert INTEGER DEFAULT 5,
  image_url TEXT,
  supplier_name TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ตารางลูกค้าและสมาชิกดิจิทัล (Customers & Digital Wisdom Pass)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  member_code TEXT,
  tier TEXT DEFAULT 'SILVER',
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_channel TEXT,
  address TEXT,
  tax_id TEXT,
  reward_points INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ตารางกะแคชเชียร์ 2 สาขา (Shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
  id TEXT PRIMARY KEY,
  branch TEXT DEFAULT 'SHOP',          -- 'SHOP' หรือ 'WAREHOUSE'
  cashier_id TEXT,
  cashier_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  starting_cash NUMERIC DEFAULT 0,
  closing_cash_expected NUMERIC,
  closing_cash_actual NUMERIC,
  cash_difference NUMERIC,
  total_cash_sales NUMERIC DEFAULT 0,
  total_promptpay_sales NUMERIC DEFAULT 0,
  total_credit_sales NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'OPEN',          -- 'OPEN' หรือ 'CLOSED'
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ตารางออเดอร์บิลขาย (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  local_order_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  cashier_id TEXT,
  cashier_name TEXT,
  shift_id TEXT,
  branch TEXT DEFAULT 'SHOP',
  customer_id TEXT,
  customer_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  promo_discount NUMERIC DEFAULT 0,
  member_discount_amount NUMERIC DEFAULT 0,
  member_tier TEXT,
  net_total NUMERIC DEFAULT 0,
  payments JSONB DEFAULT '[]'::jsonb,
  cash_received NUMERIC,
  change_given NUMERIC,
  status TEXT DEFAULT 'COMPLETED',
  is_synced BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ตารางโอนย้ายสินค้าระหว่างโกดังกับหน้าร้าน (Stock Transfers)
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id TEXT PRIMARY KEY,
  transfer_no TEXT UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  from_branch TEXT NOT NULL,           -- 'WAREHOUSE'
  to_branch TEXT NOT NULL,             -- 'SHOP'
  items JSONB DEFAULT '[]'::jsonb,     -- รายการสินค้าและจำนวนที่โอน
  total_qty INTEGER DEFAULT 0,
  sender_name TEXT NOT NULL,
  receiver_name TEXT,
  received_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING_RECEIPT', -- 'PENDING_RECEIPT', 'COMPLETED', 'CANCELLED'
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ตารางงานสั่งทำสั่งผลิต & เงินมัดจำ 50% (Custom Made Orders)
CREATE TABLE IF NOT EXISTS public.custom_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  staff_name TEXT NOT NULL,
  branch TEXT DEFAULT 'SHOP',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_method TEXT DEFAULT 'PICKUP_SHOP', -- 'PICKUP_SHOP' หรือ 'SHIPPING_ADDRESS'
  shipping_address TEXT,
  due_date TEXT,
  item_description TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  total_price NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  deposit_payment_method TEXT DEFAULT 'PROMPTPAY',
  status TEXT DEFAULT 'PENDING_PRODUCTION', -- 'PENDING_PRODUCTION', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COMPLETED'
  final_payment_method TEXT,
  final_paid_amount NUMERIC,
  final_paid_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. ตารางตั้งค่าร้านค้า (Store Settings)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- ตั้งค่าความปลอดภัยและสิทธิ์การอ่านเขียน (Row Level Security - RLS)
-- อนุญาตให้คีย์ anon ใช้งานได้เต็มที่สำหรับระบบ POS หน้าร้าน
-- ====================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- สร้างนโยบาย (Policies) อนุญาตให้ anon อ่าน-เขียนได้
DROP POLICY IF EXISTS "Allow anon all on products" ON public.products;
CREATE POLICY "Allow anon all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on variants" ON public.variants;
CREATE POLICY "Allow anon all on variants" ON public.variants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on customers" ON public.customers;
CREATE POLICY "Allow anon all on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on shifts" ON public.shifts;
CREATE POLICY "Allow anon all on shifts" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on orders" ON public.orders;
CREATE POLICY "Allow anon all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on stock_transfers" ON public.stock_transfers;
CREATE POLICY "Allow anon all on stock_transfers" ON public.stock_transfers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on custom_orders" ON public.custom_orders;
CREATE POLICY "Allow anon all on custom_orders" ON public.custom_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on store_settings" ON public.store_settings;
CREATE POLICY "Allow anon all on store_settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- เปิดระบบ Realtime ให้กับตารางสต็อกและออเดอร์ (ปลอดภัย ไม่เกิด Error ซ้ำซ้อน)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'variants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.variants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_transfers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
  END IF;
END $$;
