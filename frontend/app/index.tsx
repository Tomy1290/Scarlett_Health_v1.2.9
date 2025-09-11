import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { displayDate, toKey, parseGermanOrShort } from "../src/utils/date";
import { LineChart } from "react-native-gifted-charts";

function useThemeColors(theme: string) {
  if (theme === "pink_pastel") {
    return { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" };
  }
  if (theme === "pink_vibrant") {
    return { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" };
  }
  return { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const c = useThemeColors(theme);
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function Home() {
  const {
    theme,
    language,
    currentDate,
    days,
    ensureDay,
    goPrevDay,
    goNextDay,
    goToday,
    togglePill,
    incDrink,
    toggleFlag,
    setWeight,
    goal,
    setGoal,
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    chat,
    addChat,
    saved,
    addSaved,
    setLanguage,
    setTheme,
    appVersion,
    reminders,
  } = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(theme);

  // Ensure day exists
  React.useEffect(() => {
    ensureDay(currentDate);
  }, [currentDate]);

  const todayKey = toKey(new Date());
  const d = days[currentDate];

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState(d?.weight ? String(d.weight) : "");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalWeight, setGoalWeight] = useState("");
  const [goalDate, setGoalDate] = useState("");

  React.useEffect(() => {
    setWeightInput(d?.weight ? String(d.weight) : "");
  }, [currentDate, d?.weight]);

  const last7 = useMemo(() => {
    const arr: { value: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(new Date(currentDate));
      date.setDate(date.getDate() - i);
      const key = toKey(date);
      const w = days[key]?.weight ?? NaN;
      arr.push({ value: isNaN(w) ? 0 : w, label: date.getDate().toString() });
    }
    return arr;
  }, [currentDate, days]);

  // i18n minimal
  const t = (k: string) => {
    const dict: Record<string, Record<string, string>> = {
      de: {
        today: "Heute",
        pills: "Tabletten",
        morning: "Morgens",
        evening: "Abends",
        drinks: "Getränke &amp; Sport",
        water: "Wasser",
        coffee: "Kaffee",
        slimCoffee: "Abnehmkaffee",
        gingerGarlicTea: "Ingwer-Knoblauch-Tee",
        waterCure: "Wasserkur",
        sport: "Sport",
        weight: "Gewicht",
        enterWeight: "Gewicht eingeben",
        setGoal: "Ziel festlegen",
        goals: "Gewichtsziele",
        reminders: "Erinnerungen",
        achievements: "Nächste Erfolge",
        chat: "Gugi – Gesundheitschat",
        savedMessages: "Gespeicherte Nachrichten",
        settings: "Einstellungen",
        themes: "Themes",
        export: "Daten exportieren",
        import: "Daten importieren",
        version: "Version",
        language: "Sprache",
      },
      en: {
        today: "Today",
        pills: "Pills",
        morning: "Morning",
        evening: "Evening",
        drinks: "Drinks &amp; Sport",
        water: "Water",
        coffee: "Coffee",
        slimCoffee: "Slim coffee",
        gingerGarlicTea: "Ginger-garlic tea",
        waterCure: "Water cure",
        sport: "Sport",
        weight: "Weight",
        enterWeight: "Enter weight",
        setGoal: "Set goal",
        goals: "Weight goals",
        reminders: "Reminders",
        achievements: "Next achievements",
        chat: "Gugi – Health chat",
        savedMessages: "Saved messages",
        settings: "Settings",
        themes: "Themes",
        export: "Export data",
        import: "Import data",
        version: "Version",
        language: "Language",
      },
    };
    return dict[language]?.[k] ?? k;
  };

  const header = (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={goPrevDay} style={styles.iconBtn} accessibilityLabel="Prev day">
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.title, { color: colors.text }]}>Scarletts Gesundheitstracking</Text>
        <Text style={{ color: colors.muted, marginTop: 2 }}>{displayDate(new Date(currentDate))} • Lv {level}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={goToday} style={styles.iconBtn} accessibilityLabel={t("today")} >
          <Ionicons name="calendar" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goNextDay}
          style={[styles.iconBtn, { opacity: currentDate === todayKey ? 0.3 : 1 }]}
          disabled={currentDate === todayKey}
          accessibilityLabel="Next day"
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const pillRow = (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <ToggleButton
        icon="sunny"
        label={t("morning")}
        active={!!d?.pills.morning}
        onPress={() => togglePill(currentDate, "morning")}
        colors={colors}
      />
      <ToggleButton
        icon="moon"
        label={t("evening")}
        active={!!d?.pills.evening}
        onPress={() => togglePill(currentDate, "evening")}
        colors={colors}
      />
    </View>
  );

  const drinkRow = (
    <View style={{ gap: 12 }}>
      <CounterRow
        icon="water"
        label={t("water")}
        value={d?.drinks.water ?? 0}
        onAdd={() => incDrink(currentDate, "water", +1)}
        onSub={() => incDrink(currentDate, "water", -1)}
        colors={colors}
      />
      <CounterRow
        icon="cafe"
        label={t("coffee")}
        value={d?.drinks.coffee ?? 0}
        onAdd={() => incDrink(currentDate, "coffee", +1)}
        onSub={() => incDrink(currentDate, "coffee", -1)}
        colors={colors}
      />
      <ToggleRow icon="flame" label={t("slimCoffee")} active={!!d?.drinks.slimCoffee} onPress={() => toggleFlag(currentDate, "slimCoffee")} colors={colors} />
      <ToggleRow icon="leaf" label={t("gingerGarlicTea")} active={!!d?.drinks.gingerGarlicTea} onPress={() => toggleFlag(currentDate, "gingerGarlicTea")} colors={colors} />
      <ToggleRow icon="water" label={t("waterCure")} active={!!d?.drinks.waterCure} onPress={() => toggleFlag(currentDate, "waterCure")} colors={colors} />
      <ToggleRow icon="barbell" label={t("sport")} active={!!d?.drinks.sport} onPress={() => toggleFlag(currentDate, "sport")} colors={colors} />
    </View>
  );

  const weightCard = (
    <View>
      <Text style={{ color: colors.text, marginBottom: 8 }}>
        {t("weight")}: {d?.weight != null ? `${d?.weight.toFixed(1)} kg` : "–"}
      </Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <PrimaryButton icon="fitness" label={t("enterWeight")} onPress={() => setShowWeightModal(true)} colors={colors} />
        <PrimaryButton icon="flag" label={t("setGoal")} onPress={() => setShowGoalModal(true)} colors={colors} />
      </View>
      <View style={{ height: 180 }}>
        <LineChart
          data={last7}
          thickness={3}
          color={colors.primary}
          hideDataPoints
          noOfSections={4}
          yAxisTextStyle={{ color: colors.muted }}
          xAxisLabelTextStyle={{ color: colors.muted }}
          rulesColor={colors.muted}
          yAxisColor={colors.muted}
          xAxisColor={colors.muted}
          curved
        />
      </View>
    </View>
  );

  function handleSaveGoal() {
    if (d?.weight == null) {
      Alert.alert("Hinweis", "Bitte erst Gewicht eingeben");
      return;
    }
    const w = parseFloat(goalWeight.replace(",", "."));
    const parsed = parseGermanOrShort(goalDate || "");
    if (!isFinite(w) || !parsed) {
      Alert.alert("Fehler", "Bitte Gewicht und Datum korrekt angeben (TT.MM.JJJJ)");
      return;
    }
    const g = { targetWeight: w, targetDate: toKey(parsed), startWeight: d?.weight!, active: true };
    setGoal(g);
    setShowGoalModal(false);
  }

  function handleSaveWeight() {
    const w = parseFloat(weightInput.replace(",", "."));
    if (!isFinite(w)) {
      Alert.alert("Fehler", "Bitte ein gültiges Gewicht eingeben");
      return;
    }
    setWeight(currentDate, w);
    setShowWeightModal(false);
  }

  // Simple rule-based bot
  function botRespond(userText: string) {
    const msgs: string[] = [];
    const today = days[currentDate];
    const water = today?.drinks.water ?? 0;
    if (water < 6) msgs.push(language === "de" ? "Trinke heute noch etwas mehr Wasser – Ziel 6+ Gläser." : "Try to drink a bit more water today – aim for 6+ glasses.");
    const weights = Object.values(days)
      .filter((x) => x.weight != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (weights.length >= 2) {
      const delta = (weights[weights.length - 1].weight! - weights[0].weight!);
      if (delta < 0) msgs.push(language === "de" ? "Starke Arbeit – dein Gewicht geht nach unten!" : "Great job – your weight trend is down!");
      else if (delta > 0.2) msgs.push(language === "de" ? "Gewicht leicht gestiegen – bleib dran mit Ernährung und Bewegung." : "Weight slightly up – keep focusing on nutrition and activity.");
    }
    if (today?.drinks.sport) msgs.push(language === "de" ? "Sport heute abgehakt – super!" : "Sport done today – awesome!");
    if (msgs.length === 0) msgs.push(language === "de" ? "Ich bin für dich da – was möchtest du verbessern?" : "I'm here for you – what would you like to improve?");

    const reply = msgs.join(" \n");
    const botMsg = { id: String(Date.now() + 1), sender: "bot" as const, text: reply, createdAt: Date.now() };
    addChat(botMsg);
  }

  const [chatInput, setChatInput] = useState("");

  async function handleExport() {
    try {
      const state = useAppStore.getState();
      const json = JSON.stringify(state, null, 2);
      const { default: FileSystem } = await import("expo-file-system");
      const { shareAsync } = await import("expo-sharing");
      const uri = FileSystem.cacheDirectory + `scarlett-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await shareAsync(uri, { mimeType: "application/json" });
    } catch (e) {
      Alert.alert("Fehler", String(e));
    }
  }

  async function handleImport() {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const res = await DocumentPicker.getDocumentAsync({ type: "application/json", multiple: false });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const { default: FileSystem } = await import("expo-file-system");
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(content);
      // Basic safety: only take known fields
      useAppStore.setState({
        days: parsed.days ?? {},
        goal: parsed.goal,
        reminders: parsed.reminders ?? [],
        chat: parsed.chat ?? [],
        saved: parsed.saved ?? [],
        achievementsUnlocked: parsed.achievementsUnlocked ?? [],
        xp: parsed.xp ?? 0,
        language: parsed.language ?? "de",
        theme: parsed.theme ?? "pink_default",
        appVersion: parsed.appVersion ?? appVersion,
        currentDate: toKey(new Date()),
      });
      useAppStore.getState().recalcAchievements();
      Alert.alert(language === "de" ? "Import erfolgreich" : "Import successful");
    } catch (e) {
      Alert.alert("Fehler", String(e));
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <SectionCard title={t("pills")}>{pillRow}</SectionCard>
          <SectionCard title={t("drinks")}>{drinkRow}</SectionCard>
          <SectionCard title={t("weight")}>{weightCard}</SectionCard>
          <SectionCard title={t("achievements")}>
            <AchievementPreview />
          </SectionCard>
          <SectionCard title={t("chat")}>
            <View style={{ gap: 8 }}>
              {chat.slice(-5).map((m) => (
                <View key={m.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <Ionicons name={m.sender === "user" ? "person-circle" : "chatbubble-ellipses"} size={18} color={colors.muted} />
                  <Text style={{ color: colors.text, flex: 1 }}>{m.text}</Text>
                  {m.sender === "bot" ? (
                    <TouchableOpacity onPress={() => addSaved({ id: String(Date.now()), title: "Tipp", text: m.text, createdAt: Date.now() })}>
                      <Ionicons name="bookmark" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder={language === "de" ? "Nachricht…" : "Message…"}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.muted, color: colors.text }]}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (!chatInput.trim()) return;
                    const userMsg = { id: String(Date.now()), sender: "user" as const, text: chatInput.trim(), createdAt: Date.now() };
                    addChat(userMsg);
                    setChatInput("");
                    botRespond(userMsg.text);
                  }}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>
          <SectionCard title={t("savedMessages")}>
            {saved.length === 0 ? (
              <Text style={{ color: colors.muted }}>–</Text>
            ) : (
              saved.slice(0, 5).map((s) => (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="bookmark" size={16} color={colors.primary} />
                    <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{s.text}</Text>
                  </View>
                  <TouchableOpacity onPress={() => useAppStore.getState().deleteSaved(s.id)}>
                    <Ionicons name="trash" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SectionCard>
          <SectionCard title={t("settings")}>
            <View style={{ gap: 12 }}>
              <RowButton icon="color-palette" label={`${t("themes")}: ` + theme} onPress={() => cycleTheme()} colors={colors} />
              <RowButton icon="language" label={`${t("language")}: ` + (language === "de" ? "Deutsch" : "English")} onPress={() => setLanguage(language === "de" ? "en" : "de")} colors={colors} />
              <RowButton icon="cloud-download" label={t("export")} onPress={handleExport} colors={colors} />
              <RowButton icon="cloud-upload" label={t("import")} onPress={handleImport} colors={colors} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="information-circle" size={18} color={colors.muted} />
                <Text style={{ color: colors.muted }}>{t("version")}: {appVersion}</Text>
              </View>
            </View>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Weight Modal */}
      {showWeightModal ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t("enterWeight")} ({displayDate(new Date(currentDate))})</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="72.4"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.muted, color: colors.text }]}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <PrimaryButton label="Abbrechen" icon="close" onPress={() => setShowWeightModal(false)} colors={colors} outline />
              <PrimaryButton label="Speichern" icon="save" onPress={handleSaveWeight} colors={colors} />
            </View>
          </View>
        </View>
      ) : null}

      {/* Goal Modal */}
      {showGoalModal ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t("goals")} ({displayDate(new Date(currentDate))})</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder={language === 'de' ? 'Zielgewicht (kg)' : 'Target weight (kg)'}
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.muted, color: colors.text, marginBottom: 8 }]}
            />
            <TextInput
              keyboardType="numbers-and-punctuation"
              value={goalDate}
              onChangeText={setGoalDate}
              placeholder={language === 'de' ? 'Zieldatum (TT.MM.JJJJ)' : 'Target date (DD.MM.YYYY)'}
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.muted, color: colors.text }]}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <PrimaryButton label="Abbrechen" icon="close" onPress={() => setShowGoalModal(false)} colors={colors} outline />
              <PrimaryButton label="Ziel erstellen" icon="flag" onPress={handleSaveGoal} colors={colors} />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );

  function cycleTheme() {
    const list: any[] = ["pink_default", "pink_pastel", "pink_vibrant"]; // ThemeName[]
    const idx = list.indexOf(theme);
    const next = list[(idx + 1) % list.length] as any;
    setTheme(next);
  }
}

function ToggleButton({ icon, label, active, onPress, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggle, { borderColor: active ? colors.primary : colors.muted, backgroundColor: active ? colors.primary : "transparent" }]}>
      <Ionicons name={icon} size={16} color={active ? "#fff" : colors.text} />
      <Text style={{ color: active ? "#fff" : colors.text, marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CounterRow({ icon, label, value, onAdd, onSub, colors }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={18} color={colors.text} />
        <Text style={{ color: colors.text }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={onSub} style={[styles.roundBtn, { borderColor: colors.muted }]} accessibilityLabel="minus">
          <Ionicons name="remove" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, minWidth: 24, textAlign: "center" }}>{value}</Text>
        <TouchableOpacity onPress={onAdd} style={[styles.roundBtn, { borderColor: colors.muted }]} accessibilityLabel="plus">
          <Ionicons name="add" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToggleRow({ icon, label, active, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={18} color={colors.text} />
        <Text style={{ color: colors.text }}>{label}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: active ? colors.primary : "transparent", borderColor: colors.muted }]}>
        <Text style={{ color: active ? "#fff" : colors.text }}>{active ? "On" : "Off"}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PrimaryButton({ icon, label, onPress, colors, outline }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.primaryBtn, outline ? { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary } : { backgroundColor: colors.primary }]}>
      {icon ? <Ionicons name={icon} size={16} color={outline ? colors.primary : "#fff"} /> : null}
      {label ? <Text style={{ color: outline ? colors.primary : "#fff", marginLeft: 8 }}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

function RowButton({ icon, label, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={{ color: colors.text, marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function AchievementPreview() {
  const { achievementsUnlocked, xp } = useAppStore();
  const next = useMemo(() => {
    const all: { id: string; title: string; percent: number }[] = [
      { id: "first_weight", title: "Erstes Gewicht", percent: achievementsUnlocked.includes("first_weight") ? 100 : 20 },
      { id: "seven_days", title: "7 Tage Gewichte", percent: achievementsUnlocked.includes("seven_days") ? 100 : 60 },
      { id: "water_10", title: "10x Wasser an einem Tag", percent: achievementsUnlocked.includes("water_10") ? 100 : 40 },
    ];
    return all.slice(0, 3);
  }, [achievementsUnlocked, xp]);
  const theme = useAppStore((s) => s.theme);
  const colors = useThemeColors(theme);
  return (
    <View style={{ gap: 12 }}>
      {next.map((a) => (
        <View key={a.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.text }}>{a.title}</Text>
            <Text style={{ color: colors.muted }}>{a.percent}%</Text>
          </View>
          <View style={{ height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
            <View style={{ width: `${a.percent}%`, height: 8, backgroundColor: colors.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCenter: { alignItems: "center" },
  iconBtn: { padding: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  card: { borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  roundBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  toggle: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  badge: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  primaryBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flex: 1 },
  modalOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modalCard: { width: "90%", borderRadius: 12, padding: 16 },
});