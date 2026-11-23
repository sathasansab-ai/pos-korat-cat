// src/services/thermalPrinter.ts

export interface ThermalPrintOptions {
  paperWidth?: '58mm' | '80mm';
  scale?: number; // 80 - 110 (%)
  fontSize?: 'compact' | 'normal' | 'large';
  title?: string;
}

export class ThermalPrinterService {
  private static readonly STORAGE_KEY_WIDTH = 'pos_thermal_paper_width';
  private static readonly STORAGE_KEY_SCALE = 'pos_thermal_scale';
  private static readonly STORAGE_KEY_FONT = 'pos_thermal_font_size';

  /**
   * ดึงค่าการตั้งค่าขนาดกระดาษที่บันทึกไว้ในเครื่อง
   */
  public static getStoredPaperWidth(fallback: '58mm' | '80mm' = '80mm'): '58mm' | '80mm' {
    const saved = localStorage.getItem(this.STORAGE_KEY_WIDTH);
    if (saved === '58mm' || saved === '80mm') return saved;
    return fallback;
  }

  public static setStoredPaperWidth(width: '58mm' | '80mm') {
    localStorage.setItem(this.STORAGE_KEY_WIDTH, width);
  }

  /**
   * ดึงค่าการย่อ/ขยายสเกล (%) ที่ปรับจูนไว้
   */
  public static getStoredScale(fallback = 100): number {
    const saved = localStorage.getItem(this.STORAGE_KEY_SCALE);
    if (saved) {
      const val = parseInt(saved, 10);
      if (!isNaN(val) && val >= 75 && val <= 115) return val;
    }
    return fallback;
  }

  public static setStoredScale(scale: number) {
    localStorage.setItem(this.STORAGE_KEY_SCALE, scale.toString());
  }

  /**
   * ดึงขนาดตัวอักษร
   */
  public static getStoredFontSize(fallback: 'compact' | 'normal' | 'large' = 'normal'): 'compact' | 'normal' | 'large' {
    const saved = localStorage.getItem(this.STORAGE_KEY_FONT);
    if (saved === 'compact' || saved === 'normal' || saved === 'large') return saved;
    return fallback;
  }

  public static setStoredFontSize(size: 'compact' | 'normal' | 'large') {
    localStorage.setItem(this.STORAGE_KEY_FONT, size);
  }

  /**
   * สั่งพิมพ์สลิปผ่าน invisible iframe ด้วย CSS สำหรับเครื่องพิมพ์ความร้อนโดยเฉพาะ
   * รองรับทั้งเครื่อง 58 มม. (Xprinter/POS-58) และ 80 มม. (EasyPrint/Epson/POS-80)
   */
  public static printElement(
    elementOrId: HTMLElement | string,
    options: ThermalPrintOptions = {}
  ): boolean {
    const targetEl = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;

    if (!targetEl) {
      console.warn('ThermalPrinterService: Element not found to print.');
      window.print();
      return false;
    }

    const paperWidth = options.paperWidth || this.getStoredPaperWidth('80mm');
    const scale = options.scale || this.getStoredScale(100);
    const fontMode = options.fontSize || this.getStoredFontSize('normal');
    const title = options.title || 'Thermal Receipt';

    // ความกว้างพื้นที่พิมพ์จริงของหัวพิมพ์ความร้อน
    // 58mm: กระดาษ 58mm หัวพิมพ์กว้าง 48mm (384 dots)
    // 80mm: กระดาษ 80mm หัวพิมพ์กว้าง 72mm (576 dots)
    const printableWidth = paperWidth === '80mm' ? '72mm' : '48mm';

    // คำนวณขนาดตัวอักษรตามขนาดกระดาษและโหมด
    let baseFontSize = '11px';
    let titleFontSize = '14px';
    let smallFontSize = '9.5px';

    if (paperWidth === '58mm') {
      if (fontMode === 'compact') {
        baseFontSize = '10px';
        titleFontSize = '12px';
        smallFontSize = '8.5px';
      } else if (fontMode === 'large') {
        baseFontSize = '12px';
        titleFontSize = '14px';
        smallFontSize = '10px';
      } else {
        baseFontSize = '10.5px';
        titleFontSize = '13px';
        smallFontSize = '9px';
      }
    } else {
      // 80mm
      if (fontMode === 'compact') {
        baseFontSize = '12px';
        titleFontSize = '15px';
        smallFontSize = '10px';
      } else if (fontMode === 'large') {
        baseFontSize = '14px';
        titleFontSize = '17px';
        smallFontSize = '12px';
      } else {
        baseFontSize = '13px';
        titleFontSize = '16px';
        smallFontSize = '11px';
      }
    }

    try {
      const frameId = 'thermal-print-invisible-frame';
      let printFrame = document.getElementById(frameId) as HTMLIFrameElement;
      if (printFrame) {
        printFrame.remove();
      }

      printFrame = document.createElement('iframe');
      printFrame.id = frameId;
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.opacity = '0';
      printFrame.style.pointerEvents = 'none';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return false;
      }

      // ดึงสไตล์ CSS จากหน้าเว็บปัจจุบันมาใช้ประกอบ
      const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            ${existingStyles}
            <style>
              /* บังคับระยะขอบหน้ากระดาษเป็น 0 ทั้งหมด ป้องกันตกขอบ */
              @page {
                size: ${paperWidth} auto;
                margin: 0mm !important;
              }
              
              /* รีเซ็ตให้สีดำสนิท 100% ไม่เกิดเม็ดสีเทาพร่ามัวบนหัวพิมพ์ความร้อน */
              *, *::before, *::after {
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                text-shadow: none !important;
              }

              html {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }

              body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 auto !important;
                padding: 1.5mm 1mm 6mm 1mm !important;
                width: 100% !important;
                max-width: ${printableWidth} !important;
                font-family: 'Tahoma', 'Segoe UI', 'Prompt', 'Cordia New', sans-serif !important;
                font-size: ${baseFontSize} !important;
                font-weight: 600 !important;
                line-height: 1.35 !important;
                overflow: visible !important;
                height: auto !important;
                min-height: 0 !important;
                transform-origin: top center;
                transform: scale(${scale / 100});
              }

              /* ปรับขนาดส่วนหัวเรื่อง */
              h1, h2, h3, .text-sm, .text-base, .font-extrabold, .font-black {
                font-size: ${titleFontSize} !important;
                font-weight: 900 !important;
                color: #000000 !important;
              }

              /* ข้อความตัวเล็ก เช่น ที่อยู่ รหัสสินค้า */
              .text-\\[9px\\], .text-\\[10px\\], .text-xs, .text-slate-400, .text-slate-500 {
                font-size: ${smallFontSize} !important;
                font-weight: 500 !important;
                color: #000000 !important;
              }

              /* รีเซ็ตขอบทั้งหมดเป็น 0 100% ป้องกันการเกิดกรอบสี่เหลี่ยมดำ (Solid/Dashed Boxes) โดยเด็ดขาด */
              *, *::before, *::after {
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
              }

              /* มีเฉพาะเส้นคั่นเดี่ยว .receipt-line, .receipt-divider, hr เท่านั้นที่มีเส้นประด้านบน */
              .receipt-line, .receipt-divider, hr, .divider {
                border: none !important;
                border-top: 1px dashed #000000 !important;
                margin: 5px 0 !important;
                padding: 0 !important;
                height: 0 !important;
                width: 100% !important;
                display: block !important;
              }

              /* รูปภาพโลโก้และบาร์โค้ด */
              .receipt-logo, img.receipt-logo, .store-logo {
                max-width: ${paperWidth === '80mm' ? '22mm' : '18mm'} !important;
                max-height: ${paperWidth === '80mm' ? '22mm' : '18mm'} !important;
                width: auto !important;
                height: auto !important;
                object-fit: contain !important;
                display: block !important;
                margin: 0 auto 3px auto !important;
                image-rendering: -webkit-optimize-contrast !important;
              }

              img {
                max-width: ${paperWidth === '80mm' ? '24mm' : '18mm'} !important;
                max-height: ${paperWidth === '80mm' ? '24mm' : '18mm'} !important;
                height: auto !important;
                display: block !important;
                margin: 0 auto 4px auto !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: pixelated !important;
                filter: grayscale(100%) contrast(150%) !important;
              }

              svg {
                max-width: 92% !important;
                height: auto !important;
                margin: 2px auto !important;
                display: block !important;
                overflow: visible !important;
              }

              /* การจัดแถวรายการสินค้าแบบ Flex */
              .flex {
                display: flex !important;
              }

              .justify-between {
                justify-content: space-between !important;
              }

              .items-center {
                align-items: center !important;
              }

              .text-right {
                text-align: right !important;
              }

              .text-center {
                text-align: center !important;
              }

              /* ป้องกันไม่ให้ตัวเลขราคาหักตกบรรทัด */
              .price-value, .whitespace-nowrap {
                white-space: nowrap !important;
                flex-shrink: 0 !important;
              }

              /* ปลดล็อคความสูงและ overflow ทั้งหมด ไม่ให้บาร์โค้ดและข้อความท้ายสลิปโดนตัด */
              #printable-thermal-receipt,
              #printable-shift-handover,
              #printable-exchange-slip,
              #printable-test-thermal-slip {
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                overflow-y: visible !important;
                padding: 0 !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }

              .no-print {
                display: none !important;
              }
            </style>
          </head>
          <body>
            ${targetEl.outerHTML}
          </body>
        </html>
      `;

      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          window.print();
        }
      }, 250);

      return true;
    } catch (err) {
      console.error('Thermal print error:', err);
      window.print();
      return false;
    }
  }
}
