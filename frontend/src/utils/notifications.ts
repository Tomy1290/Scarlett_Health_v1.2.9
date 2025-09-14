import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Set notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    console.log('Current notification permissions:', settings);
    
    if (settings.status !== 'granted') {
      console.log('Requesting notification permissions...');
      const req = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      console.log('Permission request result:', req);
      return req.status === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error getting notification permissions:', error);
    return false;
  }
}

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    try {
      console.log('Setting up Android notification channel...');
      
      // Delete old channel first to reset settings
      try {
        await Notifications.deleteNotificationChannelAsync('reminders');
      } catch (e) {
        // Channel might not exist, that's ok
      }
      
      const channel = await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Tabletten & Erinnerungen',
        description: 'Erinnerungen für Tabletten, Gewicht, Sport und andere Gesundheitsaktivitäten',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: '#FF2D87',
        bypassDnd: true,
        showBadge: true,
      });
      
      console.log('Android channel created:', channel);
      
      // Also create a high priority channel for urgent reminders
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

export async function scheduleDailyReminder(id: string, title: string, body: string, time: string, isUrgent: boolean = false): Promise<string | null> {
  try {
    console.log(`Scheduling daily reminder: ${id} at ${time} - ${title}`);
    
    const parsed = parseHHMM(time);
    if (!parsed) {
      console.error('Failed to parse time:', time);
      return null;
    }

    // Ensure permissions first
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      console.error('No notification permission');
      Alert.alert(
        'Benachrichtigungen nicht erlaubt',
        'Bitte aktivieren Sie Benachrichtigungen in den Geräteeinstellungen.',
        [{ text: 'OK' }]
      );
      return null;
    }

    // Ensure channel exists
    await ensureAndroidChannel();

    const channelId = isUrgent ? 'urgent' : 'reminders';
    
    // For Android, we need to use CalendarTriggerInput with explicit channel
    const trigger: Notifications.CalendarTriggerInput = {
      hour: parsed.hour,
      minute: parsed.minute,
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

// --- Helper: Berechtigungen prüfen ---
export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return req.status === 'granted';
    }
    return true;
  } catch (error) {
    console.error('Error getting notification permissions:', error);
    return false;
  }
}

// --- Helper: Android Channels erstellen (nur einmal, nie löschen) ---
export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    try {
      // Standard-Channel
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Tabletten & Erinnerungen',
        description: 'Erinnerungen für Tabletten, Gewicht, Sport und andere Aktivitäten',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        lightColor: '#FF2D87',
        bypassDnd: true,
        showBadge: true,
      });

      // Urgent-Channel
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
  if (digits.length === 4) return `${digits.slice(0,2)}:${digits.slice(2)}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 2) return `${digits}:00`;
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

// --- Helper: berechne nächsten Trigger (heute oder morgen) ---
function getNextTrigger(hour: number, minute: number): Date {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
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

    // Alte Notification löschen, falls sie existiert
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    // Trigger berechnen (heute oder morgen)
    const triggerDate = getNextTrigger(parsed.hour, parsed.minute);

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        date: triggerDate,
        repeats: true, // täglich wiederholen
      },
    });

    return notifId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

// --- One-time Notification ---
export async function scheduleOneTime(title: string, body: string, date: Date, isUrgent: boolean = false): Promise<string | null> {
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
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: { date },
    });

    return id;
  } catch (error) {
    console.error('Error scheduling one-time notification:', error);
    return null;
  }
}

// --- Notifications löschen ---
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

// --- Alle geplanten Notifications anzeigen ---
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
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

    const testDate = new Date(Date.now() + 3000); // in 3 Sekunden

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Test erfolgreich!',
        body: 'Benachrichtigung funktioniert.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId: 'reminders' }),
      },
      trigger: { date: testDate },
    });

    Alert.alert('🧪 Test gestartet', 'Eine Test-Benachrichtigung wird in 3 Sekunden angezeigt.');
  } catch (error) {
    console.error('Error testing notification:', error);
    Alert.alert('Fehler', `Test fehlgeschlagen: ${error.message}`);
  }
}
