import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppStore, useLevel } from "../src/store/useStore";
import { displayDate, toKey, parseGermanOrShort } from "../src/utils/date";
import { LineChart } from "react-native-gifted-charts";
import { useWindowDimensions } from "react-native";
import { computeAchievements } from "../src/achievements";
import { useRouter } from "expo-router";

function useThemeColors(theme: string) {
  const { width } = useWindowDimensions();
  const compact = width < 360; // z.B. kleine/enge Displays
  const base = theme === "pink_pastel"
    ? { bg: "#fff0f5", card: "#ffe4ef", primary: "#d81b60", text: "#3a2f33", muted: "#8a6b75" }
    : theme === "pink_vibrant"
    ? { bg: "#1b0b12", card: "#2a0f1b", primary: "#ff2d87", text: "#ffffff", muted: "#e59ab8" }
    : { bg: "#fde7ef", card: "#ffd0e0", primary: "#e91e63", text: "#2a1e22", muted: "#7c5866" };
  if (compact) { return { ...base, card: base.card, primary: base.primary, text: base.text, muted: base.muted }; }
  return base;
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
  const router = useRouter();
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
  } = useAppStore();
  const { level } = useLevel();
  const colors = useThemeColors(theme);

  React.useEffect(() => { ensureDay(currentDate); }, [currentDate]);
  const todayKey = toKey(new Date());
  const d = days[currentDate];

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState(d?.weight ? String(d.weight) : "");
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalWeight, setGoalWeight] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [newRemType, setNewRemType] = useState("");
  const [newRemTime, setNewRemTime] = useState("");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<'7'|'14'|'30'|'custom'>('7');
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  React.useEffect(() => { setWeightInput(d?.weight ? String(d.weight) : ""); }, [currentDate, d?.weight]);

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

  const t = (k: string) => {
    const dict: Record<string, Record<string, string>> = {
      de: { today: "Heute", pills: "Tabletten", morning: "Morgens", evening: "Abends", drinks: "Getränke & Sport", water: "Wasser", coffee: "Kaffee", slimCoffee: "Abnehmkaffee", gingerGarlicTea: "Ingwer-Knoblauch-Tee", waterCure: "Wasserkur", sport: "Sport", weight: "Gewicht", enterWeight: "Gewicht eingeben", setGoal: "Ziel festlegen", goals: "Gewichtsziele", reminders: "Erinnerungen", achievements: "Nächste Erfolge", chat: "Gugi – Gesundheitschat", savedMessages: "Gespeicherte Nachrichten", settings: "Einstellungen", themes: "Themes", export: "Daten exportieren", import: "Daten importieren", version: "Version", language: "Sprache", },
      en: { today: "Today", pills: "Pills", morning: "Morning", evening: "Evening", drinks: "Drinks & Sport", water: "Water", coffee: "Coffee", slimCoffee: "Slim coffee", gingerGarlicTea: "Ginger-garlic tea", waterCure: "Water cure", sport: "Sport", weight: "Weight", enterWeight: "Enter weight", setGoal: "Set goal", goals: "Weight goals", reminders: "Reminders", achievements: "Next achievements", chat: "Gugi – Health chat", savedMessages: "Saved messages", settings: "Settings", themes: "Themes", export: "Export data", import: "Import data", version: "Version", language: "Language", },
    };
    return dict[language]?.[k] ?? k;
  };

  const analysisSeries = useMemo(() => buildRange(days, analysisTab, customStart, customEnd), [days, analysisTab, customStart, customEnd]);
  const analysisData = useMemo(() => analysisSeries.map((s) => ({ value: typeof s.weight === 'number' ? s.weight : 0, label: s.date.slice(5) })), [analysisSeries]);
  const analysisSummary = useMemo(() => computeStats(analysisSeries), [analysisSeries]);

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
        <TouchableOpacity onPress={goNextDay} style={[styles.iconBtn, { opacity: currentDate === todayKey ? 0.3 : 1 }]} disabled={currentDate === todayKey} accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const pillRow = (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <ToggleButton icon="sunny" label={t("morning")} active={!!d?.pills.morning} onPress={() => togglePill(currentDate, "morning")} colors={colors} />
      <ToggleButton icon="moon" label={t("evening")} active={!!d?.pills.evening} onPress={() => togglePill(currentDate, "evening")} colors={colors} />
    </View>
  );

  const drinkRow = (
    <View style={{ gap: 12 }}>
      <CounterRow icon="water" label={t("water")} value={d?.drinks.water ?? 0} onAdd={() => incDrink(currentDate, "water", +1)} onSub={() => incDrink(currentDate, "water", -1)} colors={colors} />
      <CounterRow icon="cafe" label={t("coffee")} value={d?.drinks.coffee ?? 0} onAdd={() => incDrink(currentDate, "coffee", +1)} onSub={() => incDrink(currentDate, "coffee", -1)} colors={colors} />
      <ToggleRow icon="flame" label={t("slimCoffee")} active={!!d?.drinks.slimCoffee} onPress={() => toggleFlag(currentDate, "slimCoffee")} colors={colors} />
      <ToggleRow icon="leaf" label={t("gingerGarlicTea")} active={!!d?.drinks.gingerGarlicTea} onPress={() => toggleFlag(currentDate, "gingerGarlicTea")} colors={colors} />
      <ToggleRow icon="water" label={t("waterCure")} active={!!d?.drinks.waterCure} onPress={() => toggleFlag(currentDate, "waterCure")} colors={colors} />
      <ToggleRow icon="barbell" label={t("sport")} active={!!d?.drinks.sport} onPress={() => toggleFlag(currentDate, "sport")} colors={colors} />
    </View>
  );

  const weightCard = (
    <View>
      <Text style={{ color: colors.text, marginBottom: 8 }}>{t("weight")}: {d?.weight != null ? `${d?.weight.toFixed(1)} kg` : "–"}</Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <PrimaryButton icon="fitness" label={t("enterWeight")} onPress={() => setShowWeightModal(true)} colors={colors} />
        <PrimaryButton icon="flag" label={t("setGoal")} onPress={() => setShowGoalModal(true)} colors={colors} />
      </View>
      <View style={{ height: 180 }}>
        <LineChart data={last7} thickness={3} color={colors.primary} hideDataPoints noOfSections={4} yAxisTextStyle={{ color: colors.muted }} xAxisLabelTextStyle={{ color: colors.muted }} rulesColor={colors.muted} yAxisColor={colors.muted} xAxisColor={colors.muted} curved />
      </View>
    </View>
  );

  function handleSaveGoal() {
    if (d?.weight == null) { Alert.alert("Hinweis", "Bitte erst Gewicht eingeben"); return; }
    const w = parseFloat(goalWeight.replace(",", "."));
    const parsed = parseGermanOrShort(goalDate || "");
    if (!isFinite(w) || !parsed) { Alert.alert("Fehler", "Bitte Gewicht und Datum korrekt angeben (TT.MM.JJJJ)"); return; }
    const g = { targetWeight: w, targetDate: toKey(parsed), startWeight: d?.weight!, active: true };
    setGoal(g);
    setShowGoalModal(false);
  }

  function handleSaveWeight() {
    const w = parseFloat(weightInput.replace(",", "."));
    if (!isFinite(w)) { Alert.alert("Fehler", "Bitte ein gültiges Gewicht eingeben"); return; }
    setWeight(currentDate, w);
    setShowWeightModal(false);
  }

  function botRespond(userText: string) {
    const msgs: string[] = [];
    const today = days[currentDate];
    const water = today?.drinks.water ?? 0;
    if (water < 6) msgs.push(language === "de" ? "Trinke heute noch etwas mehr Wasser – Ziel 6+ Gläser." : "Try to drink a bit more water today – aim for 6+ glasses.");
    const weights = Object.values(days).filter((x) => x.weight != null).sort((a, b) => a.date.localeCompare(b.date));
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
    } catch (e) { Alert.alert("Fehler", String(e)); }
  }

  async function handleImport() {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const res = await DocumentPicker.getDocumentAsync({ type: "application/json", multiple: false });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const { default: FileSystem } = await import("expo-file-system");
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(content);
      useAppStore.setState({
        days: parsed.days ?? {}, goal: parsed.goal, reminders: parsed.reminders ?? [], chat: parsed.chat ?? [], saved: parsed.saved ?? [], achievementsUnlocked: parsed.achievementsUnlocked ?? [], xp: parsed.xp ?? 0, language: parsed.language ?? language, theme: parsed.theme ?? theme, appVersion: parsed.appVersion ?? appVersion, currentDate: toKey(new Date()),
      });
      useAppStore.getState().recalcAchievements();
      Alert.alert(language === "de" ? "Import erfolgreich" : "Import successful");
    } catch (e) { Alert.alert("Fehler", String(e)); }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }] }>
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <SectionCard title={t("pills")}>{pillRow}</SectionCard>
          <SectionCard title={t("drinks")}>{drinkRow}</SectionCard>
          <SectionCard title={t("weight")}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
              <PrimaryButton icon="analytics" label={language==='de'?'Analyse':'Analysis'} onPress={() => setShowAnalysisModal(true)} colors={colors} />
            </View>
            {weightCard}
          </SectionCard>
          <SectionCard title={t("achievements")}>
            <AchievementPreview />
            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
              <PrimaryButton icon="list" label={language==='de'?'Alle Erfolge':'All achievements'} onPress={() => router.push('/achievements')} colors={colors} />
            </View>
          </SectionCard>
          <SectionCard title={t("reminders")}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alarm" size={18} color={colors.text} />
                <Text style={{ color: colors.text }}>{reminders.length} {language === 'de' ? 'Erinnerungen' : 'reminders'}</Text>
              </View>
              <PrimaryButton icon="create" label={language === 'de' ? 'Verwalten' : 'Manage'} onPress={() => setShowRemindersModal(true)} colors={colors} />
            </View>
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
                <TextInput value={chatInput} onChangeText={setChatInput} placeholder={language === "de" ? "Nachricht…" : "Message…"} placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => { if (!chatInput.trim()) return; const userMsg = { id: String(Date.now()), sender: "user" as const, text: chatInput.trim(), createdAt: Date.now() }; addChat(userMsg); setChatInput(""); botRespond(userMsg.text); }}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>
          <SectionCard title={t("savedMessages")}> {saved.length === 0 ? (<Text style={{ color: colors.muted }}>–</Text>) : ( saved.slice(0, 5).map((s) => (
              <View key={s.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Ionicons name="bookmark" size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{s.text}</Text>
                </View>
                <TouchableOpacity onPress={() => useAppStore.getState().deleteSaved(s.id)}>
                  <Ionicons name="trash" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            )) )}
          </SectionCard>
          <SectionCard title={t("settings")}> <View style={{ gap: 12 }}>
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
            <TextInput keyboardType="decimal-pad" value={weightInput} onChangeText={setWeightInput} placeholder="72.4" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
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
            <TextInput keyboardType="decimal-pad" value={goalWeight} onChangeText={setGoalWeight} placeholder={language === 'de' ? 'Zielgewicht (kg)' : 'Target weight (kg)'} placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, marginBottom: 8 }]} />
            <TextInput keyboardType="numbers-and-punctuation" value={goalDate} onChangeText={setGoalDate} placeholder={language === 'de' ? 'Zieldatum (TT.MM.JJJJ)' : 'Target date (DD.MM.YYYY)'} placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <PrimaryButton label="Abbrechen" icon="close" onPress={() => setShowGoalModal(false)} colors={colors} outline />
              <PrimaryButton label="Ziel erstellen" icon="flag" onPress={handleSaveGoal} colors={colors} />
            </View>
          </View>
        </View>
      ) : null}

      {/* Reminders Modal */}
      {showRemindersModal ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('reminders')}</Text>
            <View style={{ maxHeight: 320 }}>
              <ScrollView contentContainerStyle={{ gap: 8 }}>
                {reminders.length === 0 ? (<Text style={{ color: colors.muted }}>–</Text>) : reminders.map((r) => (
                  <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="alarm" size={18} color={colors.text} />
                      <Text style={{ color: colors.text }}>{r.type}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TextInput value={r.time} onChangeText={(v) => updateReminder(r.id, { time: v })} style={[styles.input, { borderColor: colors.muted, color: colors.text, width: 96 }]} placeholder="HH:MM" placeholderTextColor={colors.muted} />
                      <Switch value={r.enabled} onValueChange={(v) => updateReminder(r.id, { enabled: v })} />
                      <TouchableOpacity onPress={() => deleteReminder(r.id)}>
                        <Ionicons name="trash" size={18} color={colors.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <TextInput value={newRemType} onChangeText={setNewRemType} placeholder={language === 'de' ? 'Typ (z. B. pills_morning)' : 'Type (e.g. pills_morning)'} placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
              <TextInput value={newRemTime} onChangeText={setNewRemTime} placeholder="HH:MM" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text, width: 96 }]} />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => { if (!/^\d{2}:\d{2}$/.test(newRemTime)) { Alert.alert('Fehler', 'Zeit bitte als HH:MM angeben'); return; } const r = { id: String(Date.now()), type: newRemType || 'custom', time: newRemTime, enabled: true } as any; addReminder(r); setNewRemType(''); setNewRemTime(''); }}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <PrimaryButton label={language === 'de' ? 'Schließen' : 'Close'} icon="close" onPress={() => setShowRemindersModal(false)} colors={colors} outline />
            </View>
          </View>
        </View>
      ) : null}

      {/* Analysis Modal */}
      {showAnalysisModal ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.cardTitle, { color: colors.text }]}>{language==='de'?'Gewichtsverlauf':'Weight analysis'}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(['7','14','30','custom'] as const).map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setAnalysisTab(tab)} style={[styles.badge, { borderColor: colors.muted, backgroundColor: analysisTab===tab ? colors.primary : 'transparent' }]}>
                  <Text style={{ color: analysisTab===tab ? '#fff' : colors.text }}>{language==='de' ? (tab==='week'?'Woche':tab==='month'?'Monat':'Benutzerdefiniert') : (tab==='week'?'Week':tab==='month'?'Month':'Custom')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {analysisTab==='custom' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput value={customStart} onChangeText={setCustomStart} placeholder="Start: TT.MM.JJJJ" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
                <TextInput value={customEnd} onChangeText={setCustomEnd} placeholder="Ende: TT.MM.JJJJ" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.muted, color: colors.text }]} />
              </View>
            ) : null}
            <View style={{ height: 200, marginBottom: 8 }}>
              <LineChart data={analysisData} thickness={3} color={colors.primary} hideDataPoints noOfSections={4} yAxisTextStyle={{ color: colors.muted }} xAxisLabelTextStyle={{ color: colors.muted }} rulesColor={colors.muted} yAxisColor={colors.muted} xAxisColor={colors.muted} curved />
            </View>
            <Text style={{ color: colors.text }}>{`${analysisSummary.delta >= 0 ? '+' : ''}${analysisSummary.delta} kg gesamt, ${analysisSummary.perDay >= 0 ? '+' : ''}${analysisSummary.perDay} kg/Tag`}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <PrimaryButton label={language==='de'?'Schließen':'Close'} icon="close" onPress={() => setShowAnalysisModal(false)} colors={colors} outline />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );

  function cycleTheme() { const list: any[] = ["pink_default", "pink_pastel", "pink_vibrant"]; const idx = list.indexOf(theme); const next = list[(idx + 1) % list.length] as any; setTheme(next); }
}

function ToggleButton({ icon, label, active, onPress, colors }: any) { return (
  <TouchableOpacity onPress={onPress} style={[styles.toggle, { borderColor: active ? colors.primary : colors.muted, backgroundColor: active ? colors.primary : "transparent" }]}>
    <Ionicons name={icon} size={16} color={active ? "#fff" : colors.text} />
    <Text style={{ color: active ? "#fff" : colors.text, marginLeft: 8 }}>{label}</Text>
  </TouchableOpacity>
); }

function CounterRow({ icon, label, value, onAdd, onSub, colors }: any) { return (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={{ color: colors.text }}>{label}</Text>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <TouchableOpacity onPress={onSub} style={[styles.roundBtn, { borderColor: colors.muted }]} accessibilityLabel="minus"><Ionicons name="remove" size={16} color={colors.text} /></TouchableOpacity>
      <Text style={{ color: colors.text, minWidth: 24, textAlign: "center" }}>{value}</Text>
      <TouchableOpacity onPress={onAdd} style={[styles.roundBtn, { borderColor: colors.muted }]} accessibilityLabel="plus"><Ionicons name="add" size={16} color={colors.text} /></TouchableOpacity>
    </View>
  </View>
); }

function ToggleRow({ icon, label, active, onPress, colors }: any) { return (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={{ color: colors.text }}>{label}</Text>
    </View>
    <View style={[styles.badge, { backgroundColor: active ? colors.primary : "transparent", borderColor: colors.muted }]}>
      <Text style={{ color: active ? "#fff" : colors.text }}>{active ? "On" : "Off"}</Text>
    </View>
  </TouchableOpacity>
); }

function PrimaryButton({ icon, label, onPress, colors, outline }: any) { return (
  <TouchableOpacity onPress={onPress} style={[styles.primaryBtn, outline ? { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary } : { backgroundColor: colors.primary }]}>
    {icon ? <Ionicons name={icon} size={16} color={outline ? colors.primary : "#fff"} /> : null}
    {label ? <Text style={{ color: outline ? colors.primary : "#fff", marginLeft: 8 }}>{label}</Text> : null}
  </TouchableOpacity>
); }

function RowButton({ icon, label, onPress, colors }: any) { return (
  <TouchableOpacity onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
    <Ionicons name={icon} size={18} color={colors.text} />
    <Text style={{ color: colors.text, marginLeft: 8 }}>{label}</Text>
  </TouchableOpacity>
); }

function buildRange(days: any, mode: '7'|'14'|'30'|'custom', customStart?: string, customEnd?: string) {
  const today = new Date();
  let start: Date; let end: Date;
  if (mode === 'week') { start = new Date(today); start.setDate(today.getDate() - 6); end = today; }
  else if (mode === 'month') { start = new Date(today); start.setDate(today.getDate() - 29); end = today; }
  else {
    const { parseGermanOrShort, toKey } = require('../src/utils/date');
    const s = parseGermanOrShort(customStart || '');
    const e = parseGermanOrShort(customEnd || '');
    start = s || new Date(today.getFullYear(), today.getMonth(), today.getDate());
    end = e || today;
  }
  const res: { date: string; weight?: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const k = toKey(cur);
    res.push({ date: k, weight: days[k]?.weight });
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}

function computeStats(series: { date: string; weight?: number }[]) {
  const points = series.filter(s => typeof s.weight === 'number') as { date: string; weight: number }[];
  if (points.length < 2) return { delta: 0, perDay: 0 };
  const first = points[0].weight; const last = points[points.length - 1].weight;
  const delta = +(last - first).toFixed(1);
  const days = points.length - 1; const perDay = +((last - first) / days).toFixed(2);
  return { delta, perDay };
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