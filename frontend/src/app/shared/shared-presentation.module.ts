import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReviewContextComponent } from './review-context.component';
import { ReferenceLabelPipe } from './presentation-text.pipe';
@NgModule({declarations:[ReviewContextComponent,ReferenceLabelPipe],imports:[CommonModule,RouterModule],exports:[ReviewContextComponent,ReferenceLabelPipe]})
export class SharedPresentationModule {}
