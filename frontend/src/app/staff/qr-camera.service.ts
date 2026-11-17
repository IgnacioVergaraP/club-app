import { Injectable, InjectionToken, inject } from '@angular/core';
export interface QrDetector {detect(source:HTMLVideoElement):Promise<{rawValue:string}[]>;}
export interface QrDetectorConstructor {new(options:{formats:string[]}):QrDetector;getSupportedFormats():Promise<string[]>;}
export interface CameraPlatform {secure():boolean;detector():QrDetectorConstructor|undefined;getStream:((constraints:MediaStreamConstraints)=>Promise<MediaStream>)|undefined;}
export const QR_CAMERA_PLATFORM=new InjectionToken<CameraPlatform>('QR camera platform',{providedIn:'root',factory:()=>({secure:()=>window.isSecureContext,detector:()=>(window as unknown as {BarcodeDetector?:QrDetectorConstructor}).BarcodeDetector,getStream:navigator.mediaDevices?.getUserMedia?c=>navigator.mediaDevices.getUserMedia(c):undefined})});
export type CameraState='off'|'starting'|'active'|'denied'|'unavailable'|'unsupported'|'error';
export const CAMERA_MESSAGES:Record<CameraState,string>={off:'Cámara desactivada',starting:'Preparando cámara…',active:'Cámara activa · buscando QR',denied:'Permiso de cámara denegado. Puedes introducir un código manual.',unavailable:'Cámara no disponible o en uso. Usa la entrada manual.',unsupported:'Este navegador no ofrece lector QR nativo compatible. Usa la entrada manual DEMO.',error:'No se pudo leer la cámara. Desactívala y vuelve a intentar, o usa un código manual.'};
@Injectable()
export class QrCameraService {
 private readonly platform=inject(QR_CAMERA_PLATFORM);state:CameraState='off';
 private stream:MediaStream|null=null;private video:HTMLVideoElement|null=null;private timer:ReturnType<typeof setTimeout>|undefined;private generation=0;
 get message(){return CAMERA_MESSAGES[this.state];}
 async start(video:HTMLVideoElement,onCode:(code:string)=>void){
  this.stop();const token=this.generation;this.state='starting';
  try{
   if(!this.platform.secure()||!this.platform.getStream){this.state='unavailable';return;}
   const Constructor=this.platform.detector();if(!Constructor){this.state='unsupported';return;}
   const formats=await Constructor.getSupportedFormats();if(token!==this.generation)return;
   if(!formats.includes('qr_code')){this.state='unsupported';return;}
   const detector=new Constructor({formats:['qr_code']});
   const stream=await this.platform.getStream({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video=video;video.srcObject=stream;
   stream.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(token===this.generation){this.stop();this.state='unavailable';}},{once:true}));
   await video.play();if(token!==this.generation)return;this.state='active';
   const scan=async()=>{
    if(token!==this.generation)return;
    try{if(video.readyState>=2){const codes=await detector.detect(video);if(token!==this.generation)return;if(codes.length){this.stop();onCode(codes[0].rawValue);return;}}}
    catch{if(token===this.generation){this.stop();this.state='error';}return;}
    if(token===this.generation)this.timer=setTimeout(()=>void scan(),300);
   };void scan();
  }catch(e){if(token!==this.generation)return;this.stop();const name=(e as {name?:string})?.name;this.state=name==='NotAllowedError'||name==='SecurityError'?'denied':['NotFoundError','NotReadableError','OverconstrainedError'].includes(name||'')?'unavailable':'error';}
 }
 stop(){this.generation++;if(this.timer)clearTimeout(this.timer);this.timer=undefined;const stream=this.stream;this.stream=null;if(this.video){this.video.pause();this.video.srcObject=null;this.video=null;}stream?.getTracks().forEach(t=>t.stop());this.state='off';}
 ngOnDestroy(){this.stop();}
}
