import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { packsApi, errorMessage, type ApiPack } from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';

const STATUS_LABEL: Record<ApiPack['status'], string> = {
  draft: 'Draft',
  published: 'Live',
  archived: 'Archived',
};

const STATUS_COLOR: Record<ApiPack['status'], string> = {
  draft: '#B0B0B0',
  published: '#2E9E5B',
  archived: '#C4304A',
};

export default function PackListScreen() {
  const router = useRouter();
  const { uid, role } = useUser();
  const [packs, setPacks] = useState<ApiPack[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const canEdit = useCallback((pack: ApiPack) => pack.ownerUid === uid || role === 'admin', [uid, role]);

  const load = useCallback(async () => {
    try {
      const items = await packsApi.list();
      setPacks(items);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Hindi na-load ang mga content pack.'));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Kulang na Impormasyon', 'Maglagay ng pangalan para sa bagong pack.');
      return;
    }
    setBusyId('__create__');
    try {
      const created = await packsApi.create(newName.trim());
      setNewName('');
      setCreating(false);
      await load();
      router.navigate({ pathname: '/admin-content-manager', params: { packId: created.id } });
    } catch (err) {
      Alert.alert('Hindi Nagawa', errorMessage(err, 'Hindi nagawa ang bagong pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.duplicate(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Nakopya', errorMessage(err, 'Hindi nakopya ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.publish(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Na-publish', errorMessage(err, 'Hindi na-publish ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.archive(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Na-archive', errorMessage(err, 'Hindi na-archive ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Packs</Text>
        <Text style={styles.headerSubtitle}>Gumawa, kopyahin, o i-publish ang iyong mga content pack</Text>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#3B7DD8" />
            <Text style={styles.loadingText}>Kinukuha ang mga pack mula sa server...</Text>
          </View>
        )}

        {ready && (
          creating ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bagong Pack</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Pangalan ng pack..."
                autoFocus
              />
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryBtn, busyId === '__create__' && styles.busyBtn]}
                  onPress={handleCreate}
                  disabled={busyId === '__create__'}
                >
                  {busyId === '__create__' ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Gawin</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setCreating(false)}>
                  <Text style={styles.actionBtnText}>Kanselahin</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.newPackBtn} onPress={() => setCreating(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#3B7DD8" />
              <Text style={styles.newPackBtnText}>Bagong Pack</Text>
            </TouchableOpacity>
          )
        )}

        {ready && packs.map((pack) => {
          const owned = canEdit(pack);
          const busy = busyId === pack.id;
          return (
            <View key={pack.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{pack.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[pack.status] }]}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABEL[pack.status]}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                v{pack.version} · {pack.classCount > 0 ? `Ginagamit ng ${pack.classCount} klase` : 'Walang gumagamit'}
              </Text>

              <View style={styles.cardActions}>
                {owned && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      onPress={() => router.navigate({ pathname: '/admin-content-manager', params: { packId: pack.id } })}
                    >
                      <Text style={styles.actionBtnText}>I-edit ang Quiz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.purpleBtn]}
                      onPress={() => router.navigate({ pathname: '/jigsaw-content', params: { packId: pack.id } })}
                    >
                      <Text style={styles.actionBtnText}>I-edit ang Jigsaw</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.duplicateBtn, busy && styles.busyBtn]}
                  onPress={() => handleDuplicate(pack)}
                  disabled={busy}
                >
                  <Text style={styles.actionBtnText}>Kopyahin</Text>
                </TouchableOpacity>
                {owned && pack.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.publishBtn, busy && styles.busyBtn]}
                    onPress={() => handlePublish(pack)}
                    disabled={busy}
                  >
                    <Text style={styles.actionBtnText}>I-publish</Text>
                  </TouchableOpacity>
                )}
                {owned && pack.status !== 'archived' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.archiveBtn, busy && styles.busyBtn]}
                    onPress={() => handleArchive(pack)}
                    disabled={busy}
                  >
                    <Text style={styles.actionBtnText}>I-archive</Text>
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
  header: { backgroundColor: '#3B7DD8', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', fontSize: 12, flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 12.5, color: '#8E8E93' },
  list: { padding: 16, gap: 12 },
  newPackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#3B7DD8', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 12, marginBottom: 4,
  },
  newPackBtnText: { color: '#3B7DD8', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#1A1A1A', flex: 1 },
  cardMeta: { fontSize: 12, color: '#8E8E93', marginBottom: 10 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', marginBottom: 10,
  },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  primaryBtn: { backgroundColor: '#3B7DD8' },
  purpleBtn: { backgroundColor: '#9B4FD6' },
  duplicateBtn: { backgroundColor: '#8E8E93' },
  publishBtn: { backgroundColor: '#2E9E5B' },
  archiveBtn: { backgroundColor: '#C4304A' },
  cancelBtn: { backgroundColor: '#8E8E93' },
  busyBtn: { opacity: 0.6 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});
