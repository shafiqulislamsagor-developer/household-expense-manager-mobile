import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { COLORS } from '../src/constants/api';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, isLocked, isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isLocked) {
      router.replace('/lock');
    } else {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLocked, isLoading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

