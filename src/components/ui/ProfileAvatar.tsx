import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { useTheme } from '../../theme/ThemeContext';

export interface ProfileAvatarProps {
  name: string;
  role?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRoleBadge?: boolean;
  isActive?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  role,
  size = 'md',
  showRoleBadge = false,
  isActive = true,
}) => {
  const { colors, isDark } = useTheme();

  // Extract initials (first letter or first two words)
  const getInitials = (n: string) => {
    if (!n) return 'ব';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizeMetrics = {
    sm: { diameter: 34, fontSize: 13, badgeSize: 12 },
    md: { diameter: 44, fontSize: 16, badgeSize: 16 },
    lg: { diameter: 58, fontSize: 22, badgeSize: 18 },
    xl: { diameter: 76, fontSize: 28, badgeSize: 22 },
  }[size];

  const getRoleIcon = () => {
    if (role === 'SUPER_ADMIN') return 'shield-checkmark';
    if (role === 'HOME_ADMIN') return 'star';
    return 'person';
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatarCircle,
          {
            width: sizeMetrics.diameter,
            height: sizeMetrics.diameter,
            borderRadius: sizeMetrics.diameter / 2,
            backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight,
            borderColor: colors.primary,
          },
        ]}
      >
        <BengaliText
          variant="h3"
          color={colors.primary}
          weight="700"
          style={{ fontSize: sizeMetrics.fontSize }}
        >
          {getInitials(name)}
        </BengaliText>

        {/* Role Icon Badge */}
        {showRoleBadge && (
          <View
            style={[
              styles.roleBadge,
              {
                width: sizeMetrics.badgeSize,
                height: sizeMetrics.badgeSize,
                borderRadius: sizeMetrics.badgeSize / 2,
                backgroundColor: role === 'SUPER_ADMIN' ? colors.primary : colors.accent,
                borderColor: '#FFFFFF',
              },
            ]}
          >
            <Ionicons
              name={getRoleIcon()}
              size={sizeMetrics.badgeSize * 0.65}
              color="#FFFFFF"
            />
          </View>
        )}

        {/* Active Dot */}
        {isActive && (
          <View
            style={[
              styles.activeDot,
              {
                backgroundColor: colors.accent,
                borderColor: '#FFFFFF',
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  roleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
