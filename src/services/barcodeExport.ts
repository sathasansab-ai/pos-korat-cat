// src/services/barcodeExport.ts

export class BarcodeExport {
  /**
   * ดาวน์โหลดโค้ด SVG บาร์โค้ดเป็นไฟล์เวกเตอร์ .svg (เหมาะสำหรับส่งต่อกราฟิก/Canva/Illustrator)
   */
  public static downloadSvg(svgString: string, filename: string): void {
    try {
      let cleanSvg = svgString.trim();
      if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Download SVG failed:', e);
      alert('ไม่สามารถดาวน์โหลดไฟล์ SVG ได้');
    }
  }

  /**
   * แปลง SVG เป็นภาพความละเอียดสูง (PNG 300 DPI) และดาวน์โหลดลงเครื่องทันที
   */
  public static downloadSvgAsPng(
    svgString: string,
    filename: string,
    targetWidth: number = 800,
    targetHeight: number = 400
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        let cleanSvg = svgString.trim();
        if (!cleanSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
          cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              this.downloadSvg(cleanSvg, filename.replace('.png', '.svg'));
              resolve();
              return;
            }

            // เติมพื้นหลังสีขาวคมชัด
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }
              resolve();
            }, 'image/png');
          } catch {
            this.downloadSvg(cleanSvg, filename.replace('.png', '.svg'));
            resolve();
          }
        };

        img.onerror = () => {
          // หากแปลง canvas ล้มเหลว ให้บันทึกเป็น SVG แทนทันที
          this.downloadSvg(cleanSvg, filename.replace('.png', '.svg'));
          resolve();
        };

        img.src = svgDataUri;
      } catch {
        this.downloadSvg(svgString, filename.replace('.png', '.svg'));
        resolve();
      }
    });
  }

  /**
   * ดาวน์โหลดภาพ QR Code จาก URL เป็นไฟล์ PNG
   */
  public static async downloadQrImage(imageUrl: string, filename: string): Promise<void> {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Fallback: เปิดดูในแท็บใหม่เพื่อกดบันทึก
      window.open(imageUrl, '_blank');
    }
  }

  /**
   * ดาวน์โหลดแผ่นสติ๊กเกอร์บาร์โค้ดเป็นไฟล์ HTML สำเร็จรูป
   * (สามารถเปิดพิมพ์แบบ Offline ได้จากเบราว์เซอร์ทุกเครื่องโดยไม่ต้องเข้าระบบ)
   */
  public static downloadHtmlSheet(
    title: string,
    contentHtml: string,
    pageStyle: string,
    filename: string
  ): void {
    try {
      const todayFormatted = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${todayFormatted}</title>
  <style>
    * { 
      box-sizing: border-box !important; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    body {
      margin: 0;
      padding: 16px;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Sarabun", "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
    }
    .print-control-bar {
      max-width: 900px;
      margin: 0 auto 20px auto;
      padding: 14px 20px;
      background: #090d16;
      color: #ffffff;
      border-radius: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      border: 1px solid #1e293b;
    }
    .print-btn {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
      transition: all 0.2s ease;
    }
    .print-btn:hover {
      background: linear-gradient(135deg, #b45309, #92400e);
      transform: translateY(-1px);
    }
    @media print {
      .print-control-bar, .no-print {
        display: none !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
    }
    ${pageStyle}
  </style>
</head>
<body>
  <div class="print-control-bar no-print">
    <div>
      <div style="font-weight: 800; font-size: 15px; color: #f59e0b; display: flex; items-center; gap: 6px;">
        🏷️ ${title}
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">
        เอกสารสติ๊กเกอร์บาร์โค้ดพร้อมพิมพ์แบบออฟไลน์ • สร้างเมื่อ ${todayFormatted} • กดปุ่มพิมพ์เพื่อส่งออกเครื่องพิมพ์
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="print-btn" onclick="window.print()">
        🖨️ สั่งพิมพ์เอกสารนี้ (Ctrl + P)
      </button>
    </div>
  </div>

  <div class="stickers-print-grid">
    ${contentHtml}
  </div>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Download HTML Sheet failed:', e);
      alert('ไม่สามารถดาวน์โหลดไฟล์แผ่นพิมพ์ HTML ได้');
    }
  }
}
