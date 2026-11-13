export interface ClubConfiguration {
  id: string;
  tradeName: string;
  logo: { src: string; alt: string };
  branding: { primary: string; accent: string; background: string };
  legalName: string;
  demoTaxId: string;
  country: 'CL';
  address: string;
  status: 'demo';
  currency: 'CLP';
  settings: { timezone: string; locale: string; salesEnabled: false };
}
export interface DemoDashboard {
  isDemo: true;
  period: string;
  salesClp: number;
  orders: number;
  tickets: number;
  drinks: number;
  averageClp: number;
  recentSales: { id: string; at: string; type: string; totalClp: number }[];
  products: { id: string; name: string; units: number; salesClp: number; image: string; share: number }[];
  events: { id: string; name: string; startsAt: string; tickets: number; capacity: number; image: string }[];
  activity: { id: string; title: string; at: string }[];
}
