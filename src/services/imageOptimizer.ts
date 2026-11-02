// src/services/imageOptimizer.ts

/**
 * ปรับขนาดและบีบอัดรูปภาพฝั่งเบราว์เซอร์อัตโนมัติ
 * แปลงไฟล์ขนาดใหญ่ (เช่น 5MB-10MB จากมือถือ) ให้เหลือรูปภาพขนาดมาตรฐาน ~40-80KB
 * โดยคงความโปร่งใส (Alpha Transparency) สำหรับไฟล์ PNG/WebP ไม่ให้เกิดขอบดำหรือกรอบสี่เหลี่ยม
 */
export class ImageOptimizer {
  public static async resizeAndCompress(
    file: File,
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.88
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      const preserveTransparency = isPng || isWebp || isSvg;

      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;

          // คำนวณ Aspect Ratio ให้ภาพคงสัดส่วนเดิม
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // เคลียร์ Canvas ให้เป็นพื้นหลังโปร่งใส 100% (Transparent)
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          let dataUrl: string;
          if (preserveTransparency) {
            // สำคัญ: ห้ามแปลงเป็น JPEG เพราะ JPEG ไม่รองรับ Transparency และจะเปลี่ยนพื้นหลังใสเป็น "สีดำ"
            // ใช้ WebP (รักษาความโปร่งใสและบีบอัดได้ดี) หรือ PNG
            try {
              dataUrl = canvas.toDataURL('image/webp', quality);
              if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/png');
              }
            } catch {
              dataUrl = canvas.toDataURL('image/png');
            }
          } else {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
