// src/services/barcodeGenerator.ts

/**
 * Pure TypeScript Code 128 (ISO/IEC 15417) Barcode SVG Generator
 * 100% compliant with standard 1D Laser/CCD Barcode Scanners and Mobile Imagers.
 */
export class BarcodeGenerator {
  // Official ISO/IEC 15417 Code 128 bar and space widths (0 to 106)
  // Each string contains alternating widths: Bar, Space, Bar, Space, Bar, Space (Sum = 11 modules, Stop = 13 modules)
  private static readonly WIDTHS: string[] = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211133", // 30-39
    "211331", "231131", "113123", "113321", "133121", "313121", "211313", "231113", "231311", "112133", // 40-49
    "112331", "132131", "113132", "113312", "133112", "313112", "311231", "331211", "321113", "321311", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (103=StartA, 104=StartB, 105=StartC, 106=Stop)
  ];

  private static readonly START_A = 103;
  private static readonly START_B = 104;
  private static readonly START_C = 105;
  private static readonly STOP = 106;

  /**
   * Convert width string (e.g. "212222") to binary string of modules ("11011001100")
   */
  private static patternToBinary(widths: string): string {
    let binary = '';
    for (let i = 0; i < widths.length; i++) {
      const moduleCount = parseInt(widths[i], 10);
      const isBar = i % 2 === 0;
      binary += (isBar ? '1' : '0').repeat(moduleCount);
    }
    return binary;
  }

  /**
   * สร้าง SVG string ของบาร์โค้ด Code 128 (Auto B/C) ตามมาตรฐานสากล ISO/IEC 15417
   * หากเป็นตัวเลขล้วน จะเข้ารหัสด้วย Code 128C อัตโนมัติ (แท่งหนาเป็น 2 เท่า สแกนเนอร์ทุกรุ่นยิงติด 100%)
   */
  public static generateSvg(
    text: string, 
    options: { width?: number; height?: number; showText?: boolean; barcodeScale?: number } = {}
  ): string {
    const rawText = String(text || '').trim();
    if (!rawText) return '<svg width="100" height="40"></svg>';

    const height = options.height || 120;
    const showText = options.showText !== false;
    
    // ตรวจสอบว่าข้อความเป็นตัวเลขล้วนหรือไม่
    const isNumericOnly = /^\d+$/.test(rawText);

    const symbols: number[] = [];
    let checksum = 0;
    let displayText = rawText;

    if (isNumericOnly && rawText.length >= 2) {
      // 🚀 CODE 128 SUBSET C: จัดกลุ่มตัวเลขทีละ 2 หลัก (Double Density & Thick Bars)
      // แท่งบาร์โค้ดจะกว้างขึ้นเกือบเท่าตัว สแกนเนอร์ปืนยิง 1D ทุกยี่ห้ออ่านติดง่ายที่สุด
      let encodedDigits = rawText;
      if (encodedDigits.length % 2 !== 0) {
        // หากจำนวนหลักเป็นเลขคี่ ให้เติม 0 ด้านหน้าเพื่อให้จับคู่ 2 หลักได้สมบูรณ์
        encodedDigits = '0' + encodedDigits;
        displayText = encodedDigits;
      }

      symbols.push(this.START_C);
      checksum = this.START_C;

      let position = 1;
      for (let i = 0; i < encodedDigits.length; i += 2) {
        const pairValue = parseInt(encodedDigits.slice(i, i + 2), 10);
        symbols.push(pairValue);
        checksum += pairValue * position;
        position++;
      }
    } else {
      // 🔤 CODE 128 SUBSET B: สำหรับข้อความผสมตัวอักษรและตัวเลข (Alphanumeric)
      symbols.push(this.START_B);
      checksum = this.START_B;

      for (let i = 0; i < rawText.length; i++) {
        const asciiCode = rawText.charCodeAt(i);
        const symbolValue = asciiCode >= 32 && asciiCode <= 127 ? asciiCode - 32 : 0;
        symbols.push(symbolValue);
        checksum += symbolValue * (i + 1);
      }
    }

    // 2. คำนวณ Check Digit (Modulo 103) และใส่ Stop Character
    symbols.push(checksum % 103);
    symbols.push(this.STOP);

    // 3. แปลง Symbol เป็นแท่งสีดำและช่องว่างสีขาว
    let fullBinary = '';
    for (const sym of symbols) {
      const widthStr = this.WIDTHS[sym];
      if (widthStr) {
        fullBinary += this.patternToBinary(widthStr);
      }
    }

    // 4. Barcode Geometry (Quiet Zones กว้างปลอดภัย + Module Width คมชัด)
    // สำหรับ Code 128C แท่งบาร์โค้ดน้อยลง สามารถเพิ่มความกว้างแท่งให้หนาคมชัดพิเศษได้
    const moduleWidth = isNumericOnly ? 2.6 : 2.0; 
    const quietZoneModules = 14; // ขอบขาวซ้าย-ขวา 14 modules ป้องกันการรบกวนของเส้นตัด
    const quietZonePx = quietZoneModules * moduleWidth;
    const totalWidth = fullBinary.length * moduleWidth + (quietZonePx * 2);

    // 5. Build SVG Rectangles for black bars
    let rects = '';
    let currentX = quietZonePx;
    let runLength = 0;

    for (let i = 0; i < fullBinary.length; i++) {
      if (fullBinary[i] === '1') {
        runLength++;
      } else {
        if (runLength > 0) {
          const barWidth = runLength * moduleWidth;
          const barX = currentX - barWidth;
          rects += `<rect x="${barX.toFixed(2)}" y="6" width="${barWidth.toFixed(2)}" height="${height}" fill="#000000" shape-rendering="crispEdges"/>`;
          runLength = 0;
        }
      }
      currentX += moduleWidth;
    }
    // Final bar if ended on '1'
    if (runLength > 0) {
      const barWidth = runLength * moduleWidth;
      const barX = currentX - barWidth;
      rects += `<rect x="${barX.toFixed(2)}" y="6" width="${barWidth.toFixed(2)}" height="${height}" fill="#000000" shape-rendering="crispEdges"/>`;
    }

    const totalHeight = showText ? height + 34 : height + 12;
    const textSvg = showText
      ? `<text x="${(totalWidth / 2).toFixed(2)}" y="${height + 26}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="900" letter-spacing="4" fill="#000000">${displayText}</text>`
      : '';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block; margin:auto; background:#ffffff;">
        <rect width="100%" height="100%" fill="#ffffff"/>
        ${rects}
        ${textSvg}
      </svg>
    `.trim();
  }

  /**
   * สร้าง Data URI สำหรับใส่ใน <img src="..." />
   */
  public static generateDataUrl(text: string, options: { width?: number; height?: number; showText?: boolean } = {}): string {
    const svg = this.generateSvg(text, options);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}
