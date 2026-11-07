import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { formatMoney } from "@/constants/pharmacy";
import { trpc } from "@/lib/trpc";

const alerts = [
  { title: "أصناف قريبة من الانتهاء", detail: "3 أصناف خلال 90 يومًا", tone: "warning", icon: "time-outline" },
  { title: "مخزون منخفض", detail: "2 صنف تحت الحد الأدنى", tone: "danger", icon: "alert-circle-outline" },
];

export default function HomeScreen() {
  const router = useRouter();
  const summaryQuery = trpc.dashboard.summary.useQuery();
  const salesQuery = trpc.sales.list.useQuery();
  const summary = summaryQuery.data ?? { salesTodayCents: 0, invoiceCount: 0, averageSaleCents: 0, productCount: 0 };
  const metrics = [
    { label: "مبيعات اليوم", value: formatMoney(summary.salesTodayCents / 100), delta: `${summary.invoiceCount} فاتورة`, icon: "trending-up", color: "#0F8A70" },
    { label: "متوسط الفاتورة", value: formatMoney(summary.averageSaleCents / 100), delta: "بيانات فعلية", icon: "analytics-outline", color: "#2563EB" },
    { label: "الأصناف النشطة", value: String(summary.productCount), delta: "من قاعدة البيانات", icon: "cube-outline", color: "#7C3AED" },
    { label: "الذمم المستحقة", value: "—", delta: "غير مفعلة", icon: "wallet-outline", color: "#D97706" },
  ] as const;
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>الفرع الرئيسي · اليوم 12 يونيو</Text>
            <Text style={styles.title}>صباح الخير، مدير الصيدلية</Text>
            <Text style={styles.subtitle}>هذه صورة سريعة عن أداء العمل اليوم.</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>ن</Text></View>
        </View>

        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>النظام يعمل بشكل طبيعي</Text>
          <Text style={styles.demoText}>{summaryQuery.isLoading ? "جارٍ التحميل" : "بيانات فعلية"}</Text>
        </View>

        <View style={styles.metricsGrid}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
                <Ionicons name={metric.icon as never} size={19} color={metric.color} />
              </View>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={[styles.metricDelta, { color: metric.color }]}>{metric.delta}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
          <Text style={styles.sectionHint}>اختصارات يومية</Text>
        </View>
        <View style={styles.quickRow}>
          {[{ label: "بيع جديد", icon: "cart-outline", color: "#0F8A70", route: "/(tabs)/sales" }, { label: "إضافة صنف", icon: "add-circle-outline", color: "#2563EB", route: "/(tabs)/inventory" }, { label: "شراء", icon: "bag-add-outline", color: "#7C3AED", route: "/(tabs)/inventory" }, { label: "مصروف", icon: "receipt-outline", color: "#D97706", route: "/(tabs)/reports" }].map((item) => (
            <Pressable key={item.label} onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
              <Ionicons name={item.icon as never} size={22} color={item.color} />
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>تنبيهات تحتاج انتباهك</Text>
          <Text style={styles.linkText}>عرض الكل</Text>
        </View>
        {alerts.map((alert) => (
          <View key={alert.title} style={styles.alertCard}>
            <View style={[styles.alertIcon, alert.tone === "warning" ? styles.warningBg : styles.dangerBg]}>
              <Ionicons name={alert.icon as never} size={21} color={alert.tone === "warning" ? "#B45309" : "#DC2626"} />
            </View>
            <View style={styles.alertCopy}><Text style={styles.alertTitle}>{alert.title}</Text><Text style={styles.alertDetail}>{alert.detail}</Text></View>
            <Ionicons name="chevron-back" size={18} color="#94A3B8" />
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>آخر الفواتير</Text>
          <Text style={styles.linkText}>كل المبيعات</Text>
        </View>
        <View style={styles.salesCard}>
          {(salesQuery.data ?? []).slice(0, 3).map((sale, index) => (
            <View key={sale.id} style={[styles.saleRow, index > 0 && styles.rowBorder]}>
              <View style={styles.saleIcon}><Ionicons name="receipt-outline" size={18} color="#0F8A70" /></View>
              <View style={styles.saleCopy}><Text style={styles.saleId}>{sale.invoiceNumber} · {sale.customerName}</Text><Text style={styles.saleTime}>{new Date(sale.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</Text></View>
              <View style={styles.saleAmount}><Text style={styles.amountText}>{formatMoney(sale.totalCents / 100)}</Text><Text style={[styles.saleStatus, sale.status === "paid" ? styles.paid : sale.status === "credit" ? styles.credit : styles.refunded]}>{sale.status === "paid" ? "مدفوعة" : sale.status === "credit" ? "آجلة" : "مسترجعة"}</Text></View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 14, backgroundColor: "#F7FAF9" },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  eyebrow: { textAlign: "right", color: "#0F8A70", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  title: { textAlign: "right", color: "#0F172A", fontSize: 23, fontWeight: "800" },
  subtitle: { textAlign: "right", color: "#64748B", fontSize: 13, marginTop: 5 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#0F8A70" },
  avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  statusBar: { flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#E9F8F2", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  statusText: { flex: 1, textAlign: "right", color: "#166534", fontSize: 12, fontWeight: "700" },
  demoText: { color: "#64748B", fontSize: 11 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48.5%", minHeight: 132, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E5EEEB" },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 8 },
  metricLabel: { textAlign: "right", color: "#64748B", fontSize: 12, marginBottom: 5 },
  metricValue: { textAlign: "right", color: "#0F172A", fontSize: 17, fontWeight: "800" },
  metricDelta: { textAlign: "right", fontSize: 11, fontWeight: "700", marginTop: 5 },
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  sectionTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  sectionHint: { color: "#94A3B8", fontSize: 12 },
  linkText: { color: "#0F8A70", fontSize: 12, fontWeight: "700" },
  quickRow: { flexDirection: "row-reverse", gap: 8 },
  quickAction: { flex: 1, minHeight: 77, backgroundColor: "#FFFFFF", borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: "#E5EEEB" },
  quickLabel: { color: "#334155", fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  alertCard: { minHeight: 66, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5EEEB", flexDirection: "row-reverse", alignItems: "center", padding: 12, gap: 11 },
  alertIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  warningBg: { backgroundColor: "#FEF3C7" },
  dangerBg: { backgroundColor: "#FEE2E2" },
  alertCopy: { flex: 1 },
  alertTitle: { textAlign: "right", color: "#1E293B", fontSize: 13, fontWeight: "800" },
  alertDetail: { textAlign: "right", color: "#64748B", fontSize: 12, marginTop: 4 },
  salesCard: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E5EEEB", paddingHorizontal: 13 },
  saleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: "#EDF2F0" },
  saleIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#E9F8F2", alignItems: "center", justifyContent: "center" },
  saleCopy: { flex: 1 },
  saleId: { textAlign: "right", color: "#1E293B", fontSize: 12, fontWeight: "800" },
  saleTime: { textAlign: "right", color: "#94A3B8", fontSize: 11, marginTop: 4 },
  saleAmount: { alignItems: "flex-end" },
  amountText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  saleStatus: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  paid: { color: "#16A34A" },
  credit: { color: "#D97706" },
  refunded: { color: "#DC2626" },
});
