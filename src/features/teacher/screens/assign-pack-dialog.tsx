import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { packsApi, errorMessage, type ApiPack, type AssignPackRequest } from '@/shared/api';
import { useLanguage } from '@/shared/i18n/language-context';
import { Button, H2, BodyStrong, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

interface AssignPackDialogProps {
  visible: boolean;
  currentPackId: string | null;
  onAssign: (input: AssignPackRequest) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

export function AssignPackDialog({ visible, currentPackId, onAssign, onClose }: AssignPackDialogProps) {
  const { t } = useLanguage();
  const [packs, setPacks] = useState<ApiPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(currentPackId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedId(currentPackId);
    setLoading(true);
    packsApi
      .list()
      .then(setPacks)
      .catch((err) => Alert.alert(t('assignPackLoadErrorTitle'), errorMessage(err)))
      .finally(() => setLoading(false));
  }, [visible, currentPackId]);

  const choose = async (mode: 'link' | 'copy') => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const result = await onAssign({ packId: selectedId, mode });
      if (!result.success) {
        Alert.alert(t('assignPackAssignErrorTitle'), result.message);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.scrim} />
        <View style={styles.sheet}>
          <H2 style={styles.title}>{t('assignPackDialogTitle')}</H2>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={tokens.color.primary} />
          ) : (
            <ScrollView style={styles.list}>
              {packs.map((pack) => {
                const selected = selectedId === pack.id;
                return (
                  <TouchableOpacity
                    key={pack.id}
                    style={[styles.packRow, selected && styles.packRowActive]}
                    onPress={() => setSelectedId(pack.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <BodyStrong style={styles.packRowText} numberOfLines={1}>
                      {pack.name}
                    </BodyStrong>
                    <Caption style={styles.packRowMeta}>{pack.status}</Caption>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.actionRow}>
            <Button
              label={t('assignPackShareBtn')}
              onPress={() => choose('link')}
              disabled={!selectedId}
              busy={busy}
              color={tokens.color.success}
              shadowColor={tokens.color.successDark}
              style={!selectedId ? styles.actionBtnDisabled : styles.actionBtn}
            />
            <Button
              label={t('assignPackCopyBtn')}
              onPress={() => choose('copy')}
              disabled={!selectedId || busy}
              color={tokens.color.navQuiz}
              shadowColor={tokens.color.primaryDark}
              style={!selectedId || busy ? styles.actionBtnDisabled : styles.actionBtn}
            />
          </View>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
          >
            <BodyStrong style={styles.cancelBtnText}>{t('cancelBtn')}</BodyStrong>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/** Layout only — every colour, radius and size comes from `tokens`. */
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.55 },
  sheet: {
    backgroundColor: tokens.color.canvas,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    padding: tokens.space.lg,
    gap: tokens.space.md,
    maxHeight: '80%',
  },
  title: { color: tokens.color.primary },
  loading: { marginVertical: tokens.space.xl },
  list: { maxHeight: 260 },
  packRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space.sm,
    minHeight: tokens.hit.min,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
    marginBottom: tokens.space.sm,
  },
  packRowActive: { borderColor: tokens.color.primary, backgroundColor: tokens.color.surfaceSunken },
  packRowText: { flex: 1 },
  packRowMeta: { color: tokens.color.inkMuted },
  actionRow: { flexDirection: 'row', gap: tokens.space.sm },
  actionBtn: { flex: 1 },
  actionBtnDisabled: { flex: 1, opacity: 0.4 },
  cancelBtn: {
    minHeight: tokens.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: tokens.color.inkMuted },
});
