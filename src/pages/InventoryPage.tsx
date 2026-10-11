// src/pages/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Plus, 
  Sparkles, 
  Search, 
  Trash2,
  Layers,
  Printer,
  Tag,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, StoreSettings } from '../types';
import { MatrixBuilder, type AttributeGroup } from '../services/matrixBuilder';
import { BarcodePrintModal } from '../components/BarcodePrintModal';

export const InventoryPage: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  
  // Barcode Label Print Modal
  const [selectedVariantForPrint, setSelectedVariantForPrint] = useState<ProductVariant | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Matrix Generator Form State
  const [baseProductName, setBaseProductName] = useState('เสื้อยืดลิมิเต็ด KORAT CAT x เรือนโคราช');
  const [skuPrefix, setSkuPrefix] = useState('KCAT-HERITAGE');
  const [category, setCategory] = useState('เสื้อผ้าแฟชั่นไฮเอนด์');
  const [baseCost, setBaseCost] = useState(220);
  const [basePrice, setBasePrice] = useState(590);
  const [supplierName, setSupplierName] = useState('กลุ่มวิสาหกิจชุมชนหัตถศิลป์โคราช');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&q=80');
  
  // Attribute Groups
  const [colors, setColors] = useState('ดำ Obsidian, ขาว Ivory, กรมท่า');
  const [sizes, setSizes] = useState('S, M, L, XL');
  const [techniques, setTechniques] = useState('DTF สีสวาดทอง, Flex นูนเมทัลลิก');
  const [patterns, setPatterns] = useState('แมวโคราชลายฉลุเรือนทอง, ตราประทับเฉลิมวัฒนา');

  // Single Item Add State (Auto-generated Barcode)
  const [singleName, setSingleName] = useState('');
  const [singleCategory, setSingleCategory] = useState('งานฝีมือ & วิสาหกิจชุมชน');
  const [singleCost, setSingleCost] = useState(150);
  const [singlePrice, setSinglePrice] = useState(390);
  const [singleStock, setSingleStock] = useState(20);
  const [singleImage, setSingleImage] = useState('');
  const [singleAttributes, setSingleAttributes] = useState('สี: ดำ, ไซส์: ฟรีไซส์, งาน: Handcraft');

  const loadVariants = async () => {
    const list = await db.variants.toArray();
    setVariants(list);
    const s = await db.settings.get('current_store_settings');
    if (s) setSettings(s);
  };

  useEffect(() => {
    loadVariants();
  }, []);

  const handleGenerateMatrix = async () => {
    const attrGroups: AttributeGroup[] = [
      { name: 'สี', key: 'color', values: colors.split(',').map(s => s.trim()) },
      { name: 'ไซส์', key: 'size', values: sizes.split(',').map(s => s.trim()) },
      { name: 'เทคนิค', key: 'technique', values: techniques.split(',').map(s => s.trim()) },
      { name: 'ลายพิมพ์', key: 'pattern', values: patterns.split(',').map(s => s.trim()) },
    ];

    const generated = MatrixBuilder.generateVariants(
      `prod-${Date.now()}`,
      baseProductName,
      skuPrefix,
      category,
      baseCost,
      basePrice,
      supplierName,
      attrGroups
    );

    if (generated.length === 0) {
      alert('กรุณากรอกตัวเลือกสินค้า');
      return;
    }

    // Attach base image to generated variants
    const withImages = generated.map(v => ({ ...v, imageUrl }));

    if (confirm(`ระบบจะสร้าง Variants ทั้งหมด ${withImages.length} รายการ ต้องการบันทึกหรือไม่?`)) {
      await db.variants.bulkAdd(withImages);
      setIsMatrixModalOpen(false);
      loadVariants();
      alert(`สร้าง Variants สำเร็จ ${withImages.length} รายการ!`);
    }
  };

  // Add Single Product with Auto Barcode
  const handleAddSingleProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;

    // Auto calculate unique EAN-style Barcode
    const autoBarcode = `885${Date.now().toString().slice(-7)}`;
    const autoSku = `KCAT-${Date.now().toString().slice(-5)}`;

    const attrMap: Record<string, string> = {};
    singleAttributes.split(',').forEach(part => {
      const [k, v] = part.split(':').map(s => s?.trim());
      if (k && v) attrMap[k] = v;
    });

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      productId: `prod-${Date.now()}`,
      productName: singleName.trim(),
      category: singleCategory,
      sku: autoSku,
      barcode: autoBarcode,
      attributes: attrMap,
      costPrice: singleCost,
      salePrice: singlePrice,
      stockQuantity: singleStock,
      minStockAlert: 5,
      imageUrl: singleImage.trim() || undefined,
      isActive: true
    };

    await db.variants.add(newVariant);
    setIsSingleModalOpen(false);
    loadVariants();

    // Ask to print stickers immediately!
    if (confirm(`เพิ่มสินค้าสำเร็จ! บาร์โค้ดที่ระบบสร้างให้: ${autoBarcode}\nต้องการพิมพ์สติ๊กเกอร์บาร์โค้ด ${singleStock} ดวงเพื่อนำไปติดที่สินค้าทันทีหรือไม่?`)) {
      setSelectedVariantForPrint(newVariant);
      setIsPrintModalOpen(true);
    }
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    await db.variants.update(id, { stockQuantity: Math.max(0, newStock) });
    loadVariants();
  };

  const handleDeleteVariant = async (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบตัวเลือกสินค้านี้?')) {
      await db.variants.delete(id);
      loadVariants();
    }
  };

  const filteredVariants = variants.filter(v => 
    v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.barcode.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <span>คลังสินค้า & พิมพ์สติ๊กเกอร์บาร์โค้ด (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500">
            จัดการสินค้าไฮเอนด์ คอลเลกชันแมวโคราช x เรือนโคราชเฉลิมวัฒนา พร้อมระบบพิมพ์สติ๊กเกอร์บาร์โค้ดตามจำนวนสต็อก
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มสินค้าเดี่ยว (คำนวณบาร์โค้ดเอง)</span>
          </button>

          <button
            onClick={() => setIsMatrixModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ สร้าง Matrix Variants (DTF/Flex)</span>
          </button>
        </div>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อสินค้า, SKU, Barcode, หรือลายพิมพ์..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>
        <div className="text-xs text-slate-500">
          รวมสินค้าทั้งหมด <span className="font-bold text-slate-800">{variants.length}</span> รายการ
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center">รูปภาพ</th>
                <th className="p-3.5">SKU / บาร์โค้ด</th>
                <th className="p-3.5">ชื่อสินค้าและตัวเลือก</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5 text-right">ต้นทุน</th>
                <th className="p-3.5 text-right">ราคาขาย</th>
                <th className="p-3.5 text-center">คงเหลือ (ตัดสต็อกอัตโนมัติ)</th>
                <th className="p-3.5 text-center">พิมพ์บาร์โค้ดติดสินค้า</th>
                <th className="p-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVariants.map((item) => {
                const isLow = item.stockQuantity <= item.minStockAlert;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 mx-auto"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm mx-auto">
                          👕
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-slate-900">{item.sku}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">{item.barcode}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{item.productName}</div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(item.attributes).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px]">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">{item.category}</td>
                    <td className="p-3.5 text-right font-mono text-slate-500">฿{item.costPrice.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-700">฿{item.salePrice.toLocaleString()}</td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stockQuantity - 1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          isLow ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {item.stockQuantity}
                        </span>
                        <button
                          onClick={() => handleUpdateStock(item.id, item.stockQuantity + 1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Print Barcode Label button */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedVariantForPrint(item);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs inline-flex items-center gap-1 shadow-xs transition"
                        title="พิมพ์สติ๊กเกอร์บาร์โค้ดตามสต็อกเพื่อนำไปติดสินค้า"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600" />
                        <span>พิมพ์สติ๊กเกอร์ ({item.stockQuantity} ดวง)</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteVariant(item.id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                        title="ลบตัวเลือกนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Single Product */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              <span>เพิ่มสินค้าเดี่ยว (ระบบคำนวณเลขบาร์โค้ดให้อัตโนมัติ)</span>
            </h3>

            <form onSubmit={handleAddSingleProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อสินค้า</label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={e => setSingleName(e.target.value)}
                  placeholder="เช่น ผ้าพันคอผ้าไหมมัดหมี่ ลายแมวโคราช"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่</label>
                  <input
                    type="text"
                    value={singleCategory}
                    onChange={e => setSingleCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">จำนวนสต็อกที่นำเข้า</label>
                  <input
                    type="number"
                    value={singleStock}
                    onChange={e => setSingleStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ต้นทุน (บาท)</label>
                  <input
                    type="number"
                    value={singleCost}
                    onChange={e => setSingleCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาขาย (บาท)</label>
                  <input
                    type="number"
                    value={singlePrice}
                    onChange={e => setSinglePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดตัวเลือก (Attributes)</label>
                <input
                  type="text"
                  value={singleAttributes}
                  onChange={e => setSingleAttributes(e.target.value)}
                  placeholder="เช่น สี: ดำ, ไซส์: L, งาน: DTF"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ลิงก์รูปภาพสินค้า (Image URL)</label>
                <input
                  type="text"
                  value={singleImage}
                  onChange={e => setSingleImage(e.target.value)}
                  placeholder="ใส่ URL รูปภาพเพื่อแสดงในหน้าร้านและจอฝั่งลูกค้า"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Matrix Generator */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">ระบบสร้าง Matrix Variants อัตโนมัติ</h3>
              </div>
              <button onClick={() => setIsMatrixModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อสินค้าแม่</label>
                  <input
                    type="text"
                    value={baseProductName}
                    onChange={e => setBaseProductName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัส SKU Prefix</label>
                  <input
                    type="text"
                    value={skuPrefix}
                    onChange={e => setSkuPrefix(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ลิงก์รูปภาพสินค้าแม่</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ต้นทุนมาตรฐาน (บาท)</label>
                  <input
                    type="number"
                    value={baseCost}
                    onChange={e => setBaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาขายมาตรฐาน (บาท)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={e => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                <div className="font-bold text-amber-900 text-sm">
                  🎨 กำหนดตัวเลือกย่อย (คั่นแต่ละตัวเลือกด้วยเครื่องหมายจุลภาค ,)
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สี (Color):</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={e => setColors(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ไซส์ (Size):</label>
                  <input
                    type="text"
                    value={sizes}
                    onChange={e => setSizes(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เทคนิคสกรีน (Technique e.g. DTF, Flex):</label>
                  <input
                    type="text"
                    value={techniques}
                    onChange={e => setTechniques(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ลวดลายเฉพาะ (Pattern):</label>
                  <input
                    type="text"
                    value={patterns}
                    onChange={e => setPatterns(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateMatrix}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>คำนวณและสร้าง Matrix Variants ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Sticker Print Modal */}
      {settings && (
        <BarcodePrintModal
          isOpen={isPrintModalOpen}
          variant={selectedVariantForPrint}
          settings={settings}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedVariantForPrint(null);
          }}
        />
      )}
    </div>
  );
};
