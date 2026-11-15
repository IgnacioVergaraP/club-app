import { EVENT_IMAGES } from './admin-event.model';
import { isAdminImageReference } from '../admin-image';
export { ADMIN_IMAGE_MAX_BYTES as EVENT_IMAGE_MAX_BYTES, readAdminImage as readEventImage } from '../admin-image';

/** Compatibilidad de 4.2: mismos recursos locales y validación raster compartida. */
export function isEventImageReference(value: string): boolean {
  return isAdminImageReference(value, EVENT_IMAGES.map(image=>image.value));
}
