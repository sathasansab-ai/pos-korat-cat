// src/services/googleSheets.ts
import { db } from '../db';
import type { ProductVariant } from '../types';

export class GoogleSheetsBridge {
  /**
   * สร้าง CSV Data พร้อมสูตรคำนวณราคาและมาร์จิ้น สำหรับเปิดใน Google Sheets ได้ทันที
   */
  public static async exportProductsToCsv(): Promise<string> {
    const variants = await db.variants.toArray();

    const headers = [
      'SKU',
      'Barcode',
      'Product_Name',
      'Category',
      'Color',
      'Size',
      'Technique',
      'Pattern',
      'Cost_Price',
      'Sale_Price',
      'Profit_Formula',
      'Margin_Percent_Formula',
      'Stock_Quantity',
      'Min_Stock_Alert',
      'Supplier_Name'
    ];

    const rows = variants.map((v, index) => {
      const rowNum = index + 2; // Google Sheets row 2 onwards
      const color = v.attributes['color'] || v.attributes['สี'] || '-';
      const size = v.attributes['size'] || v.attributes['ไซส์'] || '-';
      const technique = v.attributes['technique'] || v.attributes['เทคนิคสกรีน'] || '-';
      const pattern = v.attributes['pattern'] || v.attributes['ลายพิมพ์'] || '-';

      // สูตร Google Sheets: กำไร = ราคาขาย - ต้นทุน (Col J - Col I)
      const profitFormula = `"=J${rowNum}-I${rowNum}"`;
      // สูตรมาร์จิ้น: = (กำไร / ราคาขาย) * 100
      const marginFormula = `"=IF(J${rowNum}>0, ((J${rowNum}-I${rowNum})/J${rowNum})*100, 0)"`;

      return [
        `"${v.sku}"`,
        `"${v.barcode}"`,
        `"${v.productName.replace(/"/g, '""')}"`,
        `"${v.category}"`,
        `"${color}"`,
        `"${size}"`,
        `"${technique}"`,
        `"${pattern}"`,
        v.costPrice,
        v.salePrice,
        profitFormula,
        marginFormula,
        v.stockQuantity,
        v.minStockAlert,
        `"${v.supplierName || ''}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * นำเข้าข้อมูล CSV จาก Google Sheets
   */
  public static async importProductsFromCsv(csvText: string): Promise<{ success: number; errors: string[] }> {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      return { success: 0, errors: ['ไฟล์ว่างเปล่าหรือไม่มีข้อมูล'] };
    }

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 10) continue;

        const [sku, barcode, name, category, color, size, technique, pattern, costStr, priceStr, , , stockStr, minAlertStr, supplier] = cols;

        const cost = parseFloat(costStr) || 0;
        const price = parseFloat(priceStr) || 0;
        const stock = parseInt(stockStr, 10) || 0;
        const minAlert = parseInt(minAlertStr, 10) || 3;

        // ค้นหาว่ามีอยู่แล้วหรือไม่
        const existing = await db.variants.where({ sku }).first();
        if (existing) {
          await db.variants.update(existing.id, {
            costPrice: cost,
            salePrice: price,
            stockQuantity: stock,
            minStockAlert: minAlert,
            supplierName: supplier || existing.supplierName
          });
        } else {
          // เพิ่มใหม่
          await db.variants.add({
            id: `var-import-${Date.now()}-${i}`,
            productId: `prod-import-${Date.now()}`,
            productName: name,
            category: category || 'ทั่วไป',
            sku,
            barcode,
            attributes: { color, size, technique, pattern },
            costPrice: cost,
            salePrice: price,
            stockQuantity: stock,
            minStockAlert: minAlert,
            supplierName: supplier,
            isActive: true
          });
        }
        successCount++;
      } catch (err: any) {
        errors.push(`แถวที่ ${i + 1}: ${err.message}`);
      }
    }

    return { success: successCount, errors };
  }

  /**
   * ดาวน์โหลดไฟล์ CSV ลงเครื่อง
   */
  public static downloadCsv(content: string, filename: string) {
    // ใส่ UTF-8 BOM (\uFEFF) เพื่อให้ Google Sheets และ Excel รองรับภาษาไทยได้ 100% ไม่เป็นภาษาต่างดาว
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
