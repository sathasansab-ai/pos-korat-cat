// src/components/MannequinFigure.tsx
import React from 'react';
import type { GenderType, CustomOrderCategory, CustomOrderMeasurements } from '../types';

interface MannequinFigureProps {
  gender: GenderType;
  category?: CustomOrderCategory;
  measurements?: CustomOrderMeasurements;
  className?: string;
  isPrintMode?: boolean;
}

/**
 * ฟังก์ชันสร้าง SVG String สำหรับใส่ในเอกสารสั่งพิมพ์ A4
 * ออกแบบตามภาพตัวอย่างเวกเตอร์มาตรฐานสากล (Female & Male Silhouette Vector)
 * ให้คมชัด 100% ไม่พึ่งพา CSS ภายนอก และไม่ใช้ Filter ที่อาจทำให้เบราว์เซอร์ Print Engine ขาวโพลน
 */
export function renderMannequinSvgHtml(
  gender: GenderType,
  category: CustomOrderCategory = 'SHIRT',
  measurements: CustomOrderMeasurements = {},
  isPrintMode: boolean = true
): string {
  const isFemale = gender === 'FEMALE';
  const m = measurements || {};

  return `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 240 380" 
      width="100%" 
      height="230" 
      style="display: block; margin: 0 auto; max-height: 230px;"
    >
      ${isFemale ? `
        <!-- ================= FEMALE VECTOR SILHOUETTE ================= -->
        <g stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <!-- Hair (Long dark hair behind/around shoulders) -->
          <path d="M 120 18 C 104 18 92 28 90 46 C 88 62 86 85 91 108 C 94 122 98 138 100 148 C 102 136 105 106 109 88 C 107 70 109 48 120 38 C 131 48 133 70 131 88 C 135 106 138 136 140 148 C 142 138 146 122 149 108 C 154 85 152 62 150 46 C 148 28 136 18 120 18 Z" fill="#2d3748" />

          <!-- Head (Blank elegant face contour) -->
          <path d="M 108 42 C 108 30 132 30 132 42 C 133 55 129 68 120 74 C 111 68 107 55 108 42 Z" fill="#ffffff" />

          <!-- Neck & Collarbones -->
          <path d="M 114 74 L 114 88 M 126 74 L 126 88" fill="none" stroke-width="1.5" />
          <path d="M 108 91 Q 116 94 120 91 Q 124 94 132 91" fill="none" stroke="#64748b" stroke-width="1.2" />

          <!-- Torso & Arms Outline -->
          <path d="M 114 88 C 104 90 94 94 90 102 C 86 110 83 140 79 175 C 76 195 74 210 72 220 C 70 227 74 230 77 227 C 80 220 84 200 87 180 C 90 158 92 142 94 134 C 95 146 98 162 104 174 C 109 184 111 194 107 205 C 103 216 100 223 100 223 L 140 223 C 140 223 137 216 133 205 C 129 194 131 184 136 174 C 142 162 145 146 146 134 C 148 142 150 158 153 180 C 156 200 160 220 163 227 C 166 230 170 227 168 220 C 166 210 164 195 161 175 C 157 140 154 110 150 102 C 146 94 136 90 126 88 Z" fill="#ffffff" />

          <!-- Bikini Top (Dark Cups & Straps) -->
          <path d="M 104 108 L 102 96 M 136 108 L 138 96" fill="none" stroke="#1e293b" stroke-width="1.2" />
          <path d="M 98 116 Q 106 107 114 117 Q 109 131 98 124 Z" fill="#2d3748" />
          <path d="M 142 116 Q 134 107 126 117 Q 131 131 142 124 Z" fill="#2d3748" />
          <path d="M 114 118 L 126 118" fill="none" stroke="#1e293b" stroke-width="1.2" />

          <!-- Navel & Abdomen contour -->
          <path d="M 117 150 Q 120 155 120 168" fill="none" stroke="#cbd5e1" stroke-width="1" />
          <ellipse cx="120" cy="172" rx="1" ry="1.8" fill="#64748b" />

          <!-- Bikini Bottom (Panties) -->
          <path d="M 99 204 Q 120 211 141 204 L 136 226 Q 120 231 104 226 Z" fill="#2d3748" />

          <!-- Legs & Feet -->
          <path d="M 104 226 C 104 246 103 270 103 295 C 103 318 105 340 104 358 L 99 363 L 110 363 C 113 355 115 332 116 310 C 117 288 118 260 120 236 C 122 260 123 288 124 310 C 125 332 127 355 130 363 L 141 363 L 136 358 C 135 340 137 318 137 295 C 137 270 136 246 136 226 Z" fill="#ffffff" />
          
          <!-- Knee & Ankle Accents -->
          <path d="M 107 284 Q 110 286 113 284 M 127 284 Q 130 286 133 284" fill="none" stroke="#94a3b8" stroke-width="1.2" />
        </g>
      ` : `
        <!-- ================= MALE VECTOR SILHOUETTE ================= -->
        <g stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <!-- Short Hair with Pompadour/Quiff -->
          <path d="M 120 18 C 106 18 97 26 95 38 C 98 39 104 37 110 34 C 116 31 127 29 135 32 C 140 34 144 38 146 41 C 146 29 139 18 120 18 Z" fill="#2d3748" />

          <!-- Head (Chiseled Masculine Face) -->
          <path d="M 105 38 C 105 27 135 27 135 38 C 136 51 133 66 120 72 C 107 66 104 51 105 38 Z" fill="#ffffff" />

          <!-- Muscular Neck & Trapezius -->
          <path d="M 112 68 L 112 85 M 128 68 L 128 85" fill="none" stroke-width="1.5" />
          <path d="M 106 72 C 96 76 86 84 80 96 M 134 72 C 144 76 154 84 160 96" fill="none" stroke="#1e293b" stroke-width="1.6" />

          <!-- Broad Muscular Torso & Arms -->
          <path d="M 80 96 C 75 106 71 140 68 175 C 65 195 62 210 60 220 C 58 227 62 230 66 227 C 70 220 74 200 78 180 C 82 155 84 140 87 132 C 90 146 95 170 102 186 C 105 194 107 202 104 214 L 104 222 L 136 222 L 136 214 C 133 202 135 194 138 186 C 145 170 150 146 153 132 C 156 140 158 155 162 180 C 166 200 170 220 174 227 C 178 230 182 227 180 220 C 178 210 175 195 172 175 C 169 140 165 106 160 96 Z" fill="#ffffff" />

          <!-- Pectoral Chest Lines -->
          <path d="M 94 116 Q 106 128 118 122 M 146 116 Q 134 128 122 122" fill="none" stroke="#475569" stroke-width="1.4" />
          <path d="M 120 106 L 120 123" fill="none" stroke="#475569" stroke-width="1.4" />

          <!-- 6-Pack Abdominals Definition -->
          <path d="M 120 124 L 120 188" fill="none" stroke="#64748b" stroke-width="1.2" />
          <path d="M 108 140 L 132 140 M 109 156 L 131 156 M 111 172 L 129 172" fill="none" stroke="#94a3b8" stroke-width="1.2" />
          <ellipse cx="120" cy="180" rx="1.2" ry="2" fill="#475569" />

          <!-- Dark Boxer Trunks / Athletic Shorts -->
          <path d="M 104 212 L 136 212 L 138 244 L 123 244 L 120 234 L 117 244 L 102 244 Z" fill="#2d3748" />
          <path d="M 104 216 L 136 216" fill="none" stroke="#475569" stroke-width="1" />

          <!-- Muscular Legs & Feet -->
          <path d="M 104 244 C 104 266 103 292 103 315 C 103 335 105 352 104 360 L 98 364 L 110 364 C 114 354 116 332 117 310 C 118 288 119 265 120 240 C 121 265 122 288 123 310 C 124 332 126 354 130 364 L 142 364 L 136 360 C 135 352 137 335 137 315 C 137 292 136 266 136 244 Z" fill="#ffffff" />
          
          <!-- Knee Contours -->
          <path d="M 106 288 Q 110 291 114 288 M 126 288 Q 130 291 134 288" fill="none" stroke="#94a3b8" stroke-width="1.3" />
        </g>
      `}

      <!-- ================= MEASUREMENT CALLOUT BADGES (SOLID PRINTABLE) ================= -->
      ${m.shoulder ? `
        <line x1="${isFemale ? 90 : 80}" y1="102" x2="${isFemale ? 150 : 160}" y2="102" stroke="#b45309" stroke-width="1.6" stroke-dasharray="3,2" />
        <g transform="translate(${isFemale ? 154 : 164}, 92)">
          <rect width="68" height="18" rx="4" fill="#b45309" />
          <text x="34" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">ไหล่: ${m.shoulder}</text>
        </g>
      ` : ''}

      ${m.chest ? `
        <line x1="${isFemale ? 94 : 88}" y1="125" x2="${isFemale ? 146 : 152}" y2="125" stroke="#be185d" stroke-width="1.8" stroke-dasharray="3,2" />
        <g transform="translate(${isFemale ? 150 : 156}, 115)">
          <rect width="68" height="18" rx="4" fill="#be185d" />
          <text x="34" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">อก: ${m.chest}</text>
        </g>
      ` : ''}

      ${(m.waist || m.waistPants) ? `
        <line x1="${isFemale ? 104 : 98}" y1="170" x2="${isFemale ? 136 : 142}" y2="170" stroke="#047857" stroke-width="1.8" stroke-dasharray="3,2" />
        <g transform="translate(${isFemale ? 142 : 148}, 160)">
          <rect width="72" height="18" rx="4" fill="#047857" />
          <text x="36" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">เอว: ${m.waist || m.waistPants}</text>
        </g>
      ` : ''}

      ${(m.hips || m.hipsPants) ? `
        <line x1="${isFemale ? 99 : 102}" y1="214" x2="${isFemale ? 141 : 138}" y2="214" stroke="#6d28d9" stroke-width="1.6" stroke-dasharray="3,2" />
        <g transform="translate(${isFemale ? 145 : 144}, 205)">
          <rect width="74" height="18" rx="4" fill="#6d28d9" />
          <text x="37" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">สะโพก: ${m.hips || m.hipsPants}</text>
        </g>
      ` : ''}

      ${m.armLength ? `
        <line x1="${isFemale ? 88 : 78}" y1="104" x2="${isFemale ? 73 : 61}" y2="220" stroke="#0369a1" stroke-width="1.6" stroke-dasharray="3,2" />
        <g transform="translate(6, 150)">
          <rect width="66" height="18" rx="4" fill="#0369a1" />
          <text x="33" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">แขน: ${m.armLength}</text>
        </g>
      ` : ''}

      ${m.pantsLength ? `
        <line x1="${isFemale ? 138 : 137}" y1="214" x2="${isFemale ? 136 : 136}" y2="358" stroke="#1d4ed8" stroke-width="1.6" stroke-dasharray="3,2" />
        <g transform="translate(150, 280)">
          <rect width="74" height="18" rx="4" fill="#1d4ed8" />
          <text x="37" y="12.5" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">ขายาว: ${m.pantsLength}</text>
        </g>
      ` : ''}

      <text x="120" y="375" fill="#64748b" font-size="9.5" font-weight="bold" text-anchor="middle" font-family="sans-serif" letter-spacing="0.5">
        ${isFemale ? 'FEMALE SILHOUETTE (หุ่นสตรี)' : 'MALE SILHOUETTE (หุ่นบุรุษ)'}
      </text>
    </svg>
  `;
}

export const MannequinFigure: React.FC<MannequinFigureProps> = ({
  gender,
  category = 'SHIRT',
  measurements = {},
  className = '',
  isPrintMode = false
}) => {
  const isFemale = gender === 'FEMALE';
  const isPants = category === 'PANTS';
  const m = measurements || {};

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 240 380"
        className="w-full h-full max-h-[380px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="badgeShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.25" />
          </filter>
        </defs>

        {isFemale ? (
          /* ================= FEMALE VECTOR SILHOUETTE ================= */
          <g stroke={isPrintMode ? "#1e293b" : "#cbd5e1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Hair */}
            <path
              d="M 120 18 C 104 18 92 28 90 46 C 88 62 86 85 91 108 C 94 122 98 138 100 148 C 102 136 105 106 109 88 C 107 70 109 48 120 38 C 131 48 133 70 131 88 C 135 106 138 136 140 148 C 142 138 146 122 149 108 C 154 85 152 62 150 46 C 148 28 136 18 120 18 Z"
              fill={isPrintMode ? "#2d3748" : "#475569"}
            />

            {/* Head (Face) */}
            <path
              d="M 108 42 C 108 30 132 30 132 42 C 133 55 129 68 120 74 C 111 68 107 55 108 42 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
            />

            {/* Neck & Collarbones */}
            <path d="M 114 74 L 114 88 M 126 74 L 126 88" fill="none" strokeWidth="1.5" />
            <path d="M 108 91 Q 116 94 120 91 Q 124 94 132 91" fill="none" stroke={isPrintMode ? "#64748b" : "#94a3b8"} strokeWidth="1.2" />

            {/* Torso & Arms Outline */}
            <path
              d="M 114 88 C 104 90 94 94 90 102 C 86 110 83 140 79 175 C 76 195 74 210 72 220 C 70 227 74 230 77 227 C 80 220 84 200 87 180 C 90 158 92 142 94 134 C 95 146 98 162 104 174 C 109 184 111 194 107 205 C 103 216 100 223 100 223 L 140 223 C 140 223 137 216 133 205 C 129 194 131 184 136 174 C 142 162 145 146 146 134 C 148 142 150 158 153 180 C 156 200 160 220 163 227 C 166 230 170 227 168 220 C 166 210 164 195 161 175 C 157 140 154 110 150 102 C 146 94 136 90 126 88 Z"
              fill={isPrintMode ? "#ffffff" : "#0f172a"}
            />

            {/* Bikini Top */}
            <path d="M 104 108 L 102 96 M 136 108 L 138 96" fill="none" stroke={isPrintMode ? "#1e293b" : "#94a3b8"} strokeWidth="1.2" />
            <path d="M 98 116 Q 106 107 114 117 Q 109 131 98 124 Z" fill={isPrintMode ? "#2d3748" : "#334155"} />
            <path d="M 142 116 Q 134 107 126 117 Q 131 131 142 124 Z" fill={isPrintMode ? "#2d3748" : "#334155"} />
            <path d="M 114 118 L 126 118" fill="none" stroke={isPrintMode ? "#1e293b" : "#94a3b8"} strokeWidth="1.2" />

            {/* Navel & Abdomen */}
            <path d="M 117 150 Q 120 155 120 168" fill="none" stroke={isPrintMode ? "#cbd5e1" : "#334155"} strokeWidth="1" />
            <ellipse cx="120" cy="172" rx="1" ry="1.8" fill={isPrintMode ? "#64748b" : "#94a3b8"} />

            {/* Bikini Bottom */}
            <path d="M 99 204 Q 120 211 141 204 L 136 226 Q 120 231 104 226 Z" fill={isPrintMode ? "#2d3748" : "#334155"} />

            {/* Legs */}
            <path
              d="M 104 226 C 104 246 103 270 103 295 C 103 318 105 340 104 358 L 99 363 L 110 363 C 113 355 115 332 116 310 C 117 288 118 260 120 236 C 122 260 123 288 124 310 C 125 332 127 355 130 363 L 141 363 L 136 358 C 135 340 137 318 137 295 C 137 270 136 246 136 226 Z"
              fill={isPrintMode ? "#ffffff" : "#0f172a"}
            />
            
            <path d="M 107 284 Q 110 286 113 284 M 127 284 Q 130 286 133 284" fill="none" stroke={isPrintMode ? "#94a3b8" : "#475569"} strokeWidth="1.2" />
          </g>
        ) : (
          /* ================= MALE VECTOR SILHOUETTE ================= */
          <g stroke={isPrintMode ? "#1e293b" : "#cbd5e1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Hair */}
            <path
              d="M 120 18 C 106 18 97 26 95 38 C 98 39 104 37 110 34 C 116 31 127 29 135 32 C 140 34 144 38 146 41 C 146 29 139 18 120 18 Z"
              fill={isPrintMode ? "#2d3748" : "#475569"}
            />

            {/* Head (Face) */}
            <path
              d="M 105 38 C 105 27 135 27 135 38 C 136 51 133 66 120 72 C 107 66 104 51 105 38 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
            />

            {/* Neck & Trapezius */}
            <path d="M 112 68 L 112 85 M 128 68 L 128 85" fill="none" strokeWidth="1.5" />
            <path d="M 106 72 C 96 76 86 84 80 96 M 134 72 C 144 76 154 84 160 96" fill="none" stroke={isPrintMode ? "#1e293b" : "#cbd5e1"} strokeWidth="1.6" />

            {/* Broad Muscular Torso & Arms */}
            <path
              d="M 80 96 C 75 106 71 140 68 175 C 65 195 62 210 60 220 C 58 227 62 230 66 227 C 70 220 74 200 78 180 C 82 155 84 140 87 132 C 90 146 95 170 102 186 C 105 194 107 202 104 214 L 104 222 L 136 222 L 136 214 C 133 202 135 194 138 186 C 145 170 150 146 153 132 C 156 140 158 155 162 180 C 166 200 170 220 174 227 C 178 230 182 227 180 220 C 178 210 175 195 172 175 C 169 140 165 106 160 96 Z"
              fill={isPrintMode ? "#ffffff" : "#0f172a"}
            />

            {/* Chest (Pectorals) */}
            <path d="M 94 116 Q 106 128 118 122 M 146 116 Q 134 128 122 122" fill="none" stroke={isPrintMode ? "#475569" : "#64748b"} strokeWidth="1.4" />
            <path d="M 120 106 L 120 123" fill="none" stroke={isPrintMode ? "#475569" : "#64748b"} strokeWidth="1.4" />

            {/* Abdominals (6-Pack) */}
            <path d="M 120 124 L 120 188" fill="none" stroke={isPrintMode ? "#64748b" : "#475569"} strokeWidth="1.2" />
            <path d="M 108 140 L 132 140 M 109 156 L 131 156 M 111 172 L 129 172" fill="none" stroke={isPrintMode ? "#94a3b8" : "#334155"} strokeWidth="1.2" />
            <ellipse cx="120" cy="180" rx="1.2" ry="2" fill={isPrintMode ? "#475569" : "#94a3b8"} />

            {/* Boxer Shorts */}
            <path d="M 104 212 L 136 212 L 138 244 L 123 244 L 120 234 L 117 244 L 102 244 Z" fill={isPrintMode ? "#2d3748" : "#334155"} />
            <path d="M 104 216 L 136 216" fill="none" stroke={isPrintMode ? "#475569" : "#64748b"} strokeWidth="1" />

            {/* Muscular Legs */}
            <path
              d="M 104 244 C 104 266 103 292 103 315 C 103 335 105 352 104 360 L 98 364 L 110 364 C 114 354 116 332 117 310 C 118 288 119 265 120 240 C 121 265 122 288 123 310 C 124 332 126 354 130 364 L 142 364 L 136 360 C 135 352 137 335 137 315 C 137 292 136 266 136 244 Z"
              fill={isPrintMode ? "#ffffff" : "#0f172a"}
            />
            
            <path d="M 106 288 Q 110 291 114 288 M 126 288 Q 130 291 134 288" fill="none" stroke={isPrintMode ? "#94a3b8" : "#475569"} strokeWidth="1.3" />
          </g>
        )}

        {/* ================= MEASUREMENT GUIDE LINES & BADGES ================= */}
        {/* 1. SHOULDER WIDTH (ไหล่กว้าง) */}
        {m.shoulder && (
          <g>
            <line x1={isFemale ? 90 : 80} y1="102" x2={isFemale ? 150 : 160} y2="102" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 90 : 80} cy="102" r="3" fill="#f59e0b" />
            <circle cx={isFemale ? 150 : 160} cy="102" r="3" fill="#f59e0b" />
            <g transform={`translate(${isFemale ? 154 : 164}, 92)`} filter="url(#badgeShadow)">
              <rect width="68" height="20" rx="5" fill="#f59e0b" />
              <text x="34" y="14" fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ไหล่: {m.shoulder}
              </text>
            </g>
          </g>
        )}

        {/* 2. CHEST / BUST (รอบอก) */}
        {m.chest && (
          <g>
            <line x1={isFemale ? 94 : 88} y1="125" x2={isFemale ? 146 : 152} y2="125" stroke="#ec4899" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 94 : 88} cy="125" r="3.5" fill="#ec4899" />
            <circle cx={isFemale ? 146 : 152} cy="125" r="3.5" fill="#ec4899" />
            <g transform={`translate(${isFemale ? 150 : 156}, 115)`} filter="url(#badgeShadow)">
              <rect width="68" height="20" rx="5" fill="#ec4899" />
              <text x="34" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                อก: {m.chest}
              </text>
            </g>
          </g>
        )}

        {/* 3. WAIST (รอบเอว) */}
        {(m.waist || m.waistPants) && (
          <g>
            <line x1={isFemale ? 104 : 98} y1="170" x2={isFemale ? 136 : 142} y2="170" stroke="#10b981" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 104 : 98} cy="170" r="3.5" fill="#10b981" />
            <circle cx={isFemale ? 136 : 142} cy="170" r="3.5" fill="#10b981" />
            <g transform={`translate(${isFemale ? 142 : 148}, 160)`} filter="url(#badgeShadow)">
              <rect width="72" height="20" rx="5" fill="#10b981" />
              <text x="36" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                เอว: {m.waist || m.waistPants}
              </text>
            </g>
          </g>
        )}

        {/* 4. HIPS (รอบสะโพก) */}
        {(m.hips || m.hipsPants) && (
          <g>
            <line x1={isFemale ? 99 : 102} y1="214" x2={isFemale ? 141 : 138} y2="214" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 99 : 102} cy="214" r="3" fill="#8b5cf6" />
            <circle cx={isFemale ? 141 : 138} cy="214" r="3" fill="#8b5cf6" />
            <g transform={`translate(${isFemale ? 145 : 144}, 205)`} filter="url(#badgeShadow)">
              <rect width="74" height="20" rx="5" fill="#8b5cf6" />
              <text x="37" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                สะโพก: {m.hips || m.hipsPants}
              </text>
            </g>
          </g>
        )}

        {/* 5. ARM LENGTH (ความยาวแขน) */}
        {m.armLength && (
          <g>
            <line x1={isFemale ? 88 : 78} y1="104" x2={isFemale ? 73 : 61} y2="220" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 88 : 78} cy="104" r="3" fill="#0ea5e9" />
            <circle cx={isFemale ? 73 : 61} cy="220" r="3" fill="#0ea5e9" />
            <g transform="translate(6, 150)" filter="url(#badgeShadow)">
              <rect width="66" height="20" rx="5" fill="#0ea5e9" />
              <text x="33" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                แขน: {m.armLength}
              </text>
            </g>
          </g>
        )}

        {/* 6. SHIRT LENGTH (ความยาวเสื้อ) */}
        {m.shirtLength && !isPants && (
          <g>
            <line x1="120" y1="88" x2="120" y2="204" stroke="#f97316" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx="120" cy="88" r="3" fill="#f97316" />
            <circle cx="120" cy="204" r="3" fill="#f97316" />
            <g transform="translate(6, 110)" filter="url(#badgeShadow)">
              <rect width="68" height="20" rx="5" fill="#f97316" />
              <text x="34" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                เสื้อยาว: {m.shirtLength}
              </text>
            </g>
          </g>
        )}

        {/* 7. PANTS LENGTH (ความยาวกางเกง) */}
        {m.pantsLength && (
          <g>
            <line x1={isFemale ? 138 : 137} y1="214" x2={isFemale ? 136 : 136} y2="358" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,2" />
            <circle cx={isFemale ? 138 : 137} cy="214" r="3" fill="#3b82f6" />
            <circle cx={isFemale ? 136 : 136} cy="358" r="3" fill="#3b82f6" />
            <g transform="translate(150, 280)" filter="url(#badgeShadow)">
              <rect width="74" height="20" rx="5" fill="#3b82f6" />
              <text x="37" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ขายาว: {m.pantsLength}
              </text>
            </g>
          </g>
        )}

        {/* 8. THIGH (รอบต้นขา) */}
        {m.thigh && (
          <g>
            <line x1="104" y1="250" x2="118" y2="250" stroke="#14b8a6" strokeWidth="2" strokeDasharray="3,2" />
            <g transform="translate(6, 240)" filter="url(#badgeShadow)">
              <rect width="66" height="20" rx="5" fill="#14b8a6" />
              <text x="33" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ต้นขา: {m.thigh}
              </text>
            </g>
          </g>
        )}

        {/* 9. LEG OPENING (ปลายขา) */}
        {m.legOpening && (
          <g>
            <line x1="99" y1="360" x2="110" y2="360" stroke="#6366f1" strokeWidth="2" strokeDasharray="3,2" />
            <g transform="translate(6, 335)" filter="url(#badgeShadow)">
              <rect width="68" height="20" rx="5" fill="#6366f1" />
              <text x="34" y="14" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ปลายขา: {m.legOpening}
              </text>
            </g>
          </g>
        )}

        {/* Silhouette Caption */}
        <text
          x="120"
          y="375"
          fill={isPrintMode ? "#64748b" : "#94a3b8"}
          fontSize="9.5"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="sans-serif"
          letterSpacing="0.5"
        >
          ${isFemale ? 'FEMALE SILHOUETTE (หุ่นสตรี)' : 'MALE SILHOUETTE (หุ่นบุรุษ)'}
        </text>
      </svg>
    </div>
  );
};
