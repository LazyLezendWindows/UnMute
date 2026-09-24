import { api } from './api';

/** Public sign-in settings from GET /auth/config, fetched once and shared. */
export interface AuthConfig {
  googleClientId: string;
  googleIosClientId: string;
  /** False when new accounts can only be created with Google (production default). */
  passwordSignup: boolean;
  /** Whether members can upload their own profile photo (Cloudinary configured). */
  photoUploads: boolean;
  /** Length limit of a chat request's introductory message. */
  chatRequestMessageMax: number;
}

let loader: Promise<AuthConfig> | null = null;

export function loadAuthConfig(): Promise<AuthConfig> {
  if (!loader) {
    loader = api
      .get('/auth/config')
      .then((res) => ({
        googleClientId: res.data.data?.googleClientId || '',
        googleIosClientId: res.data.data?.googleIosClientId || '',
        passwordSignup: res.data.data?.passwordSignup === true,
        photoUploads: res.data.data?.photoUploads === true,
        chatRequestMessageMax: Number(res.data.data?.chatRequestMessageMax) || 500,
      }))
      .catch((err) => {
        loader = null; // try again next time
        throw err;
      });
  }
  return loader;
}
