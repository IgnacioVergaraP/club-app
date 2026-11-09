import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CartSelectionService } from '../services/cart-selection.service';

/**
 * Guard funcional mínimo compatible con Angular 17 (standalone).
 * No pertenece a un NgModule; se registra directamente en la ruta.
 * Redirige a /carrito si el carrito está vacío.
 */
export const emptyCartGuard: CanActivateFn = () => {
  const cart = inject(CartSelectionService);
  const router = inject(Router);

  if (cart.isEmptySnapshot()) {
    return router.createUrlTree(['/carrito']);
  }
  return true;
};