// src/services/imageOptimizer.ts

/**
 * ปรับขนาดและบีบอัดรูปภาพฝั่งเบราว์เซอร์อัตโนมัติ
 * แปลงไฟล์ขนาดใหญ่ (เช่น 5MB-10MB จากมือถือ) ให้เหลือรูปภาพขนาดมาตรฐาน ~40-80KB
 * เพื่อจัดเก็บใน IndexedDB ได้อย่างรวดเร็วและไม่เปลืองพื้นที่
 */
export class ImageOptimizer {
  public static async resizeAndCompress(
    file: File,
    maxWidth = 480,
    maxHeight = 480,
    quality = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
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

          // วาดภาพลง Canvas และบีบอัดเป็น WebP หรือ JPEG
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
