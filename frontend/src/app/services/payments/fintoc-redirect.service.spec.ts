import { FintocRedirectService } from './fintoc-redirect.service';
describe('FintocRedirectService',()=>{
  it('rechaza destinos externos, protocolos inseguros y credenciales antes de navegar',()=>{
    const service=new FintocRedirectService();
    for(const url of ['https://evil.example','javascript:alert(1)','http://pay.fintoc.com','https://checkout.fintoc.com.evil.example',
      'https://user@pay.fintoc.com','https://pay.fintoc.com:444','https://pay.fintoc.com/#bad']) expect(()=>service.open(url)).toThrow();
  });
});
