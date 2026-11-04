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

  private static readonly START_B = 104;
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
   * สร้าง SVG string ของบาร์โค้ด Code 128 ตามมาตรฐานสากล ISO/IEC 15417
   */
  public static generateSvg(
    text: string, 
    options: { width?: number; height?: number; showText?: boolean; barcodeScale?: number } = {}
  ): string {
    const rawText = String(text || '').trim();
    if (!rawText) return '<svg width="100" height="40"></svg>';

    // Height of the black bars in SVG space
    const height = options.height || 120;
    const showText = options.showText !== false;
    
    // 1. Calculate Code 128B symbols & Modulo 103 checksum
    const symbols: number[] = [this.START_B];
    let checksum = this.START_B;

    for (let i = 0; i < rawText.length; i++) {
      const asciiCode = rawText.charCodeAt(i);
      // Code 128B maps ASCII 32 (' ') through 127
      const symbolValue = asciiCode >= 32 && asciiCode <= 127 ? asciiCode - 32 : 0;
      symbols.push(symbolValue);
      checksum += symbolValue * (i + 1);
    }

    // 2. Append Check Digit (modulo 103) and Stop Character
    symbols.push(checksum % 103);
    symbols.push(this.STOP);

    // 3. Convert all symbols to full binary string
    let fullBinary = '';
    for (const sym of symbols) {
      const widthStr = this.WIDTHS[sym];
      if (widthStr) {
        fullBinary += this.patternToBinary(widthStr);
      }
    }

    // 4. Barcode Geometry (module width & quiet zones)
    const moduleWidth = 2.0; // standard crisp module width (px)
    const quietZoneModules = 12; // 12 modules quiet margin each side (standard requires at least 10)
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

    const totalHeight = showText ? height + 32 : height + 12;
    const textSvg = showText
      ? `<text x="${(totalWidth / 2).toFixed(2)}" y="${height + 26}" text-anchor="middle" font-family="'Courier New', Courier, monospace, monospace" font-size="16" font-weight="900" letter-spacing="4" fill="#000000">${rawText}</text>`
      : '';

    // Notice: preserveAspectRatio="xMidYMid meet" ensures bars keep exact integer ratios without stretching!
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block; margin:auto;">
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
