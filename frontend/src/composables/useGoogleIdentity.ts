import { ref } from 'vue';
import { loadAuthConfig } from '../services/authConfig';

/**
 * Google Identity Services (GIS) integration. GIS only yields a signed ID token ("credential");
 * the backend verifies it and decides who the user is.
 */

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * The OAuth client ID: VITE_GOOGLE_CLIENT_ID when the build sets it, otherwise the backend's
 * GOOGLE_CLIENT_ID from /auth/config, so a deployment only has to configure it in one place.
 */
const clientId = ref<string>(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
/** The iOS app's own OAuth client ID (backend GOOGLE_IOS_CLIENT_ID), for native sign-in on iOS. */
const iosClientId = ref<string | null>(null);
let clientIdLoader: Promise<string> | null = null;

function resolveClientId(): Promise<string> {
  if (clientId.value && iosClientId.value !== null) return Promise.resolve(clientId.value);
  if (!clientIdLoader) {
    clientIdLoader = loadAuthConfig()
      .then((authConfig) => {
        iosClientId.value = authConfig.googleIosClientId;
        return (clientId.value = clientId.value || authConfig.googleClientId);
      })
      .catch(() => {
        clientIdLoader = null; // try again next time a sign-in button mounts
        return '';
      });
  }
  return clientIdLoader;
}

let scriptLoader: Promise<GoogleAccountsId> | null = null;

function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!scriptLoader) {
    scriptLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () =>
        window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in failed to load'));
      script.onerror = () => {
        scriptLoader = null;
        reject(new Error('Google sign-in failed to load. Check your connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoader;
}

export type GoogleButtonText = 'continue_with' | 'signup_with' | 'signin_with';

export function useGoogleIdentity() {
  /** Renders Google's official button into `el`; `onCredential` receives the raw ID token. */
  async function renderButton(el: HTMLElement, onCredential: (credential: string) => void, text: GoogleButtonText) {
    const gis = await loadGoogleIdentity();
    gis.initialize({
      client_id: clientId.value,
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      itp_support: true,
    });
    gis.renderButton(el, {
      type: 'standard',
      theme: 'outline',
      shape: 'pill',
      size: 'large',
      text,
      // GIS accepts 200–400px.
      width: Math.max(200, Math.min(400, el.clientWidth || 360)),
    });
  }

  /** Stops GIS from silently re-selecting the account after the user signs out. */
  function disableAutoSelect() {
    window.google?.accounts?.id?.disableAutoSelect();
  }

  return { clientId, iosClientId, resolveClientId, renderButton, disableAutoSelect };
}
