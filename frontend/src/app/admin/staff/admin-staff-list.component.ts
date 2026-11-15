import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AdminStaff, STAFF_AREAS } from './admin-staff.model';
import { staffInitials } from './admin-staff.validation';
@Component({selector:'app-admin-staff-list',standalone:false,templateUrl:'./admin-staff-list.component.html',styleUrls:['./admin-staff-list.component.scss']})
export class AdminStaffListComponent implements OnChanges {
 @Input() workers:AdminStaff[]=[];@Input() selectedId:string|null=null;@Output() selectionChange=new EventEmitter<string|null>();
 page=1;readonly pageSize=5;readonly initials=staffInitials;
 get visible():AdminStaff[]{return this.workers.slice((this.page-1)*this.pageSize,this.page*this.pageSize);}
 get pages():number{return Math.max(1,Math.ceil(this.workers.length/this.pageSize));}
 get first():number{return this.workers.length?(this.page-1)*this.pageSize+1:0;}
 get last():number{return Math.min(this.page*this.pageSize,this.workers.length);}
 area(value:string):string{return STAFF_AREAS.find(a=>a.value===value)?.label||'';}
 ngOnChanges(changes:SimpleChanges):void{if(changes['workers'])this.page=1;if(this.selectedId){const index=this.workers.findIndex(w=>w.id===this.selectedId);if(index>=0)this.page=Math.floor(index/this.pageSize)+1;}}
 toggle(id:string):void{this.selectionChange.emit(this.selectedId===id?null:id);}
 go(delta:number):void{this.page=Math.max(1,Math.min(this.pages,this.page+delta));this.selectionChange.emit(null);}
 track(_:number,worker:AdminStaff):string{return worker.id;}
}
