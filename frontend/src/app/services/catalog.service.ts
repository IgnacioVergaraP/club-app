import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CategoryOption, Product } from '../models/product.model';
import { CATEGORY_OPTIONS, MOCK_PRODUCTS } from '../data/mock-products';

/**
 * Servicio de catálogo de tragos.
 *
 * Actualmente devuelve datos simulados locales. En una subetapa
 * posterior se reemplazará por una llamada HTTP al backend sin
 * cambiar la firma pública del servicio.
 */
@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  getProducts(): Observable<Product[]> {
    return of(MOCK_PRODUCTS);
  }

  getCategories(): CategoryOption[] {
    return CATEGORY_OPTIONS;
  }
}