import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pulse.performance",
  appName: "FORGE",
  webDir: "out",
  backgroundColor: "#f8fafc",
  android: { backgroundColor: "#f8fafc" },
  ios: { backgroundColor: "#f8fafc", contentInset: "automatic" },
};

export default config;
