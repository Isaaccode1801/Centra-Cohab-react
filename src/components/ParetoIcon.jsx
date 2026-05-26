import React from 'react';

export const ParetoIcon = ({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 75"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Connected Axes (L-shape) */}
      <path d="M 8 4 L 8 68 L 96 68" />

      {/* Y-Axis Ticks (pointing left) */}
      <path d="M 8 8 L 5 8" />
      <path d="M 8 15 L 5 15" />
      <path d="M 8 22 L 5 22" />
      <path d="M 8 29 L 5 29" />
      <path d="M 8 36 L 5 36" />
      <path d="M 8 43 L 5 43" />
      <path d="M 8 50 L 5 50" />
      <path d="M 8 57 L 5 57" />
      <path d="M 8 64 L 5 64" />

      {/* X-Axis Ticks (pointing down) */}
      <path d="M 15 68 L 15 71" />
      <path d="M 26 68 L 26 71" />
      <path d="M 37 68 L 37 71" />
      <path d="M 48 68 L 48 71" />
      <path d="M 59 68 L 59 71" />
      <path d="M 70 68 L 70 71" />
      <path d="M 81 68 L 81 71" />
      <path d="M 92 68 L 92 71" />

      {/* Descending Bars (outlined, transparent) */}
      {/* Bar 1 */}
      <rect x="11.5" y="10" width="7" height="58" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 2 */}
      <rect x="22.5" y="24" width="7" height="44" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 3 */}
      <rect x="33.5" y="36" width="7" height="32" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 4 */}
      <rect x="44.5" y="46" width="7" height="22" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 5 */}
      <rect x="55.5" y="54" width="7" height="14" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 6 */}
      <rect x="66.5" y="60" width="7" height="8" rx="2" strokeWidth={strokeWidth} />
      {/* Bar 7 */}
      <rect x="77.5" y="63" width="7" height="5" rx="1.5" strokeWidth={strokeWidth} />
      {/* Bar 8 */}
      <rect x="88.5" y="65" width="7" height="3" rx="1" strokeWidth={strokeWidth} />

      {/* Cumulative Line */}
      <path
        d="M 15 50 L 26 38 L 37 28 L 48 20 L 59 14 L 70 10 L 81 7 L 92 6"
        strokeWidth={strokeWidth}
      />

      {/* Data Points (Square Markers) */}
      {/* Point 1 (15, 50) */}
      <rect x="12" y="47" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="14" y="49" width="2" height="2" fill={color} stroke="none" />

      {/* Point 2 (26, 38) */}
      <rect x="23" y="35" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="25" y="37" width="2" height="2" fill={color} stroke="none" />

      {/* Point 3 (37, 28) */}
      <rect x="34" y="25" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="36" y="27" width="2" height="2" fill={color} stroke="none" />

      {/* Point 4 (48, 20) */}
      <rect x="45" y="17" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="47" y="19" width="2" height="2" fill={color} stroke="none" />

      {/* Point 5 (59, 14) */}
      <rect x="56" y="11" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="58" y="13" width="2" height="2" fill={color} stroke="none" />

      {/* Point 6 (70, 10) */}
      <rect x="67" y="7" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="69" y="9" width="2" height="2" fill={color} stroke="none" />

      {/* Point 7 (81, 7) */}
      <rect x="78" y="4" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="80" y="6" width="2" height="2" fill={color} stroke="none" />

      {/* Point 8 (92, 6) */}
      <rect x="89" y="3" width="6" height="6" rx="1" strokeWidth={strokeWidth} fill="none" />
      <rect x="91" y="5" width="2" height="2" fill={color} stroke="none" />
    </svg>
  );
};
