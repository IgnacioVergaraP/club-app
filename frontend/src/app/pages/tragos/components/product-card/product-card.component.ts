import { Component, Input } from '@angular/core';
import { Product } from '../../../../models/product.model';
import { CartSelectionService } from '../../../../services/cart-selection.service';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  standalone: false
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() quantity: number = 0;

  constructor(private cart: CartSelectionService) {}

  get priceLabel(): string {
    return '$' + this.product.priceClp.toLocaleString('es-CL');
  }

  onIncrement(): void {
    this.cart.increment(this.product);
  }

  onDecrement(): void {
    this.cart.decrement(this.product.id);
  }
}