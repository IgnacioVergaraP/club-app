import { CategoryOption, Product } from '../models/product.model';

/**
 * Datos de demostración del catálogo de tragos.
 * NO son precios reales de una discoteca. Se reemplazarán por una API
 * en una subetapa posterior.
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'piscola',
    imageUrl: 'assets/drinks/piscola.jpg',
    name: 'Piscola',
    description: 'Pisco con bebida cola y hielo.',
    priceClp: 6000,
    category: 'pisco',
    available: true
  },
  {
    id: 'ron-cola',
    imageUrl: 'assets/drinks/ron-cola.jpg',
    name: 'Ron Cola',
    description: 'Ron con bebida cola y hielo.',
    priceClp: 6500,
    category: 'ron',
    available: true
  },
  {
    id: 'gin-tonic',
    imageUrl: 'assets/drinks/gin-tonic.jpg',
    name: 'Gin Tonic',
    description: 'Gin con tónica, limón y hielo.',
    priceClp: 8000,
    category: 'gin',
    available: true
  },
  {
    id: 'vodka-tonica',
    imageUrl: 'assets/drinks/vodka-tonica.jpg',
    name: 'Vodka Tónica',
    description: 'Vodka con tónica y hielo.',
    priceClp: 7500,
    category: 'vodka',
    available: true
  },
  {
    id: 'mojito',
    imageUrl: 'assets/drinks/mojito.jpg',
    name: 'Mojito',
    description: 'Ron, menta, limón, azúcar y soda.',
    priceClp: 8500,
    category: 'cocteles',
    available: true
  },
  {
    id: 'pisco-sour',
    imageUrl: 'assets/drinks/pisco-sour.jpg',
    name: 'Pisco Sour',
    description: 'Pisco, limón, azúcar y clara de huevo.',
    priceClp: 7000,
    category: 'cocteles',
    available: true
  },
  {
    id: 'cuba-libre',
    imageUrl: 'assets/drinks/cuba-libre.jpg',
    name: 'Cuba Libre',
    description: 'Ron, cola y limón.',
    priceClp: 6500,
    category: 'cocteles',
    available: true
  },
  {
    id: 'agua-mineral',
    imageUrl: 'assets/drinks/agua-mineral.jpg',
    name: 'Agua mineral',
    description: 'Botella de agua mineral sin gas.',
    priceClp: 2500,
    category: 'sin-alcohol',
    available: true
  }
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'all',          label: 'Todos' },
  { key: 'pisco',        label: 'Pisco' },
  { key: 'ron',          label: 'Ron' },
  { key: 'gin',          label: 'Gin' },
  { key: 'vodka',        label: 'Vodka' },
  { key: 'cocteles',     label: 'Cócteles' },
  { key: 'sin-alcohol',  label: 'Sin alcohol' }
];