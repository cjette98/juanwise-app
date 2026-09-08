import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

const CATEGORIES = [
  { key: 'history', label: 'History', color: '#2E6FB8' },
  { key: 'culture', label: 'Culture & Tradition', color: '#C9631D' },
  { key: 'geography', label: 'Geography', color: '#3E9E4F' },
  { key: 'festival', label: 'Festival Arts', color: '#B84FA0' },
  { key: 'national', label: 'National Symbols', color: '#C4304A' },
  { key: 'heroes', label: 'Filipino Heroes', color: '#8A5A2B' },
];

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITIES = [1, 2, 3, 4, 5, 6];

export default function AdminContentManagerScreen() {
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [level, setLevel] = useState(1);
  // Every read and write here goes through the content module, so an edit made
  // on this device is what every student's app fetches next.
  const {
    isPackReady,
    error,
    ensurePackLoaded,
    getPack,
    getEffectiveQuestion,
    isOverridden,
    deleteQuestionOverride,
    setShowMiniLesson,
  } = useAdminContent();

  useEffect(() => {
    if (packId) ensurePackLoaded(packId);
  }, [packId, ensurePackLoaded]);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Walang napiling pack. Bumalik sa Content Packs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ready = isPackReady(packId);
  const pack = getPack(packId);

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  const handleDelete = (activityNum: number) => {
    Alert.alert(
      'Alisin ang Custom na Tanong?',
      `Babalik ito sa default na tanong para sa Activity ${activityNum}.`,
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Alisin',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteQuestionOverride(packId, category, level, activityNum);
            if (!result.success) Alert.alert('Hindi Naalis', result.message);
          },
        },
      ]
    );
  };

  const handleToggleMiniLesson = async (value: boolean) => {
    const result = await setShowMiniLesson(packId, value);
    if (!result.success) Alert.alert('Hindi Na-save', result.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: activeCategory.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Manager</Text>
        <Text style={styles.headerSubtitle}>{`I-edit ang: ${pack?.name ?? '...'}`}</Text>
      </View>

      <View style={styles.catRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRowContent}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, { borderColor: c.color }, category === c.key && { backgroundColor: c.color }]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.catChipText, { color: category === c.key ? '#FFF' : c.color }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.levelRow}>
        {LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[styles.levelChip, level === lvl && { backgroundColor: activeCategory.color }]}
            onPress={() => setLevel(lvl)}
          >
            <Text style={[styles.levelChipText, level === lvl && { color: '#FFF' }]}>Level {lvl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.miniLessonRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniLessonTitle}>Mini-Lesson bago ang Quiz</Text>
          <Text style={styles.miniLessonSub}>
            Kapag naka-ON, makikita ng mag-aaral ang mini-lesson bago sumagot sa bawat tanong.
          </Text>
        </View>
        <Switch
          value={pack?.showMiniLesson ?? true}
          onValueChange={handleToggleMiniLesson}
          trackColor={{ false: '#D0D0D0', true: activeCategory.color }}
          thumbColor="#FFF"
        />
      </View>
      <Text style={styles.miniLessonNote}>
        Tandaan: kasalukuyang naaapektuhan lang nito ang Global Library — hindi pa ito
        nakikita ng mga estudyanteng gumagamit ng ibang pack.
      </Text>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {!ready && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={activeCategory.color} />
          <Text style={styles.loadingText}>Kinukuha ang nilalaman mula sa server...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {ready && ACTIVITIES.map((num) => {
          const q = getEffectiveQuestion(packId, category, level, num);
          const custom = isOverridden(packId, category, level, num);
          return (
            <View key={num} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>Activity {num}</Text>
                {custom ? (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                ) : (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardQuestion} numberOfLines={2}>{q.question}</Text>
              <Text style={styles.cardAnswer}>Sagot: {q.correctAnswer}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: activeCategory.color }]}
                  onPress={() =>
                    router.navigate({ pathname: '/question-editor', params: { packId, category, level, activityNum: num, categoryColor: activeCategory.color, categoryLabel: activeCategory.label } })
                  }
                >
                  <Ionicons name="create-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                {custom && (
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(num)}>
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  /**
   * One scrollable line of category chips.
   *
   * Every cross-axis size here is explicit on purpose. A horizontal ScrollView
   * in a column layout has no natural height, so it either grows to fill the
   * screen or collapses — and the usual patches for that are what broke this
   * row twice: `maxHeight` capped the box but let the chips lay out taller and
   * clipped their labels, and `alignItems: 'center'` against an indefinite
   * cross-size collapsed the labels to nothing while the pills kept their
   * shape. With a fixed height on the wrapper *and* on the chip, nothing has to
   * be inferred: the wrapper defines the band, the chip defines its own pill,
   * and the label is centred inside a box that is already 34px tall.
   */
  catRowWrap: { height: 46, marginTop: 12 },
  catRowContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  catChip: {
    height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5,
    backgroundColor: '#FFF', justifyContent: 'center',
  },
  catChipText: { fontWeight: 'bold', fontSize: 12 },
  levelRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12 },
  levelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#E5DCC8' },
  levelChipText: { fontWeight: 'bold', fontSize: 12, color: '#5C3A21' },
  miniLessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF',
    marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0D5BE',
  },
  miniLessonTitle: { fontWeight: 'bold', fontSize: 13.5, color: '#1A1A1A' },
  miniLessonSub: { fontSize: 11.5, color: '#8E8E93', marginTop: 2, lineHeight: 16 },
  miniLessonNote: { fontSize: 11, color: '#8E8E93', marginTop: 4, paddingHorizontal: 16, lineHeight: 15 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', fontSize: 12, flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 12.5, color: '#8E8E93' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#1A1A1A' },
  customBadge: { backgroundColor: '#2E9E5B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  customBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  defaultBadge: { backgroundColor: '#B0B0B0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  cardQuestion: { fontSize: 13.5, color: '#2B2B2B', marginBottom: 4 },
  cardAnswer: { fontSize: 12, color: '#5C3A21', fontWeight: '600', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  deleteBtn: { backgroundColor: '#C4304A' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});