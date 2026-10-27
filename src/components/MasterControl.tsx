import React from 'react';
import { GlassySlider } from './GlassySlider';
import { HeartOutlineIcon, VolumeSvgIcon } from './Icons';

interface MasterControlProps {
  isPlaying: boolean;
  masterVolume: number;
  onVolumeChange: (newVol: number) => void;
  onTogglePlay: () => void;
  onFavoriteClick: () => void;
}

export const MasterControl: React.FC<MasterControlProps> = ({
  isPlaying,
  masterVolume,
  onVolumeChange,
  onTogglePlay,
  onFavoriteClick,
}) => {
  return (
    <div className="hf-master-pill">
      <div className="hf-master-pill__vol-icon">
        <VolumeSvgIcon muted={masterVolume === 0} size={16} />
      </div>

      <div className="hf-master-pill__slider-col">
        <div className="hf-master-pill__pct">{Math.round(masterVolume * 100)}%</div>
        <GlassySlider
          value={masterVolume}
          onChange={onVolumeChange}
          trackHeight={4.6}
          thumbSize={11.5}
          thumbBorder={1.8}
        />
      </div>

      <button
        type="button"
        className="hf-master-pill__play-btn"
        onClick={onTogglePlay}
        aria-label="Toggle Play"
      >
        {isPlaying ? (
          <div className="hf-master-pill__pause-bars">
            <span />
            <span />
          </div>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#0D121F"
            style={{ marginLeft: '1px' }}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="hf-master-pill__fav-btn"
        onClick={onFavoriteClick}
        aria-label="Favorite Mixes"
      >
        <HeartOutlineIcon size={17} />
      </button>
    </div>
  );
};
