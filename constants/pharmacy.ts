export type SaleStatus = "مدفوعة" | "آجلة" | "مسترجعة";

export type Sale = {
  id: string;
  customer: string;
  total: number;
  time: string;
  status: SaleStatus;
  items: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minimum: number;
  expiry: string;
  batch: string;
  price: number;
  status: "جيد" | "منخفض" | "ينتهي قريبًا";
};

export const sales: Sale[] = [
  { id: "#INV-1048", customer: "عميل نقدي", total: 186.5, time: "منذ 8 دقائق", status: "مدفوعة", items: 4 },
  { id: "#INV-1047", customer: "مؤسسة الندى", total: 742, time: "منذ 32 دقيقة", status: "آجلة", items: 9 },
  { id: "#INV-1046", customer: "عميل نقدي", total: 94, time: "منذ ساعة", status: "مدفوعة", items: 2 },
  { id: "#INV-1045", customer: "صيدلية الشفاء", total: 325, time: "منذ ساعتين", status: "مسترجعة", items: 6 },
];

export const inventory: InventoryItem[] = [
  { id: "1", name: "باراسيتامول 500 ملغ", category: "مسكنات", stock: 84, minimum: 30, expiry: "2027/09", batch: "P-2409", price: 12.5, status: "جيد" },
  { id: "2", name: "أوجمنتين 625 ملغ", category: "مضادات حيوية", stock: 12, minimum: 20, expiry: "2026/04", batch: "A-2611", price: 68, status: "منخفض" },
  { id: "3", name: "فيتامين د3 1000 وحدة", category: "فيتامينات", stock: 28, minimum: 15, expiry: "2026/02", batch: "V-2502", price: 44, status: "ينتهي قريبًا" },
  { id: "4", name: "شراب كحة للأطفال", category: "أدوية أطفال", stock: 46, minimum: 20, expiry: "2027/11", batch: "C-2412", price: 21.75, status: "جيد" },
  { id: "5", name: "جهاز قياس السكر", category: "أجهزة طبية", stock: 7, minimum: 10, expiry: "2029/01", batch: "G-2501", price: 119, status: "منخفض" },
  { id: "6", name: "مرطب للبشرة الحساسة", category: "عناية شخصية", stock: 31, minimum: 12, expiry: "2027/06", batch: "S-2506", price: 55, status: "جيد" },
];

export const weeklyRevenue = [
  { day: "السبت", value: 2180 },
  { day: "الأحد", value: 2840 },
  { day: "الاثنين", value: 2460 },
  { day: "الثلاثاء", value: 3310 },
  { day: "الأربعاء", value: 2980 },
  { day: "الخميس", value: 3570 },
  { day: "اليوم", value: 2485 },
];

export const formatMoney = (value: number) => `${value.toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
