export type AdminDrinkCategory = 'clasicos' | 'cocteles' | 'autorales' | 'sin-alcohol';
export interface AdminDrinkDraft {
  name: string;
  description: string;
  category: AdminDrinkCategory;
  priceClp: number;
  available: boolean;
  featured: boolean;
  image: string;
}
export interface AdminDrink extends AdminDrinkDraft { id: string; isDemo: true; }
export const DRINK_CATEGORIES: readonly {value:AdminDrinkCategory;label:string}[] = [
  {value:'clasicos',label:'Clásicos'}, {value:'cocteles',label:'Cócteles'}, {value:'autorales',label:'Autorales'}, {value:'sin-alcohol',label:'Sin alcohol'}
];
export const DRINK_LIMITS={name:100,description:1200,priceClp:10000000} as const;
export const DRINK_IMAGES = ['assets/drinks/piscola.jpg','assets/drinks/gin-tonic.jpg','assets/drinks/mojito.jpg','assets/drinks/pisco-sour.jpg','assets/drinks/ron-cola.jpg'] as const;
