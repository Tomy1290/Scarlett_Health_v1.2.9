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
      repeats: true,
    };

    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      sound: 'default',
      priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
      sticky: false,
      autoDismiss: true,
    };

    // Add Android-specific properties
    if (Platform.OS === 'android') {
      (notificationContent as any).channelId = channelId;
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });

    console.log(`Scheduled notification ${notifId} for ${time}`);
    
    // Test the notification by scheduling one for 10 seconds from now
    if (id.startsWith('test_')) {
      const testDate = new Date();
      testDate.setSeconds(testDate.getSeconds() + 10);
      
      const testNotifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `TEST: ${title}`,
          body: `Test-Benachrichtigung: ${body}`,
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: { date: testDate },
      });
      
      console.log(`Test notification scheduled: ${testNotifId}`);
    }
    
    return notifId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

export async function scheduleOneTime(title: string, body: string, date: Date, isUrgent: boolean = false): Promise<string | null> {
  try {
    if (+date <= +new Date()) {
      console.log('Date is in the past, not scheduling');
      return null;
    }

    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      console.error('No notification permission');
      return null;
    }

    await ensureAndroidChannel();

    const channelId = isUrgent ? 'urgent' : 'reminders';
    
    const trigger: Notifications.DateTriggerInput = {
      date,
    };

    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      sound: 'default',
      priority: isUrgent ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
    };

    if (Platform.OS === 'android') {
      (notificationContent as any).channelId = channelId;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });

    console.log(`Scheduled one-time notification: ${id} for ${date}`);
    return id;
  } catch (error) {
    console.error('Error scheduling one-time notification:', error);
    return null;
  }
}

export async function cancelNotification(notifId?: string | null) {
  if (notifId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
      console.log(`Cancelled notification: ${notifId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }
}

export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// Test function to verify notifications work
export async function testNotification() {
  try {
    const hasPermission = await ensureNotificationPermissions();
    if (!hasPermission) {
      Alert.alert('Fehler', 'Keine Berechtigung für Benachrichtigungen');
      return;
    }

    await ensureAndroidChannel();

    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + 5);

    const notifId = await scheduleOneTime(
      'Test Benachrichtigung',
      'Dies ist eine Test-Benachrichtigung. Wenn Sie diese sehen, funktionieren Benachrichtigungen!',
      testDate
    );

    if (notifId) {
      Alert.alert(
        'Test gestartet',
        'Eine Test-Benachrichtigung wird in 5 Sekunden angezeigt.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Fehler', 'Test-Benachrichtigung konnte nicht geplant werden');
    }
  } catch (error) {
    console.error('Error testing notification:', error);
    Alert.alert('Fehler', `Test fehlgeschlagen: ${error.message}`);
  }
}