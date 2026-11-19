import { SoftwareQrDetector } from './qr-software-detector';

/** Canvas stands in for a video frame; the actual library decodes the actual Wallet assets. */
describe('Local QR image decoding', () => {
  async function frame(asset?: string, size = 370): Promise<HTMLVideoElement> {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    if (asset) {
      const image = new Image();
      image.src = 'assets/qr-demo/' + asset;
      await image.decode();
      context.drawImage(image, 0, 0, size, size);
    }
    return Object.assign(canvas, { videoWidth: size, videoHeight: size }) as unknown as HTMLVideoElement;
  }

  for (const [asset, code] of [['drink-001.svg', 'VOID:DEMO:CON:001'], ['ticket-001.svg', 'VOID:DEMO:ENT:001']]) {
    it('decodes ' + asset + ' including its central logo', async () => {
      const reader = new SoftwareQrDetector();
      try { expect(await reader.detect(await frame(asset))).toEqual([{ rawValue: code }]); }
      finally { reader.dispose(); }
    });
  }
  it('bounds large frames and still decodes them', async () => {
    const reader = new SoftwareQrDetector();
    try { expect(await reader.detect(await frame('drink-001.svg', 1920))).toEqual([{ rawValue: 'VOID:DEMO:CON:001' }]); }
    finally { reader.dispose(); }
  });
  it('does not fabricate a code for blank or not-yet-ready frames', async () => {
    const reader = new SoftwareQrDetector();
    try {
      expect(await reader.detect(await frame())).toEqual([]);
      expect(await reader.detect({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toEqual([]);
    } finally { reader.dispose(); }
  });
});
