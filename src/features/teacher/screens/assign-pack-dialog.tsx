import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { packsApi, errorMessage, type ApiPack, type AssignPackRequest } from '@/shared/api';
import { useLanguage } from '@/shared/i18n/language-context';

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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('assignPackDialogTitle')}</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={styles.list}>
              {packs.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  style={[styles.packRow, selectedId === pack.id && styles.packRowActive]}
                  onPress={() => setSelectedId(pack.id)}
                >
                  <Text style={styles.packRowText}>{pack.name}</Text>
                  <Text style={styles.packRowMeta}>{pack.status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn, (!selectedId || busy) && styles.disabledBtn]}
              onPress={() => choose('link')}
              disabled={!selectedId || busy}
            >
              {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>{t('assignPackShareBtn')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.copyBtn, (!selectedId || busy) && styles.disabledBtn]}
              onPress={() => choose('copy')}
              disabled={!selectedId || busy}
            >
              <Text style={styles.actionBtnText}>{t('assignPackCopyBtn')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelBtnText}>{t('cancelBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  title: { fontSize: 16, fontWeight: '900', color: '#0038A8', marginBottom: 12 },
  list: { maxHeight: 260, marginBottom: 12 },
  packRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0D5BE', marginBottom: 8,
  },
  packRowActive: { borderColor: '#3B7DD8', backgroundColor: '#EFF3FF' },
  packRowText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  packRowMeta: { fontSize: 11, color: '#8E8E93' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  shareBtn: { backgroundColor: '#2E9E5B' },
  copyBtn: { backgroundColor: '#3B7DD8' },
  disabledBtn: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: { marginTop: 10, alignItems: 'center' },
  cancelBtnText: { color: '#8E8E93', fontWeight: '600' },
});
