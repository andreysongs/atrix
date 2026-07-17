import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pulse.performance",
  appName: "Pulse",
  webDir: "out",
  backgroundColor: "#06080d",
  android: { backgroundColor: "#06080d" },
  ios: { backgroundColor: "#06080d", contentInset: "automatic" },
};

export default config;
