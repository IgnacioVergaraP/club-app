import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { FintocSdk, FintocSdkService } from './fintoc-sdk.service';

describe('Carga del SDK oficial Fintoc', () => {
  let original: FintocSdk | undefined;
  beforeEach(() => { original = window.Fintoc; delete window.Fintoc; });
  afterEach(() => { window.Fintoc = original; });
  it('carga una sola vez directamente desde js.fintoc.com y limpia listeners', fakeAsync(() => {
    let script!: HTMLScriptElement;
    spyOn(document.head, 'appendChild').and.callFake(node => { script = node as unknown as HTMLScriptElement; return node; });
    const service = TestBed.inject(FintocSdkService);
    const first = service.load(); expect(service.load()).toBe(first);
    expect(script.src).toBe('https://js.fintoc.com/v1/');
    window.Fintoc = { create: jasmine.createSpy('create') };
    script.dispatchEvent(new Event('load')); flushMicrotasks();
    expect(script.onload).toBeNull(); expect(document.head.appendChild).toHaveBeenCalledTimes(1);
  }));
  it('permite reintentar si el script no carga', fakeAsync(() => {
    let script!: HTMLScriptElement;
    spyOn(document.head, 'appendChild').and.callFake(node => { script = node as unknown as HTMLScriptElement; return node; });
    const service = TestBed.inject(FintocSdkService);
    let failed = false; service.load().catch(() => { failed = true; });
    script.dispatchEvent(new Event('error')); flushMicrotasks(); expect(failed).toBeTrue();
    service.load().catch(() => undefined);
    window.Fintoc = { create: jasmine.createSpy('create') };
    script.dispatchEvent(new Event('load')); flushMicrotasks();
    expect(document.head.appendChild).toHaveBeenCalledTimes(2);
  }));
});
