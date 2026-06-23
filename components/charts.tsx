import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path,
  Line,
  Rect,
  Circle,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme, type } from '../theme/theme';
import { moneyCompact } from '../lib/format';

// ─── Line / area chart ──────────────────────────────────────────────────────────

export function LineChart({
  data,
  labels,
  width,
  height = 160,
  color,
  showAxis = true,
}: {
  data: number[];
  labels?: string[];
  width: number;
  height?: number;
  color?: string;
  showAxis?: boolean;
}) {
  const { palette } = useTheme();
  const stroke = color ?? palette.primary;
  if (data.length === 0) return null;

  const padL = showAxis ? 44 : 8;
  const padR = 10;
  const padT = 10;
  const padB = labels ? 22 : 10;
  const w = width;
  const h = height;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const x = (i: number) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / range) * innerH;

  const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${padT + innerH} L ${x(0).toFixed(1)} ${padT + innerH} Z`;

  const gridVals = [min, min + range / 2, max];

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {showAxis &&
        gridVals.map((gv, i) => (
          <G key={i}>
            <Line x1={padL} y1={y(gv)} x2={w - padR} y2={y(gv)} stroke={palette.border} strokeWidth={1} />
            <SvgText x={padL - 6} y={y(gv) + 4} fontSize={10} fill={palette.textMuted} textAnchor="end">
              {moneyCompact(gv)}
            </SvgText>
          </G>
        ))}

      <Path d={areaPath} fill="url(#areaFill)" />
      <Path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={4} fill={stroke} />

      {labels &&
        labels.map((lab, i) =>
          i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1 ? (
            <SvgText key={i} x={x(i)} y={h - 6} fontSize={10} fill={palette.textMuted} textAnchor="middle">
              {lab}
            </SvgText>
          ) : null
        )}
    </Svg>
  );
}

// ─── Bar chart ──────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  labels,
  width,
  height = 160,
  color,
}: {
  data: number[];
  labels: string[];
  width: number;
  height?: number;
  color?: string;
}) {
  const { palette } = useTheme();
  const fill = color ?? palette.primary;
  const padB = 22;
  const padT = 10;
  const innerH = height - padB - padT;
  const max = Math.max(...data, 1);
  const slot = width / data.length;
  const barW = Math.min(slot * 0.56, 34);

  return (
    <Svg width={width} height={height}>
      {data.map((v, i) => {
        const barH = (v / max) * innerH;
        const cx = i * slot + slot / 2;
        return (
          <G key={i}>
            <Rect
              x={cx - barW / 2}
              y={padT + innerH - barH}
              width={barW}
              height={Math.max(barH, 2)}
              rx={5}
              fill={fill}
              opacity={i === data.length - 1 ? 1 : 0.55}
            />
            <SvgText x={cx} y={height - 6} fontSize={10} fill={palette.textMuted} textAnchor="middle">
              {labels[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Donut chart ────────────────────────────────────────────────────────────────

export function DonutChart({
  segments,
  size = 150,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const { palette } = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          <Circle cx={cx} cy={cy} r={r} stroke={palette.surfaceAlt} strokeWidth={thickness} fill="none" />
          {segments.map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * circ;
            const el = (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center' }}>
        {centerValue ? (
          <Text style={{ color: palette.text, fontSize: type.heading, fontWeight: '700' }}>{centerValue}</Text>
        ) : null}
        {centerLabel ? (
          <Text style={{ color: palette.textMuted, fontSize: type.tiny }}>{centerLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}
