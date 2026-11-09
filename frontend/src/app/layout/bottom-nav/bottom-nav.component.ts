import { Component } from '@angular/core';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: false
})
export class BottomNavComponent {
  readonly items: NavItem[] = [
    { path: '/',        label: 'Inicio', icon: 'home' },
    { path: '/noches',  label: 'Noches', icon: 'moon' },
    { path: '/tragos',  label: 'Tragos', icon: 'cup'  },
    { path: '/wallet',  label: 'Wallet', icon: 'card' },
    { path: '/perfil',  label: 'Perfil', icon: 'user' }
  ];
}