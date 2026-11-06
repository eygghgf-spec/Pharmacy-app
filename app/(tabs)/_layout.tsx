import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.tint, tabBarInactiveTintColor: "#94A3B8", tabBarButton: HapticTab, tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 58 + bottomPadding, backgroundColor: "#FFFFFF", borderTopColor: "#E5EEEB", borderTopWidth: 0.5 }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}><Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} /><Tabs.Screen name="sales" options={{ title: "المبيعات", tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} /> }} /><Tabs.Screen name="inventory" options={{ title: "المخزون", tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} /> }} /><Tabs.Screen name="reports" options={{ title: "التقارير", tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} /><Tabs.Screen name="assistant" options={{ title: "Gemini", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} /> }} /></Tabs>;
}
