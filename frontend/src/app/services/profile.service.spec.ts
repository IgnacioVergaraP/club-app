import { firstValueFrom } from 'rxjs';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  it('mantiene datos y preferencias solo en la instancia de sesión y emite copias', async () => {
    const service=new ProfileService();
    const snapshot=await firstValueFrom(service.profile$);
    snapshot.name='Mutación';snapshot.preferences.notifications=true;
    expect((await firstValueFrom(service.profile$)).preferences.notifications).toBeFalse();
    service.updateDetails({name:'  Sol Demo  ',phone:'+56 9 0000 0000'});
    service.updatePreference('communications',true);
    const current=await firstValueFrom(service.profile$);
    expect(current.name).toBe('Sol Demo');expect(current.preferences.communications).toBeTrue();
    expect(current.accountStatus).toBe('DEMO');expect(current.email).toBe('alex.demo@example.com');
    expect((await firstValueFrom(new ProfileService().profile$)).name).toBe('Alex Demo');
  });
  it('rechaza nombres vacíos, largos y teléfonos inválidos sin modificar el estado', async () => {
    const service=new ProfileService();const before=await firstValueFrom(service.profile$);
    for(const edit of [{name:'  '},{name:'x'.repeat(81)},{name:'Demo',phone:'abc'},{name:'Demo',phone:'123'},{name:'Demo',phone:'1'.repeat(16)}]) {
      expect(()=>service.updateDetails(edit)).toThrow();
    }
    expect(await firstValueFrom(service.profile$)).toEqual(before);
  });
  it('permite quitar el teléfono opcional y no escribe en storage', async () => {
    const storage=spyOn(Storage.prototype,'setItem');
    const service=new ProfileService();service.updateDetails({name:'Alex Demo',phone:'900000000'});
    service.updateDetails({name:'Alex Demo',phone:'   '});
    expect((await firstValueFrom(service.profile$)).phone).toBeUndefined();expect(storage).not.toHaveBeenCalled();
  });
});
