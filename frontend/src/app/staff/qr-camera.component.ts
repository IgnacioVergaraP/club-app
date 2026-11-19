import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild, inject } from '@angular/core';
import { QrCameraService } from './qr-camera.service';
@Component({selector:'app-staff-qr-camera',standalone:false,providers:[QrCameraService],template:`<section class="camera" aria-label="Escáner QR"><div class="viewport"><video #video autoplay muted playsinline aria-label="Vista de cámara para leer QR"></video><div class="frame" aria-hidden="true"></div><p *ngIf="camera.state!=='active'">QR<span>Coloca el QR dentro del recuadro</span></p></div><p class="instruction">Coloca el QR dentro del recuadro</p><p class="state" role="status" aria-live="polite">{{camera.message}}</p><button type="button" (click)="toggle()" [attr.aria-pressed]="camera.state==='active' || camera.state==='starting'">{{camera.state==='active'||camera.state==='starting'?'Desactivar cámara':'Activar cámara'}}</button><small>El permiso se solicita al activar. No guardamos imágenes.</small></section>`,styleUrls:['./qr-camera.component.scss']})
export class QrCameraComponent {
 readonly camera=inject(QrCameraService);@ViewChild('video',{static:true}) video!:ElementRef<HTMLVideoElement>;@Output() code=new EventEmitter<string>();
 toggle(){if(this.camera.state==='active'||this.camera.state==='starting')this.camera.stop();else void this.camera.start(this.video.nativeElement,value=>this.code.emit(value));}
 @HostListener('document:visibilitychange') visibility(){if(document.hidden)this.camera.stop();}
 @HostListener('window:pagehide') pagehide(){this.camera.stop();}
 ngOnDestroy(){this.camera.stop();}
}
