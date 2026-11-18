// src/utils/thaiBaht.ts

/**
 * แปลงจำนวนเงินตัวเลขเป็นข้อความภาษาไทย (Thai Baht Text)
 * เช่น 1500 -> "หนึ่งพันห้าร้อยบาทถ้วน"
 * 2350.50 -> "สองพันสามร้อยห้าสิบบาทห้าสิบสตางค์"
 */
export function thaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const [bahtStr, satangStrRaw] = absNum.toFixed(2).split('.');
  const satangStr = satangStrRaw || '00';

  const thaiDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function convertChunk(nStr: string): string {
    let result = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i], 10);
      const pos = len - i - 1;

      if (digit === 0) continue;

      if (pos === 1 && digit === 1) {
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else if (pos === 0 && digit === 1 && len > 1 && nStr[len - 2] !== '0') {
        result += 'เอ็ด';
      } else {
        result += thaiDigits[digit] + thaiUnits[pos];
      }
    }
    return result;
  }

  function convertInteger(intStr: string): string {
    if (intStr === '0') return 'ศูนย์';
    let res = '';
    const millions: string[] = [];
    let cur = intStr;
    while (cur.length > 6) {
      millions.unshift(cur.slice(-6));
      cur = cur.slice(0, -6);
    }
    millions.unshift(cur);

    for (let i = 0; i < millions.length; i++) {
      const chunkText = convertChunk(millions[i]);
      if (chunkText) {
        res += chunkText;
        if (i < millions.length - 1) {
          res += 'ล้าน';
        }
      }
    }
    return res;
  }

  let finalBaht = '';
  if (bahtStr === '0') {
    if (satangStr === '00') {
      return 'ศูนย์บาทถ้วน';
    }
  } else {
    finalBaht = convertInteger(bahtStr) + 'บาท';
  }

  let finalSatang = '';
  if (satangStr === '00') {
    finalSatang = 'ถ้วน';
  } else {
    finalSatang = convertChunk(satangStr) + 'สตางค์';
  }

  return (isNegative ? 'ลบ' : '') + finalBaht + finalSatang;
}
