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
  Upload, 
  Filter, 
  Image as ImageIcon,
  Check,
  X,
  Truck,
  Scissors
} from 'lucide-react';
import { db } from '../db';
import type { ProductVariant, StoreSettings, ConsignmentVendor } from '../types';
import { DEFAULT_PRODUCT_CATEGORIES } from '../types';
import { MatrixBuilder, type AttributeGroup } from '../services/matrixBuilder';
import { BarcodePrintModal } from '../components/BarcodePrintModal';
import { StockTransferModal } from '../components/StockTransferModal';
import { WarehouseProductionModal } from '../components/WarehouseProductionModal';
import { ImageOptimizer } from '../services/imageOptimizer';
import { CloudSync } from '../services/cloudSync';

interface SizeStockEntry {
  size: string;
  qty: number;
}

export const InventoryPage: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  
  // Modals
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);

  // Stock Destination Choice (Where new stock goes: Shop 100% (หน้าร้านพร้อมขาย), Warehouse 100%, or 50/50)
  const [stockDestination, setStockDestination] = useState<'WAREHOUSE' | 'SHOP' | 'HALF'>('SHOP');
  
  // Barcode Label Print Modal
  const [selectedVariantForPrint, setSelectedVariantForPrint] = useState<ProductVariant | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Matrix Generator Form State
  const [baseProductName, setBaseProductName] = useState('เสื้อยืดลิมิเต็ด KORAT CAT x เรือนโคราช');
  const [skuPrefix, setSkuPrefix] = useState('KCAT-HERITAGE');
  const [category, setCategory] = useState(DEFAULT_PRODUCT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [baseCost, setBaseCost] = useState(220);
  const [basePrice, setBasePrice] = useState(590);
  const [supplierName, setSupplierName] = useState('กลุ่มวิสาหกิจชุมชนหัตถศิลป์โคราช');
  const [matrixImagePreview, setMatrixImagePreview] = useState<string>('');
  
  // Attribute Groups for Matrix
  const [colors, setColors] = useState('ดำ Obsidian, ขาว Ivory, กรมท่า');
  const [sizes, setSizes] = useState('S, M, L, XL');
  const [techniques, setTechniques] = useState('DTF สีสวาดทอง, Flex นูนเมทัลลิก');
  const [patterns, setPatterns] = useState('แมวโคราชลายฉลุเรือนทอง, ตราประทับเฉลิมวัฒนา');

  // Single Item Add State (Multi-size Stock Support)
  const [singleName, setSingleName] = useState('');
  const [singleCategory, setSingleCategory] = useState(DEFAULT_PRODUCT_CATEGORIES[0]);
  const [singleCustomCategory, setSingleCustomCategory] = useState('');
  const [singleCost, setSingleCost] = useState(150);
  const [singlePrice, setSinglePrice] = useState(390);
  const [singleImagePreview, setSingleImagePreview] = useState<string>('');
  const [singleColor, setSingleColor] = useState('ดำ Obsidian');
  const [singleTechnique, setSingleTechnique] = useState('DTF คุณภาพสูง');
  const [hasSizes, setHasSizes] = useState(true);
  
  // Size Breakdown Matrix for Single Item
  const [sizeStocks, setSizeStocks] = useState<SizeStockEntry[]>([
    { size: 'S', qty: 10 },
    { size: 'M', qty: 20 },
    { size: 'L', qty: 20 },
    { size: 'XL', qty: 10 },
    { size: '2XL', qty: 5 },
  ]);
  const [newSizeName, setNewSizeName] = useState('');
  const [singleFixedStock, setSingleFixedStock] = useState<number>(20);

  // Consignment Vendors State
  const [consignors, setConsignors] = useState<ConsignmentVendor[]>([]);
  const [isConsignment, setIsConsignment] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [consignmentGpPercent, setConsignmentGpPercent] = useState<number>(20);
  const [consignmentVendorPayout, setConsignmentVendorPayout] = useState<number>(312);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCode, setNewVendorCode] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorBank, setNewVendorBank] = useState('');
  const [newVendorAccountNo, setNewVendorAccountNo] = useState('');
  const [newVendorDefaultGp, setNewVendorDefaultGp] = useState<number>(20);
  const [consignmentFilter, setConsignmentFilter] = useState<'ALL' | 'SHOP_ONLY' | 'CONSIGNMENT_ONLY'>('ALL');

  const resetSingleForm = () => {
    setSingleName('');
    setSingleCategory(DEFAULT_PRODUCT_CATEGORIES[0]);
    setSingleCustomCategory('');
    setSingleCost(150);
    setSinglePrice(390);
    setSingleImagePreview('');
    setSingleColor('ดำ Obsidian');
    setSingleTechnique('DTF คุณภาพสูง');
    setHasSizes(true);
    setSizeStocks([
      { size: 'S', qty: 10 },
      { size: 'M', qty: 20 },
      { size: 'L', qty: 20 },
      { size: 'XL', qty: 10 },
      { size: '2XL', qty: 5 },
    ]);
    setSingleFixedStock(20);
    setNewSizeName('');
    setIsConsignment(false);
    setSelectedVendorId('');
    setConsignmentGpPercent(20);
    setConsignmentVendorPayout(312);
  };

  const updatePendingCount = async () => {
    try {
      if (navigator.onLine) {
        await CloudSync.syncTransfersOnly().catch(() => {});
      }
      let allTransfers = await db.transfers.toArray();
      // รวบรวม transferNo ที่ได้รับการตรวจรับเสร็จสมบูรณ์แล้ว (COMPLETED)
      const completedNos = new Set(
        allTransfers.filter(t => t.status === 'COMPLETED').map(t => t.transferNo)
      );
      
      // กวาดล้างรายการซ้ำที่ค้างสถานะ PENDING_RECEIPT ถ้า transferNo นั้นถูกตรวจรับไปแล้ว
      let needsRefetch = false;
      for (const t of allTransfers) {
        if (t.status === 'PENDING_RECEIPT' && completedNos.has(t.transferNo)) {
          await db.transfers.update(t.id, { status: 'COMPLETED' });
          needsRefetch = true;
        }
      }
      if (needsRefetch) {
        allTransfers = await db.transfers.toArray();
      }

      // นับเฉพาะรายการที่ยังรอตรวจรับจริงเท่านั้น
      const p = allTransfers.filter(t => t.status === 'PENDING_RECEIPT' && !completedNos.has(t.transferNo)).length;
      setPendingTransferCount(p);
    } catch {
      setPendingTransferCount(0);
    }
  };

  const loadVariants = async () => {
    const list = await db.variants.toArray();
    setVariants(list);
    const s = await db.settings.get('current_store_settings');
    if (s) setSettings(s);
    const vList = await db.consignors.toArray();
    setConsignors(vList.filter(v => v.isActive !== false));
    await updatePendingCount();
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    const newVendor: ConsignmentVendor = {
      id: `vnd-${Date.now()}`,
      code: newVendorCode.trim().toUpperCase() || `VND-${Date.now().toString().slice(-4)}`,
      name: newVendorName.trim(),
      phone: newVendorPhone.trim(),
      bankName: newVendorBank.trim() || undefined,
      bankAccountNo: newVendorAccountNo.trim() || undefined,
      defaultGpPercent: newVendorDefaultGp,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    await db.consignors.put(newVendor);
    const updated = await db.consignors.toArray();
    setConsignors(updated.filter(v => v.isActive !== false));
    setSelectedVendorId(newVendor.id);
    setConsignmentGpPercent(newVendor.defaultGpPercent);
    setConsignmentVendorPayout(Math.round(singlePrice * (1 - newVendor.defaultGpPercent / 100)));

    const currentSettings = await db.settings.get('current_store_settings');
    if (currentSettings) {
      const mergedConsignors = [...(currentSettings.consignors || []).filter(c => c.id !== newVendor.id), newVendor];
      await db.settings.update('current_store_settings', { consignors: mergedConsignors });
      CloudSync.pushStoreSettings({ ...currentSettings, consignors: mergedConsignors }).catch(() => {});
    }

    setIsAddVendorOpen(false);
    setNewVendorName('');
    setNewVendorCode('');
    setNewVendorPhone('');
    setNewVendorBank('');
    setNewVendorAccountNo('');
    alert(`ลงทะเบียนผู้ประกอบการ "${newVendor.name}" สำเร็จเรียบร้อย!`);
  };

  useEffect(() => {
    loadVariants();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Image Upload Handlers with Automatic Compression
  const handleMatrixImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await ImageOptimizer.resizeAndCompress(file, 480, 480, 0.8);
      setMatrixImagePreview(compressedBase64);
    } catch (err) {
      alert('ไม่สามารถประมวลผลรูปภาพได้');
    }
  };

  const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await ImageOptimizer.resizeAndCompress(file, 480, 480, 0.8);
      setSingleImagePreview(compressedBase64);
    } catch (err) {
      alert('ไม่สามารถประมวลผลรูปภาพได้');
    }
  };

  // Add custom size into list
  const handleAddCustomSize = () => {
    if (!newSizeName.trim()) return;
    const exists = sizeStocks.some(s => s.size.toLowerCase() === newSizeName.trim().toLowerCase());
    if (exists) {
      alert('มีไซส์นี้อยู่ในรายการแล้ว');
      return;
    }
    setSizeStocks(prev => [...prev, { size: newSizeName.trim().toUpperCase(), qty: 10 }]);
    setNewSizeName('');
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    setSizeStocks(prev => prev.filter(s => s.size !== sizeToRemove));
  };

  const handleUpdateSizeQty = (sizeName: string, qty: number) => {
    setSizeStocks(prev => prev.map(s => s.size === sizeName ? { ...s, qty: Math.max(0, qty) } : s));
  };

  // Matrix Generator
  const handleGenerateMatrix = async () => {
    const targetCat = category === 'CUSTOM' ? (customCategory.trim() || 'สินค้าอื่นๆ') : category;
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
      targetCat,
      baseCost,
      basePrice,
      supplierName,
      attrGroups
    );

    if (generated.length === 0) {
      alert('กรุณากรอกตัวเลือกสินค้า');
      return;
    }

    const getCalculatedStocks = (qty: number) => {
      let wh = 0;
      let sh = 0;
      if (stockDestination === 'WAREHOUSE') {
        wh = qty;
        sh = 0;
      } else if (stockDestination === 'SHOP') {
        wh = 0;
        sh = qty;
      } else {
        wh = Math.floor(qty / 2);
        sh = qty - wh;
      }
      return { stockQuantity: qty, warehouseStock: wh, shopStock: sh };
    };

    const nowIso = new Date().toISOString();
    const withImages = generated.map(v => ({ 
      ...v, 
      ...getCalculatedStocks(v.stockQuantity || 10),
      imageUrl: matrixImagePreview || v.imageUrl,
      updatedAt: nowIso
    }));

    if (confirm(`ระบบจะสร้าง Variants ทั้งหมด ${withImages.length} รายการ ต้องการบันทึกหรือไม่?`)) {
      await db.variants.bulkAdd(withImages);
      // Auto push to Cloud with Promise.all
      await Promise.all(withImages.map(v => CloudSync.pushVariant(v)));
      setIsMatrixModalOpen(false);
      loadVariants();
      alert(`สร้าง Variants สำเร็จ ${withImages.length} รายการ และซิงค์ขึ้น Cloud เรียบร้อย!`);
    }
  };

  // Add Single Product (Supports size breakdown and consignment)
  const handleAddSingleProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;

    if (isConsignment && !selectedVendorId) {
      alert('กรุณาเลือกผู้ประกอบการ / ชุมชนผู้ฝากขาย');
      return;
    }

    const vendor = consignors.find(c => c.id === selectedVendorId);
    const vendorName = vendor?.name || 'ผู้ประกอบการฝากขาย';

    const targetCat = singleCategory === 'CUSTOM' ? (singleCustomCategory.trim() || 'สินค้าทั่วไป') : singleCategory;
    const baseProductId = `prod-${Date.now()}`;
    const rawEnglish = singleName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const uniqueShort = Date.now().toString().slice(-4);
    const cleanPrefix = rawEnglish.length >= 3 ? rawEnglish.slice(0, 5) : `ITM${uniqueShort}`;

    const variantsToAdd: ProductVariant[] = [];
    const nowIso = new Date().toISOString();

    if (hasSizes) {
      // Create a variant for each size entry that has stock > 0
      const activeSizes = sizeStocks.filter(s => s.qty > 0);
      if (activeSizes.length === 0) {
        alert('กรุณาระบุจำนวนสต็อกอย่างน้อย 1 ไซส์');
        return;
      }

      activeSizes.forEach((s, idx) => {
        const autoBarcode = `885${Date.now().toString().slice(-6)}${idx + 1}`;
        const autoSku = `KCAT-${cleanPrefix}-${s.size}`;
        const wh = stockDestination === 'WAREHOUSE' ? s.qty : stockDestination === 'SHOP' ? 0 : Math.floor(s.qty / 2);
        const sh = s.qty - wh;

        variantsToAdd.push({
          id: `var-${Date.now()}-${idx}`,
          productId: baseProductId,
          productName: `${singleName.trim()} (${s.size})`,
          category: targetCat,
          sku: autoSku,
          barcode: autoBarcode,
          attributes: {
            color: singleColor,
            size: s.size,
            technique: singleTechnique,
            ...(isConsignment ? {
              isConsignment: 'true',
              vendorId: selectedVendorId,
              vendorName: vendorName,
              gpPercent: consignmentGpPercent.toString(),
              vendorPayoutPrice: consignmentVendorPayout.toString()
            } : {})
          },
          costPrice: isConsignment ? consignmentVendorPayout : singleCost,
          salePrice: singlePrice,
          stockQuantity: s.qty,
          warehouseStock: wh,
          shopStock: sh,
          minStockAlert: 3,
          imageUrl: singleImagePreview || undefined,
          isActive: true,
          updatedAt: nowIso,
          isConsignment: isConsignment,
          vendorId: isConsignment ? selectedVendorId : undefined,
          vendorName: isConsignment ? vendorName : undefined,
          gpPercent: isConsignment ? consignmentGpPercent : undefined,
          vendorPayoutPrice: isConsignment ? consignmentVendorPayout : undefined
        });
      });
    } else {
      // Single Fixed Item (e.g. Bag, Souvenir, Workshop Ticket)
      const autoBarcode = `885${Date.now().toString().slice(-7)}`;
      const autoSku = `KCAT-${cleanPrefix}-${uniqueShort}`;
      const wh = stockDestination === 'WAREHOUSE' ? singleFixedStock : stockDestination === 'SHOP' ? 0 : Math.floor(singleFixedStock / 2);
      const sh = singleFixedStock - wh;

      variantsToAdd.push({
        id: `var-${Date.now()}`,
        productId: baseProductId,
        productName: singleName.trim(),
        category: targetCat,
        sku: autoSku,
        barcode: autoBarcode,
        attributes: {
          color: singleColor,
          format: 'ฟรีไซส์ / ชิ้นเดียว',
          ...(isConsignment ? {
            isConsignment: 'true',
            vendorId: selectedVendorId,
            vendorName: vendorName,
            gpPercent: consignmentGpPercent.toString(),
            vendorPayoutPrice: consignmentVendorPayout.toString()
          } : {})
        },
        costPrice: isConsignment ? consignmentVendorPayout : singleCost,
        salePrice: singlePrice,
        stockQuantity: singleFixedStock,
        warehouseStock: wh,
        shopStock: sh,
        minStockAlert: 3,
        imageUrl: singleImagePreview || undefined,
        isActive: true,
        updatedAt: nowIso,
        isConsignment: isConsignment,
        vendorId: isConsignment ? selectedVendorId : undefined,
        vendorName: isConsignment ? vendorName : undefined,
        gpPercent: isConsignment ? consignmentGpPercent : undefined,
        vendorPayoutPrice: isConsignment ? consignmentVendorPayout : undefined
      });
    }

    await db.variants.bulkAdd(variantsToAdd);
    // Auto push each newly added variant to Cloud with Promise.all
    await Promise.all(variantsToAdd.map(v => CloudSync.pushVariant(v)));
    const totalQty = variantsToAdd.reduce((sum, v) => sum + v.stockQuantity, 0);

    setIsSingleModalOpen(false);
    resetSingleForm(); // Form is cleaned and reset!
    loadVariants();

    if (confirm(`บันทึกสินค้าเรียบร้อย (${variantsToAdd.length} ตัวเลือก รวม ${totalQty} ชิ้น)!\nต้องการพิมพ์สติ๊กเกอร์บาร์โค้ดทันทีหรือไม่?`)) {
      setSelectedVariantForPrint(variantsToAdd[0]);
      setIsPrintModalOpen(true);
    }
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    const v = await db.variants.get(id);
    if (v) {
      const safeNewStock = Math.max(0, newStock);
      const diff = safeNewStock - v.stockQuantity;
      const newShop = Math.max(0, (v.shopStock ?? v.stockQuantity) + diff);
      const updated: ProductVariant = { 
        ...v, 
        stockQuantity: safeNewStock,
        shopStock: newShop,
        updatedAt: new Date().toISOString()
      };
      await db.variants.put(updated);
      await CloudSync.pushVariant(updated);
      loadVariants();
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (confirm('คุณแน่ใจว่าต้องการลบตัวเลือกสินค้านี้?')) {
      await db.variants.delete(id);
      CloudSync.deleteVariant(id);
      loadVariants();
    }
  };

  const allCategories = Array.from(new Set(variants.map(v => v.category).filter(Boolean)));

  const filteredVariants = variants.filter(v => {
    const matchesSearch = 
      v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.barcode.includes(searchTerm) ||
      (v.vendorName && v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategoryFilter === 'ALL' || v.category === selectedCategoryFilter;
    if (consignmentFilter === 'SHOP_ONLY' && v.isConsignment) return false;
    if (consignmentFilter === 'CONSIGNMENT_ONLY' && !v.isConsignment) return false;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <span>คลังสินค้า & สติ๊กเกอร์บาร์โค้ด (แอดมินเจ้าของร้าน)</span>
          </h1>
          <p className="text-xs text-slate-500">
            จัดการสินค้าและสต็อกแยกตามไซส์ (S, M, L, XL...) อัปโหลดภาพ และสั่งพิมพ์สติ๊กเกอร์บาร์โค้ด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProductionModalOpen(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition flex-shrink-0"
            title="ตรวจดูรายการสั่งผลิตพิเศษ เสื้อสกรีน/มัดจำ 50% สำหรับคลังและช่างผลิต"
          >
            <Scissors className="w-4 h-4 text-purple-200" />
            <span>✂️ คิวงานสั่งผลิต (Production)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition flex-shrink-0"
            title="โอนย้ายสต็อกระหว่างโกดัง/โรงงานผลิต เข้าหน้าร้าน"
          >
            <Truck className="w-4 h-4 text-emerald-200" />
            <span>🚚 โอนย้ายสต็อกข้ามคลัง</span>
            {pendingTransferCount > 0 && (
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black text-[10px] ml-1 shadow animate-pulse">
                รอรับ {pendingTransferCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              resetSingleForm();
              setIsSingleModalOpen(true);
            }}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มสินค้า (แยกสต็อกตามไซส์)</span>
          </button>

          <button
            onClick={() => setIsMatrixModalOpen(true)}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ สร้าง Matrix Variants (DTF/Flex)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามชื่อสินค้า, ไซส์, SKU, หรือ Barcode..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Consignment & Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setConsignmentFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${consignmentFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ทั้งหมด ({variants.length})
            </button>
            <button
              type="button"
              onClick={() => setConsignmentFilter('SHOP_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition ${consignmentFilter === 'SHOP_ONLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ของร้านเอง ({variants.filter(v => !v.isConsignment).length})
            </button>
            <button
              type="button"
              onClick={() => setConsignmentFilter('CONSIGNMENT_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition ${consignmentFilter === 'CONSIGNMENT_ONLY' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'}`}
            >
              🤝 ฝากขายชุมชน ({variants.filter(v => v.isConsignment).length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">ทุกหมวดหมู่ ({variants.length})</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({variants.filter(v => v.category === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center">รูปภาพ</th>
                <th className="p-3.5">SKU / บาร์โค้ด</th>
                <th className="p-3.5">ชื่อสินค้าและไซส์/ตัวเลือก</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5 text-right">ต้นทุน</th>
                <th className="p-3.5 text-right">ราคาขาย</th>
                <th className="p-3.5 text-center">
                  <div>สต็อกคงเหลือ</div>
                  <div className="text-[10px] text-slate-400 font-normal lowercase">โกดัง / หน้าร้าน / รวม</div>
                </th>
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
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 mx-auto shadow-2xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                          <Tag className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-slate-900">{item.sku}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">{item.barcode}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{item.productName}</span>
                        {item.isConsignment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            🤝 ฝากขาย: {item.vendorName || 'ชุมชน'} (หัก GP {item.gpPercent}%)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.attributes)
                          .filter(([k]) => !['isConsignment', 'vendorId', 'vendorName', 'gpPercent', 'vendorPayoutPrice'].includes(k))
                          .map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px]">
                              {k}: {v}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">฿{item.costPrice.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-700">฿{item.salePrice.toLocaleString()}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-slate-500">โกดัง:</span>
                          <span className="font-bold text-amber-700">{item.warehouseStock ?? Math.floor(item.stockQuantity * 0.6)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">หน้าร้าน:</span>
                          <span className="font-bold text-emerald-700">{item.shopStock ?? (item.stockQuantity - Math.floor(item.stockQuantity * 0.6))}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, item.stockQuantity - 1)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            isLow ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white'
                          }`} title="ยอดรวมทั้ง 2 คลัง">
                            รวม: {item.stockQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(item.id, item.stockQuantity + 1)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedVariantForPrint(item);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs inline-flex items-center gap-1 shadow-xs transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-600" />
                        <span>พิมพ์สติ๊กเกอร์ ({item.stockQuantity})</span>
                      </button>
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteVariant(item.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
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

      {/* MODAL: ADD PRODUCT WITH MULTI-SIZE STOCK MATRIX & FORM RESET */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <span>เพิ่มสินค้าใหม่ (ระบุจำนวนสต็อกแยกตามแต่ละไซส์)</span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  resetSingleForm();
                  setIsSingleModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSingleProduct} className="space-y-4 text-xs">
              {/* Image Upload Area with Compression */}
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center gap-4">
                {singleImagePreview ? (
                  <div className="relative flex-shrink-0">
                    <img
                      src={singleImagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setSingleImagePreview('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-200 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[9px]">ไม่มีรูปภาพ</span>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block font-bold text-slate-700 mb-1">
                    📷 รูปภาพสินค้า (ถ่ายจากมือถือ ย่อบีบอัดอัตโนมัติ)
                  </label>
                  <label className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow transition">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>เลือกรูปภาพจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSingleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  value={singleName}
                  onChange={e => setSingleName(e.target.value)}
                  placeholder="เช่น เสื้อยืดลิมิเต็ด KORAT CAT ลายฉลุเรือนโคราช"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  autoFocus
                />
              </div>

              {/* Category Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่สินค้า</label>
                  <select
                    value={singleCategory}
                    onChange={e => setSingleCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {DEFAULT_PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="CUSTOM">+ เพิ่มหมวดหมู่ใหม่เอง...</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">สีของสินค้า (Color)</label>
                  <input
                    type="text"
                    value={singleColor}
                    onChange={e => setSingleColor(e.target.value)}
                    placeholder="เช่น ดำ Obsidian, ขาว Ivory"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {singleCategory === 'CUSTOM' && (
                <div>
                  <label className="block font-bold text-amber-800 mb-1">ระบุชื่อหมวดหมู่ใหม่</label>
                  <input
                    type="text"
                    required
                    value={singleCustomCategory}
                    onChange={e => setSingleCustomCategory(e.target.value)}
                    placeholder="พิมพ์ชื่อหมวดหมู่ที่ต้องการ..."
                    className="w-full p-2.5 bg-amber-50/50 border border-amber-300 rounded-xl"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isConsignment ? 'ต้นทุนสินค้า / จ่ายคืนผู้ฝาก (บาท)' : 'ต้นทุนมาตรฐาน (บาท)'}
                  </label>
                  <input
                    type="number"
                    value={isConsignment ? consignmentVendorPayout : singleCost}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (isConsignment) {
                        setConsignmentVendorPayout(val);
                        if (singlePrice > 0) {
                          setConsignmentGpPercent(Math.max(0, Math.round(((singlePrice - val) / singlePrice) * 100)));
                        }
                      } else {
                        setSingleCost(val);
                      }
                    }}
                    className={`w-full p-2.5 border rounded-xl font-mono ${isConsignment ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ราคาขายหน้าร้าน (บาท) *</label>
                  <input
                    type="number"
                    value={singlePrice}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setSinglePrice(val);
                      if (isConsignment) {
                        setConsignmentVendorPayout(Math.round(val * (1 - consignmentGpPercent / 100)));
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              {/* CONSIGNMENT SECTION (สินค้าฝากขายจากวิสาหกิจชุมชน) */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤝</span>
                    <div>
                      <span className="font-bold text-amber-950 text-sm">สินค้าฝากขาย (Consignment ชุมชน)</span>
                      <p className="text-[11px] text-amber-800">สินค้าของวิสาหกิจชุมชน/ผู้ประกอบการรายเล็ก นำมาฝากจำหน่ายในร้าน</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-xs">
                    <input
                      type="checkbox"
                      checked={isConsignment}
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsConsignment(checked);
                        if (checked && consignors.length > 0 && !selectedVendorId) {
                          setSelectedVendorId(consignors[0].id);
                          setConsignmentGpPercent(consignors[0].defaultGpPercent || 20);
                          setConsignmentVendorPayout(Math.round(singlePrice * (1 - (consignors[0].defaultGpPercent || 20) / 100)));
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-amber-900">เป็นสินค้าฝากขาย</span>
                  </label>
                </div>

                {isConsignment && (
                  <div className="pt-2 border-t border-amber-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-amber-900">ผู้ประกอบการ / ชุมชนผู้ฝาก *</label>
                          <button
                            type="button"
                            onClick={() => setIsAddVendorOpen(true)}
                            className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline"
                          >
                            + เพิ่มผู้ฝากรายใหม่
                          </button>
                        </div>
                        <select
                          value={selectedVendorId}
                          onChange={e => {
                            const vId = e.target.value;
                            setSelectedVendorId(vId);
                            const v = consignors.find(c => c.id === vId);
                            if (v) {
                              setConsignmentGpPercent(v.defaultGpPercent || 20);
                              setConsignmentVendorPayout(Math.round(singlePrice * (1 - (v.defaultGpPercent || 20) / 100)));
                            }
                          }}
                          className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900"
                        >
                          <option value="">-- เลือกผู้ประกอบการฝากขาย --</option>
                          {consignors.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.code ? `(${c.code})` : ''} - GP {c.defaultGpPercent}%
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 mb-1">
                            หัก % ร้าน (GP)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={consignmentGpPercent}
                              onChange={e => {
                                const gp = parseFloat(e.target.value) || 0;
                                setConsignmentGpPercent(gp);
                                setConsignmentVendorPayout(Math.round(singlePrice * (1 - gp / 100)));
                              }}
                              className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-center"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs text-amber-700 font-bold">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-emerald-900 mb-1">
                            ยอดเงินคืนผู้ฝาก/ชิ้น
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={consignmentVendorPayout}
                              onChange={e => {
                                const payout = parseFloat(e.target.value) || 0;
                                setConsignmentVendorPayout(payout);
                                if (singlePrice > 0) {
                                  const computedGp = Math.round(((singlePrice - payout) / singlePrice) * 100);
                                  setConsignmentGpPercent(Math.max(0, computedGp));
                                }
                              }}
                              className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-center text-emerald-800"
                            />
                            <span className="absolute right-2.5 top-2.5 text-xs text-emerald-700 font-bold">฿</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-1">
                      <span className="text-slate-600">
                        สรุปการแบ่งรายได้ต่อชิ้น (ราคาขาย <b>฿{singlePrice.toLocaleString()}</b>):
                      </span>
                      <span className="font-bold">
                        ร้านได้ <span className="text-amber-700">฿{(singlePrice - consignmentVendorPayout).toLocaleString()}</span> ({consignmentGpPercent}%) | 
                        คืนผู้ฝาก <span className="text-emerald-700">฿{consignmentVendorPayout.toLocaleString()}</span> ({100 - consignmentGpPercent}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SIZE BREAKDOWN SELECTOR */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800">
                    📏 การแยกสต็อกตามไซส์ (Size Breakdown)
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={hasSizes}
                      onChange={e => setHasSizes(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>มีหลายไซส์ (เสื้อผ้า/หมวก)</span>
                  </label>
                </div>

                {hasSizes ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">
                      กรอกจำนวนสต็อกที่นำเข้าของแต่ละไซส์ (ระบบจะสร้างบาร์โค้ดเฉพาะของแต่ละไซส์ให้อัตโนมัติ):
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sizeStocks.map((item) => (
                        <div key={item.size} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="font-bold font-mono text-slate-800 w-12">{item.size}:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.qty}
                            onChange={e => handleUpdateSizeQty(item.size, parseInt(e.target.value, 10) || 0)}
                            className="w-16 p-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(item.size)}
                            className="text-slate-300 hover:text-rose-500 p-0.5 ml-1"
                            title="ลบไซส์นี้"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Custom Size Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newSizeName}
                        onChange={e => setNewSizeName(e.target.value)}
                        placeholder="เพิ่มไซส์ใหม่ เช่น 3XL, เด็ก..."
                        className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSize}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                      >
                        + เพิ่มไซส์
                      </button>
                    </div>

                    <div className="p-2 bg-amber-50 rounded-xl text-right font-bold text-amber-900">
                      รวมสต็อกทุกไซส์ทั้งหมด: <span className="font-mono text-sm">{sizeStocks.reduce((s, i) => s + i.qty, 0)}</span> ชิ้น
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      จำนวนสต็อกนำเข้าทั้งหมด (ชิ้น)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={singleFixedStock}
                      onChange={e => setSingleFixedStock(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm"
                    />
                  </div>
                )}
              </div>

              {/* STOCK DESTINATION SELECTOR */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-indigo-950">
                  📍 สต็อกที่เพิ่มนี้ ต้องการนำเข้าเก็บที่ไหน? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockDestination('WAREHOUSE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'WAREHOUSE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>🏭 เข้าโกดัง 100%</span>
                    <span className="text-[10px] font-normal opacity-85">(สต็อกหลังร้าน)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDestination('SHOP')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'SHOP'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>🏪 เข้าหน้าร้าน 100%</span>
                    <span className="text-[10px] font-normal opacity-85">(พร้อมยิงขาย)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDestination('HALF')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'HALF'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>⚖️ แบ่งครึ่ง (50/50)</span>
                    <span className="text-[10px] font-normal opacity-85">(โกดัง 50% หน้าร้าน 50%)</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    resetSingleForm();
                    setIsSingleModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
                >
                  บันทึกสินค้า & สต็อก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATRIX MODAL */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    {DEFAULT_PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
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

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <div className="font-bold text-amber-900 text-sm">
                  🎨 กำหนดตัวเลือกย่อย (คั่นด้วยเครื่องหมายจุลภาค ,)
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
                  <label className="block font-semibold text-slate-700 mb-1">เทคนิค (Technique e.g. DTF, Flex):</label>
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

              {/* STOCK DESTINATION SELECTOR FOR MATRIX */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-indigo-950">
                  📍 สต็อกที่ Matrix สร้างขึ้นทั้งหมด ต้องการนำเข้าเก็บที่ไหน? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockDestination('WAREHOUSE')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'WAREHOUSE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>🏭 เข้าโกดัง 100%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDestination('SHOP')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'SHOP'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>🏪 เข้าหน้าร้าน 100%</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDestination('HALF')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                      stockDestination === 'HALF'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>⚖️ แบ่งครึ่ง (50/50)</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateMatrix}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>คำนวณและสร้าง Matrix Variants ทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CONSIGNOR MODAL */}
      {isAddVendorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <span>🤝</span> ลงทะเบียนผู้ประกอบการฝากขายใหม่
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              บันทึกข้อมูลผู้ผลิต วิสาหกิจชุมชน เพื่อใช้สรุปยอดขายและคำนวณเงินส่งมอบคืน
            </p>
            <form onSubmit={handleCreateVendor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ประกอบการ / ชุมชน *</label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={e => setNewVendorName(e.target.value)}
                  placeholder="เช่น คุณกอ (เครื่องเคลือบดินเผาด่านเกวียน)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผู้ประกอบการ</label>
                  <input
                    type="text"
                    value={newVendorCode}
                    onChange={e => setNewVendorCode(e.target.value)}
                    placeholder="เช่น VND-03"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <input
                    type="tel"
                    required
                    value={newVendorPhone}
                    onChange={e => setNewVendorPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ธนาคาร / พร้อมเพย์</label>
                  <input
                    type="text"
                    value={newVendorBank}
                    onChange={e => setNewVendorBank(e.target.value)}
                    placeholder="เช่น กสิกรไทย / พร้อมเพย์"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่บัญชี</label>
                  <input
                    type="text"
                    value={newVendorAccountNo}
                    onChange={e => setNewVendorAccountNo(e.target.value)}
                    placeholder="เช่น 044-x-xxxxx-x"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เปอร์เซ็นต์หักของร้านเริ่มต้น (GP %)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newVendorDefaultGp}
                    onChange={e => setNewVendorDefaultGp(parseFloat(e.target.value) || 20)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">เช่น 20% หมายถึง ร้านได้รับค่าส่วนแบ่ง 20% และส่งมอบเงินคืนผู้ฝาก 80%</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  บันทึกผู้ประกอบการ
                </button>
              </div>
            </form>
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

      {/* Multi-Location Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          loadVariants();
        }}
        onTransferComplete={loadVariants}
      />

      {/* Warehouse / Custom Order Production Queue Modal */}
      <WarehouseProductionModal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
      />
    </div>
  );
};
