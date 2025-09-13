import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  }
  return true;
}

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Erinnerungen',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: '#FF2D87',
    });
  }
}

export function parseHHMM(time: string): { hour: number; minute: number } | null {
  const m = time.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function secondsUntilNextOccurrence(hour: number, minute: number) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (+next <= +now) {
    next.setDate(next.getDate() + 1);
  }
  return Math.max(1, Math.round((+next - +now) / 1000));
}

export async function scheduleDailyReminder(id: string, title: string, body: string, time: string): Promise<string | null> {
  const parsed = parseHHMM(time);
  if (!parsed) return null;
  const secs = secondsUntilNextOccurrence(parsed.hour, parsed.minute);
  const trigger: Notifications.NotificationTriggerInput = Platform.select({
    android: { channelId: 'reminders', seconds: secs, repeats: true },
    ios: { seconds: secs, repeats: true },
    default: { seconds: secs, repeats: true },
  }) as any;
  const notifId = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' as any },
    trigger,
  });
  return notifId;
}

export async function scheduleOneTime(title: string, body: string, date: Date): Promise<string | null> {
  // If past date, do not schedule
  if (+date <= +new Date()) return null;
  const trigger: Notifications.NotificationTriggerInput = Platform.select({
    android: { channelId: 'reminders', date },
    ios: date,
    default: date,
  }) as any;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' as any },
    trigger,
  });
  return id;
}

export async function cancelNotification(notifId?: string | null) {
  if (notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
  }
}