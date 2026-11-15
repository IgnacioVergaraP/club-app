export const ADMIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const types = ['image/jpeg', 'image/png', 'image/webp'];
function matchesImageHeader(bytes: Uint8Array, mime: string): boolean {
  if (mime==='image/jpeg') return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if (mime==='image/png') return [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
  return mime==='image/webp' && [82,73,70,70].every((value,index)=>bytes[index]===value) && [87,69,66,80].every((value,index)=>bytes[index+8]===value);
}
/** Solo recursos existentes o una imagen raster local en memoria; nunca URLs externas/SVG. */
export function isAdminImageReference(value: string, localImages: readonly string[] = []): boolean {
  if (localImages.includes(value)) return true;
  if (typeof value!=='string'||value.length>Math.ceil(ADMIN_IMAGE_MAX_BYTES/3)*4+32) return false;
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length%4!==0) return false;
  const size=match[2].length/4*3-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0);
  if(size>ADMIN_IMAGE_MAX_BYTES)return false;
  try {return matchesImageHeader(Uint8Array.from(atob(match[2].slice(0,16)),char=>char.charCodeAt(0)),match[1]);}catch{return false;}
}
export async function readAdminImage(file: File): Promise<string> {
  if (!types.includes(file.type)) throw new Error('Elige una imagen JPG, PNG o WEBP.');
  if (!file.size||file.size>ADMIN_IMAGE_MAX_BYTES) throw new Error('La imagen debe pesar entre 1 byte y 5 MB.');
  const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
  if(!matchesImageHeader(header,file.type))throw new Error('El archivo no corresponde a una imagen JPG, PNG o WEBP válida.');
  const url=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('No se pudo leer la imagen.'));
    reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.onabort=()=>reject(new Error('La lectura de la imagen se canceló.'));reader.readAsDataURL(file);
  });
  if(!isAdminImageReference(url))throw new Error('No se pudo preparar la imagen.');
  await new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth&&image.naturalHeight?resolve():reject(new Error('La imagen está dañada.'));image.onerror=()=>reject(new Error('La imagen está dañada o no puede abrirse.'));image.src=url;});
  return url;
}
