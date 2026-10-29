// src/services/thaiBahtText.ts

/**
 * แปลงตัวเลขจำนวนเงินเป็นข้อความภาษาไทย (เช่น 650.00 -> หกร้อยห้าสิบบาทถ้วน)
 * ตามมาตรฐานเอกสารบัญชีและใบกำกับภาษีไทย
 */
export function formatThaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';

  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  function convertGroup(nStr: string): string {
    let result = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i], 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1 && nStr[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += numbers[digit] + units[pos];
        }
      }
    }
    return result;
  }

  let text = '';
  // Handle millions
  if (integerPart.length > 6) {
    const millionPart = integerPart.slice(0, -6);
    const remainPart = integerPart.slice(-6);
    text += convertGroup(millionPart) + 'ล้าน' + convertGroup(remainPart);
  } else {
    text += convertGroup(integerPart);
  }

  text += 'บาท';

  if (decimalPart === '00') {
    text += 'ถ้วน';
  } else {
    const satang = convertGroup(decimalPart);
    text += satang + 'สตางค์';
  }

  return text;
}
