import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { formatMoney, type InventoryItem } from "@/constants/pharmacy";
import { acquireSyncLock, initLocalDatabase, markOperationFailed, markOperationSynced, readInventory, readPendingOperations, queueOperation, releaseSyncLock, saveInventory } from "@/lib/local-db";
import { trpc } from "@/lib/trpc";

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minimum, setMinimum] = useState("");
  const syncPending = trpc.sync.push.useMutation();

  useEffect(() => {
    initLocalDatabase();
    const timer = setTimeout(() => {
      const stored = readInventory();
      if (stored.length > 0) setItems(stored);
      else saveInventory([]);
      if (acquireSyncLock()) {
        const pending = readPendingOperations();
        const operations = pending.flatMap((operation) => { try { return [{ id: operation.id, operationId: operation.operation_id, operationType: operation.operation_type as "product.create" | "sale.create", payload: JSON.parse(operation.payload) }]; } catch { return []; } });
        if (operations.length) syncPending.mutate({ operations }, { onSuccess: (result) => { result.syncedIds.forEach(markOperationSynced); releaseSyncLock(); }, onError: () => { pending.forEach((operation) => markOperationFailed(operation.id)); releaseSyncLock(); } }); else releaseSyncLock();
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.category} ${item.batch}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  const lowStockCount = items.filter((item) => item.stock <= item.minimum).length;
  const nearExpiryCount = items.filter((item) => item.status === "ينتهي قريبًا").length;

  const addProduct = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const next: InventoryItem = { id: `local-${Date.now()}`, name: trimmedName, category: category.trim() || "عام", stock: Number(stock) || 0, minimum: Number(minimum) || 5, expiry: "غير محدد", batch: "محلي", price: Number(price) || 0, status: (Number(stock) || 0) <= (Number(minimum) || 5) ? "منخفض" : "جيد" };
    const updated = [next, ...items];
    setItems(updated);
    saveInventory(updated);
    queueOperation("product.create", next);
    setName(""); setCategory(""); setPrice(""); setStock(""); setMinimum(""); setShowAdd(false);
  };

  return <ScreenContainer><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><View style={styles.header}><View><Text style={styles.kicker}>الأصناف والدفعات</Text><Text style={styles.title}>المخزون</Text></View><Pressable onPress={() => setShowAdd(true)} style={styles.addButton}><Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addText}>إضافة صنف</Text></Pressable></View><View style={styles.topRow}><View style={styles.stockCard}><Text style={styles.cardLabel}>الأصناف المحلية</Text><Text style={styles.cardValue}>{items.length}</Text><Text style={styles.cardHint}>محفوظة على الهاتف</Text></View><View style={[styles.stockCard, styles.warningCard]}><Text style={styles.cardLabel}>تحتاج متابعة</Text><Text style={styles.cardValue}>{lowStockCount + nearExpiryCount}</Text><Text style={styles.cardHint}>{lowStockCount} نقص · {nearExpiryCount} انتهاء قريب</Text></View></View><View style={styles.search}><Ionicons name="search-outline" size={19} color="#94A3B8" /><TextInput value={query} onChangeText={setQuery} placeholder="ابحث عن دواء أو دفعة" placeholderTextColor="#94A3B8" style={styles.input} /><Ionicons name="barcode-outline" size={20} color="#0F8A70" /></View><View style={styles.notice}><Ionicons name="cloud-offline-outline" size={19} color="#B45309" /><Text style={styles.noticeText}>يُحفظ الصنف محليًا فورًا، وتتم مزامنته عند توفر الاتصال.</Text></View><Text style={styles.sectionTitle}>قائمة الأصناف ({filtered.length})</Text><View style={styles.list}>{filtered.map((item) => <View key={item.id} style={styles.item}><View style={[styles.itemIcon, item.status === "جيد" ? styles.okIcon : item.status === "منخفض" ? styles.lowIcon : styles.expiryIcon]}><Ionicons name={item.status === "جيد" ? "checkmark" : item.status === "منخفض" ? "arrow-down" : "time-outline"} size={18} color={item.status === "جيد" ? "#15803D" : item.status === "منخفض" ? "#DC2626" : "#B45309"} /></View><View style={styles.itemCopy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemMeta}>{item.category} · دفعة {item.batch}</Text><Text style={styles.itemMeta}>انتهاء {item.expiry} · سعر البيع {formatMoney(item.price)}</Text></View><View style={styles.stock}><Text style={styles.stockNumber}>{item.stock}</Text><Text style={styles.stockLabel}>متوفر</Text><Text style={[styles.itemStatus, item.status === "جيد" ? styles.good : item.status === "منخفض" ? styles.low : styles.expiry]}>{item.status}</Text></View></View>)}</View></ScrollView><Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}><View style={styles.modalBackdrop}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>إضافة صنف جديد</Text><Pressable onPress={() => setShowAdd(false)}><Ionicons name="close" size={22} color="#64748B" /></Pressable></View><TextInput value={name} onChangeText={setName} placeholder="اسم الدواء أو الصنف" placeholderTextColor="#94A3B8" style={styles.field} /><TextInput value={category} onChangeText={setCategory} placeholder="التصنيف" placeholderTextColor="#94A3B8" style={styles.field} /><View style={styles.fieldRow}><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="سعر البيع" placeholderTextColor="#94A3B8" style={[styles.field, styles.half]} /><TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="الكمية" placeholderTextColor="#94A3B8" style={[styles.field, styles.half]} /></View><TextInput value={minimum} onChangeText={setMinimum} keyboardType="number-pad" placeholder="الحد الأدنى للمخزون" placeholderTextColor="#94A3B8" style={styles.field} /><Pressable onPress={addProduct} disabled={!name.trim()} style={[styles.saveButton, !name.trim() && styles.disabled]}><Text style={styles.saveText}>حفظ الصنف محليًا</Text></Pressable><Text style={styles.modalHint}>سيُضاف إلى قائمة المزامنة تلقائيًا.</Text></View></View></Modal></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 40, gap: 14, backgroundColor: "#F7FAF9", flexGrow: 1 }, header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, kicker: { color: "#0F8A70", fontSize: 12, fontWeight: "800", textAlign: "right" }, title: { color: "#0F172A", fontSize: 25, fontWeight: "800", textAlign: "right" }, addButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, backgroundColor: "#0F8A70", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 10 }, addText: { color: "#FFF", fontWeight: "800", fontSize: 11 }, topRow: { flexDirection: "row-reverse", gap: 10 }, stockCard: { flex: 1, backgroundColor: "#0F8A70", borderRadius: 18, padding: 15 }, warningCard: { backgroundColor: "#243B53" }, cardLabel: { color: "#CBEFE3", fontSize: 12, textAlign: "right" }, cardValue: { color: "#FFF", fontSize: 27, fontWeight: "800", textAlign: "right", marginTop: 9 }, cardHint: { color: "#D6E8E3", fontSize: 11, textAlign: "right", marginTop: 3 }, search: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderColor: "#E5EEEB", borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 }, input: { flex: 1, textAlign: "right", color: "#1E293B", paddingVertical: 13, fontSize: 12 }, notice: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 13, padding: 12 }, noticeText: { flex: 1, color: "#92400E", fontSize: 12, lineHeight: 19, textAlign: "right" }, sectionTitle: { textAlign: "right", color: "#0F172A", fontSize: 16, fontWeight: "800", marginTop: 3 }, list: { backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1, borderColor: "#E5EEEB", paddingHorizontal: 12 }, item: { flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EDF2F0" }, itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, okIcon: { backgroundColor: "#DCFCE7" }, lowIcon: { backgroundColor: "#FEE2E2" }, expiryIcon: { backgroundColor: "#FEF3C7" }, itemCopy: { flex: 1 }, itemName: { textAlign: "right", color: "#1E293B", fontWeight: "800", fontSize: 12 }, itemMeta: { textAlign: "right", color: "#94A3B8", fontSize: 10, marginTop: 4 }, stock: { alignItems: "flex-end" }, stockNumber: { color: "#0F172A", fontSize: 16, fontWeight: "800" }, stockLabel: { color: "#94A3B8", fontSize: 10 }, itemStatus: { fontSize: 10, fontWeight: "700", marginTop: 4 }, good: { color: "#15803D" }, low: { color: "#DC2626" }, expiry: { color: "#B45309" }, modalBackdrop: { flex: 1, backgroundColor: "#0F172A88", justifyContent: "flex-end" }, modal: { backgroundColor: "#FFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, gap: 11 }, modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }, modalTitle: { color: "#0F172A", fontSize: 19, fontWeight: "800", textAlign: "right" }, field: { backgroundColor: "#F7FAF9", borderWidth: 1, borderColor: "#DDEAE5", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, textAlign: "right", color: "#1E293B", fontSize: 13 }, fieldRow: { flexDirection: "row-reverse", gap: 9 }, half: { flex: 1 }, saveButton: { backgroundColor: "#0F8A70", borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 4 }, disabled: { backgroundColor: "#B8D8CF" }, saveText: { color: "#FFF", fontWeight: "800", fontSize: 13 }, modalHint: { color: "#94A3B8", fontSize: 11, textAlign: "center" } });
