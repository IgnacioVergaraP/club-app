import { ClubConfiguration } from './admin.model';

// Configuración de ESTA aplicación. Otra aplicación puede reutilizar los
// componentes con su propia configuración, sin selector ni catálogo de clubes.
export const CLUB_CONFIG: ClubConfiguration = {
  id: 'void-demo-001',
  tradeName: 'Club VOID',
  logo: { src: 'assets/admin/void-logo.svg', alt: 'Club VOID' },
  branding: { primary: '#4b1e66', accent: '#c77af7', background: '#080809' },
  legalName: 'Sociedad Club VOID de Ejemplo (ficticia)',
  demoTaxId: 'DEMO-VOID (no válido)',
  country: 'CL',
  address: 'Calle de Ejemplo 100 · dirección ficticia',
  status: 'demo',
  currency: 'CLP',
  settings: { timezone: 'America/Santiago', locale: 'es-CL', salesEnabled: false }
};
