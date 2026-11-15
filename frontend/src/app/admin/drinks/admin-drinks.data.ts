import { AdminDrink } from './admin-drink.model';
/** Carta administrativa ficticia, independiente de CatalogService, pedidos y precios comerciales. */
export const ADMIN_DEMO_DRINKS: readonly AdminDrink[] = [
  {id:'admin-demo-drink-001',isDemo:true,name:'Piscola',description:'Pisco, bebida cola y hielo.',category:'clasicos',priceClp:5000,available:true,featured:true,image:'assets/drinks/piscola.jpg'},
  {id:'admin-demo-drink-002',isDemo:true,name:'Gin Tonic',description:'Gin, agua tónica y limón.',category:'clasicos',priceClp:7000,available:true,featured:true,image:'assets/drinks/gin-tonic.jpg'},
  {id:'admin-demo-drink-003',isDemo:true,name:'Mojito',description:'Ron, limón, menta y soda.',category:'cocteles',priceClp:7000,available:true,featured:false,image:'assets/drinks/mojito.jpg'},
  {id:'admin-demo-drink-004',isDemo:true,name:'Pisco Sour',description:'Pisco, limón, syrup y clara.',category:'autorales',priceClp:7000,available:true,featured:true,image:'assets/drinks/pisco-sour.jpg'},
  {id:'admin-demo-drink-005',isDemo:true,name:'Ron Cola',description:'Ron, bebida cola y hielo.',category:'clasicos',priceClp:5000,available:false,featured:false,image:'assets/drinks/ron-cola.jpg'}
];
