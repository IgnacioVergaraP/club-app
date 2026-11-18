import { PresentationBridgeService } from './presentation-bridge.service';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
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
  constructor(private readonly presentation:PresentationBridgeService=new PresentationBridgeService()){}
  getProducts(): Observable<Product[]> {
    return this.presentation.drinks$.pipe(map(patches=>{const products=MOCK_PRODUCTS.map(p=>{const edit=patches[p.id];return edit?{...p,name:edit.name,description:edit.description,imageUrl:edit.image,available:p.available&&edit.available}:{...p};});for(const [id,d]of Object.entries(patches))if(!products.some(p=>p.id===id))products.push({id,name:d.name,description:d.description,imageUrl:d.image,priceClp:d.priceClp,category:'cocteles',available:false,presentationOnly:true});return products;}));
  }

  getCategories(): CategoryOption[] {
    return CATEGORY_OPTIONS;
  }
}