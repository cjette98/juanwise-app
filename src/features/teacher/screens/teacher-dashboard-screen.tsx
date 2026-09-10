import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useAssignedPack } from '@/features/teacher/lib/use-assigned-pack';
import { Screen, ScreenHeader, Card, Pill, Icon, type IconName, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

const AVATAR_SIZE = 76;

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  // Name, grade and section come off the signed-in profile now, and the roster
  // count is whatever GET /classes/mine reports — no more placeholders.
  const { avatar, photoUri, name, grade: profileGrade, section } = useUser();
  const { currentClass, totalStudents } = useClass();
  const assignedPack = useAssignedPack(currentClass?.packId);

  const grade =
    currentClass?.gradeLevel || profileGrade
      ? [currentClass?.gradeLevel ?? profileGrade, currentClass?.section ?? section]
          .filter(Boolean)
          .join('-')
      : '—';

  const menuItems: { label: string; icon: IconName; color: string; href: '/class-overview' | '/teacher-leaderboard' | '/class-content' | '/packs' | '/performance' }[] = [
    { label: t('classOverview'), icon: 'grid', color: tokens.color.points, href: '/class-overview' },
    { label: t('leaderBoard'), icon: 'trophy', color: tokens.color.success, href: '/teacher-leaderboard' },
    { label: t('classContent'), icon: 'book', color: tokens.color.navQuiz, href: '/class-content' },
    { label: t('managePacksBtn'), icon: 'bookmark', color: tokens.color.navJigsaw, href: '/packs' },
    { label: t('performanceProgression'), icon: 'chart', color: tokens.color.navLeaderboard, href: '/performance' },
  ];

  const hasPack = !!currentClass?.packId;
  const packVersion = assignedPack?.version ?? currentClass?.packVersion ?? null;

  return (
    <Screen>
      <ScreenHeader
        title={name}
        subtitle={t('teacherAccountTitle')}
        right={
          <View style={styles.avatarCircle}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            )}
          </View>
        }
      >
        <View style={styles.headerPills}>
          <Pill label={`${t('grade')}: ${grade}`} icon="book" tone="translucent" />
          <Pill label={`${t('totalStudents')}: ${totalStudents}`} icon="grid" tone="translucent" />
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Label style={styles.sectionLabel}>{t('contentPackCardTitle')}</Label>
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.navigate('/class-content')}>
          <Card raised>
            <View style={styles.packRow}>
              <View style={[styles.packTile, !hasPack && styles.packTileEmpty]}>
                <Icon name="book" size={22} color={hasPack ? tokens.color.onDark : tokens.color.inkFaint} />
              </View>
              <View style={styles.packInfo}>
                {hasPack ? (
                  <>
                    <BodyStrong numberOfLines={1}>{assignedPack?.name ?? '…'}</BodyStrong>
                    <View style={styles.packMetaRow}>
                      <Pill
                        label={currentClass?.packBinding === 'copied' ? t('contentPackBoundCopied') : t('contentPackBoundLinked')}
                        tone="neutral"
                      />
                      {packVersion != null && <Caption>v{packVersion}</Caption>}
                    </View>
                  </>
                ) : (
                  <BodyStrong numberOfLines={2}>{t('contentPackNoneAssigned')}</BodyStrong>
                )}
              </View>
              <Icon name="chevronRight" size={18} color={tokens.color.inkFaint} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} activeOpacity={0.85} onPress={() => router.navigate(item.href)}>
              <Card style={styles.menuRow}>
                <View style={[styles.menuIconTile, { backgroundColor: item.color }]}>
                  <Icon name={item.icon} size={20} color={tokens.color.onDark} />
                </View>
                <BodyStrong style={styles.menuLabel} numberOfLines={1}>{item.label}</BodyStrong>
                <Icon name="chevronRight" size={18} color={tokens.color.inkFaint} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomItem}>
          <Icon name="home" size={25} color={tokens.color.primary} strokeWidth={2.4} />
          <Caption style={{ ...tokens.type.tab, color: tokens.color.primary }}>{t('dashboardHomeTab')}</Caption>
        </View>
        <TouchableOpacity
          style={styles.bottomItem}
          onPress={() => router.navigate('/profile')}
          accessibilityRole="tab"
          accessibilityLabel={t('dashboardProfileTab')}
        >
          <Icon name="user" size={25} color={tokens.color.inkDisabled} strokeWidth={2.4} />
          <Caption style={{ ...tokens.type.tab, color: tokens.color.inkDisabled }}>{t('dashboardProfileTab')}</Caption>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: tokens.space.lg, gap: tokens.space.sm, paddingBottom: tokens.space.xxl },

  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 3,
    borderColor: tokens.color.onDarkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: Math.round(AVATAR_SIZE * 0.48) },

  headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginTop: tokens.space.md },

  sectionLabel: { marginBottom: tokens.space.xs },

  packRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  packTile: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.navJigsaw,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packTileEmpty: { backgroundColor: tokens.color.surfaceSunken },
  packInfo: { flex: 1, gap: tokens.space.xs },
  packMetaRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },

  menuList: { gap: tokens.space.sm, marginTop: tokens.space.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    minHeight: tokens.hit.min,
  },
  menuIconTile: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1 },

  bottomBar: {
    flexDirection: 'row',
    backgroundColor: tokens.color.surface,
    borderTopWidth: 2,
    borderTopColor: tokens.color.border,
    paddingVertical: tokens.space.sm,
  },
  bottomItem: { flex: 1, alignItems: 'center', gap: 4, minHeight: tokens.hit.min, justifyContent: 'center' },
});
