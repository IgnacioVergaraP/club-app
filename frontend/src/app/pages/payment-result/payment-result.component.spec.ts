import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocRedirectService } from '../../services/payments/fintoc-redirect.service';
import { PaymentResultComponent } from './payment-result.component';
const ID='4cc803f9-f77b-4073-a5dd-6df96b92cb36';
describe('PaymentResultComponent',()=>{
  let fixture:ComponentFixture<PaymentResultComponent>;let payments:jasmine.SpyObj<FintocPaymentsService>;
  let params:BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(async()=>{
    params=new BehaviorSubject(convertToParamMap({order_id:ID,result:'returned',verified:'true'}));
    payments=jasmine.createSpyObj('payments',['verifyHosted','createHostedSession']);
    payments.verifyHosted.and.returnValue(of({order_id:ID,mode:'test',verified:false,status:'created'}));
    await TestBed.configureTestingModule({imports:[CommonModule,RouterTestingModule],declarations:[PaymentResultComponent],providers:[
      {provide:ActivatedRoute,useValue:{queryParamMap:params}},{provide:FintocPaymentsService,useValue:payments},
      {provide:FintocRedirectService,useValue:jasmine.createSpyObj('redirect',['open'])}]}).compileComponents();
  });
  afterEach(()=>fixture?.destroy());
  function render(){fixture=TestBed.createComponent(PaymentResultComponent);fixture.detectChanges();return fixture.nativeElement as HTMLElement;}
  it('no confirma pago por return URL y permite consultar sin carrito',()=>{
    const page=render();expect(payments.verifyHosted).toHaveBeenCalledOnceWith(ID);expect(fixture.componentInstance.verified).toBeFalse();
    expect(page.textContent).toContain('aún no confirma');expect(page.querySelector('a')?.getAttribute('href')).toBe('/tragos');
  });
  it('confirma solamente una respuesta coincidente del backend en modo test',()=>{
    payments.verifyHosted.and.returnValue(of({order_id:ID,mode:'test',verified:true,status:'succeeded'}));render();
    expect(fixture.componentInstance.verified).toBeTrue();expect(fixture.componentInstance.canResume).toBeFalse();
    payments.verifyHosted.and.returnValue(of({order_id:'other',mode:'test',verified:true,status:'succeeded'}));
    params.next(convertToParamMap({order_id:ID}));fixture.detectChanges();expect(fixture.componentInstance.verified).toBeFalse();
  });
  it('muestra requires_action sin confundir sesión finalizada con pago exitoso',()=>{
    payments.verifyHosted.and.returnValue(of({order_id:ID,mode:'test',verified:false,status:'requires_action'}));const page=render();
    expect(page.textContent).toContain('pendiente de aprobación');expect(fixture.componentInstance.verified).toBeFalse();
  });
  it('consulta también al cancelar y maneja error o pedido ausente',()=>{
    params.next(convertToParamMap({order_id:ID,result:'cancelled'}));payments.verifyHosted.and.returnValue(throwError(()=>new Error('not found')));
    const page=render();expect(page.textContent).toContain('cancelación');expect(page.textContent).toContain('No se pudo consultar');
  });
  it('rechaza referencias inválidas sin solicitar el estado',()=>{
    params.next(convertToParamMap({order_id:'invalid'}));const page=render();expect(payments.verifyHosted).not.toHaveBeenCalled();expect(page.textContent).toContain('referencia de pedido válida');
  });
  it('reanuda la misma sesión por ID sin crear un pedido nuevo',()=>{
    render();payments.createHostedSession.and.returnValue(of({redirect_url:'https://pay.fintoc.com/checkout/cs_test',mode:'test'}));
    fixture.componentInstance.resume();expect(payments.createHostedSession).toHaveBeenCalledOnceWith(ID);
    expect(TestBed.inject(FintocRedirectService).open).toHaveBeenCalled();
  });
});
