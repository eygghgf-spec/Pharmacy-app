import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const beginLogin = async () => {
    try { setError(""); setLoading(true); await startOAuthLogin(); } catch (e) { setError(e instanceof Error ? e.message : "تعذر فتح صفحة تسجيل الدخول"); setLoading(false); }
  };
  return <SafeAreaView style={styles.safe}><View style={styles.background}><View style={styles.logo}><Ionicons name="medkit" size={38} color="#FFF" /></View><Text style={styles.title}>مساعدي الذكي</Text><Text style={styles.subtitle}>نظام إدارة الصيدلية والمحاسبة</Text><View style={styles.card}><Text style={styles.cardTitle}>تسجيل الدخول</Text><Text style={styles.cardText}>سجّل الدخول للوصول إلى بيانات الصيدلية والفواتير والمخزون.</Text><Pressable onPress={beginLogin} disabled={loading} style={[styles.button, loading && styles.disabled]}>{loading ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="log-in-outline" size={20} color="#FFF" /><Text style={styles.buttonText}>المتابعة لتسجيل الدخول</Text></>}</Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}<Text style={styles.security}><Ionicons name="shield-checkmark-outline" size={15} color="#0F8A70" /> جلسة مشفرة وصلاحيات حسب دور المستخدم</Text></View><Text style={styles.footer}>للمدير والكاشير والمخزن والمحاسب</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#0F8A70" }, background: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, logo: { width: 78, height: 78, borderRadius: 25, backgroundColor: "#42B59C", alignItems: "center", justifyContent: "center", marginBottom: 16 }, title: { color: "#FFF", fontSize: 28, fontWeight: "800" }, subtitle: { color: "#D6F4EA", fontSize: 13, marginTop: 7 }, card: { width: "100%", backgroundColor: "#FFF", borderRadius: 24, padding: 22, marginTop: 32, gap: 13 }, cardTitle: { color: "#0F172A", fontSize: 21, fontWeight: "800", textAlign: "right" }, cardText: { color: "#64748B", lineHeight: 21, fontSize: 13, textAlign: "right" }, button: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0F8A70", borderRadius: 14, paddingVertical: 15, marginTop: 4 }, disabled: { opacity: 0.65 }, buttonText: { color: "#FFF", fontWeight: "800", fontSize: 13 }, error: { color: "#DC2626", textAlign: "right", fontSize: 12 }, security: { color: "#64748B", textAlign: "center", fontSize: 11 }, footer: { color: "#D6F4EA", fontSize: 11, marginTop: 18 } });
