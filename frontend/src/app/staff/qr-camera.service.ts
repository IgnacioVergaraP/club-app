import { Injectable, InjectionToken, inject } from '@angular/core';

export interface QrDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
  dispose?(): void;
}
export interface QrDetectorConstructor {
  new(options: { formats: string[] }): QrDetector;
  getSupportedFormats(): Promise<string[]>;
}
export interface CameraPlatform {
  secure(): boolean;
  detector(): QrDetectorConstructor | undefined;
  getStream: ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | undefined;
}
export const QR_CAMERA_PLATFORM = new InjectionToken<CameraPlatform>('QR camera platform', {
  providedIn: 'root', factory: () => ({
    secure: () => window.isSecureContext,
    detector: () => (window as unknown as { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector,
    getStream: navigator.mediaDevices?.getUserMedia ? c => navigator.mediaDevices.getUserMedia(c) : undefined
  })
});
export const QR_SOFTWARE_READER = new InjectionToken<() => Promise<QrDetector>>('Local QR reader', {
  providedIn: 'root', factory: () => () => import('./qr-software-detector').then(m => new m.SoftwareQrDetector())
});
export type CameraState = 'off' | 'starting' | 'active' | 'denied' | 'insecure' | 'unavailable' | 'error';
export const CAMERA_MESSAGES: Record<CameraState, string> = {
  off: 'Cámara desactivada', starting: 'Preparando cámara…', active: 'Cámara activa · buscando QR',
  denied: 'Permiso de cámara denegado. Revisa el permiso de cámara de esta app o sitio y vuelve a intentarlo. También puedes introducir un código manual.',
  insecure: 'Para activar la cámara, abre la aplicación mediante HTTPS. También puedes introducir un código manual.',
  unavailable: 'Cámara no disponible o en uso. Usa la entrada manual.',
  error: 'No se pudo iniciar o leer la cámara. Desactívala y vuelve a intentar, o usa un código manual.'
};

@Injectable()
export class QrCameraService {
  private readonly platform = inject(QR_CAMERA_PLATFORM);
  private readonly softwareReader = inject(QR_SOFTWARE_READER);
  state: CameraState = 'off';
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private reader: QrDetector | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  get message(): string { return CAMERA_MESSAGES[this.state]; }

  async start(video: HTMLVideoElement, onCode: (code: string) => void): Promise<void> {
    this.stop();
    const token = this.generation;
    this.state = 'starting';
    try {
      if (!this.platform.secure()) { this.state = 'insecure'; return; }
      if (!this.platform.getStream) { this.state = 'unavailable'; return; }
      // Request from the user's tap, before any decoder import or format probe.
      const stream = await this.platform.getStream({ audio: false, video: {
        facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }
      } });
      if (token !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      this.video = video;
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (token === this.generation) { this.stop(); this.state = 'unavailable'; }
      }, { once: true }));

      let reader: QrDetector | undefined;
      try {
        const Constructor = this.platform.detector();
        if (Constructor && (await Constructor.getSupportedFormats()).includes('qr_code') && token === this.generation) {
          reader = new Constructor({ formats: ['qr_code'] });
        }
      } catch { /* A broken native implementation can use the local decoder. */ }
      if (token !== this.generation) { reader?.dispose?.(); return; }
      let native = !!reader;
      reader ??= await this.softwareReader();
      if (token !== this.generation) { reader.dispose?.(); return; }
      this.reader = reader;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      if (token !== this.generation) return;
      this.state = 'active';

      const scan = async (): Promise<void> => {
        if (token !== this.generation) return;
        try {
          if (video.readyState >= 2) {
            const codes = await reader!.detect(video);
            if (token !== this.generation) return;
            if (codes.length) { this.stop(); onCode(codes[0].rawValue); return; }
          }
        } catch {
          if (token !== this.generation) return;
          if (!native) { this.stop(); this.state = 'error'; return; }
          native = false;
          try {
            const fallback = await this.softwareReader();
            if (token !== this.generation) { fallback.dispose?.(); return; }
            reader?.dispose?.();
            reader = this.reader = fallback;
          } catch {
            if (token === this.generation) { this.stop(); this.state = 'error'; }
            return;
          }
        }
        if (token === this.generation) this.timer = setTimeout(() => void scan(), 300);
      };
      void scan();
    } catch (e) {
      if (token !== this.generation) return;
      this.stop();
      const name = (e as { name?: string })?.name;
      this.state = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
        : ['NotFoundError', 'NotReadableError', 'OverconstrainedError'].includes(name || '') ? 'unavailable' : 'error';
    }
  }

  stop(): void {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const stream = this.stream;
    this.stream = null;
    if (this.video) { this.video.pause(); this.video.srcObject = null; this.video = null; }
    this.reader?.dispose?.();
    this.reader = null;
    stream?.getTracks().forEach(t => t.stop());
    this.state = 'off';
  }
  ngOnDestroy(): void { this.stop(); }
}
