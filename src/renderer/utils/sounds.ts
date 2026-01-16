// Sound feedback utilities
class SoundManager {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  playStart(): void {
    // Upward tone for start
    this.playTone(440, 0.1, 'sine');
    setTimeout(() => this.playTone(523, 0.1, 'sine'), 50);
  }

  playStop(): void {
    // Downward tone for stop
    this.playTone(523, 0.1, 'sine');
    setTimeout(() => this.playTone(440, 0.1, 'sine'), 50);
  }

  playError(): void {
    // Low error tone
    this.playTone(220, 0.2, 'square');
  }

  playSuccess(): void {
    // Success chime
    this.playTone(523, 0.1, 'sine');
    setTimeout(() => this.playTone(659, 0.1, 'sine'), 80);
    setTimeout(() => this.playTone(784, 0.15, 'sine'), 160);
  }

  playNotification(): void {
    // Subtle notification
    this.playTone(800, 0.15, 'sine');
  }
}

export const soundManager = new SoundManager();
