// src/components/CloudSyncModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Database
} from 'lucide-react';
import { CloudSync, SUPABASE_CONFIG } from '../services/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [connStatus, setConnStatus] = useState<{ checked: boolean; success: boolean; message: string }>({
    checked: false,
    success: false,
    message: 'กำลังตรวจสอบการเชื่อมต่อ...'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const checkConnection = async () => {
    setConnStatus({ checked: false, success: false, message: 'กำลังตรวจสอบการเชื่อมต่อกับ Supabase...' });
    const res = await CloudSync.testConnection();
    setConnStatus({ checked: true, success: res.success, message: res.message });
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePushAll = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await CloudSync.pushAllToCloud();
    setIsSyncing(false);
    setSyncResult(res.message);
    if (res.success && onSyncComplete) onSyncComplete();
  };

  const handlePullAll = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await CloudSync.pullFromCloud();
    setIsSyncing(false);
    setSyncResult(res.summary);
    if (res.success && onSyncComplete) onSyncComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">ระบบซิงค์ข้อมูล Cloud (Supabase)</h3>
              <p className="text-[11px] text-slate-400">เชื่อมโยงสต็อกและบิลขายระหว่าง หน้าร้าน • โกดัง • คอมพิวเตอร์ที่บ้าน</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Connection Status Box */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            connStatus.success 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            {connStatus.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-bold mb-1 flex items-center justify-between">
                <span>สถานะ Cloud Database:</span>
                <button 
                  type="button" 
                  onClick={checkConnection}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> ตรวจสอบใหม่
                </button>
              </div>
              <p className="text-[11px] leading-relaxed">{connStatus.message}</p>
              <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                URL: {SUPABASE_CONFIG.url}
              </div>
            </div>
          </div>

          {/* If table not created yet notice */}
          {!connStatus.success && (
            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300">
              <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4" /> ขั้นตอนสำคัญ: รันสคริปต์ SQL บน Supabase
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                เปิดหน้าต่าง Supabase Dashboard &gt; <b>SQL Editor</b> &gt; คัดลอกโค้ดจากไฟล์ <code>supabase_schema.sql</code> ไปวางแล้วกด <b>RUN</b> หนึ่งครั้ง เพื่อสร้างตารางให้พร้อมใช้งานครับ
              </p>
            </div>
          )}

          {/* Sync Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Push Local -> Cloud */}
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePushAll}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white flex flex-col items-center justify-center gap-2 font-bold shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <UploadCloud className="w-6 h-6 text-white" />
              <span className="text-xs">อัปโหลดขึ้น Cloud</span>
              <span className="text-[10px] font-normal text-amber-200">ส่งสต็อกในเครื่องนี้ขึ้น Cloud</span>
            </button>

            {/* Pull Cloud -> Local */}
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePullAll}
              className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex flex-col items-center justify-center gap-2 font-bold transition active:scale-95 disabled:opacity-50"
            >
              <DownloadCloud className="w-6 h-6 text-amber-400" />
              <span className="text-xs">ดึงข้อมูลจาก Cloud</span>
              <span className="text-[10px] font-normal text-slate-400">ดึงสต็อกล่าสุดจาก Cloud ลงเครื่อง</span>
            </button>
          </div>

          {/* Live Sync Spinner or Result Toast */}
          {isSyncing && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>กำลังส่งข้อมูลซิงค์กับ Supabase...</span>
            </div>
          )}

          {syncResult && !isSyncing && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-bold">
              {syncResult}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>KORAT CAT x เรือนโคราชเฉลิมวัฒนา</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
};
