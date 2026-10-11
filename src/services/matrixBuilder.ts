// src/services/matrixBuilder.ts
import type { ProductVariant } from '../types';

export interface AttributeGroup {
  name: string; // e.g. "สี", "ไซส์", "เทคนิคสกรีน", "ลายพิมพ์"
  key: string;  // e.g. "color", "size", "technique", "pattern"
  values: string[];
}

export class MatrixBuilder {
  /**
   * สร้าง Variant Matrix จากการผสมตัวเลือก (Cartesian Product)
   */
  public static generateVariants(
    productId: string,
    productName: string,
    skuPrefix: string,
    category: string,
    baseCost: number,
    basePrice: number,
    supplierName: string,
    attributes: AttributeGroup[]
  ): ProductVariant[] {
    if (attributes.length === 0) return [];

    const cartesian = (arr: any[][]): any[][] =>
      arr.reduce((acc, curr) => acc.flatMap(c => curr.map(n => [...c, n])), [[]]);

    const valueArrays = attributes.map(a => a.values.filter(v => v.trim() !== ''));
    const combinations = cartesian(valueArrays);

    const now = Date.now().toString().slice(-4);

    return combinations.map((combo, idx) => {
      const attrMap: Record<string, string> = {};
      const skuParts = [skuPrefix];

      combo.forEach((val, i) => {
        const key = attributes[i].key || attributes[i].name;
        attrMap[key] = val;
        // ย่อคำสร้าง SKU
        const cleanVal = val.toUpperCase().replace(/\s+/g, '');
        skuParts.push(cleanVal);
      });

      const uniqueSeq = (idx + 1).toString().padStart(3, '0');
      const sku = skuParts.join('-');
      const barcode = `885${now}${uniqueSeq}`;

      // ตั้งชื่อ Variant ให้อ่านง่าย
      const variantName = `${productName} (${combo.join(' / ')})`;

      return {
        id: `var-${Date.now()}-${idx}`,
        productId,
        productName: variantName,
        category,
        sku,
        barcode,
        attributes: attrMap,
        costPrice: baseCost,
        salePrice: basePrice,
        stockQuantity: 10, // ค่าเริ่มต้น
        minStockAlert: 3,
        supplierName,
        isActive: true
      };
    });
  }
}
