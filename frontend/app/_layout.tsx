import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from 'expo-notifications';
import { ensureAndroidChannel, ensureNotificationPermissions } from "../src/utils/notifications";
import { useAppStore } from "../src/store/useStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const barStyle = theme === "pink_vibrant" ? "light" : "dark";

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
    </>
  );
}