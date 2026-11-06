import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderTopColor: isDark ? colors.borderStrong : colors.border,
          borderTopWidth: 1,
          height: 54 + safeBottom,
          paddingBottom: safeBottom,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.2 : 0.04,
          shadowRadius: 6,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif',
            default: 'sans-serif',
          }),
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ড্যাশবোর্ড',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={21}
                color={color as string}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="personal"
        options={{
          title: 'ব্যক্তিগত',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={21}
                color={color as string}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: 'পারিবারিক',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={22}
                color={color as string}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'আবেদন',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={21}
                color={color as string}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settlement"
        options={{
          title: 'হিসাব',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'calculator' : 'calculator-outline'}
                size={21}
                color={color as string}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'অন্যান্য',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'menu' : 'menu-outline'}
                size={22}
                color={color as string}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    transform: [{ scale: 1.08 }],
  },
});
