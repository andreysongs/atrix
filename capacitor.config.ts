import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pulse.performance",
  appName: "OLYMPUS AI",
  webDir: ".next-build",
  backgroundColor: "#030303",
  android: { backgroundColor: "#030303" },
  ios: { backgroundColor: "#030303", contentInset: "automatic" },
};

export default config;
