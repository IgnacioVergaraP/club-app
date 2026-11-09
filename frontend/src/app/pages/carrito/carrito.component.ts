import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartItem, CartSelectionService } from '../../services/cart-selection.service';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss'],
  standalone: false
})
export class CarritoComponent implements OnInit, OnDestroy {
  items$!: Observable<CartItem[]>;
  totalUnits$!: Observable<number>;
  subtotal$!: Observable<number>;
  isEmpty$!: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private cart: CartSelectionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.items$ = this.cart.items$;
    this.totalUnits$ = this.cart.totalUnits$;
    this.subtotal$ = this.cart.totalPriceClp$;
    this.isEmpty$ = this.cart.isEmpty$;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatClp(value: number): string {
    return this.cart.formatClp(value);
  }

  increment(item: CartItem): void {
    this.cart.increment(item.product);
  }

  decrement(item: CartItem): void {
    this.cart.decrement(item.product.id);
  }

  remove(item: CartItem): void {
    this.cart.remove(item.product.id);
  }

  goToTragos(): void {
    this.router.navigate(['/tragos']);
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  trackByProductId(_: number, item: CartItem): string {
    return item.product.id;
  }
}