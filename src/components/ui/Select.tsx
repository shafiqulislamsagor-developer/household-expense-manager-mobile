import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BengaliText } from '../BengaliText';
import { SearchInput } from './SearchInput';
import { useTheme } from '../../theme/ThemeContext';

export interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'নির্বাচন করুন',
  required = false,
  searchable = false,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((o) => o.value === selectedValue);

  const filteredOptions = searchable && search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.subtitle && o.subtitle.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  const handleChoose = (val: string) => {
    onSelect(val);
    setModalVisible(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <BengaliText variant="h4" color={isDark ? colors.textSecondary : colors.secondary} style={styles.label}>
            {label}
          </BengaliText>
          {required && (
            <BengaliText variant="h4" color={colors.danger} style={styles.requiredStar}>
              *
            </BengaliText>
          )}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: isDark ? colors.borderStrong : colors.border,
          },
        ]}
      >
        <View style={styles.leftContent}>
          {selectedOption?.icon && (
            <Ionicons
              name={selectedOption.icon}
              size={18}
              color={selectedOption.color || colors.primary}
              style={{ marginRight: 8 }}
            />
          )}
          <BengaliText
            variant="bodyBold"
            color={selectedOption ? colors.text : colors.textLight}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </BengaliText>
        </View>

        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: isDark ? colors.borderStrong : colors.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHeader}>
              <BengaliText variant="h3" color={colors.text}>
                {label || placeholder}
              </BengaliText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchWrapper}>
                <SearchInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="খুঁজুন..."
                />
              </View>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleChoose(item.value)}
                    style={[
                      styles.optionItem,
                      {
                        borderBottomColor: isDark ? colors.borderLight : colors.borderLight,
                        backgroundColor: isSelected
                          ? isDark
                            ? `${colors.primary}20`
                            : `${colors.primary}10`
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      {item.icon && (
                        <View
                          style={[
                            styles.optionIconCircle,
                            {
                              backgroundColor: isDark
                                ? `${item.color || colors.primary}25`
                                : `${item.color || colors.primary}15`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={item.color || colors.primary}
                          />
                        </View>
                      )}
                      <View>
                        <BengaliText
                          variant="bodyBold"
                          color={isSelected ? colors.primary : colors.text}
                        >
                          {item.label}
                        </BengaliText>
                        {item.subtitle ? (
                          <BengaliText variant="caption" color={colors.textMuted}>
                            {item.subtitle}
                          </BengaliText>
                        ) : null}
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  requiredStar: {
    marginLeft: 3,
    fontSize: 14,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchWrapper: {
    padding: 12,
  },
  list: {
    paddingHorizontal: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
