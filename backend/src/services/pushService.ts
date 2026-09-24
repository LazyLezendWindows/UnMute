import crypto from 'crypto';
import webpush, { WebPushError } from 'web-push';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { getSocketServer } from '../sockets/chatSocket';
import { PushSubscriptionRepository } from '../repositories/pushSubscriptionRepository';

export interface PushPayload {
  title: string;
  body: string;
  /** App path the notification opens. */
  url: string;
  /** Notifications with the same tag replace each other on the device instead of stacking. */
  tag: string;
}

/** True when the endpoint is https and on one of the configured push services. */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return config.webPush.endpointHosts.some((allowed) =>
    allowed.startsWith('.') ? host.endsWith(allowed) : host === allowed
  );
}

/** A push-service Topic (at most 32 URL-safe characters), so a newer notification replaces a pending one. */
function topicFor(tag: string): string {
  return crypto.createHash('sha256').update(tag).digest('base64url').slice(0, 32);
}

export class PushService {
  static isEnabled(): boolean {
    const { publicKey, privateKey, subject } = config.webPush;
    return Boolean(publicKey && privateKey && subject);
  }

  static publicConfig() {
    return { enabled: this.isEnabled(), publicKey: this.isEnabled() ? config.webPush.publicKey : null };
  }

  static async subscribe(
    userId: string,
    sessionId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    if (!this.isEnabled()) {
      throw new AppError('Push notifications are not available', 503);
    }
    if (!isAllowedPushEndpoint(subscription.endpoint)) {
      throw new AppError('Unsupported push service', 400);
    }
    await PushSubscriptionRepository.save({
      userId,
      sessionId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
    return { subscribed: true };
  }

  static async unsubscribe(sessionId: string) {
    await PushSubscriptionRepository.deleteForSession(sessionId);
    return { subscribed: false };
  }

  /**
   * Sends a notification to every device of a member who is not looking at the app (an app on
   * screen already shows the event in real time). A connected socket alone does not count: a
   * backgrounded app or locked phone can keep its connection for a while. Never throws: a failed
   * notification must not fail the message or match that caused it. Subscriptions the push
   * service reports as gone are removed.
   */
  static async notifyIfAway(userId: string, payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      const io = getSocketServer();
      const sockets = io ? await io.in(`user:${userId}`).fetchSockets() : [];
      if (sockets.some((s) => s.data.visible !== false)) return;

      const subscriptions = await PushSubscriptionRepository.listDeliverable(userId);
      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(payload),
              {
                vapidDetails: {
                  subject: config.webPush.subject,
                  publicKey: config.webPush.publicKey,
                  privateKey: config.webPush.privateKey,
                },
                TTL: 24 * 60 * 60,
                urgency: 'high',
                topic: topicFor(payload.tag),
                timeout: 10_000,
              }
            );
          } catch (err) {
            const status = err instanceof WebPushError ? err.statusCode : undefined;
            if (status === 404 || status === 410) {
              await PushSubscriptionRepository.delete(sub.id);
            } else {
              console.warn('[Push] Delivery failed:', status ?? (err as Error).message);
            }
          }
        })
      );
    } catch (err) {
      console.error('[Push] Notification failed:', err);
    }
  }
}
