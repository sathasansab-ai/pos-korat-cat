// src/services/barcodeScannerHelper.ts
import { db } from '../db';
import type { ProductVariant, Customer } from '../types';

/**
 * Thai Kedmanee to English QWERTY Keyboard Mapping
 * Prevents barcode scanner failures when Windows keyboard is stuck in Thai language.
 */
const THAI_TO_ENG_MAP: Record<string, string> = {
  // Top row numbers (Unshifted)
  'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5',
  'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0', 'ข': '-', 'ช': '=',
  
  // Top row numbers (Shifted)
  '+': '1', '๑': '2', '๒': '3', '๓': '4', '๔': '5',
  'ู': '6', '฿': '7', '๕': '8', '๖': '9', '๗': '0', '๘': '_', '๙': '+',

  // Letters row 1 (Unshifted)
  'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't',
  'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']', 'ฃ': '\\',

  // Letters row 1 (Shifted)
  '๐': 'Q', '"': 'W', 'ฎ': 'E', 'ฑ': 'R', 'ธ': 'T',
  'ํ': 'Y', '๊': 'U', 'ณ': 'I', 'ฯ': 'O', 'ญ': 'P', 'ฐ': '{', 'ฅ': '}',

  // Letters row 2 (Unshifted)
  'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g',
  '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',

  // Letters row 2 (Shifted)
  'ฤ': 'A', 'ฆ': 'S', 'ฏ': 'D', 'โ': 'F', 'ฌ': 'G',
  '็': 'H', '๋': 'J', 'ษ': 'K', 'ศ': 'L', 'ซ': ':',

  // Letters row 3 (Unshifted)
  'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ิ': 'b',
  'ื': 'n', 'ท': 'm', 'ม': ',', 'ใ': '.', 'ฝ': '/',

  // Letters row 3 (Shifted)
  'ฉ': 'Z', 'ฮ': 'X', 'ฺ': 'C', '์': 'V', '?': 'B',
  'ฒ': 'N', 'ฬ': 'M', 'ฦ': '<'
};

export class BarcodeScannerHelper {
  /**
   * Convert Thai Kedmanee characters to English/Digits
   * e.g. "คคถจๅจจๅ" -> "88501001", "จคๅตตตคคคค" -> "0819998888"
   */
  public static convertThaiToEnglish(text: string): string {
    if (!text) return '';
    let result = '';
    for (const char of text) {
      result += THAI_TO_ENG_MAP[char] !== undefined ? THAI_TO_ENG_MAP[char] : char;
    }
    return result;
  }

  /**
   * Clean raw input from barcode guns (removes control chars, prefix/suffix whitespace)
   */
  public static clean(input: string): string {
    return (input || '').replace(/[\x00-\x1F\x7F]/g, '').trim();
  }

  /**
   * Search for product variant or member by barcode/SKU/phone
   * Automatically attempts both exact string and Thai-to-English converted string.
   */
  public static async findMatch(rawInput: string): Promise<{
    type: 'PRODUCT' | 'MEMBER' | 'NONE';
    variant?: ProductVariant;
    customer?: Customer;
    resolvedCode: string;
  }> {
    const cleaned = this.clean(rawInput);
    if (!cleaned) return { type: 'NONE', resolvedCode: '' };

    const candidates = [cleaned];
    const converted = this.convertThaiToEnglish(cleaned);
    if (converted !== cleaned) {
      candidates.push(converted);
    }

    // 1. Try finding Member (by Member Code or Phone)
    for (const code of candidates) {
      const lower = code.toLowerCase();
      const member = await db.customers
        .filter(c => (c.memberCode && c.memberCode.toLowerCase() === lower) || c.phone === code)
        .first();
      if (member) {
        return { type: 'MEMBER', customer: member, resolvedCode: code };
      }
    }

    // 2. Try finding Product Variant (by Barcode or SKU)
    for (const code of candidates) {
      const lower = code.toLowerCase();
      const variant = await db.variants
        .filter(v => v.isActive !== false && (v.barcode === code || v.sku.toLowerCase() === lower))
        .first();
      if (variant) {
        return { type: 'PRODUCT', variant, resolvedCode: code };
      }
    }

    return { type: 'NONE', resolvedCode: converted || cleaned };
  }
}
