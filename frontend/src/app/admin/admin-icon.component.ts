import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-admin-icon', standalone: false,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="paths[name] || paths['activity']" /></svg>`,
  styles: [':host{display:inline-flex;width:1.5rem;height:1.5rem;flex-shrink:0}svg{width:100%;height:100%}']
})
export class AdminIconComponent {
  @Input() name = 'activity';
  readonly paths: Record<string, string> = {
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    calendar: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16',
    drink: 'M3 3h18L12 13 3 3Zm9 10v8m-5 0h10M7 7h10',
    sales: 'M4 20V12m5 8V8m5 12V4m5 16V10',
    coins: 'M3 6c0-4 12-4 12 0s-12 4-12 0Zm0 0v8c0 4 12 4 12 0V6M3 10c0 4 12 4 12 0m0-3c8-3 9 4 4 5m2-3v9c0 3-8 4-11 2',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M17 4a4 4 0 0 1 0 7m2 4a6 6 0 0 1 3 6',
    settings: 'M9 3h6l1 4 4 1 2 5-3 3v4l-5 2-3-3H7l-3-5 2-3V7l3-4Zm3 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    ticket: 'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm13 1v2m0 3v2m0 3v2',
    cart: 'M2 3h3l3 13h11l3-10H6M9 20h1m7 0h1',
    receipt: 'M5 3h14v19l-3-2-4 2-4-2-3 2V3Zm3 5h8M8 12h8m-8 4h5',
    percent: 'M5 20 19 4M6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    activity: 'M2 12h5l3-9 4 18 3-9h5',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    menu: 'M3 5h18M3 12h18M3 19h18',
    close: 'm5 5 14 14M19 5 5 19',
    bell: 'M5 16h14l-2-4V8a5 5 0 0 0-10 0v4l-2 4Zm5 4h4',
    edit: 'm4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4'
  };
}
