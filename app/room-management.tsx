import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../src/components/Header';
import { BengaliText } from '../src/components/BengaliText';
import { FinancialSummaryCard } from '../src/components/ui/FinancialSummaryCard';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { EmptyState } from '../src/components/ui/EmptyState';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { AmountInput } from '../src/components/ui/AmountInput';
import { TextInput } from '../src/components/ui/TextInput';
import { ApiClient } from '../src/services/apiClient';
import { MoneyUtil } from '../src/utils/money';
import { useTheme } from '../src/theme/ThemeContext';
import { useToast } from '../src/context/ToastContext';

interface RoomItem {
  _id: string;
  roomName: string;
  monthlyRentPaisa: number;
  assignedMemberUserIds: Array<{ _id: string; name: string; phone?: string }>;
  notes?: string;
}

export default function RoomManagementScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Room Modal (Create / Edit)
  const [roomModal, setRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [monthlyRentTaka, setMonthlyRentTaka] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomRes, memRes] = await Promise.all([
        ApiClient.listRooms(),
        ApiClient.getHouseholdMembers(),
      ]);

      if (roomRes?.success && Array.isArray(roomRes.data)) {
        setRooms(roomRes.data);
      }
      if (memRes?.success && Array.isArray(memRes.data)) {
        setMembers(memRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenCreate = () => {
    setEditingRoomId(null);
    setRoomName('');
    setMonthlyRentTaka('');
    setSelectedMemberIds([]);
    setNotes('');
    setRoomModal(true);
  };

  const handleOpenEdit = (room: RoomItem) => {
    setEditingRoomId(room._id);
    setRoomName(room.roomName);
    setMonthlyRentTaka(MoneyUtil.paisaToTaka(room.monthlyRentPaisa).toString());
    setSelectedMemberIds(room.assignedMemberUserIds.map((m) => m._id));
    setNotes(room.notes || '');
    setRoomModal(true);
  };

  const toggleMemberSelection = (uid: string) => {
    if (selectedMemberIds.includes(uid)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== uid));
    } else {
      setSelectedMemberIds([...selectedMemberIds, uid]);
    }
  };

  const handleSubmit = async () => {
    if (!roomName.trim()) {
      showToast('রুমের নাম উল্লেখ করুন', 'warning');
      return;
    }
    const num = parseFloat(monthlyRentTaka);
    if (isNaN(num) || num < 0) {
      showToast('সঠিক মাসিক ভাড়া দিন', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        roomName: roomName.trim(),
        monthlyRentPaisa: MoneyUtil.takaToPaisa(num),
        assignedMemberUserIds: selectedMemberIds,
        notes: notes.trim(),
      };

      let res;
      if (editingRoomId) {
        res = await ApiClient.updateRoom(editingRoomId, payload);
      } else {
        res = await ApiClient.createRoom(payload);
      }

      if (res?.success) {
        showToast(editingRoomId ? 'রুম তথ্য আপডেট হয়েছে' : 'নতুন রুম তৈরি হয়েছে', 'success');
        setRoomModal(false);
        loadData();
      } else {
        showToast(res?.message || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (room: RoomItem) => {
    Alert.alert(
      'রুম মুছে ফেলতে চান?',
      `"${room.roomName}" মুছে ফেললে সদস্যদের রুম নির্ধারণ বাতিল হবে।`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await ApiClient.deleteRoom(room._id);
              if (res?.success) {
                showToast('রুম মুছে ফেলা হয়েছে', 'success');
                loadData();
              }
            } catch (err: any) {
              showToast(err.message || 'মুছে ফেলা যায়নি', 'error');
            }
          },
        },
      ]
    );
  };

  // Summaries
  const totalRentPaisa = rooms.reduce((sum, r) => sum + r.monthlyRentPaisa, 0);
  const totalOccupants = rooms.reduce((sum, r) => sum + r.assignedMemberUserIds.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="রুম ও ভাড়া ব্যবস্থাপনা"
        subtitle="মেস ও যৌথ বাসার রুমভিত্তিক ভাড়া বিভাজন"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="home-outline" size={24} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <BengaliText style={[styles.infoTitle, { color: colors.text }]}>
              স্বয়ংক্রিয় রুমভিত্তিক ভাড়া হিসাব
            </BengaliText>
            <BengaliText style={[styles.infoDesc, { color: colors.textMuted }]}>
              প্রতিটি রুমের জন্য পৃথক ভাড়া নির্ধারণ করুন। একটি রুমে একাধিক সদস্য থাকলে তাদের মধ্যে ভাড়া স্বয়ংক্রিয়ভাবে সমানভাবে ভাগ হবে।
            </BengaliText>
          </View>
        </View>

        {/* Top Summary */}
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <FinancialSummaryCard
              title="মোট মাসিক বাড়িভাড়া"
              amountPaisa={totalRentPaisa}
              icon="business-outline"
              variant="expense"
              subtitle={`${rooms.length} টি রুমের মোট ভাড়া`}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FinancialSummaryCard
              title="বরাদ্দকৃত সদস্য"
              amountPaisa={totalOccupants}
              icon="people-outline"
              variant="default"
              customValue={`${totalOccupants} জন`}
              subtitle="রুমের মোট বাসিন্দা"
            />
          </View>
        </View>

        {/* Add Room Button */}
        <PrimaryButton
          title="নতুন রুম যুক্ত করুন"
          icon="add-circle-outline"
          onPress={handleOpenCreate}
          style={{ marginVertical: 12 }}
        />

        {/* Section: Rooms List */}
        <SectionHeader title="রুমসমূহের তালিকা" count={rooms.length} />

        {rooms.length === 0 ? (
          <EmptyState
            title="কোনো রুম কনফিগারেশন নেই"
            description="বাসা বা মেসের রুম এবং তাদের ভাড়া নির্ধারণ করতে উপরের বোতাম চাপুন।"
            icon="home"
          />
        ) : (
          rooms.map((room) => {
            const occupantCount = room.assignedMemberUserIds.length;
            const perMemberRent = occupantCount > 0
              ? Math.floor(room.monthlyRentPaisa / occupantCount)
              : room.monthlyRentPaisa;

            return (
              <View
                key={room._id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.roomTitleRow}>
                    <View style={[styles.roomIcon, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="bed-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <BengaliText style={[styles.cardTitle, { color: colors.text }]}>
                        {room.roomName}
                      </BengaliText>
                      <BengaliText style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                        {occupantCount > 0 ? `${occupantCount} জন সদস্যের জন্য` : 'সদস্য নির্ধারিত হয়নি'}
                      </BengaliText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <BengaliText style={[styles.amountText, { color: colors.primary }]}>
                      {MoneyUtil.formatBengaliCurrency(room.monthlyRentPaisa)}
                    </BengaliText>
                    {occupantCount > 1 && (
                      <BengaliText style={[styles.perMemberText, { color: colors.textMuted }]}>
                        জনপ্রতি: {MoneyUtil.formatBengaliCurrency(perMemberRent)}
                      </BengaliText>
                    )}
                  </View>
                </View>

                {/* Assigned Members */}
                <View style={styles.memberTagsContainer}>
                  {occupantCount === 0 ? (
                    <BengaliText style={[styles.noMemberNotice, { color: colors.textMuted }]}>
                      কোনো সদস্য নির্বাচন করা হয়নি
                    </BengaliText>
                  ) : (
                    room.assignedMemberUserIds.map((m) => (
                      <View key={m._id} style={[styles.memberBadge, { backgroundColor: colors.primary + '12' }]}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
                        <BengaliText style={[styles.memberName, { color: colors.primary }]}>
                          {m.name}
                        </BengaliText>
                      </View>
                    ))
                  )}
                </View>

                {room.notes ? (
                  <BengaliText style={[styles.notesText, { color: colors.textMuted }]}>
                    {room.notes}
                  </BengaliText>
                ) : null}

                {/* Card Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleOpenEdit(room)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.text} />
                    <BengaliText style={[styles.actionBtnText, { color: colors.text }]}>
                      সম্পাদনা
                    </BengaliText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#EF444430', backgroundColor: '#EF444410' }]}
                    onPress={() => handleDelete(room)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    <BengaliText style={[styles.actionBtnText, { color: '#DC2626' }]}>
                      মুছুন
                    </BengaliText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* CREATE / EDIT ROOM MODAL */}
      <BottomSheet
        visible={roomModal}
        onClose={() => setRoomModal(false)}
        title={editingRoomId ? 'রুম তথ্য সম্পাদনা' : 'নতুন রুম যুক্ত করুন'}
      >
        <ScrollView style={{ maxHeight: 500 }}>
          <TextInput
            label="রুমের নাম *"
            value={roomName}
            onChangeText={setRoomName}
            placeholder="যেমন: Room A (মাস্টার বেড)"
          />

          <AmountInput
            label="রুমের মাসিক ভাড়া (টাকা) *"
            value={monthlyRentTaka}
            onChangeTaka={setMonthlyRentTaka}
            placeholder="0.00"
          />

          <BengaliText style={[styles.label, { color: colors.text }]}>এই রুমে কারা থাকেন? (সদস্য নির্বাচন করুন)</BengaliText>
          <View style={styles.pillContainer}>
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m._id);
              return (
                <TouchableOpacity
                  key={m._id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleMemberSelection(m._id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={isSelected ? '#FFF' : colors.textMuted}
                  />
                  <BengaliText style={[styles.pillText, { color: isSelected ? '#FFF' : colors.text }]}>
                    {m.name}
                  </BengaliText>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label="অতিরিক্ত নোট (ঐচ্ছিক)"
            value={notes}
            onChangeText={setNotes}
            placeholder="যেমন: অ্যাটাচড ওয়াশরুম ও ব্যালকনি সহ"
          />

          <PrimaryButton
            title={editingRoomId ? 'আপডেট করুন' : 'রুম সংরক্ষণ করুন'}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={{ marginTop: 16, marginBottom: 24 }}
          />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  perMemberText: {
    fontSize: 11,
    marginTop: 2,
  },
  memberTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  noMemberNotice: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
