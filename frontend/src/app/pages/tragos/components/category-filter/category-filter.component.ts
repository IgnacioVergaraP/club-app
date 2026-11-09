import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CategoryOption, ProductCategory } from '../../../../models/product.model';

@Component({
  selector: 'app-category-filter',
  templateUrl: './category-filter.component.html',
  styleUrls: ['./category-filter.component.scss'],
  standalone: false
})
export class CategoryFilterComponent {
  @Input() categories: CategoryOption[] = [];
  @Input() selected: ProductCategory | 'all' = 'all';

  @Output() selectedChange = new EventEmitter<ProductCategory | 'all'>();

  onSelect(key: ProductCategory | 'all'): void {
    if (key === this.selected) {
      return;
    }
    this.selectedChange.emit(key);
  }
}