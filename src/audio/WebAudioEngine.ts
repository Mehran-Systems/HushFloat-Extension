import { findSoundById, SoundTrack } from '../data/soundLibrary';

const SYNTH_OUTPUT_GAIN = 1.6;
const ASSET_OUTPUT_GAIN = 1.6;

function fastTanh(x: number): number {
  if (x <= -3.0) return -1.0;
  if (x >= 3.0) return 1.0;
  const x2 = x * x;
  return (x * (27.0 + x2)) / (27.0 + 9.0 * x2);
}

interface SynthChannel {
  node: ScriptProcessorNode;
  targetVolume: number;
  currentVolume: number;
}

interface AssetChannel {
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
  audioEl?: HTMLAudioElement;
  loading?: boolean;
  stopped?: boolean;
}

export class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private softClipShaper: WaveShaperNode | null = null;
  private masterVolume = 0.85;
  private channelVolumes = new Map<string, number>();
  private synths = new Map<string, SynthChannel>();
  private assets = new Map<string, AssetChannel>();
  private bufferCache = new Map<string, AudioBuffer>();

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 44100 });
      this.softClipShaper = this.createSoftClipper(this.ctx);
      this.softClipShaper.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createSoftClipper(ctx: AudioContext): WaveShaperNode {
    const shaper = ctx.createWaveShaper();
    const samples = 4096;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = fastTanh(x * ASSET_OUTPUT_GAIN);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  private computeEffectiveVolume(channelVolume: number): number {
    return Math.min(1, Math.max(0, channelVolume * this.masterVolume));
  }

  public playSound(soundId: string, initialVolume = 0.85): void {
    const sound = findSoundById(soundId);
    if (!sound) return;

    this.channelVolumes.set(sound.id, initialVolume);
    const effectiveVol = this.computeEffectiveVolume(initialVolume);

    if (sound.assetFile) {
      this.playAsset(sound, effectiveVol);
    } else {
      this.startProcedural(sound, effectiveVol);
    }
  }

  private async playAsset(sound: SoundTrack, effectiveVol: number): Promise<void> {
    const ctx = this.ensureContext();
    const existing = this.assets.get(sound.id);
    if (existing && !existing.stopped) {
      existing.gainNode.gain.setTargetAtTime(effectiveVol, ctx.currentTime, 0.03);
      if (existing.audioEl && existing.audioEl.paused) {
        existing.audioEl.play().catch(() => {});
      }
      return;
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(effectiveVol, ctx.currentTime);
    gainNode.connect(this.softClipShaper || ctx.destination);

    const channel: AssetChannel = { gainNode, loading: true, stopped: false };
    this.assets.set(sound.id, channel);

    try {
      const runtimeUrl =
        typeof chrome !== 'undefined' && chrome.runtime?.getURL
          ? chrome.runtime.getURL(`audio/${sound.assetFile}`)
          : `/audio/${sound.assetFile}`;

      let audioBuffer = this.bufferCache.get(sound.assetFile!);
      if (!audioBuffer) {
        const res = await fetch(runtimeUrl);
        const arrayBuf = await res.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(sound.assetFile!, audioBuffer);
      }

      if (channel.stopped || !this.channelVolumes.has(sound.id)) {
        gainNode.disconnect();
        return;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(gainNode);
      source.start(0);
      channel.source = source;
      channel.loading = false;
    } catch (e) {
      console.warn(`Buffer decode fallback for ${sound.id}, using procedural synth:`, e);
      gainNode.disconnect();
      this.assets.delete(sound.id);
      if (!channel.stopped && this.channelVolumes.has(sound.id)) {
        this.startProcedural(sound, this.computeEffectiveVolume(this.channelVolumes.get(sound.id) ?? effectiveVol));
      }
    }
  }

  private startProcedural(sound: SoundTrack, effectiveVol: number): void {
    const existing = this.synths.get(sound.id);
    if (existing) {
      existing.targetVolume = effectiveVol;
      return;
    }

    const ctx = this.ensureContext();
    const isStereo = sound.id.startsWith('bw_');
    const node = ctx.createScriptProcessor(4096, 0, isStereo ? 2 : 1);
    const state: SynthChannel = {
      node,
      targetVolume: effectiveVol,
      currentVolume: 0,
    };

    const sampleRate = ctx.sampleRate || 44100;
    let lastOut = 0.0;
    let lastIn = 0.0;
    let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
    let phase = 0.0;
    let pulsePhase = 0.0;
    let phaseL = 0.0;
    let phaseR = 0.0;
    let burstEnv = 0.0;

    const beatFreq =
      sound.id === 'bw_delta' ? 2.0 : sound.id === 'bw_theta' ? 6.0 : sound.id === 'bw_alpha' ? 10.0 : 4.0;
    const baseFreq = 200.0;
    const phaseIncL = (2.0 * Math.PI * (baseFreq - beatFreq / 2.0)) / sampleRate;
    const phaseIncR = (2.0 * Math.PI * (baseFreq + beatFreq / 2.0)) / sampleRate;

    const carrierFreq =
      sound.id.includes('cricket') ? 4500.0 : sound.id === 'bio_birds' ? 2500.0 : 60.0;
    const pulseRate =
      sound.id.includes('cricket') ? 3.0 : sound.id === 'bio_birds' ? 8.0 : 1.2;

    node.onaudioprocess = (ev) => {
      const outL = ev.outputBuffer.getChannelData(0);
      const outR = isStereo ? ev.outputBuffer.getChannelData(1) : null;
      const len = outL.length;

      for (let i = 0; i < len; i++) {
        state.currentVolume += (state.targetVolume - state.currentVolume) * 0.001;
        const eff = state.currentVolume;
        if (eff <= 0.0005) {
          outL[i] = 0;
          if (outR) outR[i] = 0;
          continue;
        }

        if (isStereo && outR) {
          // BinauralGenerator (stereo L/R phase offset)
          outL[i] = fastTanh(Math.sin(phaseL) * eff * SYNTH_OUTPUT_GAIN);
          outR[i] = fastTanh(Math.sin(phaseR) * eff * SYNTH_OUTPUT_GAIN);
          phaseL += phaseIncL;
          if (phaseL > 2.0 * Math.PI) phaseL -= 2.0 * Math.PI;
          phaseR += phaseIncR;
          if (phaseR > 2.0 * Math.PI) phaseR -= 2.0 * Math.PI;
          continue;
        }

        const white = Math.random() * 2.0 - 1.0;
        let sample = 0.0;

        if (sound.id === 'cn_white') {
          sample = white;
        } else if (sound.id === 'cn_brown' || sound.id.includes('ocean') || sound.id.includes('train')) {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          sample = Math.max(-1.0, Math.min(1.0, lastOut * 3.5));
        } else if (sound.id === 'cn_blue' || sound.id === 'cn_violet') {
          sample = (white - lastIn) * 0.5;
          lastIn = white;
        } else if (sound.id.includes('heart') || sound.id.includes('cricket') || sound.id === 'bio_birds') {
          const carrier = Math.sin(phase);
          const pulse = (Math.sin(pulsePhase) + 1.0) * 0.5;
          sample = carrier * (pulse * pulse * pulse);
          phase += (2.0 * Math.PI * carrierFreq) / sampleRate;
          if (phase > 2.0 * Math.PI) phase -= 2.0 * Math.PI;
          pulsePhase += (2.0 * Math.PI * pulseRate) / sampleRate;
          if (pulsePhase > 2.0 * Math.PI) pulsePhase -= 2.0 * Math.PI;
        } else if (sound.id.includes('thunder')) {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          if (Math.random() > 0.99995) burstEnv = 1.0;
          burstEnv *= 0.9995;
          sample = Math.max(-1.0, Math.min(1.0, lastOut * (0.1 + burstEnv * 3.0)));
        } else if (sound.id.includes('fan') || sound.id.includes('cosmic')) {
          lastOut = lastOut + 0.1 * (white - lastOut);
          sample = lastOut * 2.0;
        } else {
          // Pink Noise (Paul Kellet 7-pole filter matching AudioEngine.kt)
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        outL[i] = fastTanh(sample * eff * SYNTH_OUTPUT_GAIN);
      }
    };

    node.connect(ctx.destination);
    this.synths.set(sound.id, state);
  }

  public stopSound(soundId: string): void {
    this.channelVolumes.delete(soundId);

    const synth = this.synths.get(soundId);
    if (synth) {
      synth.targetVolume = 0;
      try {
        synth.node.disconnect();
      } catch {}
      this.synths.delete(soundId);
    }

    const asset = this.assets.get(soundId);
    if (asset) {
      asset.stopped = true;
      try {
        asset.source?.stop();
        asset.source?.disconnect();
        asset.gainNode.disconnect();
      } catch {}
      this.assets.delete(soundId);
    }
  }

  public stopAllSounds(): void {
    const keys = Array.from(this.channelVolumes.keys());
    for (const k of keys) {
      this.stopSound(k);
    }
  }

  public setVolume(soundId: string, volume: number): void {
    if (volume <= 0) {
      this.stopSound(soundId);
      return;
    }
    this.channelVolumes.set(soundId, volume);
    const effVol = this.computeEffectiveVolume(volume);

    const synth = this.synths.get(soundId);
    if (synth) {
      synth.targetVolume = effVol;
    }

    const asset = this.assets.get(soundId);
    if (asset && this.ctx) {
      asset.gainNode.gain.setTargetAtTime(effVol, this.ctx.currentTime, 0.02);
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    for (const [id, chVol] of this.channelVolumes.entries()) {
      const effVol = this.computeEffectiveVolume(chVol);
      const synth = this.synths.get(id);
      if (synth) synth.targetVolume = effVol;
      const asset = this.assets.get(id);
      if (asset && this.ctx) {
        asset.gainNode.gain.setTargetAtTime(effVol, this.ctx.currentTime, 0.02);
      }
    }
  }

  public getActiveMix(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.channelVolumes.entries()) {
      if (v > 0) out[k] = v;
    }
    return out;
  }

  public isCurrentlyPlaying(): boolean {
    return this.channelVolumes.size > 0;
  }
}

export const globalAudioEngine = new WebAudioEngine();
