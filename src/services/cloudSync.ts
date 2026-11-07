// src/services/cloudSync.ts
import { db } from '../db';
import type { 
  ProductVariant, 
  Product, 
  Customer, 
  Order, 
  Shift, 
  StockTransfer, 
  CustomMadeOrder,
  StoreSettings 
} from '../types';

const BASE_SUPABASE_URL = 'https://jfzfestdintwwsnoxiwv.supabase.co'.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

export const SUPABASE_CONFIG = {
  url: BASE_SUPABASE_URL,
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmemZlc3RkaW50d3dzbm94aXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MTA5NjUsImV4cCI6MjEwOTI4Njk2NX0.ZrQXdlMuAc_QnGsJCQFPwKAsaXf0mnzOlnfeP3woBd4'
};

class CloudSyncService {
  private getHeaders() {
    return {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
  }

  /**
   * ตรวจสอบว่าสามารถเชื่อมต่อ Supabase ได้หรือไม่
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?select=id&limit=1`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        return { success: true, message: 'เชื่อมต่อฐานข้อมูล Supabase สำเร็จเรียบร้อย' };
      }
      if (res.status === 404 || res.status === 400) {
        return { 
          success: false, 
          message: 'เชื่อมต่อได้ แต่ยังไม่ได้รันสคริปต์สร้างตาราง (supabase_schema.sql) ใน SQL Editor' 
        };
      }
      return { success: false, message: `เกิดข้อผิดพลาดจาก Supabase (HTTP ${res.status})` };
    } catch (err: any) {
      return { success: false, message: `ไม่สามารถเชื่อมต่ออินเทอร์เน็ตหรือ Supabase ได้: ${err.message}` };
    }
  }

  /**
   * ดึงข้อมูลทั้งหมดจาก Supabase Cloud ลงมาอัปเดตในเครื่องนี้ (Cloud -> Local)
   */
  public async pullFromCloud(): Promise<{ success: boolean; summary: string }> {
    try {
      // 0. Pull Store Settings first & Check for Cross-Device Reset Signal
      const cloudSettings = await this.pullStoreSettings();
      if (cloudSettings && cloudSettings.lastResetTimestamp) {
        const lastApplied = localStorage.getItem('pos_last_applied_reset');
        if (!lastApplied || new Date(cloudSettings.lastResetTimestamp) > new Date(lastApplied)) {
          const scope = cloudSettings.lastResetScope || ['orders', 'shifts', 'transfers', 'customOrders'];
          if (scope.includes('orders')) await db.orders.clear();
          if (scope.includes('shifts')) await db.shifts.clear();
          if (scope.includes('transfers')) await db.transfers.clear();
          if (scope.includes('customOrders')) await db.customOrders.clear();
          if (scope.includes('customers')) await db.customers.clear();
          localStorage.setItem('pos_last_applied_reset', cloudSettings.lastResetTimestamp);
        }
      }

      // 1. Pull Variants
      const vRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?select=*`, {
        headers: this.getHeaders()
      });
      if (vRes.ok) {
        const cloudVariants: any[] = await vRes.json();
        for (const cv of cloudVariants) {
          const localVar: ProductVariant = {
            id: cv.id,
            productId: cv.product_id,
            productName: cv.product_name,
            category: cv.category,
            sku: cv.sku,
            barcode: cv.barcode,
            attributes: cv.attributes || {},
            costPrice: Number(cv.cost_price || 0),
            salePrice: Number(cv.sale_price || 0),
            stockQuantity: Number(cv.stock_quantity || 0),
            warehouseStock: Number(cv.warehouse_stock || 0),
            shopStock: Number(cv.shop_stock || 0),
            minStockAlert: Number(cv.min_stock_alert || 5),
            imageUrl: cv.image_url,
            supplierName: cv.supplier_name,
            isActive: cv.is_active !== false
          };
          if (cv.sku) {
            const existingSameSku = await db.variants.where({ sku: cv.sku }).first();
            if (existingSameSku && existingSameSku.id !== cv.id) {
              await db.variants.delete(existingSameSku.id);
            }
          }
          await db.variants.put(localVar);
        }
      }

      // 2. Pull Customers
      const cRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/customers?select=*`, {
        headers: this.getHeaders()
      });
      if (cRes.ok) {
        const cloudCust: any[] = await cRes.json();
        for (const cc of cloudCust) {
          const localCust: Customer = {
            id: cc.id,
            memberCode: cc.member_code,
            tier: cc.tier || 'SILVER',
            phone: cc.phone,
            name: cc.name,
            contactChannel: cc.contact_channel,
            address: cc.address,
            taxId: cc.tax_id,
            rewardPoints: Number(cc.reward_points || 0),
            totalSpent: Number(cc.total_spent || 0),
            createdAt: cc.created_at
          };
          await db.customers.put(localCust);
        }
      }

      // 3. Pull Transfers
      const tRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?select=*`, {
        headers: this.getHeaders()
      });
      if (tRes.ok) {
        const cloudTransfers: any[] = await tRes.json();
        if (cloudTransfers.length === 0) {
          await db.transfers.clear();
        } else {
          for (const ct of cloudTransfers) {
            const localTransfer: StockTransfer = {
              id: ct.id,
              transferNo: ct.transfer_no,
              timestamp: ct.timestamp,
              fromBranch: ct.from_branch,
              toBranch: ct.to_branch,
              items: ct.items || [],
              totalQty: Number(ct.total_qty || 0),
              senderName: ct.sender_name,
              receiverName: ct.receiver_name,
              receivedAt: ct.received_at,
              status: ct.status,
              notes: ct.notes
            };
            await db.transfers.put(localTransfer);
          }
        }
      }

      // 4. Pull Custom Orders
      const coRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?select=*`, {
        headers: this.getHeaders()
      });
      if (coRes.ok) {
        const cloudCO: any[] = await coRes.json();
        if (cloudCO.length === 0) {
          await db.customOrders.clear();
        } else {
          for (const co of cloudCO) {
            const localCO: CustomMadeOrder = {
              id: co.id,
              orderNo: co.order_no,
              createdAt: co.created_at,
              staffName: co.staff_name,
              branch: co.branch,
              customerName: co.customer_name,
              customerPhone: co.customer_phone,
              deliveryMethod: co.delivery_method,
              shippingAddress: co.shipping_address,
              dueDate: co.due_date,
              itemDescription: co.item_description,
              qty: Number(co.qty || 1),
              totalPrice: Number(co.total_price || 0),
              depositAmount: Number(co.deposit_amount || 0),
              balanceDue: Number(co.balance_due || 0),
              depositPaymentMethod: co.deposit_payment_method,
              status: co.status,
              finalPaymentMethod: co.final_payment_method,
              finalPaidAmount: co.final_paid_amount ? Number(co.final_paid_amount) : undefined,
              finalPaidAt: co.final_paid_at,
              notes: co.notes
            };
            await db.customOrders.put(localCO);
          }
        }
      }

      // 5. Pull Shifts (กะพนักงานทุกสาขา เพื่อให้ทุกเครื่องเห็นตรงกัน)
      const sRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/shifts?select=*`, {
        headers: this.getHeaders()
      });
      if (sRes.ok) {
        const cloudShifts: any[] = await sRes.json();
        if (cloudShifts.length === 0) {
          await db.shifts.clear();
        } else {
          for (const cs of cloudShifts) {
            const localShift: Shift = {
              id: cs.id,
              branch: cs.branch || 'SHOP',
              cashierId: cs.cashier_id,
              cashierName: cs.cashier_name,
              startTime: cs.start_time,
              endTime: cs.end_time || undefined,
              startingCash: Number(cs.starting_cash || 0),
              closingCashExpected: cs.closing_cash_expected !== null ? Number(cs.closing_cash_expected) : undefined,
              closingCashActual: cs.closing_cash_actual !== null ? Number(cs.closing_cash_actual) : undefined,
              cashDifference: cs.cash_difference !== null ? Number(cs.cash_difference) : undefined,
              totalCashSales: Number(cs.total_cash_sales || 0),
              totalPromptPaySales: Number(cs.total_promptpay_sales || 0),
              totalCreditSales: Number(cs.total_credit_sales || 0),
              totalTransactions: Number(cs.total_transactions || 0),
              status: cs.status || 'OPEN',
              notes: cs.notes || undefined
            };
            await db.shifts.put(localShift);
          }
        }
      }

      // 6. Pull Orders (บิลขายย้อนหลัง)
      const oRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?select=*&order=timestamp.desc&limit=200`, {
        headers: this.getHeaders()
      });
      if (oRes.ok) {
        const cloudOrders: any[] = await oRes.json();
        if (cloudOrders.length === 0) {
          await db.orders.clear();
        } else {
          for (const co of cloudOrders) {
            const localOrder: Order = {
              id: co.id,
              localOrderId: co.local_order_id,
              timestamp: co.timestamp,
              cashierId: co.cashier_id,
              cashierName: co.cashier_name,
              shiftId: co.shift_id,
              branch: co.branch || 'SHOP',
              customerId: co.customer_id || undefined,
              customerName: co.customer_name || undefined,
              items: co.items || [],
              subtotal: Number(co.subtotal || 0),
              promoDiscount: Number(co.promo_discount || 0),
              memberDiscountAmount: Number(co.member_discount_amount || 0),
              memberTier: co.member_tier || undefined,
              netTotal: Number(co.net_total || 0),
              payments: co.payments || [],
              cashReceived: co.cash_received !== null ? Number(co.cash_received) : undefined,
              changeGiven: co.change_given !== null ? Number(co.change_given) : undefined,
              status: co.status || 'COMPLETED',
              isSynced: true
            };
            await db.orders.put(localOrder);
          }
        }
      }

      return { success: true, summary: 'ดึงข้อมูลล่าสุดจาก Cloud อัปเดตลงเครื่องสำเร็จ (สต็อก, กะ, บิล, ใบโอน, สั่งผลิต, สไลด์ภาพจอ 2)' };
    } catch (err: any) {
      return { success: false, summary: `เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}` };
    }
  }

  /**
   * ส่งข้อมูลทั้งหมดจากเครื่องนี้ขึ้นไปเก็บบน Supabase Cloud (Local -> Cloud)
   * แก้ไขปัญหา PGRST102: ทุก Object ต้องมีคีย์ครบเหมือนกันทุกประการ (ห้ามมี undefined)
   */
  public async pushAllToCloud(): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Push Variants (สินค้าและสต็อก 2 คลัง)
      const localVariants = await db.variants.toArray();
      let variantsSyncedCount = 0;
      if (localVariants.length > 0) {
        // ดึงรายการ ID และ SKU จาก Supabase เพื่อตรวจจับคู่และป้องกัน variants_sku_key constraint (23505)
        const cloudSkuMap = new Map<string, string>();
        try {
          const checkRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?select=id,sku`, {
            headers: this.getHeaders()
          });
          if (checkRes.ok) {
            const rows: { id: string; sku: string }[] = await checkRes.json();
            rows.forEach(r => {
              if (r.sku) cloudSkuMap.set(r.sku.trim().toLowerCase(), r.id);
            });
          }
        } catch (e) {
          console.warn('Failed to pre-check existing variants SKUs', e);
        }

        const seenSkus = new Set<string>();
        const payload = [];

        for (const v of localVariants) {
          const rawSku = (v.sku || '').trim();
          let skuKey = rawSku.toLowerCase();

          // หาก SKU นี้มีอยู่แล้วบน Cloud แต่อยู่ภายใต้ id อื่น ให้เปลี่ยนมาใช้ id ของ Cloud เพื่อไม่ให้เกิด Duplicate Key
          let finalId = String(v.id);
          if (rawSku && cloudSkuMap.has(skuKey)) {
            finalId = cloudSkuMap.get(skuKey)!;
            if (v.id !== finalId) {
              await db.variants.delete(v.id);
              await db.variants.put({ ...v, id: finalId });
            }
          }

          // ป้องกัน SKU ซ้ำกันเองใน Batch
          let finalSku = rawSku;
          if (seenSkus.has(skuKey)) {
            finalSku = `${rawSku}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 5)}`;
            skuKey = finalSku.toLowerCase();
          }
          if (finalSku) seenSkus.add(skuKey);

          payload.push({
            id: finalId,
            product_id: v.productId ? String(v.productId) : null,
            product_name: String(v.productName || ''),
            category: String(v.category || 'สินค้าทั่วไป'),
            sku: finalSku || `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            barcode: String(v.barcode || ''),
            attributes: v.attributes || {},
            cost_price: Number(v.costPrice || 0),
            sale_price: Number(v.salePrice || 0),
            stock_quantity: Number(v.stockQuantity || 0),
            warehouse_stock: Number(v.warehouseStock ?? v.stockQuantity ?? 0),
            shop_stock: Number(v.shopStock ?? 0),
            min_stock_alert: Number(v.minStockAlert ?? 5),
            image_url: v.imageUrl ? String(v.imageUrl) : null,
            supplier_name: v.supplierName ? String(v.supplierName) : null,
            is_active: v.isActive !== false
          });
        }

        const vRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?on_conflict=id`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });

        if (vRes.ok) {
          variantsSyncedCount = payload.length;
        } else {
          // หากติดปัญหา Batch หรือ 409 variants_sku_key ให้ส่งแบบรายตัวและ PATCH ตาม SKU
          const errText = await vRes.text();
          console.warn(`Bulk variants notice (${vRes.status}): ${errText}. Syncing individually with SKU resolution...`);
          for (const item of payload) {
            try {
              const singleRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?on_conflict=id`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify([item])
              });
              if (singleRes.ok) {
                variantsSyncedCount++;
              } else if (singleRes.status === 409 && item.sku) {
                // หากติด Unique Constraint SKU ให้แยก id ออกแล้ว PATCH รายการเดิมบน Cloud ตาม SKU
                const { id: _unusedId, ...patchFields } = item;
                const patchRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?sku=eq.${encodeURIComponent(item.sku)}`, {
                  method: 'PATCH',
                  headers: this.getHeaders(),
                  body: JSON.stringify(patchFields)
                });
                if (patchRes.ok) variantsSyncedCount++;
              }
            } catch {
              // ignore single item fail
            }
          }
        }
      }

      // 2. Push Customers (ข้อมูลลูกค้าและสมาชิก)
      const localCustomers = await db.customers.toArray();
      if (localCustomers.length > 0) {
        try {
          const custPayload = localCustomers.map(c => ({
            id: String(c.id),
            member_code: c.memberCode ? String(c.memberCode) : null,
            tier: String(c.tier || 'SILVER'),
            phone: String(c.phone || ''),
            name: String(c.name || ''),
            contact_channel: c.contactChannel ? String(c.contactChannel) : null,
            address: c.address ? String(c.address) : null,
            tax_id: c.taxId ? String(c.taxId) : null,
            reward_points: Number(c.rewardPoints || 0),
            total_spent: Number(c.totalSpent || 0)
          }));

          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/customers?on_conflict=id`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(custPayload)
          });
        } catch (e) {
          console.warn('Customer push warning', e);
        }
      }

      // 3. Push Stock Transfers (ประวัติการโอนย้ายสต็อกข้ามคลัง)
      const localTransfers = await db.transfers.toArray();
      if (localTransfers.length > 0) {
        try {
          const transPayload = localTransfers.map(t => ({
            id: String(t.id),
            transfer_no: String(t.transferNo),
            timestamp: String(t.timestamp),
            from_branch: String(t.fromBranch),
            to_branch: String(t.toBranch),
            items: t.items || [],
            total_qty: Number(t.totalQty || 0),
            sender_name: String(t.senderName || ''),
            receiver_name: t.receiverName ? String(t.receiverName) : null,
            received_at: t.receivedAt ? String(t.receivedAt) : null,
            status: String(t.status || 'PENDING_RECEIPT'),
            notes: t.notes ? String(t.notes) : null
          }));

          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?on_conflict=id`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(transPayload)
          });
        } catch (e) {
          console.warn('Transfers push warning', e);
        }
      }

      // 4. Push Custom Orders (งานสั่งผลิต & เงินมัดจำ)
      const localCustomOrders = await db.customOrders.toArray();
      if (localCustomOrders.length > 0) {
        try {
          const coPayload = localCustomOrders.map(co => ({
            id: String(co.id),
            order_no: String(co.orderNo),
            created_at: String(co.createdAt),
            staff_name: String(co.staffName || ''),
            branch: String(co.branch || 'SHOP'),
            customer_name: String(co.customerName || ''),
            customer_phone: String(co.customerPhone || ''),
            delivery_method: String(co.deliveryMethod || 'PICKUP_SHOP'),
            shipping_address: co.shippingAddress ? String(co.shippingAddress) : null,
            due_date: co.dueDate ? String(co.dueDate) : null,
            item_description: String(co.itemDescription || ''),
            qty: Number(co.qty || 1),
            total_price: Number(co.totalPrice || 0),
            deposit_amount: Number(co.depositAmount || 0),
            balance_due: Number(co.balanceDue || 0),
            deposit_payment_method: String(co.depositPaymentMethod || 'PROMPTPAY'),
            status: String(co.status || 'PENDING_PRODUCTION'),
            final_payment_method: co.finalPaymentMethod ? String(co.finalPaymentMethod) : null,
            final_paid_amount: co.finalPaidAmount ? Number(co.finalPaidAmount) : null,
            final_paid_at: co.finalPaidAt ? String(co.finalPaidAt) : null,
            notes: co.notes ? String(co.notes) : null
          }));

          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?on_conflict=id`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(coPayload)
          });
        } catch (e) {
          console.warn('Custom orders push warning', e);
        }
      }

      // 5. Push Shifts (กะพนักงานทั้งหมด)
      const localShifts = await db.shifts.toArray();
      if (localShifts.length > 0) {
        try {
          const shiftPayload = localShifts.map(s => ({
            id: String(s.id),
            branch: String(s.branch || 'SHOP'),
            cashier_id: String(s.cashierId || ''),
            cashier_name: String(s.cashierName || ''),
            start_time: String(s.startTime),
            end_time: s.endTime ? String(s.endTime) : null,
            starting_cash: Number(s.startingCash || 0),
            closing_cash_expected: s.closingCashExpected !== undefined ? Number(s.closingCashExpected) : null,
            closing_cash_actual: s.closingCashActual !== undefined ? Number(s.closingCashActual) : null,
            cash_difference: s.cashDifference !== undefined ? Number(s.cashDifference) : null,
            total_cash_sales: Number(s.totalCashSales || 0),
            total_promptpay_sales: Number(s.totalPromptPaySales || 0),
            total_credit_sales: Number(s.totalCreditSales || 0),
            total_transactions: Number(s.totalTransactions || 0),
            status: String(s.status || 'OPEN'),
            notes: s.notes ? String(s.notes) : null
          }));

          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/shifts?on_conflict=id`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(shiftPayload)
          });
        } catch (e) {
          console.warn('Shifts push warning', e);
        }
      }

      // 6. Push Orders (บิลขายทั้งหมด)
      const localOrders = await db.orders.toArray();
      if (localOrders.length > 0) {
        try {
          const orderPayload = localOrders.map(o => ({
            id: String(o.id),
            local_order_id: String(o.localOrderId),
            timestamp: String(o.timestamp),
            cashier_id: String(o.cashierId || ''),
            cashier_name: String(o.cashierName || ''),
            shift_id: String(o.shiftId || ''),
            branch: String(o.branch || 'SHOP'),
            customer_id: o.customerId ? String(o.customerId) : null,
            customer_name: o.customerName ? String(o.customerName) : null,
            items: o.items || [],
            subtotal: Number(o.subtotal || 0),
            promo_discount: Number(o.promoDiscount || 0),
            member_discount_amount: Number(o.memberDiscountAmount || 0),
            member_tier: o.memberTier ? String(o.memberTier) : null,
            net_total: Number(o.netTotal || 0),
            payments: o.payments || [],
            cash_received: o.cashReceived !== undefined ? Number(o.cashReceived) : null,
            change_given: o.changeGiven !== undefined ? Number(o.changeGiven) : null,
            status: String(o.status || 'COMPLETED'),
            is_synced: true
          }));

          await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?on_conflict=id`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(orderPayload)
          });
        } catch (e) {
          console.warn('Orders push warning', e);
        }
      }

      // 7. Push Store Settings & Customer Display Slide Images
      const localSettings = await db.settings.get('current_store_settings');
      let settingsSynced = false;
      if (localSettings) {
        const res = await this.pushStoreSettings(localSettings);
        settingsSynced = res.success;
      }

      return { 
        success: true, 
        message: `ส่งข้อมูลขึ้น Cloud สำเร็จสมบูรณ์! (สินค้า: ${variantsSyncedCount}, บิล: ${localOrders.length}, กะ: ${localShifts.length}, สั่งผลิต: ${localCustomOrders.length}, ภาพจอฝั่งลูกค้า: ${settingsSynced ? 'ซิงค์สำเร็จ' : 'บันทึกในเครื่อง'})` 
      };
    } catch (err: any) {
      return { success: false, message: `เกิดข้อผิดพลาดในการส่งข้อมูลขึ้น Cloud: ${err.message}` };
    }
  }

  /**
   * ซิงค์เฉพาะใบโอนย้ายสต็อก เพื่อให้แถบแจ้งเตือนอัปเดตตรงกันทันที
   */
  public async syncTransfersOnly(): Promise<void> {
    try {
      const tRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?select=*`, {
        headers: this.getHeaders()
      });
      if (tRes.ok) {
        const cloudTransfers: any[] = await tRes.json();
        if (cloudTransfers.length === 0) {
          return;
        }

        for (const ct of cloudTransfers) {
          // ตรวจสอบกับข้อมูลในเครื่องก่อน หากในเครื่องสถานะเป็น COMPLETED แล้ว (รับของแล้ว)
          // แต่ Cloud ยังส่ง PENDING_RECEIPT มา ให้คง COMPLETED ไว้ และดันอัปเดตกลับขึ้น Cloud
          const localMatch = await db.transfers.where('transferNo').equals(ct.transfer_no).first() 
            || await db.transfers.get(ct.id);

          if (localMatch && localMatch.status === 'COMPLETED' && ct.status === 'PENDING_RECEIPT') {
            this.pushTransfer(localMatch).catch(() => {});
            continue;
          }

          const localTransfer: StockTransfer = {
            id: ct.id,
            transferNo: ct.transfer_no,
            timestamp: ct.timestamp,
            fromBranch: ct.from_branch,
            toBranch: ct.to_branch,
            items: ct.items || [],
            totalQty: Number(ct.total_qty || 0),
            senderName: ct.sender_name,
            receiverName: ct.receiver_name,
            receivedAt: ct.received_at,
            status: ct.status,
            notes: ct.notes
          };

          // ลบรายการซ้ำซ้อนที่มี transferNo เดียวกันแต่คนละ id เพื่อไม่ให้เกิดประวัติค้าง
          const duplicates = await db.transfers.where('transferNo').equals(ct.transfer_no).toArray();
          for (const d of duplicates) {
            if (d.id !== ct.id) {
              await db.transfers.delete(d.id);
            }
          }
          await db.transfers.put(localTransfer);
        }
      }
    } catch (e) {
      // background polling quiet ignore
    }
  }

  /**
   * ส่งออเดอร์ใหม่ขึ้น Cloud ทันทีที่คิดเงินสำเร็จ
   */
  public async pushOrder(order: Order): Promise<void> {
    try {
      const payload = {
        id: order.id,
        local_order_id: order.localOrderId,
        timestamp: order.timestamp,
        cashier_id: order.cashierId,
        cashier_name: order.cashierName,
        shift_id: order.shiftId,
        branch: order.branch || 'SHOP',
        customer_id: order.customerId ?? null,
        customer_name: order.customerName ?? null,
        items: order.items,
        subtotal: order.subtotal,
        promo_discount: order.promoDiscount,
        member_discount_amount: order.memberDiscountAmount || 0,
        member_tier: order.memberTier ?? null,
        net_total: order.netTotal,
        payments: order.payments,
        cash_received: order.cashReceived ?? null,
        change_given: order.changeGiven ?? null,
        status: order.status,
        is_synced: true
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });
    } catch (e) {
      console.warn('Failed to push order to cloud, cached locally in IndexedDB', e);
    }
  }

  /**
   * ส่งใบโอนสินค้าข้ามคลังขึ้น Cloud
   */
  public async pushTransfer(transfer: StockTransfer): Promise<void> {
    try {
      const payload = {
        id: transfer.id,
        transfer_no: transfer.transferNo,
        timestamp: transfer.timestamp,
        from_branch: transfer.fromBranch,
        to_branch: transfer.toBranch,
        items: transfer.items,
        total_qty: transfer.totalQty,
        sender_name: transfer.senderName,
        receiver_name: transfer.receiverName ?? null,
        received_at: transfer.receivedAt ?? null,
        status: transfer.status,
        notes: transfer.notes ?? null
      };

      // 1. ลอง Upsert ด้วย id ก่อน (Primary Key ในตาราง Supabase)
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });

      // 2. หากไม่สำเร็จ ให้ PATCH ตาม id หรือ transfer_no โดยตรง (ตัด id ออกเพื่อไม่ให้ชน immutable PK)
      if (!res.ok) {
        const { id, ...updateFields } = payload;
        await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?transfer_no=eq.${encodeURIComponent(payload.transfer_no)}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(updateFields)
        });
      }
    } catch (e) {
      console.warn('Failed to push transfer to cloud', e);
    }
    }
  }

  /**
   * ส่งข้อมูลสินค้าตัวเดียวขึ้น Cloud ทันที
   */
  public async pushVariant(v: ProductVariant): Promise<void> {
    try {
      const payload = {
        id: String(v.id),
        product_id: v.productId ? String(v.productId) : null,
        product_name: String(v.productName || ''),
        category: String(v.category || 'สินค้าทั่วไป'),
        sku: String(v.sku || ''),
        barcode: String(v.barcode || ''),
        attributes: v.attributes || {},
        cost_price: Number(v.costPrice || 0),
        sale_price: Number(v.salePrice || 0),
        stock_quantity: Number(v.stockQuantity || 0),
        warehouse_stock: Number(v.warehouseStock ?? v.stockQuantity ?? 0),
        shop_stock: Number(v.shopStock ?? 0),
        min_stock_alert: Number(v.minStockAlert ?? 5),
        image_url: v.imageUrl ? String(v.imageUrl) : null,
        supplier_name: v.supplierName ? String(v.supplierName) : null,
        is_active: v.isActive !== false
      };

      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });

      if (!res.ok && res.status === 409 && payload.sku) {
        // หากติด Unique Constraint SKU ให้ Patch อัปเดตรายการเดิมบน Cloud
        await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?sku=eq.${encodeURIComponent(payload.sku)}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.warn('Failed to push single variant to cloud', e);
    }
  }

  /**
   * ลบสินค้าออกจาก Cloud
   */
  public async deleteVariant(id: string): Promise<void> {
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
    } catch (e) {
      console.warn('Failed to delete variant from cloud', e);
    }
  }

  /**
   * ส่งข้อมูลกะพนักงานขึ้น Cloud เมื่อเปิดหรือปิดกะ
   */
  public async pushShift(s: Shift): Promise<void> {
    try {
      const payload = {
        id: String(s.id),
        branch: String(s.branch || 'SHOP'),
        cashier_id: String(s.cashierId || ''),
        cashier_name: String(s.cashierName || ''),
        start_time: String(s.startTime),
        end_time: s.endTime ? String(s.endTime) : null,
        starting_cash: Number(s.startingCash || 0),
        closing_cash_expected: s.closingCashExpected !== undefined ? Number(s.closingCashExpected) : null,
        closing_cash_actual: s.closingCashActual !== undefined ? Number(s.closingCashActual) : null,
        cash_difference: s.cashDifference !== undefined ? Number(s.cashDifference) : null,
        total_cash_sales: Number(s.totalCashSales || 0),
        total_promptpay_sales: Number(s.totalPromptPaySales || 0),
        total_credit_sales: Number(s.totalCreditSales || 0),
        total_transactions: Number(s.totalTransactions || 0),
        status: String(s.status || 'OPEN'),
        notes: s.notes ? String(s.notes) : null
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/shifts?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });
    } catch (e) {
      console.warn('Failed to push shift to cloud', e);
    }
  }

  /**
   * ส่งใบสั่งผลิตมัดจำ 50% ขึ้น Cloud
   */
  public async pushCustomOrder(co: CustomMadeOrder): Promise<void> {
    try {
      const payload = {
        id: co.id,
        order_no: co.orderNo,
        created_at: co.createdAt,
        staff_name: co.staffName,
        branch: co.branch,
        customer_name: co.customerName,
        customer_phone: co.customerPhone,
        delivery_method: co.deliveryMethod,
        shipping_address: co.shippingAddress ?? null,
        due_date: co.dueDate ?? null,
        item_description: co.itemDescription,
        qty: co.qty,
        total_price: co.totalPrice,
        deposit_amount: co.depositAmount,
        balance_due: co.balanceDue,
        deposit_payment_method: co.depositPaymentMethod,
        status: co.status,
        final_payment_method: co.finalPaymentMethod ?? null,
        final_paid_amount: co.finalPaidAmount ?? null,
        final_paid_at: co.finalPaidAt ?? null,
        notes: co.notes ?? null
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });
    } catch (e) {
      console.warn('Failed to push custom order to cloud', e);
    }
  }

  /**
   * ส่งการตั้งค่าร้านค้า รูปภาพโลโก้ ภาพต้อนรับ และสไลด์โฆษณาขึ้น Cloud
   */
  public async pushStoreSettings(settings: StoreSettings): Promise<{ success: boolean; message?: string }> {
    try {
      const nowIso = new Date().toISOString();
      const settingsWithTime = {
        ...settings,
        updatedAt: settings.updatedAt || nowIso
      };

      // 1. ส่งไปยังตาราง store_settings
      const payload = {
        id: 'current_store_settings',
        data: settingsWithTime,
        updated_at: nowIso
      };
      
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/store_settings?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });

      // 2. ส่ง Backup ไปยังตาราง products (รับประกันว่ามีตารางนี้และ RLS อนุญาต 100%)
      const backupProduct = {
        id: 'current_store_settings',
        sku_prefix: 'SYS',
        name: 'STORE_SETTINGS_SYNC',
        category: 'SYSTEM_SETTINGS',
        description: JSON.stringify(settingsWithTime),
        image_url: settingsWithTime.welcomeImageUrl || settingsWithTime.logoUrl || (settingsWithTime.customSlides?.[0]?.imageUrl) || '',
        is_active: true,
        updated_at: nowIso
      };

      const backupRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([backupProduct])
      });

      if (!res.ok && !backupRes.ok) {
        const err = await backupRes.text();
        console.warn('Failed to push store settings backup to products table', backupRes.status, err);
        return { success: false, message: `Cloud Sync Error (${backupRes.status})` };
      }

      return { success: true };
    } catch (e: any) {
      console.warn('Failed to push store settings to cloud', e);
      return { success: false, message: e.message };
    }
  }

  /**
   * ดึงการตั้งค่าร้านค้า รูปภาพ และสไลด์โฆษณาจาก Cloud ลงเครื่อง (สำหรับให้จอฝั่งลูกค้าซิงค์ตรงกัน)
   */
  public async pullStoreSettings(): Promise<StoreSettings | null> {
    try {
      let cloudSettings: StoreSettings | null = null;

      // 1. ดึงจากตาราง store_settings ก่อน
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/store_settings?id=eq.current_store_settings&select=*`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows.length > 0 && rows[0].data) {
          cloudSettings = rows[0].data as StoreSettings;
        }
      }

      // 2. หาก store_settings ว่างเปล่า หรือยังไม่ได้รัน SQL ให้ดึงจาก Backup ในตาราง products
      if (!cloudSettings) {
        const backupRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/products?id=eq.current_store_settings&select=*`, {
          headers: this.getHeaders()
        });
        if (backupRes.ok) {
          const rows = await backupRes.json();
          if (rows.length > 0 && rows[0].description) {
            try {
              cloudSettings = JSON.parse(rows[0].description) as StoreSettings;
            } catch (err) {
              console.warn('Failed to parse backup settings from products table', err);
            }
          }
        }
      }

      if (cloudSettings) {
        const local = await db.settings.get('current_store_settings');

        // หากเครื่องนี้มีการแก้ไขที่ใหม่กว่า ให้ส่งค่าของเครื่องนี้ขึ้น Cloud แทนที่จะถูกเขียนทับ
        if (local && local.updatedAt && cloudSettings.updatedAt) {
          if (new Date(local.updatedAt) > new Date(cloudSettings.updatedAt)) {
            this.pushStoreSettings(local).catch(() => {});
            return local;
          }
        }

        await db.settings.put(cloudSettings);
        return cloudSettings;
      }
    } catch (e) {
      console.warn('Failed to pull store settings from cloud', e);
    }
    return null;
  }

  /**
   * ล้างข้อมูลบิลขาย กะ และประวัติการโอนบน Cloud (สำหรับรีเซ็ตเตรียมเปิดร้านจริง)
   */
  public async resetCloudData(): Promise<{ success: boolean; message: string }> {
    try {
      const h = this.getHeaders();
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?id=neq.placeholder`, { method: 'DELETE', headers: h });
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/shifts?id=neq.placeholder`, { method: 'DELETE', headers: h });
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?id=neq.placeholder`, { method: 'DELETE', headers: h });
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?id=neq.placeholder`, { method: 'DELETE', headers: h });
      return { success: true, message: 'ล้างข้อมูลทดสอบบน Cloud สำเร็จแล้ว' };
    } catch (err: any) {
      return { success: false, message: `ล้างข้อมูล Cloud ไม่สำเร็จ: ${err.message}` };
    }
  }
}

export const CloudSync = new CloudSyncService();
