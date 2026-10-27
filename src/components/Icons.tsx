import React from 'react';
import iconVectorsRaw from '../data/iconVectors.json';

interface VectorPath {
  d: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
}

interface VectorDef {
  viewBox: string;
  paths: VectorPath[];
}

const iconVectors = iconVectorsRaw as Record<string, VectorDef>;

const soundIconMap: Record<string, string> = {
  graphic_eq: 'ic_activity',
  water_drop: 'ic_cloud_rain',
  waves: 'ic_waves',
  air: 'ic_wind',
  thunderstorm: 'ic_cloud_lightning',
  local_fire_department: 'ic_flame',
  droplet: 'ic_mountain',
  umbrella: 'ic_umbrella',
  bug_report: 'ic_bug',
  landscape: 'ic_mountain',
  flutter_dash: 'ic_bird',
  train: 'ic_train_front',
  cyclone: 'ic_fan',
  cosmic: 'ic_cosmic',
  cleaning_services: 'ic_brush',
  favorite: 'ic_heart',
  psychology: 'ic_brain',
  flight: 'ic_flight',
  coffee: 'ic_coffee',
  keyboard: 'ic_keyboard',
  child_care: 'ic_child_care',
  moon_stars: 'ic_moon_stars',
  theta: 'ic_theta',
  alpha: 'ic_alpha',
  delta: 'ic_delta',
};

export const HushVectorIcon: React.FC<{
  name: string;
  size?: number;
  tint?: string;
  className?: string;
}> = ({ name, size = 24, tint, className }) => {
  const resKey = soundIconMap[name] || name;
  const vec = iconVectors[resKey];
  if (!vec) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="8" fill={tint || '#FBE5C8'} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={vec.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {vec.paths.map((p, idx) => (
        <path
          key={idx}
          d={p.d}
          fill={tint && p.fill !== 'none' ? tint : p.fill}
          stroke={tint && p.stroke ? tint : p.stroke}
          strokeWidth={p.strokeWidth}
          strokeLinecap={p.strokeLinecap}
          strokeLinejoin={p.strokeLinejoin}
          fillRule={p.fillRule}
        />
      ))}
    </svg>
  );
};

export const CastSvgIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#E0E0E0',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
  </svg>
);

export const VolumeSvgIcon: React.FC<{ muted: boolean; size?: number; color?: string }> = ({
  muted,
  size = 20,
  color = '#FBE5C8',
}) =>
  muted ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );

export const HeartOutlineIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#FBE5C8',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
  </svg>
);
