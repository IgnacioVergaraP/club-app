import { DemoProfile } from '../models/profile.model';

/** Identidad ficticia. No corresponde al propietario ni a una cuenta registrada. */
export const MOCK_PROFILE: DemoProfile = {
  name: 'Alex Demo',
  email: 'alex.demo@example.com',
  accountStatus: 'DEMO',
  preferences: { notifications: false, communications: false }
};
