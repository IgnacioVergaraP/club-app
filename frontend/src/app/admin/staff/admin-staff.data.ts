import { AdminStaff } from './admin-staff.model';
// Identidades ficticias, sin cuentas de acceso ni datos del Product Owner.
export const DEMO_STAFF:ReadonlyArray<Readonly<AdminStaff>>=[
 {id:'DEMO-EMP-001',name:'Catalina Morales',email:'catalina.morales@void.example',phone:'+56 9 0000 0001',role:'admin',area:'administration',status:'active',isDemo:true},
 {id:'DEMO-EMP-002',name:'Diego Soto',email:'diego.soto@void.example',phone:'',role:'supervisor',area:'operations',status:'active',isDemo:true},
 {id:'DEMO-EMP-003',name:'Martina Flores',email:'martina.flores@void.example',phone:'',role:'bar',area:'bar',status:'active',isDemo:true},
 {id:'DEMO-EMP-004',name:'Javier Rojas',email:'javier.rojas@void.example',phone:'',role:'bar',area:'bar',status:'active',isDemo:true},
 {id:'DEMO-EMP-005',name:'Valentina Paredes',email:'valentina.paredes@void.example',phone:'',role:'door',area:'access',status:'active',isDemo:true},
 {id:'DEMO-EMP-006',name:'Tomás Vega',email:'tomas.vega@void.example',phone:'',role:'bar',area:'bar',status:'active',isDemo:true},
 {id:'DEMO-EMP-007',name:'Antonia Silva',email:'antonia.silva@void.example',phone:'',role:'door',area:'access',status:'active',isDemo:true},
 {id:'DEMO-EMP-008',name:'Felipe Reyes',email:'felipe.reyes@void.example',phone:'',role:'supervisor',area:'operations',status:'inactive',isDemo:true}
];
