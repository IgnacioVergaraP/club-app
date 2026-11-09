import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
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
  readonly searchControl = new FormControl<string>('', { nonNullable: true });
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
      this.searchControl.valueChanges.pipe(startWith('')),
      this.selectedCategory$
    ]).pipe(
      map(([products, term, category]) => {
        const normalized = term.trim().toLowerCase();
        return products.filter((p) => {
          const matchCategory =
            category === 'all' || p.category === category;
          const matchTerm =
            normalized.length === 0 ||
            p.name.toLowerCase().includes(normalized);
          return matchCategory && matchTerm;
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

  clearSearch(): void {
    this.searchControl.setValue('');
  }
}