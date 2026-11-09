export type ProductCategory =
  | 'pisco'
  | 'ron'
  | 'gin'
  | 'vodka'
  | 'cocteles'
  | 'sin-alcohol';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceClp: number;
  category: ProductCategory;
  available: boolean;
  imageUrl?: string;
}

export interface CategoryOption {
  key: ProductCategory | 'all';
  label: string;
}