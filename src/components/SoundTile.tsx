import React from 'react';
import { SoundTrack } from '../data/soundLibrary';
import { t } from '../data/i18n';
import { HushVectorIcon } from './Icons';
import { GlassySlider } from './GlassySlider';

interface SoundTileProps {
  sound: SoundTrack;
  volume: number;
  isPlaying: boolean;
  locale: string | null;
  onVolumeChange: (newVol: number) => void;
  onInteractionEnd: () => void;
  onClick: () => void;
}

export const SoundTile: React.FC<SoundTileProps> = ({
  sound,
  volume,
  isPlaying,
  locale,
  onVolumeChange,
  onInteractionEnd,
  onClick,
}) => {
  const titleText = t(sound.nameKey, locale).toUpperCase();
  const subtitleText = t(sound.subtitleKey, locale) || sound.defaultSubtitle;

  const fontSize =
    titleText.length >= 15 ? '7.0px' : titleText.length >= 13 ? '7.5px' : '8.2px';
  const letterSpacing = titleText.length >= 13 ? '0.08px' : '0.28px';

  return (
    <div
      className={`hf-sound-tile ${isPlaying ? 'hf-sound-tile--active' : ''}`}
      onClick={onClick}
    >
      <div className="hf-sound-tile__inner">
        <div className="hf-sound-tile__icon">
          <HushVectorIcon name={sound.iconName} size={31} />
        </div>
        <div
          className="hf-sound-tile__title"
          style={{ fontSize, letterSpacing }}
          title={titleText}
        >
          {titleText}
        </div>
        {isPlaying ? (
          <>
            <div className="hf-sound-tile__pct">{Math.round(volume * 100)}%</div>
            <div className="hf-sound-tile__slider-wrap">
              <GlassySlider
                value={volume}
                onChange={onVolumeChange}
                onChangeEnd={onInteractionEnd}
                trackHeight={3.2}
                thumbSize={9}
                thumbBorder={1.4}
              />
            </div>
          </>
        ) : (
          <div className="hf-sound-tile__subtitle">{subtitleText}</div>
        )}
      </div>
    </div>
  );
};
