import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const rawBundleId = "space.manus.smartchat.t056416101792001";
const bundleId = rawBundleId.replace(/[-_]/g, ".").replace(/[^a-zA-Z0-9.]/g, "").replace(/\.+/g, ".").replace(/^\.+|\.+$/g, "").toLowerCase().split(".").map((segment) => /^[a-zA-Z]/.test(segment) ? segment : "x" + segment).join(".") || "space.manus.app";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const publicRuntime = {
  oauthPortalUrl: process.env.MANUS_OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  oauthServerUrl: process.env.MANUS_OAUTH_API_URL ?? process.env.OAUTH_SERVER_URL ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.MANUS_PROJECT_ID ?? process.env.VITE_APP_ID ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
};

const config = {
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663939710966/PBiVvcOvllbFbiNF.png",
  name: "مساعدي الذكي — صيدلية",
  slug: "smartchat",
  version: "1.0.0",
  extra: publicRuntime,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: schemeFromBundleId,
  userInterfaceStyle: "automatic",
  ios: { supportsTablet: true, bundleIdentifier: bundleId, infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: { adaptiveIcon: { backgroundColor: "#E9F8F2", foregroundImage: "./assets/images/android-icon-foreground.png", backgroundImage: "./assets/images/android-icon-background.png", monochromeImage: "./assets/images/android-icon-monochrome.png" }, predictiveBackGestureEnabled: false, package: bundleId, permissions: ["POST_NOTIFICATIONS"], intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: schemeFromBundleId, host: "*" }], category: ["BROWSABLE", "DEFAULT"] }] },
  web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
  plugins: ["expo-asset", "expo-router", "expo-sqlite", ["expo-audio", { microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone." }], ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }], ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#F7FAF9", dark: { backgroundColor: "#0F172A" } }], ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } }]],
  experiments: { typedRoutes: true, reactCompiler: true },
} as ExpoConfig & { logoUrl: string };

export default config;
