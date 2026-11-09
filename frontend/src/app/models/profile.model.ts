export interface DemoProfile {
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  accountStatus: 'DEMO';
  preferences: { notifications: boolean; communications: boolean };
}
export type ProfileEdit = Pick<DemoProfile, 'name' | 'phone'>;
export const PROFILE_LIMITS = { name: 80, phone: 24 } as const;
/** Teléfono opcional: + inicial, espacios, guiones y paréntesis; 8 a 15 dígitos. */
export function validProfilePhone(value: string): boolean {
  const phone = value.trim();
  return !phone || (phone.length <= PROFILE_LIMITS.phone && /^\+?[\d ()-]+$/.test(phone)
    && /^\+?\d/.test(phone) && /^\+?\d[\d ()-]*\d$/.test(phone)
    && phone.replace(/\D/g, '').length >= 8 && phone.replace(/\D/g, '').length <= 15);
}
