import { FormArray } from '@angular/forms';
import { AdminEventTicketsComponent } from './admin-event-tickets.component';
import { AdminTicketForm } from './admin-event-ticket-form';
describe('Compact ticket editor',()=>{
  let component:AdminEventTicketsComponent;
  beforeEach(()=>{component=new AdminEventTicketsComponent();component.types=new FormArray<AdminTicketForm>([]);});
  it('adds General and VIP, edits price and capacity and closes a valid editor',()=>{
    component.add();component.types.at(0).patchValue({name:'General',priceClp:12000,capacity:100});component.done(0);expect(component.editingIndex).toBeNull();
    component.add();component.types.at(1).patchValue({name:'VIP',priceClp:25000,capacity:50});component.edit(1);component.types.at(1).controls.priceClp.setValue(26000);component.done(1);expect(component.totalCapacity).toBe(150);
  });
  it('asks confirmation for configured types and can keep or remove them',()=>{
    component.add();component.types.at(0).controls.name.setValue('General');component.requestRemove(0);expect(component.types.length).toBe(1);expect(component.pendingRemoval).toBe(0);
    component.pendingRemoval=null;expect(component.types.length).toBe(1);component.requestRemove(0);component.remove(0);expect(component.types.length).toBe(0);
  });
  it('keeps an invalid editor open with its limits visible to fix',()=>{
    component.add();component.types.at(0).patchValue({name:'General',capacity:2,maxPerPurchase:3});component.done(0);expect(component.editingIndex).toBe(0);expect(component.types.at(0).touched).toBeTrue();
  });
  it('respects the existing maximum number of types',()=>{for(let i=0;i<20;i++)component.add();expect(component.types.length).toBe(12);});
});
