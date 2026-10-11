// src/services/promptPay.ts

/**
 * คำนวณ CRC16-CCITT สำหรับ EMVCo PromptPay QR Code
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
}

function tlv(tag: string, value: string): string {
  const len = ('00' + value.length).slice(-2);
  return `${tag}${len}${value}`;
}

export class PromptPayService {
  /**
   * สร้าง EMVCo Payload สำหรับ PromptPay QR Code
   * @param target เบอร์โทรศัพท์ (เช่น 0812345678) หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก
   * @param amount ยอดเงินที่ต้องการให้ชำระ (เช่น 590.00)
   */
  public static generatePayload(target: string, amount?: number): string {
    const cleanTarget = target.replace(/[^0-9]/g, '');
    let subTag = '01'; // 01 = Mobile, 02 = Tax ID
    let formattedTarget = cleanTarget;

    if (cleanTarget.length === 10 || (cleanTarget.length === 9 && !cleanTarget.startsWith('0'))) {
      // Mobile Number -> แปลงเป็น Format 0066xxxxxxxxx
      subTag = '01';
      formattedTarget = '0066' + cleanTarget.replace(/^0/, '');
      formattedTarget = ('0000000000000' + formattedTarget).slice(-13);
    } else if (cleanTarget.length === 13) {
      // Tax ID
      subTag = '02';
      formattedTarget = cleanTarget;
    }

    const aid = tlv('00', 'A000000677010111');
    const merchantId = tlv(subTag, formattedTarget);
    const tag29 = tlv('29', aid + merchantId);

    let payload = 
      tlv('00', '01') + // Format indicator
      tlv('01', amount ? '12' : '11') + // 12 = Dynamic (มีจำนวนเงิน), 11 = Static
      tag29 +
      tlv('53', '764') + // THB Currency
      (amount !== undefined && amount > 0 ? tlv('54', amount.toFixed(2)) : '') +
      tlv('58', 'TH'); // Country Code

    // Append Tag 63 (CRC)
    payload += '6304';
    const checksum = crc16(payload);
    return payload + checksum;
  }

  /**
   * สร้าง QuickChart / Public QR Code URL หรือ SVG API เพื่อให้สแกนได้ทันที
   */
  public static getQrImageUrl(payload: string, size = 300): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(payload)}`;
  }
}
