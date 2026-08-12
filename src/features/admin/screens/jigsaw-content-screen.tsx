import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { key: 'history', label: 'History', color: '#2E6FB8' },
  { key: 'culture', label: 'Culture & Tradition', color: '#C9631D' },
  { key: 'geography', label: 'Geography', color: '#3E9E4F' },
  { key: 'festival', label: 'Festival Arts', color: '#B84FA0' },
  { key: 'national', label: 'National Symbols', color: '#C4304A' },
  { key: 'heroes', label: 'Filipino Heroes', color: '#8A5A2B' },
];

export default function JigsawContentScreen() {
  const router = useRouter();
  const { getEffectiveCategoryContent, setCategoryImageUri, setCategoryContext, resetCategoryImage } = useAdminContent();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const pickImage = async (categoryKey: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kailangan ng Pahintulot', 'Payagan ang app na ma-access ang iyong mga larawan para makapili ng puzzle picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCategoryImageUri(categoryKey, result.assets[0].uri);
    }
  };

  const startEditingLesson = (categoryKey: string, currentText: string) => {
    setEditingKey(categoryKey);
    setDraftText(currentText);
  };

  const saveLesson = (categoryKey: string) => {
    if (!draftText.trim()) {
      Alert.alert('Walang Laman', 'Maglagay ng teksto para sa mini-lesson.');
      return;
    }
    setCategoryContext(categoryKey, draftText.trim());
    setEditingKey(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jigsaw Pictures & Mini-Lessons</Text>
        <Text style={styles.headerSubtitle}>Piliin ang larawan ng puzzle at i-edit ang mini-lesson bawat kategorya</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {CATEGORIES.map((cat) => {
          const content = getEffectiveCategoryContent(cat.key);
          const isEditing = editingKey === cat.key;
          return (
            <View key={cat.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={styles.cardTitle}>{cat.label}</Text>
              </View>

              <Image source={content.image} style={styles.preview} resizeMode="cover" />

              <View style={styles.imageActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: cat.color }]} onPress={() => pickImage(cat.key)}>
                  <Ionicons name="image-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Palitan ang Larawan</Text>
                </TouchableOpacity>
                {content.hasCustomImage && (
                  <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={() => resetCategoryImage(cat.key)}>
                    <Ionicons name="refresh-outline" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Ibalik sa Default</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View style={styles.lessonEditWrap}>
                  <TextInput
                    style={styles.lessonInput}
                    value={draftText}
                    onChangeText={setDraftText}
                    multiline
                    placeholder="I-type ang mini-lesson..."
                  />
                  <View style={styles.lessonActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: cat.color }]} onPress={() => saveLesson(cat.key)}>
                      <Text style={styles.actionBtnText}>I-save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={() => setEditingKey(null)}>
                      <Text style={styles.actionBtnText}>Kanselahin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEditingLesson(cat.key, content.context)}>
                  <Text style={styles.lessonText} numberOfLines={3}>{content.context}</Text>
                  <Text style={[styles.editLessonLink, { color: cat.color }]}>✎ I-edit ang Mini-Lesson</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { backgroundColor: '#9B4FD6', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  list: { padding: 16, gap: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#1A1A1A' },
  preview: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10, backgroundColor: '#EEE' },
  imageActions: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  resetBtn: { backgroundColor: '#8E8E93' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  lessonText: { fontSize: 13, color: '#2B2B2B', lineHeight: 19 },
  editLessonLink: { fontSize: 12, fontWeight: 'bold', marginTop: 6 },
  lessonEditWrap: { gap: 8 },
  lessonInput: {
    borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12, padding: 10, minHeight: 80,
    textAlignVertical: 'top', fontSize: 13, color: '#1A1A1A',
  },
  lessonActions: { flexDirection: 'row', gap: 8 },
});
