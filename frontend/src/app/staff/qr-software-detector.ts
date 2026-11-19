import jsQR from 'jsqr';
import type { QrDetector } from './qr-camera.service';

/** Local pixels only: no uploads, remote decoder or image persistence. */
export class SoftwareQrDetector implements QrDetector {
  private readonly canvas = document.createElement('canvas');
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true });

  async detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]> {
    if (!this.context) throw new Error('Canvas no disponible');
    if (!video.videoWidth || !video.videoHeight) return [];
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.drawImage(video, 0, 0, width, height);
    const pixels = this.context.getImageData(0, 0, width, height);
    const code = jsQR(pixels.data, width, height, { inversionAttempts: 'attemptBoth' });
    return code ? [{ rawValue: code.data }] : [];
  }

  dispose(): void { this.canvas.width = this.canvas.height = 0; }
}
