// src/pages/InventoryPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Plus, 
  Sparkles, 
  AlertTriangle, 
  Search, 
  Edit, 
  Check, 
  X, 
  Trash2,
  Layers
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, Product } from '../types';
import { MatrixBuilder, type AttributeGroup } from '../services/matrixBuilder';

export const InventoryPage: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  // Matrix Generator Form State
  const [baseProductName, setBaseProductName] = useState('เสื้อยืดคอตตอน สกรีนลายแมวโคราช');
  const [skuPrefix, setSkuPrefix] = useState('KCAT-TEE');
  const [category, setCategory] = useState('เสื้อผ้าแฟชั่น');
  const [baseCost, setBaseCost] = useState(120);
  const [basePrice, setBasePrice] = useState(290);
  const [supplierName, setSupplierName] = useState('โรงงานเท็กซ์ไทล์ โคราช');
  
  // Attribute Groups for Cartesian generation
  const [colors, setColors] = useState('ดำ, ขาว, เขียวเหนี่ยวทรัพย์');
  const [sizes, setSizes] = useState('S, M, L, XL');
  const [techniques, setTechniques] = useState('DTF, Flex');
  const [patterns, setPatterns] = useState('แมวโคราช-คลาสสิก, แมวโคราช-มินิมอล');

  const loadVariants = async () => {
    const list = await db.variants.toArray();
    setVariants(list);
  };

  useEffect(() => {
    loadVariants();
  }, []);

  const handleGenerateMatrix = async () => {
    const attrGroups: AttributeGroup[] = [
      { name: 'สี', key: 'color', values: colors.split(',').map(s => s.trim()) },
      { name: 'ไซส์', key: 'size', values: sizes.split(',').map(s => s.trim()) },
      { name: 'เทคนิคสกรีน', key: 'technique', values: techniques.split(',').map(s => s.trim()) },
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

    if (confirm(`ระบบจะสร้าง Variants ทั้งหมด ${generated.length} รายการ ต้องการบันทึกหรือไม่?`)) {
      await db.variants.bulkAdd(generated);
      setIsMatrixModalOpen(false);
      loadVariants();
      alert(`สร้าง Variants สำเร็จ ${generated.length} รายการ!`);
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
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            <span>คลังสินค้า & Matrix Variants (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500">จัดการสินค้าที่มีตัวเลือกย่อยซับซ้อน เช่น ไซส์, สี, งาน DTF และงาน Flex</p>
        </div>

        <button
          onClick={() => setIsMatrixModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ สร้างสินค้า Matrix ใหม่</span>
        </button>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อสินค้า, SKU, Barcode..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="text-xs text-slate-500">
          รวมสินค้าทั้งหมด <span className="font-bold text-slate-800">{variants.length}</span> ตัวเลือก
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">SKU / บาร์โค้ด</th>
                <th className="p-3.5">ชื่อสินค้าและตัวเลือก</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5 text-right">ต้นทุน</th>
                <th className="p-3.5 text-right">ราคาขาย</th>
                <th className="p-3.5 text-center">คงเหลือ</th>
                <th className="p-3.5 text-center">เตือนสั่งซื้อ</th>
                <th className="p-3.5">ซัพพลายเออร์</th>
                <th className="p-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVariants.map((item) => {
                const isLow = item.stockQuantity <= item.minStockAlert;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono">
                      <div className="font-semibold text-slate-800">{item.sku}</div>
                      <div className="text-[11px] text-slate-400">{item.barcode}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{item.productName}</div>
                      <div className="flex gap-1 mt-0.5">
                        {Object.entries(item.attributes).map(([k, v]) => (
                          <span key={k} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">{item.category}</td>
                    <td className="p-3.5 text-right font-mono text-slate-500">฿{item.costPrice.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">฿{item.salePrice.toLocaleString()}</td>
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
                    <td className="p-3.5 text-center font-mono text-slate-500">{item.minStockAlert}</td>
                    <td className="p-3.5 text-slate-600 truncate max-w-[150px]">{item.supplierName || '-'}</td>
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

      {/* Modal Matrix Generator */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
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

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="font-bold text-emerald-900 text-sm">
                  🎨 กำหนดตัวเลือกย่อย (คั่นแต่ละตัวเลือกด้วยเครื่องหมายจุลภาค ,)
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สี (Color):</label>
                  <input
                    type="text"
                    value={colors}
                    onChange={e => setColors(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ไซส์ (Size):</label>
                  <input
                    type="text"
                    value={sizes}
                    onChange={e => setSizes(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เทคนิคสกรีน (Technique e.g. DTF, Flex):</label>
                  <input
                    type="text"
                    value={techniques}
                    onChange={e => setTechniques(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ลวดลายเฉพาะ (Pattern):</label>
                  <input
                    type="text"
                    value={patterns}
                    onChange={e => setPatterns(e.target.value)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateMatrix}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>คำนวณและสร้าง Matrix Variants ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
