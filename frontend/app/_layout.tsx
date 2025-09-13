import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, View, Text, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ensureAndroidChannel, ensureNotificationPermissions } from "../src/utils/notifications";
import { useAppStore } from "../src/store/useStore";

// Suppress alerts while the app is in foreground to avoid "flood" on open
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false }),
});

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const barStyle = theme === "pink_vibrant" ? "light" : "dark";

  const bg = theme === 'pink_vibrant' ? '#1b0b12' : '#fde7ef';

  const [bootVisible, setBootVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBootVisible(false), 4000); // show boot overlay for 4s
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      await ensureNotificationPermissions();
      await ensureAndroidChannel();
    })();
  }, []);

  return (
    <>
      <StatusBar style={barStyle as any} />
      <Stack screenOptions={{ headerShown: false }} />
      {bootVisible ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <Image source={require('../assets/images/icon.png')} style={{ width: 120, height: 120, resizeMode: 'contain' }} />
          <Text style={{ marginTop: 12, color: theme==='pink_vibrant' ? '#ffffff' : '#3a2f33' }}>created by Gugi</Text>
        </View>
      ) : null}
    </>
  );
}