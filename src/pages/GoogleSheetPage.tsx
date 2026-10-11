// src/pages/GoogleSheetPage.tsx
import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { GoogleSheetsBridge } from '../services/googleSheets';

export const GoogleSheetPage: React.FC = () => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      const csvContent = await GoogleSheetsBridge.exportProductsToCsv();
      const dateStr = new Date().toISOString().slice(0, 10);
      GoogleSheetsBridge.downloadCsv(csvContent, `POS_Korat_Cat_Catalog_${dateStr}.csv`);
    } catch (e: any) {
      alert('เกิดข้อผิดพลาดในการส่งออก: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      setIsProcessing(true);
      const res = await GoogleSheetsBridge.importProductsFromCsv(text);
      setIsProcessing(false);
      setImportStatus(`นำเข้าและอัปเดตสต็อกสำเร็จ ${res.success} รายการ! ${res.errors.length > 0 ? `(มีข้อผิดพลาด ${res.errors.length} รายการ)` : ''}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          <span>เชื่อมต่อ Google Sheets & Data Bridge (แอดมินเจ้าของร้าน)</span>
        </h1>
        <p className="text-xs text-slate-500">
          นำเข้า-ส่งออกแคตตาล็อกสินค้า จัดการต้นทุน กำไร และตั้งสมการสูตรคำนวณผ่านสเปรดชีตได้อย่างไร้รอยต่อ
        </p>
      </div>

      {/* Guide Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 text-xs space-y-2">
        <div className="font-bold text-sm flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>โครงสร้างสูตรคำนวณอัตโนมัติ (Pricing Formulas)</span>
        </div>
        <p>
          เมื่อคุณกด <b>"ดาวน์โหลดไฟล์สำหรับ Google Sheets"</b> ระบบจะฝังสูตรคำนวณกำไรและเปอร์เซ็นต์มาร์จิ้น (Margin %) ให้ในแต่ละแถวโดยอัตโนมัติ:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2 font-mono text-[11px] text-emerald-800">
          <li>สูตรกำไร (Profit): <code className="bg-white px-1.5 py-0.5 rounded">=J2-I2</code> (ราคาขาย - ต้นทุน)</li>
          <li>สูตรมาร์จิ้น (%): <code className="bg-white px-1.5 py-0.5 rounded">=((J2-I2)/J2)*100</code></li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">ส่งออกข้อมูลไปยัง Google Sheets</h3>
            <p className="text-xs text-slate-500 mt-1">
              สร้างไฟล์ CSV ที่รองรับภาษาไทย 100% (UTF-8 BOM) เพื่อเปิดใน Google Sheets หรือ Microsoft Excel ได้ทันที
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดไฟล์สำหรับ Google Sheets</span>
          </button>
        </div>

        {/* Import Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">นำเข้าข้อมูลที่แก้ไขจาก Google Sheets</h3>
            <p className="text-xs text-slate-500 mt-1">
              หลังจากปรับปรุงราคา หรือสต็อกใน Google Sheets ให้ Export เป็น .csv แล้วนำมาอัปโหลดที่นี่
            </p>
          </div>

          <div>
            <label className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition">
              <Upload className="w-4 h-4" />
              <span>เลือกไฟล์ CSV เพื่อนำเข้า</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {importStatus && (
        <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}
    </div>
  );
};
