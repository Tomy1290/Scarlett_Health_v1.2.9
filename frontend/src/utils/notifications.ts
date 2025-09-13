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

function normalizeTime(input: string): string {
  if (!input) return '';
  let s = input.trim();
  // replace common separators with ':'
  s = s.replace(/[．。·•·。•・]/g, ':'); // exotic dots
  s = s.replace(/[：:;，,]/g, ':'); // full-width colon and similar
  s = s.replace(/\s+/g, ':');
  // if only digits like 730 or 0730
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length === 4) return `${digits.slice(0,2)}:${digits.slice(2)}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 2) return `${digits}:00`;
  // accept H:MM or HH:MM
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = m[1].padStart(2,'0');
    const mm = m[2].padStart(2,'0');
    return `${h}:${mm}`;
  }
  return s;
}

export function parseHHMM(time: string): { hour: number; minute: number } | null {
  const norm = normalizeTime(time);
  const m = norm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export async function scheduleDailyReminder(id: string, title: string, body: string, time: string): Promise<string | null> {
  const parsed = parseHHMM(time);
  if (!parsed) return null;
  
  // Modern expo-notifications format with calendar trigger
  const trigger: Notifications.CalendarTriggerInput = {
    hour: parsed.hour,
    minute: parsed.minute,
    repeats: true,
    ...(Platform.OS === 'android' && { channelId: 'reminders' })
  };
  
  const notifId = await Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body, 
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'reminders' })
    },
    trigger,
  });
  return notifId;
}

export async function scheduleOneTime(title: string, body: string, date: Date): Promise<string | null> {
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