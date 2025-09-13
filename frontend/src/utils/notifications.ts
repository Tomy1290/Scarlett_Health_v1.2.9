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

export async function scheduleDailyReminder(id: string, title: string, body: string, time: string): Promise<string | null> {
  const parsed = parseHHMM(time);
  if (!parsed) return null;
  const notifId = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' as any },
    trigger: { hour: parsed.hour, minute: parsed.minute, repeats: true, channelId: 'reminders' },
  });
  return notifId;
}

export async function scheduleOneTime(title: string, body: string, date: Date): Promise<string | null> {
  // If past date, do not schedule
  if (+date <= +new Date()) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' as any },
    trigger: date,
  });
  return id;
}

export async function cancelNotification(notifId?: string | null) {
  if (notifId) {
    try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
  }
}