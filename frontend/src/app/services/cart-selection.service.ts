import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { MOCK_PRODUCTS } from '../data/mock-products';

export interface CartSelectionState {
  /** Mapa id de producto → cantidad seleccionada. */
  quantities: Record<string, number>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotalClp: number;
}

const CLP_FORMATTER = new Intl.NumberFormat('es-CL');

/**
 * Estado compartido de selección de cantidades y carrito.
 *
 * Sin persistencia (no localStorage), sin librerías de estado.
 * Ampliado en 2.2 con items derivados, subtotales, total y
 * utilidades para eliminar productos.
 */
@Injectable({
  providedIn: 'root'
})
export class CartSelectionService {
  private readonly state$ = new BehaviorSubject<CartSelectionState>({
    quantities: {}
  });

  readonly state: Observable<CartSelectionState> = this.state$.asObservable();

  readonly quantities$: Observable<Record<string, number>> = this.state$.pipe(
    map((s) => s.quantities)
  );

  readonly totalUnits$: Observable<number> = this.state$.pipe(
    map((s) => Object.values(s.quantities).reduce((acc, q) => acc + q, 0))
  );

  readonly totalPriceClp$: Observable<number> = this.state$.pipe(
    map((s) => this.calculateTotal(s.quantities))
  );

  readonly isEmpty$: Observable<boolean> = this.totalUnits$.pipe(
    map((units) => units === 0)
  );

  readonly items$: Observable<CartItem[]> = this.state$.pipe(
    map((s) => this.buildItems(s.quantities))
  );

  /** Formatea un valor numérico como CLP usando Intl. */
  formatClp(value: number): string {
    return '$' + CLP_FORMATTER.format(value);
  }

  getQuantity(productId: string): number {
    return this.state$.value.quantities[productId] ?? 0;
  }

  /** Snapshot síncrono del carrito vacío. */
  isEmptySnapshot(): boolean {
    return Object.keys(this.state$.value.quantities).length === 0;
  }

  increment(product: Product): void {
    if (!product.available) {
      return;
    }
    const current = this.getQuantity(product.id);
    this.setQuantity(product.id, current + 1);
  }

  decrement(productId: string): void {
    const current = this.getQuantity(productId);
    if (current <= 0) {
      return;
    }
    this.setQuantity(productId, current - 1);
  }

  remove(productId: string): void {
    if (this.getQuantity(productId) === 0) {
      return;
    }
    this.setQuantity(productId, 0);
  }

  clear(): void {
    this.state$.next({ quantities: {} });
  }

  private setQuantity(productId: string, quantity: number): void {
    const next = { ...this.state$.value.quantities };
    if (quantity <= 0) {
      delete next[productId];
    } else {
      next[productId] = quantity;
    }
    this.state$.next({ quantities: next });
  }

  private buildItems(quantities: Record<string, number>): CartItem[] {
    const items: CartItem[] = [];
    for (const product of MOCK_PRODUCTS) {
      const quantity = quantities[product.id] ?? 0;
      if (quantity > 0) {
        items.push({
          product,
          quantity,
          subtotalClp: product.priceClp * quantity
        });
      }
    }
    return items;
  }

  private calculateTotal(quantities: Record<string, number>): number {
    let total = 0;
    for (const product of MOCK_PRODUCTS) {
      const qty = quantities[product.id] ?? 0;
      if (qty > 0) {
        total += product.priceClp * qty;
      }
    }
    return total;
  }
}