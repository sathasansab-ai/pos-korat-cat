// src/services/barcodeGenerator.ts

/**
 * Pure TypeScript Code 128-B Barcode SVG Generator
 * Zero external dependencies, ultra-fast, and sharp print resolution.
 */
export class BarcodeGenerator {
  // Code 128 Code B patterns (107 symbols, each 11 modules wide)
  private static readonly PATTERNS: number[] = [
    0x6cc, 0x66c, 0x666, 0x498, 0x48c, 0x44c, 0x4c8, 0x4c4, 0x464, 0x648,
    0x644, 0x624, 0x59c, 0x4dc, 0x4ce, 0x5cc, 0x4ec, 0x4e6, 0x672, 0x65c,
    0x64e, 0x6e4, 0x674, 0x76e, 0x74c, 0x72c, 0x726, 0x764, 0x734, 0x732,
    0x6d8, 0x6c6, 0x636, 0x518, 0x458, 0x446, 0x588, 0x468, 0x462, 0x688,
    0x628, 0x622, 0x5b8, 0x58e, 0x46e, 0x5d8, 0x5c6, 0x476, 0x776, 0x68e,
    0x62e, 0x6e8, 0x6e2, 0x6ee, 0x758, 0x746, 0x716, 0x768, 0x762, 0x738,
    0x7b6, 0x778, 0x7ce, 0x524, 0x522, 0x4b4, 0x496, 0x452, 0x44a, 0x544,
    0x542, 0x4a4, 0x4a2, 0x442, 0x620, 0x520, 0x4a0, 0x744, 0x722, 0x6a0,
    0x5a4, 0x5a2, 0x4e4, 0x4e2, 0x470, 0x760, 0x730, 0x670, 0x570, 0x4f0,
    0x7b0, 0x7d8, 0x7d2, 0x7a8, 0x7a2, 0x774, 0x772, 0x7dc, 0x7ce, 0x7ec,
    0x7e6, 0x708, 0x702, 0x720, 0x740, 0x780, 0x79e // 106 = STOP
  ];

  private static readonly START_B = 104;
  private static readonly STOP = 106;

  /**
   * สร้าง SVG string ของบาร์โค้ด Code 128
   */
  public static generateSvg(text: string, options: { width?: number; height?: number; showText?: boolean } = {}): string {
    const height = options.height || 60;
    const showText = options.showText !== false;
    
    // Code 128B encoding
    const symbols: number[] = [this.START_B];
    let checksum = this.START_B;

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) - 32;
      if (code >= 0 && code <= 95) {
        symbols.push(code);
        checksum += code * (i + 1);
      }
    }

    symbols.push(checksum % 103);
    symbols.push(this.STOP);

    // Convert symbols to binary string of modules
    let binary = '';
    symbols.forEach((sym, idx) => {
      const pattern = this.PATTERNS[sym] || 0;
      const bitLength = sym === this.STOP ? 13 : 11;
      for (let b = bitLength - 1; b >= 0; b--) {
        binary += (pattern & (1 << b)) ? '1' : '0';
      }
    });

    const moduleWidth = 2; // px per narrow bar
    const quietZone = 20; // quiet margin
    const totalWidth = binary.length * moduleWidth + (quietZone * 2);

    // Build SVG Rectangles
    let rects = '';
    let x = quietZone;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        rects += `<rect x="${x}" y="5" width="${moduleWidth}" height="${height}" fill="#000000"/>`;
      }
      x += moduleWidth;
    }

    const totalHeight = showText ? height + 24 : height + 10;
    const textSvg = showText
      ? `<text x="${totalWidth / 2}" y="${height + 20}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="#000000">${text}</text>`
      : '';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${options.width || totalWidth}" height="${totalHeight}">
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
