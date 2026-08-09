import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../src/ui/theme';

/** Şimdilik emoji ikon — Faz 0 tasarım incelemesinden sonra gerçek ikon setine geçilecek. */
function tabIcon(emoji: string) {
  return () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Bugün', tabBarIcon: tabIcon('🎯') }}
      />
      <Tabs.Screen
        name="cards"
        options={{ title: 'Kartlar', tabBarIcon: tabIcon('🗂️') }}
      />
      <Tabs.Screen
        name="teacher"
        options={{ title: 'Öğretmen', tabBarIcon: tabIcon('👨‍🏫') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'İlerleme', tabBarIcon: tabIcon('📈') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ayarlar', tabBarIcon: tabIcon('⚙️') }}
      />
    </Tabs>
  );
}
