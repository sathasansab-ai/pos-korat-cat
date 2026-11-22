// src/services/barcodeQueueService.ts
import type { ProductVariant } from '../types';

export interface BarcodeQueueItem {
  id: string; // Unique entry id
  variantId: string;
  sku: string;
  barcode: string;
  productName: string;
  category?: string;
  salePrice: number;
  costPrice?: number;
  attributes: Record<string, string>;
  imageUrl?: string;
  stockQuantity: number;
  quantity: number; // how many stickers to print
  addedAt: string;
}

const STORAGE_KEY = 'korat_cat_barcode_print_queue';
const EVENT_NAME = 'korat_barcode_queue_updated';

export class BarcodeQueueService {
  /**
   * ดึงรายการสินค้าทั้งหมดที่อยู่ในคิวรอพิมพ์
   */
  public static getQueue(): BarcodeQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * บันทึกรายการลง localStorage และส่งสัญญาณแจ้งเตือนทุกหน้า
   */
  public static saveQueue(items: BarcodeQueueItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
    } catch (e) {
      console.error('Failed to save barcode queue to localStorage:', e);
    }
  }

  /**
   * เพิ่มสินค้า 1 ตัวเลือกเข้าคิวรอพิมพ์ (หากมีอยู่แล้วจะบวกจำนวนเพิ่ม)
   */
  public static addToQueue(variant: ProductVariant, quantity: number = 1): BarcodeQueueItem[] {
    const queue = this.getQueue();
    const existingIndex = queue.findIndex(item => item.variantId === variant.id);
    const safeQty = Math.max(1, quantity);

    if (existingIndex >= 0) {
      queue[existingIndex].quantity += safeQty;
      queue[existingIndex].stockQuantity = variant.stockQuantity;
      queue[existingIndex].salePrice = variant.salePrice;
    } else {
      const newItem: BarcodeQueueItem = {
        id: `queue-${variant.id}-${Date.now()}`,
        variantId: variant.id,
        sku: variant.sku,
        barcode: variant.barcode || variant.sku,
        productName: variant.productName,
        category: variant.category,
        salePrice: variant.salePrice,
        costPrice: variant.costPrice,
        attributes: variant.attributes || {},
        imageUrl: variant.imageUrl,
        stockQuantity: variant.stockQuantity,
        quantity: safeQty,
        addedAt: new Date().toISOString()
      };
      queue.push(newItem);
    }

    this.saveQueue(queue);
    return queue;
  }

  /**
   * เพิ่มหลายรายการพร้อมกันเข้าคิวรอพิมพ์
   */
  public static addMultipleToQueue(
    itemsToAdd: { variant: ProductVariant; quantity?: number }[]
  ): BarcodeQueueItem[] {
    const queue = this.getQueue();

    for (const item of itemsToAdd) {
      const safeQty = Math.max(1, item.quantity ?? item.variant.stockQuantity ?? 1);
      const existingIndex = queue.findIndex(q => q.variantId === item.variant.id);

      if (existingIndex >= 0) {
        queue[existingIndex].quantity += safeQty;
        queue[existingIndex].stockQuantity = item.variant.stockQuantity;
      } else {
        queue.push({
          id: `queue-${item.variant.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          variantId: item.variant.id,
          sku: item.variant.sku,
          barcode: item.variant.barcode || item.variant.sku,
          productName: item.variant.productName,
          category: item.variant.category,
          salePrice: item.variant.salePrice,
          costPrice: item.variant.costPrice,
          attributes: item.variant.attributes || {},
          imageUrl: item.variant.imageUrl,
          stockQuantity: item.variant.stockQuantity,
          quantity: safeQty,
          addedAt: new Date().toISOString()
        });
      }
    }

    this.saveQueue(queue);
    return queue;
  }

  /**
   * ปรับปรุงจำนวนสติ๊กเกอร์ของรายการในคิว
   */
  public static updateQuantity(queueItemId: string, newQuantity: number): BarcodeQueueItem[] {
    const queue = this.getQueue();
    const item = queue.find(q => q.id === queueItemId);
    if (item) {
      if (newQuantity <= 0) {
        return this.removeFromQueue(queueItemId);
      }
      item.quantity = newQuantity;
      this.saveQueue(queue);
    }
    return queue;
  }

  /**
   * ลบ 1 รายการออกจากคิว
   */
  public static removeFromQueue(queueItemId: string): BarcodeQueueItem[] {
    const queue = this.getQueue().filter(q => q.id !== queueItemId);
    this.saveQueue(queue);
    return queue;
  }

  /**
   * ล้างคิวรอพิมพ์ทั้งหมด
   */
  public static clearQueue(): void {
    this.saveQueue([]);
  }

  /**
   * คำนวณจำนวนดวงสติ๊กเกอร์ทั้งหมดในคิว
   */
  public static getTotalStickersCount(queue?: BarcodeQueueItem[]): number {
    const target = queue || this.getQueue();
    return target.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * ติดตามการเปลี่ยนแปลงของคิวแบบ Realtime
   */
  public static subscribe(callback: (items: BarcodeQueueItem[]) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<BarcodeQueueItem[]>;
      callback(customEvent.detail || this.getQueue());
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }
}
