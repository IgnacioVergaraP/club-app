import { firstValueFrom } from 'rxjs';
import { readEventImage, isEventImageReference, EVENT_IMAGE_MAX_BYTES } from './admin-event-image';
import { AdminEventsService } from './admin-events.service';
import { ADMIN_DEMO_EVENTS } from './admin-events.data';
const base64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOY6XL3PwAF7gK6caozUAAAAABJRU5ErkJggg==';
const bytes=()=>Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
describe('Local event image upload',()=>{
  it('reads and decodes a valid PNG for preview without uploading',async()=>{const result=await readEventImage(new File([bytes()],'evento.png',{type:'image/png'}));expect(result).toBe('data:image/png;base64,'+base64);expect(isEventImageReference(result)).toBeTrue();});
  it('rejects SVG, unsupported types and empty or oversized files',async()=>{
    await expectAsync(readEventImage(new File(['<svg/>'],'logo.svg',{type:'image/svg+xml'}))).toBeRejectedWithError(/JPG, PNG o WEBP/);
    await expectAsync(readEventImage(new File([],'empty.png',{type:'image/png'}))).toBeRejectedWithError(/5 MB/);
    await expectAsync(readEventImage(new File([new Uint8Array(EVENT_IMAGE_MAX_BYTES+1)],'large.png',{type:'image/png'}))).toBeRejectedWithError(/5 MB/);
  });
  it('rejects a spoofed MIME and corrupt image bytes',async()=>{
    await expectAsync(readEventImage(new File(['not an image'],'fake.png',{type:'image/png'}))).toBeRejected();
    await expectAsync(readEventImage(new File([bytes().slice(0,12)],'corrupt.png',{type:'image/png'}))).toBeRejected();
  });
  it('keeps an uploaded image through saves, edits and independent duplication',async()=>{
    const image=await readEventImage(new File([bytes()],'evento.png',{type:'image/png'}));
    const service=new AdminEventsService();const saved=service.save({...ADMIN_DEMO_EVENTS[0],image});const copy=service.duplicate(saved.id);
    expect(copy.image).toBe(image);expect((await firstValueFrom(service.events$)).find(event=>event.id===saved.id)?.image).toBe(image);
  });
  it('accepts the prior local assets but rejects external URLs and non-raster data',()=>{
    expect(isEventImageReference('assets/events/void-dj.jpg')).toBeTrue();expect(isEventImageReference('https://example.com/image.png')).toBeFalse();expect(isEventImageReference('data:image/svg+xml;base64,PHN2Zy8+')).toBeFalse();
  });
});
