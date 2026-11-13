import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { TextInput } from '@/shared/components/ui/capped-text';
import { H2, H3, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { typeScale } from '@/shared/theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { packsApi, errorMessage, type ApiPack } from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { readableColumn } from '@/shared/theme/layout';

const STATUS_LABEL_KEY: Record<ApiPack['status'], TranslationKey> = {
  draft: 'packDraft',
  published: 'packLive',
  archived: 'packArchived',
};

const STATUS_COLOR: Record<ApiPack['status'], string> = {
  draft: '#B0B0B0',
  published: '#2E9E5B',
  archived: '#C4304A',
};

export default function PackListScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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
      setError(errorMessage(err, t('packLoadFailedMsg')));
    } finally {
      setReady(true);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert(t('missingInfo'), t('packNameRequiredMsg'));
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
      Alert.alert(t('packCreateFailedTitle'), errorMessage(err, t('packCreateFailedMsg')));
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
      Alert.alert(t('packCopyFailedTitle'), errorMessage(err, t('packCopyFailedMsg')));
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
      Alert.alert(t('packPublishFailedTitle'), errorMessage(err, t('packPublishFailedMsg')));
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
      Alert.alert(t('packArchiveFailedTitle'), errorMessage(err, t('packArchiveFailedMsg')));
    } finally {
      setBusyId(null);
    }
  };

  // Correction 2, #3: clear away drafts and other packs nobody plays. Archive
  // only hides a pack; this takes its questions and pictures with it, so it
  // is confirmed first. The API refuses it while a class still uses the pack.
  const handleDelete = (pack: ApiPack) => {
    Alert.alert(t('packDeleteTitle', { name: pack.name }), t('packDeleteMsg'), [
      { text: t('packDeleteKeepBtn'), style: 'cancel' },
      {
        text: t('packDeleteConfirmBtn'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(pack.id);
          try {
            await packsApi.remove(pack.id);
            await load();
          } catch (err) {
            Alert.alert(t('packDeleteFailedTitle'), errorMessage(err, t('packDeleteFailedMsg')));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{t('managePacksBtn')}</H2>
        <Caption style={styles.headerSubtitle}>{t('packListSubtitle')}</Caption>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Caption style={styles.errorBannerText}>{error}</Caption>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.list, readableColumn]}>
        {!ready && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#3B7DD8" />
            <Caption style={styles.loadingText}>{t('packFetching')}</Caption>
          </View>
        )}

        {ready && (
          creating ? (
            <View style={styles.card}>
              <H3 style={styles.cardTitle}>{t('newPackBtn')}</H3>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder={t('packNamePlaceholder')}
                autoFocus
              />
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryBtn, busyId === '__create__' && styles.busyBtn]}
                  onPress={handleCreate}
                  disabled={busyId === '__create__'}
                >
                  {busyId === '__create__' ? <ActivityIndicator color="#FFF" size="small" /> : <Caption style={styles.actionBtnText}>{t('createBtn')}</Caption>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setCreating(false)}>
                  <Caption style={styles.actionBtnText}>{t('cancelBtn')}</Caption>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.newPackBtn} onPress={() => setCreating(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#3B7DD8" />
              <Caption style={styles.newPackBtnText}>{t('newPackBtn')}</Caption>
            </TouchableOpacity>
          )
        )}

        {ready && packs.map((pack) => {
          const owned = canEdit(pack);
          const busy = busyId === pack.id;
          return (
            <View key={pack.id} style={styles.card}>
              <View style={styles.cardTop}>
                <H3 style={styles.cardTitle}>{pack.name}</H3>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[pack.status] }]}>
                  <Caption style={styles.statusBadgeText}>{t(STATUS_LABEL_KEY[pack.status])}</Caption>
                </View>
              </View>
              <Caption style={styles.cardMeta}>
                {t('packVersionMeta', {
                  version: pack.version,
                  usage:
                    pack.classCount > 0
                      ? t('packUsedByClasses', { count: pack.classCount })
                      : t('packUsedByNone'),
                })}
              </Caption>

              <View style={styles.cardActions}>
                {owned && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      onPress={() => router.navigate({ pathname: '/admin-content-manager', params: { packId: pack.id } })}
                    >
                      <Caption style={styles.actionBtnText}>{t('editQuizBtn')}</Caption>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.purpleBtn]}
                      onPress={() => router.navigate({ pathname: '/jigsaw-content', params: { packId: pack.id } })}
                    >
                      <Caption style={styles.actionBtnText}>{t('editJigsawBtn')}</Caption>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.duplicateBtn, busy && styles.busyBtn]}
                  onPress={() => handleDuplicate(pack)}
                  disabled={busy}
                >
                  <Caption style={styles.actionBtnText}>{t('copyCode')}</Caption>
                </TouchableOpacity>
                {owned && pack.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.publishBtn, busy && styles.busyBtn]}
                    onPress={() => handlePublish(pack)}
                    disabled={busy}
                  >
                    <Caption style={styles.actionBtnText}>{t('publishBtn')}</Caption>
                  </TouchableOpacity>
                )}
                {owned && pack.status !== 'archived' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.archiveBtn, busy && styles.busyBtn]}
                    onPress={() => handleArchive(pack)}
                    disabled={busy}
                  >
                    <Caption style={styles.actionBtnText}>{t('archiveBtn')}</Caption>
                  </TouchableOpacity>
                )}
                {/* As on the web: never the default library, and only once no class uses it. */}
                {owned && pack.origin !== 'system' && pack.classCount === 0 && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, busy && styles.busyBtn]}
                    onPress={() => handleDelete(pack)}
                    disabled={busy}
                    accessibilityRole="button"
                  >
                    <Caption style={[styles.actionBtnText, styles.deleteBtnText]}>{t('deleteBtn')}</Caption>
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
  headerTitle: { color: '#FFF' },
  headerSubtitle: { color: '#FFF', opacity: 0.9, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: '#8E8E93' },
  list: { padding: 16, gap: 12 },
  newPackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#3B7DD8', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 12, marginBottom: 4,
  },
  newPackBtnText: { color: '#3B7DD8', fontFamily: tokens.font.bodyBold },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { color: '#1A1A1A', flex: 1 },
  cardMeta: { color: '#8E8E93', marginBottom: 10 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontFamily: tokens.font.body, fontSize: typeScale.body.fontSize, color: '#1A1A1A', marginBottom: 10,
  },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  primaryBtn: { backgroundColor: '#3B7DD8' },
  purpleBtn: { backgroundColor: '#9B4FD6' },
  duplicateBtn: { backgroundColor: '#8E8E93' },
  publishBtn: { backgroundColor: '#2E9E5B' },
  archiveBtn: { backgroundColor: '#C4304A' },
  // Outlined, as in the client's mock-up, so it reads apart from Archive.
  deleteBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#C4304A' },
  deleteBtnText: { color: '#C4304A' },
  cancelBtn: { backgroundColor: '#8E8E93' },
  busyBtn: { opacity: 0.6 },
  actionBtnText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
});
