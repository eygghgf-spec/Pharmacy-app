import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type ChatMessage = { role: "user" | "assistant"; content: string };
const starter: ChatMessage = { role: "assistant", content: "مرحبًا، أنا مساعدك الذكي للصيدلية. اسألني عن المبيعات أو المخزون أو قراءة مؤشرات اليوم." };
const prompts = ["ما الأصناف التي تحتاج طلب توريد؟", "لخّص أداء المبيعات اليوم", "كيف أراجع الأصناف القريبة من الانتهاء؟"];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([starter]);
  const [draft, setDraft] = useState("");
  const chat = trpc.assistant.chat.useMutation();
  const send = async (text = draft) => {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    try {
      const result = await chat.mutateAsync({ messages: next.slice(-10) });
      setMessages((current) => [...current, { role: "assistant", content: result.text }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "تعذر الاتصال بالمساعد الآن. تحقق من الاتصال وحاول مرة أخرى." }]);
    }
  };
  return <ScreenContainer><KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}><View style={styles.header}><View style={styles.headerIcon}><Ionicons name="sparkles" size={22} color="#FFF" /></View><View style={styles.headerCopy}><Text style={styles.kicker}>مدعوم بـ Gemini</Text><Text style={styles.title}>مساعد الصيدلية</Text></View><Pressable onPress={() => setMessages([starter])}><Ionicons name="refresh-outline" size={21} color="#0F8A70" /></Pressable></View><View style={styles.notice}><Ionicons name="lock-closed-outline" size={15} color="#0F8A70" /><Text style={styles.noticeText}>تُرسل الرسائل إلى خادم آمن ولا يظهر مفتاح Gemini داخل الهاتف.</Text></View><FlatList data={messages} keyExtractor={(_, index) => String(index)} contentContainerStyle={styles.messages} renderItem={({ item }) => <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}><Text style={[styles.bubbleText, item.role === "user" ? styles.userText : styles.assistantText]}>{item.content}</Text></View>} ListHeaderComponent={<View style={styles.promptWrap}>{messages.length === 1 && prompts.map((prompt) => <Pressable key={prompt} onPress={() => send(prompt)} style={({ pressed }) => [styles.prompt, pressed && { opacity: 0.65 }]}><Text style={styles.promptText}>{prompt}</Text><Ionicons name="arrow-up-outline" size={15} color="#0F8A70" /></Pressable>)}</View>} /><View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="اكتب سؤالك عن الصيدلية..." placeholderTextColor="#94A3B8" multiline style={styles.input} /><Pressable disabled={chat.isPending || !draft.trim()} onPress={() => send()} style={[styles.send, (!draft.trim() || chat.isPending) && styles.sendDisabled]}><Ionicons name={chat.isPending ? "ellipsis-horizontal" : "arrow-up"} size={19} color="#FFF" /></Pressable></View></KeyboardAvoidingView></ScreenContainer>;
}
const styles = StyleSheet.create({ wrap: { flex: 1, padding: 20, backgroundColor: "#F7FAF9" }, header: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingBottom: 14 }, headerIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#0F8A70", alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1 }, kicker: { color: "#0F8A70", fontSize: 11, fontWeight: "800", textAlign: "right" }, title: { color: "#0F172A", fontSize: 21, fontWeight: "800", textAlign: "right", marginTop: 3 }, notice: { flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#E9F8F2", borderRadius: 12, padding: 10 }, noticeText: { flex: 1, textAlign: "right", color: "#166534", fontSize: 10, lineHeight: 16 }, messages: { paddingVertical: 15, gap: 10, flexGrow: 1, justifyContent: "flex-end" }, promptWrap: { gap: 8, marginBottom: 10 }, prompt: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#D8ECE5", borderRadius: 13, padding: 12 }, promptText: { color: "#334155", fontSize: 12, textAlign: "right" }, bubble: { maxWidth: "88%", padding: 13, borderRadius: 17 }, userBubble: { alignSelf: "flex-end", backgroundColor: "#0F8A70", borderBottomRightRadius: 5 }, assistantBubble: { alignSelf: "flex-start", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5EEEB", borderBottomLeftRadius: 5 }, bubbleText: { textAlign: "right", fontSize: 13, lineHeight: 21 }, userText: { color: "#FFF" }, assistantText: { color: "#1E293B" }, composer: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8, backgroundColor: "#FFF", borderRadius: 17, borderWidth: 1, borderColor: "#D8E8E2", padding: 7 }, input: { flex: 1, maxHeight: 90, minHeight: 42, textAlign: "right", color: "#1E293B", paddingHorizontal: 10, paddingTop: 10, fontSize: 13 }, send: { width: 39, height: 39, borderRadius: 13, backgroundColor: "#0F8A70", alignItems: "center", justifyContent: "center" }, sendDisabled: { backgroundColor: "#B8D8CF" } });
