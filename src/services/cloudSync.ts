// src/services/cloudSync.ts
import { db } from '../db';
import type { 
  ProductVariant, 
  Product, 
  Customer, 
  Order, 
  Shift, 
  StockTransfer, 
  CustomMadeOrder 
} from '../types';

export const SUPABASE_CONFIG = {
  url: 'https://jfzfestdintwwsnoxiwv.supabase.co',
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

      // 4. Pull Custom Orders
      const coRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?select=*`, {
        headers: this.getHeaders()
      });
      if (coRes.ok) {
        const cloudCO: any[] = await coRes.json();
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

      return { success: true, summary: 'ดึงข้อมูลล่าสุดจาก Cloud อัปเดตลงเครื่องสำเร็จ' };
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
      if (localVariants.length > 0) {
        const payload = localVariants.map(v => ({
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
        }));

        const vRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?on_conflict=id`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });
        if (!vRes.ok) {
          const errText = await vRes.text();
          throw new Error(`Supabase variants error (${vRes.status}): ${errText}`);
        }
      }

      // 2. Push Customers (ข้อมูลลูกค้าและสมาชิก)
      const localCustomers = await db.customers.toArray();
      if (localCustomers.length > 0) {
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

        const cRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/customers?on_conflict=id`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(custPayload)
        });
        if (!cRes.ok) {
          const errText = await cRes.text();
          throw new Error(`Supabase customers error (${cRes.status}): ${errText}`);
        }
      }

      // 3. Push Stock Transfers (ประวัติการโอนย้ายสต็อกข้ามคลัง)
      const localTransfers = await db.transfers.toArray();
      if (localTransfers.length > 0) {
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

        const tRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?on_conflict=id`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(transPayload)
        });
        if (!tRes.ok) {
          const errText = await tRes.text();
          throw new Error(`Supabase stock_transfers error (${tRes.status}): ${errText}`);
        }
      }

      // 4. Push Custom Orders (งานสั่งผลิต & เงินมัดจำ)
      const localCustomOrders = await db.customOrders.toArray();
      if (localCustomOrders.length > 0) {
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

        const coRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?on_conflict=id`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(coPayload)
        });
        if (!coRes.ok) {
          const errText = await coRes.text();
          throw new Error(`Supabase custom_orders error (${coRes.status}): ${errText}`);
        }
      }

      return { 
        success: true, 
        message: `ส่งข้อมูลขึ้น Cloud สำเร็จสมบูรณ์! (สินค้า: ${localVariants.length}, ลูกค้า: ${localCustomers.length}, ใบโอน: ${localTransfers.length}, งานสั่งผลิต: ${localCustomOrders.length})` 
      };
    } catch (err: any) {
      return { success: false, message: `เกิดข้อผิดพลาดในการส่งข้อมูลขึ้น Cloud: ${err.message}` };
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
        customer_id: order.customerId,
        customer_name: order.customerName,
        items: order.items,
        subtotal: order.subtotal,
        promo_discount: order.promoDiscount,
        member_discount_amount: order.memberDiscountAmount || 0,
        member_tier: order.memberTier,
        net_total: order.netTotal,
        payments: order.payments,
        cash_received: order.cashReceived,
        change_given: order.changeGiven,
        status: order.status,
        is_synced: true
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/orders?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
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
        receiver_name: transfer.receiverName,
        received_at: transfer.receivedAt,
        status: transfer.status,
        notes: transfer.notes
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/stock_transfers?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Failed to push transfer to cloud', e);
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

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/variants?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify([payload])
      });
    } catch (e) {
      console.warn('Failed to push single variant to cloud', e);
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
        shipping_address: co.shippingAddress,
        due_date: co.dueDate,
        item_description: co.itemDescription,
        qty: co.qty,
        total_price: co.totalPrice,
        deposit_amount: co.depositAmount,
        balance_due: co.balanceDue,
        deposit_payment_method: co.depositPaymentMethod,
        status: co.status,
        final_payment_method: co.finalPaymentMethod,
        final_paid_amount: co.finalPaidAmount,
        final_paid_at: co.finalPaidAt,
        notes: co.notes
      };

      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/custom_orders?on_conflict=id`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Failed to push custom order to cloud', e);
    }
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
