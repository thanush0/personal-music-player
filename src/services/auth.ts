import axios from '../axios';
import type { User } from '../interfaces/user';

// For local player, we don't need authentication
// Return a mock user object
const fetchUser = async (): Promise<{ data: User }> => {
  // Mock user for local player
  return {
    data: {
      id: 'local-user',
      display_name: 'Local User',
      email: 'user@local.music',
      images: [
        { url: '', height: 64, width: 64 },
        { url: '', height: 64, width: 64 }
      ],
      country: 'US',
      product: 'premium', // Mock premium for full features
      followers: { total: 0, href: null },
      external_urls: { spotify: '' },
      href: '',
      type: 'user',
      uri: 'local:user:local-user',
    }
  };
};

export const authService = {
  fetchUser,
};
