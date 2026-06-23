import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

type IconProps = { color: string; size?: number };

const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
});

export function HomeIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V21h14V9.5" />
      <Path d="M9 21v-6h6v6" />
    </Svg>
  );
}

export function BudgetIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 3a9 9 0 0 1 9 9h-9z" />
    </Svg>
  );
}

export function SpendingIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1={4} y1={20} x2={4} y2={11} />
      <Line x1={10} y1={20} x2={10} y2={4} />
      <Line x1={16} y1={20} x2={16} y2={14} />
      <Line x1={22} y1={20} x2={2} y2={20} />
    </Svg>
  );
}

export function NetWorthIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 16 9 10 13 14 21 6" />
      <Polyline points="15 6 21 6 21 12" />
    </Svg>
  );
}

export function SettingsIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.81 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 11 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 21 9h.09a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1z" />
    </Svg>
  );
}

export function ChevronRight({ color, size }: IconProps) {
  return (
    <Svg {...base(size ?? 20)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

export function CardIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      <Line x1={2} y1={10} x2={22} y2={10} />
    </Svg>
  );
}

export function InvestIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 17 9 11 13 15 21 7" />
      <Circle cx={21} cy={7} r={1} />
    </Svg>
  );
}

export function DebtIcon({ color, size }: IconProps) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 21V8l9-5 9 5v13" />
      <Path d="M3 21h18" />
      <Path d="M9 21v-6h6v6" />
    </Svg>
  );
}
