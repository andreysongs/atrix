import { Capacitor } from "@capacitor/core";
import { registerPushDevice } from "@/lib/pulse-api";

let initialized = false;

export async function initializePushNotifications() {
  if (initialized || !Capacitor.isNativePlatform()) return false;
  initialized = true;
  const { PushNotifications } = await import("@capacitor/push-notifications");

  await PushNotifications.addListener("registration", (registration) => {
    const platform = Capacitor.getPlatform();
    if (platform !== "android" && platform !== "ios") return;
    void registerPushDevice({ token: registration.value, platform, appVersion: "0.1.0", locale: navigator.language }).catch(() => undefined);
  });
  await PushNotifications.addListener("registrationError", (error) => console.warn("Push registration failed", error));

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return false;
  await PushNotifications.register();
  return true;
}
