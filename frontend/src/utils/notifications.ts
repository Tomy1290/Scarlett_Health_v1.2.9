import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Notification Handler: zeigt Notifications auch im Vordergrund an
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- Berechtigungen prüfen ---
export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true, allowAnnouncements: true },
        android: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      return req.status === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error getting notification permissions:', error);
    return false;
  }
}

// --- Android Channels erstellen (nur einmal) ---
export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Tabletten & Erinnerungen',
        description: 'Standard-Erinnerungen',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: '#FF2D87',
        bypassDnd: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Wichtige Erinnerungen',
        description: 'Wichtige Gesundheitserinnerungen',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 500, 250, 500],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: '#FF0000',
        bypassDnd: true,
        showBadge: true,
      });
    } catch (error) {
      console.error('Error setting up Android channels:', error);
    }
  }
}

// --- Zeit parsen ---
function normalizeTime(input: string): string {
  if (!input) return '';
  let s = input.trim();
  s = s.replace(/[．。·•·。•・]/g, ':');
  s = s.replace(/[：:;，,]/g, ':');
  s = s.replace(/\s+/g, ':');
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 2) return `${digits}:00`;
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
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

// --- Nächsten Trigger für CalendarTriggerInput berechnen ---
function getNextTrigger(hour: number, minute: number): Notifications.CalendarTriggerInput {
  const now = new Date();
  const trigger: Notifications.CalendarTriggerInput = { hour, minute, repeats: true };
  // Wenn Zeit heute schon vorbei, startet automatisch morgen wegen repeats: true
  if (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes())) {
    trigger.hour = hour;
    trigger.minute = minute;
    // repeat=true sorgt dafür, dass es automatisch am nächsten Tag kommt
  }
  return trigger;
}

// --- Daily Reminder planen ---
export async function scheduleDailyReminder(
  id: string,
  title: string,
  body: string,
  time: string,
  isUrgent: boolean = false
): Promise<string | null> {
  try {
    const parsed = parseHHMM(time);
    if (!parsed) return null;

    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('Benachrichtigungen nicht erlaubt', 'Bitte aktiviere sie in den Einstellungen.');
      return null;
    }

    await ensureAndroidChannel();

    const channelId = isUrgent ? 'urgent' : 'reminders';

    // Alte Notification löschen
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const trigger = getNextTrigger(parsed.hour, parsed.minute);

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        channelId: Platform.OS === 'android' ? channelId : undefined,
      },
      trigger,
    });

    return notifId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

// --- One-time Notification ---
export async function scheduleOneTime(
  title: string,
  body: string,
  date: Date,
  isUrgent: boolean = false
): Promise<string | null> {
  try {
    if (+date <= +new Date()) return null;

    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) return null;

    await ensureAndroidChannel();

    const channelId = isUrgent ? 'urgent' : 'reminders';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        channelId: Platform.OS === 'android' ? channelId : undefined,
      },
      trigger: { date },
    });

    return id;
  } catch (error) {
    console.error('Error scheduling one-time notification:', error);
    return null;
  }
}

// --- Notification löschen ---
export async function cancelNotification(notifId?: string | null) {
  if (notifId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

// --- Alle geplanten Notifications abrufen ---
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// --- Test Notification ---
export async function testNotification() {
  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('Fehler', 'Keine Berechtigung für Benachrichtigungen.');
      return;
    }

    await ensureAndroidChannel();

    const testDate = new Date(Date.now() + 3000);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Test erfolgreich!',
        body: 'Benachrichtigung funktioniert.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: Platform.OS === 'android' ? 'reminders' : undefined,
      },
      trigger: { date: testDate },
    });

    Alert.alert('🧪 Test gestartet', 'Eine Test-Benachrichtigung wird in 3 Sekunden angezeigt.');
  } catch (error) {
    console.error('Error testing notification:', error);
    Alert.alert('Fehler', `Test fehlgeschlagen: ${error.message}`);
  }
}
