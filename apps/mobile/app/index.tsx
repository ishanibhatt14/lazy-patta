import { reactNativeTokens } from '@lazy-patta/design-tokens';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const t = getMessages(DEFAULT_LOCALE);
const color = reactNativeTokens.color;

export default function HomeScreen(): ReactElement {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>{t['app.name']}</Text>
      <Text style={styles.tagline}>{t['welcome.tagline']}</Text>
      <Text style={styles.badge}>{t['welcome.noBetting']}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: reactNativeTokens.space.md,
    paddingHorizontal: reactNativeTokens.space.lg,
    backgroundColor: color['background.canvas'],
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: color['action.primary'],
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    color: color['text.primary'],
  },
  badge: {
    fontSize: 13,
    textAlign: 'center',
    color: color['text.primary'],
    backgroundColor: color['surface.primary'],
    borderRadius: reactNativeTokens.radius.md,
    paddingHorizontal: reactNativeTokens.space.md,
    paddingVertical: reactNativeTokens.space.sm,
  },
});
