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
        viewBox="0 0 340 440"
        className="w-full h-full max-h-[380px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isPrintMode ? "#f8fafc" : "#1e293b"} />
            <stop offset="100%" stopColor={isPrintMode ? "#f1f5f9" : "#0f172a"} />
          </linearGradient>
          <filter id="badgeShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {isFemale ? (
          /* ================= FEMALE BODY VECTOR ================= */
          <g>
            {/* Hair */}
            <path
              d="M 170 32 C 150 32 138 48 136 68 C 134 85 142 105 144 112 C 148 100 152 75 160 70 C 168 66 178 66 186 70 C 194 75 198 100 202 112 C 204 105 212 85 210 68 C 208 48 196 32 176 32 Z"
              fill={isPrintMode ? "#334155" : "#475569"}
            />
            {/* Head & Neck */}
            <ellipse cx="173" cy="68" rx="19" ry="24" fill={isPrintMode ? "#ffffff" : "#1e293b"} stroke={isPrintMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2.5" />
            <path d="M 166 90 L 166 104 M 180 90 L 180 104" stroke={isPrintMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2.5" />

            {/* Torso & Arms */}
            <path
              d="M 166 104 C 152 108 140 114 135 125 C 130 135 125 170 120 210 C 117 230 114 245 112 255 C 110 262 114 265 118 262 C 122 255 127 235 130 215 C 133 190 136 175 138 165 C 140 178 144 195 152 208 C 158 218 160 230 156 242 C 152 254 148 262 148 262 L 198 262 C 198 262 194 254 190 242 C 186 230 188 218 194 208 C 202 195 206 178 208 165 C 210 175 213 190 216 215 C 219 235 224 255 228 262 C 232 265 236 262 234 255 C 232 245 229 230 226 210 C 221 170 216 135 211 125 C 206 114 194 108 180 104 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
              stroke={isPrintMode ? "#0f172a" : "#cbd5e1"}
              strokeWidth="2.5"
            />

            {/* Bikini Top (Stylized reference markers) */}
            <path d="M 152 135 Q 162 125 173 138 Q 184 125 194 135 Q 186 160 173 154 Q 160 160 152 135 Z" fill={isPrintMode ? "#e2e8f0" : "#334155"} stroke={isPrintMode ? "#0f172a" : "#94a3b8"} strokeWidth="1.5" />
            {/* Panties */}
            <path d="M 148 245 Q 173 252 198 245 L 192 270 Q 173 274 154 270 Z" fill={isPrintMode ? "#e2e8f0" : "#334155"} stroke={isPrintMode ? "#0f172a" : "#94a3b8"} strokeWidth="1.5" />

            {/* Legs */}
            <path
              d="M 154 270 C 154 290 152 320 152 345 C 152 370 154 395 153 415 L 148 420 L 160 420 C 163 410 166 385 167 360 C 168 335 170 305 172 280 C 174 305 176 335 177 360 C 178 385 181 410 184 420 L 196 420 L 191 415 C 190 395 192 370 192 345 C 192 320 190 290 190 270 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
              stroke={isPrintMode ? "#0f172a" : "#cbd5e1"}
              strokeWidth="2.5"
            />
          </g>
        ) : (
          /* ================= MALE BODY VECTOR ================= */
          <g>
            {/* Short hair with quiff */}
            <path
              d="M 170 28 C 152 28 142 38 140 54 C 142 56 148 54 154 50 C 162 46 176 42 188 46 C 194 48 200 52 204 56 C 204 44 196 28 170 28 Z"
              fill={isPrintMode ? "#334155" : "#475569"}
            />
            {/* Head & Neck */}
            <ellipse cx="172" cy="65" rx="20" ry="24" fill={isPrintMode ? "#ffffff" : "#1e293b"} stroke={isPrintMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2.5" />
            <path d="M 163 88 L 163 105 M 181 88 L 181 105" stroke={isPrintMode ? "#0f172a" : "#cbd5e1"} strokeWidth="2.5" />

            {/* Torso & Muscular Shoulders / Arms */}
            <path
              d="M 163 105 C 145 108 126 116 118 128 C 112 138 108 175 104 210 C 101 230 98 245 96 255 C 94 262 98 265 102 262 C 106 255 111 235 115 215 C 119 190 122 175 125 165 C 128 180 134 205 142 220 C 146 228 148 238 145 250 L 145 260 L 199 260 L 199 250 C 196 238 198 228 202 220 C 210 205 216 180 219 165 C 222 175 225 190 229 215 C 233 235 238 255 242 262 C 246 265 250 262 248 255 C 246 245 243 230 240 210 C 236 175 232 138 226 128 C 218 116 199 108 181 105 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
              stroke={isPrintMode ? "#0f172a" : "#cbd5e1"}
              strokeWidth="2.5"
            />

            {/* Chest & Abdominals outline */}
            <path d="M 152 142 Q 172 150 192 142" stroke={isPrintMode ? "#94a3b8" : "#475569"} strokeWidth="1.5" fill="none" />
            <path d="M 172 148 L 172 215 M 160 175 L 184 175 M 160 195 L 184 195" stroke={isPrintMode ? "#cbd5e1" : "#334155"} strokeWidth="1.5" />

            {/* Boxer shorts */}
            <path d="M 145 250 L 199 250 L 199 285 L 175 285 L 172 268 L 169 285 L 145 285 Z" fill={isPrintMode ? "#e2e8f0" : "#334155"} stroke={isPrintMode ? "#0f172a" : "#94a3b8"} strokeWidth="1.5" />

            {/* Legs */}
            <path
              d="M 147 285 C 147 310 146 340 146 365 C 146 385 148 405 147 418 L 140 422 L 156 422 C 160 412 163 388 164 365 C 165 340 167 315 169 285 L 175 285 C 177 315 179 340 180 365 C 181 388 184 412 188 422 L 204 422 L 197 418 C 196 405 198 385 198 365 C 198 340 197 310 197 285 Z"
              fill={isPrintMode ? "#ffffff" : "#1e293b"}
              stroke={isPrintMode ? "#0f172a" : "#cbd5e1"}
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* ================= MEASUREMENT GUIDE LINES & BADGES ================= */}

        {/* 1. SHOULDER WIDTH (ไหล่กว้าง) */}
        {m.shoulder && (
          <g>
            <line x1={isFemale ? 134 : 118} y1="116" x2={isFemale ? 212 : 226} y2="116" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx={isFemale ? 134 : 118} cy="116" r="3.5" fill="#f59e0b" />
            <circle cx={isFemale ? 212 : 226} cy="116" r="3.5" fill="#f59e0b" />
            {/* Callout Badge */}
            <g transform={`translate(${isFemale ? 222 : 236}, 105)`} filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#f59e0b" />
              <text x="42" y="15" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ไหล่: {m.shoulder}
              </text>
            </g>
          </g>
        )}

        {/* 2. CHEST / BUST (รอบอก) */}
        {m.chest && (
          <g>
            <line x1={isFemale ? 140 : 126} y1="145" x2={isFemale ? 206 : 218} y2="145" stroke="#ec4899" strokeWidth="2.5" strokeDasharray="3,3" />
            <circle cx={isFemale ? 140 : 126} cy="145" r="4" fill="#ec4899" />
            <circle cx={isFemale ? 206 : 218} cy="145" r="4" fill="#ec4899" />
            {/* Callout Badge */}
            <g transform={`translate(${isFemale ? 216 : 228}, 134)`} filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#ec4899" />
              <text x="42" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                อก: {m.chest}
              </text>
            </g>
          </g>
        )}

        {/* 3. WAIST (รอบเอว) */}
        {(m.waist || m.waistPants) && (
          <g>
            <line x1={isFemale ? 148 : 138} y1="205" x2={isFemale ? 198 : 206} y2="205" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3,3" />
            <circle cx={isFemale ? 148 : 138} cy="205" r="4" fill="#10b981" />
            <circle cx={isFemale ? 198 : 206} cy="205" r="4" fill="#10b981" />
            {/* Callout Badge */}
            <g transform={`translate(${isFemale ? 208 : 216}, 194)`} filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#10b981" />
              <text x="42" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                เอว: {m.waist || m.waistPants}
              </text>
            </g>
          </g>
        )}

        {/* 4. HIPS (รอบสะโพก) */}
        {(m.hips || m.hipsPants) && (
          <g>
            <line x1={isFemale ? 146 : 142} y1="248" x2={isFemale ? 200 : 202} y2="248" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx={isFemale ? 146 : 142} cy="248" r="3.5" fill="#8b5cf6" />
            <circle cx={isFemale ? 200 : 202} cy="248" r="3.5" fill="#8b5cf6" />
            {/* Callout Badge */}
            <g transform={`translate(${isFemale ? 210 : 212}, 237)`} filter="url(#badgeShadow)">
              <rect width="86" height="22" rx="6" fill="#8b5cf6" />
              <text x="43" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                สะโพก: {m.hips || m.hipsPants}
              </text>
            </g>
          </g>
        )}

        {/* 5. ARM LENGTH (ความยาวแขน) */}
        {m.armLength && (
          <g>
            <line x1={isFemale ? 122 : 106} y1="126" x2={isFemale ? 112 : 96} y2="255" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx={isFemale ? 122 : 106} cy="126" r="3.5" fill="#0ea5e9" />
            <circle cx={isFemale ? 112 : 96} cy="255" r="3.5" fill="#0ea5e9" />
            {/* Callout Badge on Left Side */}
            <g transform={`translate(${isFemale ? 22 : 6}, 180)`} filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#0ea5e9" />
              <text x="42" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                แขนยาว: {m.armLength}
              </text>
            </g>
          </g>
        )}

        {/* 6. SHIRT LENGTH (ความยาวเสื้อ) */}
        {m.shirtLength && !isPants && (
          <g>
            <line x1="172" y1="105" x2="172" y2="245" stroke="#f97316" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx="172" cy="105" r="3.5" fill="#f97316" />
            <circle cx="172" cy="245" r="3.5" fill="#f97316" />
            {/* Callout Badge */}
            <g transform="translate(18, 140)" filter="url(#badgeShadow)">
              <rect width="88" height="22" rx="6" fill="#f97316" />
              <text x="44" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                เสื้อยาว: {m.shirtLength}
              </text>
            </g>
          </g>
        )}

        {/* 7. PANTS LENGTH (ความยาวกางเกง) */}
        {m.pantsLength && (
          <g>
            <line x1={isFemale ? 196 : 202} y1="245" x2={isFemale ? 190 : 197} y2="415" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,3" />
            <circle cx={isFemale ? 196 : 202} cy="245" r="3.5" fill="#3b82f6" />
            <circle cx={isFemale ? 190 : 197} cy="415" r="3.5" fill="#3b82f6" />
            {/* Callout Badge on Right Lower Leg */}
            <g transform="translate(208, 330)" filter="url(#badgeShadow)">
              <rect width="90" height="22" rx="6" fill="#3b82f6" />
              <text x="45" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ขายาว: {m.pantsLength}
              </text>
            </g>
          </g>
        )}

        {/* 8. THIGH (รอบต้นขา) */}
        {m.thigh && (
          <g>
            <line x1="154" y1="295" x2="172" y2="295" stroke="#14b8a6" strokeWidth="2" strokeDasharray="3,3" />
            <g transform="translate(40, 285)" filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#14b8a6" />
              <text x="42" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ต้นขา: {m.thigh}
              </text>
            </g>
          </g>
        )}

        {/* 9. LEG OPENING (ปลายขา) */}
        {m.legOpening && (
          <g>
            <line x1="148" y1="415" x2="162" y2="415" stroke="#6366f1" strokeWidth="2" strokeDasharray="3,3" />
            <g transform="translate(36, 400)" filter="url(#badgeShadow)">
              <rect width="84" height="22" rx="6" fill="#6366f1" />
              <text x="42" y="15" fill="#ffffff" fontSize="10.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                ปลายขา: {m.legOpening}
              </text>
            </g>
          </g>
        )}

        {/* Tag Label at bottom */}
        <text
          x="172"
          y="435"
          fill={isPrintMode ? "#64748b" : "#94a3b8"}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          fontFamily="sans-serif"
          letterSpacing="1"
        >
          {isFemale ? 'FEMALE SILHOUETTE (หุ่นสตรี)' : 'MALE SILHOUETTE (หุ่นบุรุษ)'}
        </text>
      </svg>
    </div>
  );
};
