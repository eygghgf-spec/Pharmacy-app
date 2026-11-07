import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, type ColorValue } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.tint, tabBarInactiveTintColor: "#94A3B8", tabBarButton: HapticTab, tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 58 + bottomPadding, backgroundColor: "#FFFFFF", borderTopColor: "#E5EEEB", borderTopWidth: 0.5 }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" }}}>
    <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: tabIcon("home-outline") }} />
    <Tabs.Screen name="sales" options={{ title: "المبيعات", tabBarIcon: tabIcon("cart-outline") }} />
    <Tabs.Screen name="inventory" options={{ title: "المخزون", tabBarIcon: tabIcon("cube-outline") }} />
    <Tabs.Screen name="purchases" options={{ title: "المشتريات", tabBarIcon: tabIcon("bag-add-outline") }} />
    <Tabs.Screen name="expenses" options={{ title: "المصروفات", tabBarIcon: tabIcon("receipt-outline") }} />
    <Tabs.Screen name="returns" options={{ title: "المرتجعات", tabBarIcon: tabIcon("return-down-back-outline") }} />
    <Tabs.Screen name="users" options={{ title: "المستخدمون", tabBarIcon: tabIcon("people-outline") }} />
    <Tabs.Screen name="reports" options={{ title: "التقارير", tabBarIcon: tabIcon("bar-chart-outline") }} />
    <Tabs.Screen name="assistant" options={{ title: "Gemini", tabBarIcon: tabIcon("sparkles-outline") }} />
  </Tabs>;
}
