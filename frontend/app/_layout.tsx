import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppStore } from "../src/store/useStore";

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);
  const barStyle = theme === "pink_vibrant" ? "light" : "dark";

  return (
    <> 
      <StatusBar style={barStyle} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}