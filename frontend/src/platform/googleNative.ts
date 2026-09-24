/**
 * Native Google sign-in for the Capacitor apps (Android Credential Manager / iOS Google Sign-In,
 * via @capgo/capacitor-social-login). It produces the same thing as the web button: a Google ID
 * token, which the backend verifies exactly as it does for the web. The web app never loads this.
 */
let initializedFor: string | null = null;

async function plugin() {
  return (await import('@capgo/capacitor-social-login')).SocialLogin;
}

/**
 * Opens the native Google account picker and returns the ID token, or null if the user cancelled.
 * `webClientId` makes Android issue the token for the web client (the backend's audience); iOS
 * uses its own client ID, which the backend accepts as GOOGLE_IOS_CLIENT_ID.
 */
export async function nativeGoogleIdToken(webClientId: string, iosClientId: string | null): Promise<string | null> {
  const SocialLogin = await plugin();
  const key = `${webClientId}|${iosClientId ?? ''}`;
  if (initializedFor !== key) {
    await SocialLogin.initialize({
      google: { webClientId, iOSClientId: iosClientId || undefined, iOSServerClientId: webClientId, mode: 'online' },
    });
    initializedFor = key;
  }
  try {
    const { result } = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
    if (result.responseType !== 'online' || !result.idToken) {
      throw new Error('Google did not return a sign-in token. Please try again.');
    }
    return result.idToken;
  } catch (err) {
    if ((err as { code?: string })?.code === 'USER_CANCELLED') return null;
    throw err;
  }
}

/** Forgets the Google account on the device so the next sign-in asks which account to use. */
export async function nativeGoogleSignOut(): Promise<void> {
  if (!initializedFor) return;
  try {
    await (await plugin()).logout({ provider: 'google' });
  } catch {
    // Not signed in with Google on this device.
  }
}
