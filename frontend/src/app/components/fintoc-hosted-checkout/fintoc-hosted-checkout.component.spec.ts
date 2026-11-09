import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocRedirectService } from '../../services/payments/fintoc-redirect.service';
import { Order } from '../../services/orders/orders.service';
import { FintocHostedCheckoutComponent } from './fintoc-hosted-checkout.component';

describe('FintocHostedCheckoutComponent',()=>{
  let fixture:ComponentFixture<FintocHostedCheckoutComponent>;
  let payments:jasmine.SpyObj<FintocPaymentsService>;
  let redirect:jasmine.SpyObj<FintocRedirectService>;
  beforeEach(async()=>{
    payments=jasmine.createSpyObj('payments',['createHostedSession']);redirect=jasmine.createSpyObj('redirect',['open']);
    await TestBed.configureTestingModule({imports:[CommonModule],declarations:[FintocHostedCheckoutComponent],providers:[
      {provide:FintocPaymentsService,useValue:payments},{provide:FintocRedirectService,useValue:redirect}]}).compileComponents();
    fixture=TestBed.createComponent(FintocHostedCheckoutComponent);
    fixture.componentInstance.order={order_id:'4cc803f9-f77b-4073-a5dd-6df96b92cb36',status:'pending_payment',currency:'CLP',total_clp:6000,expires_at:new Date(Date.now()+900000).toISOString()} as Order;
    fixture.detectChanges();
  });
  afterEach(()=>fixture.destroy());
  it('envía el ID, bloquea doble clic y redirige solo tras respuesta test',()=>{
    const source=new Subject<{redirect_url:string;mode:'test'}>();payments.createHostedSession.and.returnValue(source);
    fixture.componentInstance.pay();fixture.componentInstance.pay();fixture.detectChanges();
    expect(payments.createHostedSession).toHaveBeenCalledOnceWith(fixture.componentInstance.order.order_id);
    expect(fixture.nativeElement.querySelector('button').disabled).toBeTrue();
    source.next({redirect_url:'https://pay.fintoc.com/checkout/cs_test',mode:'test'});source.complete();
    expect(redirect.open).toHaveBeenCalledOnceWith('https://pay.fintoc.com/checkout/cs_test');
  });
  it('rechaza cotización vencida y bloqueos de otro método de pago',()=>{
    fixture.componentInstance.disabled=true;fixture.componentInstance.pay();expect(payments.createHostedSession).not.toHaveBeenCalled();
    fixture.componentInstance.disabled=false;fixture.componentInstance.order.expires_at='2000-01-01T00:00:00Z';fixture.componentInstance.pay();
    expect(payments.createHostedSession).not.toHaveBeenCalled();expect(fixture.componentInstance.error).toContain('no admite');
  });
  it('permite reintentar la misma solicitud tras error sin confirmar pagos',()=>{
    payments.createHostedSession.and.returnValue(throwError(()=>new Error('offline')));fixture.componentInstance.pay();
    expect(fixture.componentInstance.busy).toBeFalse();expect(redirect.open).not.toHaveBeenCalled();
    payments.createHostedSession.and.returnValue(of({redirect_url:'https://pay.fintoc.com/checkout/cs_test',mode:'test'}));fixture.componentInstance.pay();
    expect(payments.createHostedSession.calls.count()).toBe(2);expect(redirect.open).toHaveBeenCalled();
  });
  it('cancela la solicitud al salir y rechaza destinos inválidos',()=>{
    payments.createHostedSession.and.returnValue(of({redirect_url:'bad',mode:'test'}));redirect.open.and.throwError('invalid');fixture.componentInstance.pay();
    expect(fixture.componentInstance.error).toContain('válida');
    const source=new Subject<{redirect_url:string;mode:'test'}>();payments.createHostedSession.and.returnValue(source);fixture.componentInstance.pay();fixture.destroy();
    redirect.open.calls.reset();source.next({redirect_url:'https://pay.fintoc.com/checkout/cs_test',mode:'test'});expect(redirect.open).not.toHaveBeenCalled();
  });
});
