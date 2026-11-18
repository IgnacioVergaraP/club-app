import { inject } from '@angular/core';
import { PresentationBridgeService } from '../../services/presentation-bridge.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CategoryOption, Product, ProductCategory } from '../../models/product.model';
import { CatalogService } from '../../services/catalog.service';
import { CartSelectionService } from '../../services/cart-selection.service';

@Component({
  selector: 'app-tragos',
  templateUrl: './tragos.component.html',
  styleUrls: ['./tragos.component.scss'],
  standalone: false
})
export class TragosComponent implements OnInit, OnDestroy {
  readonly offers$=inject(PresentationBridgeService).offers$;
  readonly selectedCategory$ = new BehaviorSubject<ProductCategory | 'all'>('all');

  categories: CategoryOption[] = [];
  products$!: Observable<Product[]>;
  quantities$!: Observable<Record<string, number>>;
  hasAnySelection$!: Observable<boolean>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private catalog: CatalogService,
    private cart: CartSelectionService
  ) {}

  ngOnInit(): void {
    this.categories = this.catalog.getCategories();

    this.products$ = combineLatest([
      this.catalog.getProducts(),
      this.selectedCategory$
    ]).pipe(
      map(([products, category]) => {
        return products.filter((p) => {
          const matchCategory =
            category === 'all' || p.category === category;
          return matchCategory;
        });
      })
    );

    this.quantities$ = this.cart.quantities$;
    this.hasAnySelection$ = this.cart.totalUnits$.pipe(map((u) => u > 0));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setCategory(category: ProductCategory | 'all'): void {
    this.selectedCategory$.next(category);
  }

  trackById(_: number, product: Product): string {
    return product.id;
  }

  quantityFor(quantities: Record<string, number>, productId: string): number {
    return quantities[productId] ?? 0;
  }

}
