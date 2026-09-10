import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useAssignedPack } from '@/features/teacher/lib/use-assigned-pack';
import { classesApi, errorMessage, type AssignPackRequest } from '@/shared/api';
import { Screen, ScreenHeader, Card, Button, Pill, Icon, H2, Body, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { AssignPackDialog } from './assign-pack-dialog';

export default function ClassContentScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currentClass, refresh: refreshClass } = useClass();
  const assignedPack = useAssignedPack(currentClass?.packId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearingPack, setClearingPack] = useState(false);

  const handleAssignPack = async (input: AssignPackRequest): Promise<{ success: boolean; message: string }> => {
    if (!currentClass) return { success: false, message: t('contentPackNoClassMsg') };
    try {
      await classesApi.assignPack(currentClass.id, input);
      await refreshClass();
      return { success: true, message: t('contentPackAssignedMsg') };
    } catch (err) {
      return { success: false, message: errorMessage(err, t('contentPackAssignFailedMsg')) };
    }
  };

  const handleClearPack = async () => {
    if (!currentClass) return;
    setClearingPack(true);
    try {
      await classesApi.clearPack(currentClass.id);
      await refreshClass();
    } catch (err) {
      Alert.alert(t('contentPackCardTitle'), errorMessage(err, t('contentPackClearFailedMsg')));
    } finally {
      setClearingPack(false);
    }
  };

  const hasPack = !!currentClass?.packId;
  const packVersion = assignedPack?.version ?? currentClass?.packVersion ?? null;

  return (
    <Screen>
      <ScreenHeader title={t('classContent')} color={tokens.color.primary} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card raised style={styles.packCard}>
          {hasPack ? (
            <>
              <View style={styles.packHeaderRow}>
                <View style={styles.packTile}>
                  <Icon name="book" size={26} color={tokens.color.onDark} />
                </View>
                <View style={styles.packHeaderInfo}>
                  <H2 numberOfLines={1}>{assignedPack?.name ?? '…'}</H2>
                  <View style={styles.metaRow}>
                    <Pill
                      label={currentClass?.packBinding === 'copied' ? t('contentPackBoundCopied') : t('contentPackBoundLinked')}
                      tone="neutral"
                    />
                    {packVersion != null && <Caption>v{packVersion}</Caption>}
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <Body>{t('contentPackStudentsDesc')}</Body>

              <View style={styles.actionRow}>
                <Button
                  label={t('contentPackChangeBtn')}
                  onPress={() => setDialogOpen(true)}
                  style={styles.actionBtn}
                />
                <Button
                  label={t('contentPackClearBtn')}
                  onPress={handleClearPack}
                  busy={clearingPack}
                  color={tokens.color.danger}
                  shadowColor={tokens.color.dangerInk}
                  style={styles.actionBtn}
                />
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyTile}>
                <Icon name="book" size={34} color={tokens.color.inkFaint} />
              </View>
              <Body style={styles.emptyText}>{t('contentPackNoneAssigned')}</Body>
              <Button
                label={t('assignPackDialogTitle')}
                onPress={() => setDialogOpen(true)}
                style={styles.fullWidthButton}
              />
            </View>
          )}
        </Card>

        <AssignPackDialog
          visible={dialogOpen}
          currentPackId={currentClass?.packId ?? null}
          onAssign={handleAssignPack}
          onClose={() => setDialogOpen(false)}
        />

        <Label style={styles.sectionLabel}>{t('contentManagementTitle')}</Label>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.navigate('/packs')}>
          <Card style={styles.linkRow}>
            <View style={styles.linkIconChip}>
              <Icon name="bookmark" size={18} color={tokens.color.onDark} />
            </View>
            <BodyStrong style={styles.linkLabel} numberOfLines={1}>{t('managePacksBtn')}</BodyStrong>
            <Icon name="chevronRight" size={18} color={tokens.color.inkFaint} />
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: tokens.space.lg, gap: tokens.space.lg, paddingBottom: tokens.space.xxl },

  packCard: { gap: tokens.space.md },
  packHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  packTile: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.navJigsaw,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packHeaderInfo: { flex: 1, gap: tokens.space.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  divider: { height: 1, backgroundColor: tokens.color.divider },
  actionRow: { flexDirection: 'row', gap: tokens.space.sm, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: 140 },

  emptyState: { alignItems: 'center', gap: tokens.space.md },
  emptyTile: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center' },
  fullWidthButton: { width: '100%' },

  sectionLabel: { marginTop: tokens.space.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    minHeight: tokens.hit.min,
  },
  linkIconChip: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.navJigsaw,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: { flex: 1 },
});
