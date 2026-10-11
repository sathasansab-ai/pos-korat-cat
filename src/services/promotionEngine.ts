// src/services/promotionEngine.ts
import type { CartItem, PromotionRule } from '../types';

export interface PromotionCalculationResult {
  originalSubtotal: number;
  discountTotal: number;
  netTotal: number;
  appliedPromos: {
    promoId: string;
    promoName: string;
    discountAmount: number;
    matchedItemCount: number;
  }[];
  upsellPrompts: string[];
}

export class PromotionEngine {
  /**
   * คำนวณโปรโมชั่น Mix & Match แบบ Greedy Matching พร้อมคืนค่า Upsell
   */
  public static calculate(
    cart: CartItem[],
    rules: PromotionRule[]
  ): PromotionCalculationResult {
    let originalSubtotal = 0;
    cart.forEach(item => {
      originalSubtotal += item.unitPrice * item.qty;
    });

    let discountTotal = 0;
    const appliedPromos: PromotionCalculationResult['appliedPromos'] = [];
    const upsellPrompts: string[] = [];

    // แตก Item ออกเป็นรายชิ้น (Single units)
    interface SingleUnit {
      variantId: string;
      category: string;
      unitPrice: number;
      productName: string;
    }

    const unassignedUnits: SingleUnit[] = [];
    cart.forEach(item => {
      for (let i = 0; i < item.qty; i++) {
        unassignedUnits.push({
          variantId: item.variantId,
          category: item.category,
          unitPrice: item.unitPrice,
          productName: item.productName
        });
      }
    });

    // เรียงราคาสินค้าจากมากไปน้อยเพื่อผลประโยชน์สูงสุดของลูกค้า
    unassignedUnits.sort((a, b) => b.unitPrice - a.unitPrice);

    for (const rule of rules) {
      if (!rule.isActive) continue;

      // กรองชิ้นสินค้าที่ตรงตามเงื่อนไขของโปรโมชั่นนี้
      const eligibleIndices: number[] = [];
      unassignedUnits.forEach((unit, idx) => {
        const isCatMatch = !rule.eligibleCategories || rule.eligibleCategories.length === 0 || rule.eligibleCategories.includes(unit.category);
        const isVariantMatch = !rule.eligibleVariantIds || rule.eligibleVariantIds.length === 0 || rule.eligibleVariantIds.includes(unit.variantId);
        
        if (isCatMatch && isVariantMatch) {
          eligibleIndices.push(idx);
        }
      });

      const fullBundles = Math.floor(eligibleIndices.length / rule.requiredQty);
      const remainder = eligibleIndices.length % rule.requiredQty;

      // Upsell Prompt: ถ้าขาด 1 ชิ้นครบเซ็ต
      if (remainder > 0 && remainder === rule.requiredQty - 1) {
        upsellPrompts.push(
          `💡 แนะนำลูกค้า: ซื้อกลุ่ม "${rule.name}" เพิ่มอีก 1 ชิ้น เพื่อรับราคาเซ็ตสุดคุ้มเพียง ${rule.bundlePrice.toLocaleString()} บาท!`
        );
      }

      if (fullBundles > 0) {
        let ruleDiscount = 0;
        let itemsUsedCount = 0;
        const usedIndices = new Set<number>();

        for (let b = 0; b < fullBundles; b++) {
          const bundleItemIndices = eligibleIndices.slice(
            b * rule.requiredQty,
            (b + 1) * rule.requiredQty
          );
          
          const bundleOriginalPrice = bundleItemIndices.reduce(
            (sum, idx) => sum + unassignedUnits[idx].unitPrice,
            0
          );

          // ส่วนลด = ราคาเต็มของชุด - ราคาโปรโมชั่น
          const discount = Math.max(0, bundleOriginalPrice - rule.bundlePrice);
          ruleDiscount += discount;
          itemsUsedCount += rule.requiredQty;
          bundleItemIndices.forEach(idx => usedIndices.add(idx));
        }

        discountTotal += ruleDiscount;
        appliedPromos.push({
          promoId: rule.id,
          promoName: rule.name,
          discountAmount: ruleDiscount,
          matchedItemCount: itemsUsedCount,
        });

        // นำชิ้นที่นำมาจับคู่แล้วออกจากการคิดโปรโมชั่นถัดไป
        const remaining = unassignedUnits.filter((_, idx) => !usedIndices.has(idx));
        unassignedUnits.length = 0;
        unassignedUnits.push(...remaining);
      }
    }

    return {
      originalSubtotal,
      discountTotal,
      netTotal: Math.max(0, originalSubtotal - discountTotal),
      appliedPromos,
      upsellPrompts,
    };
  }
}
