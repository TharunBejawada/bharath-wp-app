// Import styles first
import "../global.css";

// --------------------------------------------------------
// DO NOT REMOVE THIS COMMENT
// It prevents VS Code from re-ordering the CSS import above
// --------------------------------------------------------

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(user)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}