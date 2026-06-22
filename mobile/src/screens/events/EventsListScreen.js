import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { eventService } from '../../services/eventService';
import { realtimeClient } from '../../services/realtimeClient';
import { isTeacher } from '../../utils/auth';
import { formatDate, imageUrl } from '../../utils/formatters';

const TYPE_COLORS = {
  Workshop: { bg: '#eff6ff', text: '#1d4ed8' },
  Seminar: { bg: '#f0fdf4', text: '#166534' },
  Networking: { bg: '#fef3c7', text: '#92400e' },
  Conference: { bg: '#fce7f3', text: '#9d174d' },
  Social: { bg: '#ede9fe', text: '#5b21b6' },
  Sports: { bg: '#dcfce7', text: '#166534' },
  Career: { bg: '#e0f2fe', text: '#075985' },
  Competition: { bg: '#fff7ed', text: '#c2410c' }
};

const getTypeColor = (type) => {
  if (!type) return { bg: '#f1f5f9', text: '#475569' };
  return TYPE_COLORS[type] || { bg: '#f1f5f9', text: '#475569' };
};

const getEventDateState = (event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = event?.date ? new Date(event.date) : null;
  if (!date || Number.isNaN(date.getTime())) return 'upcoming';
  date.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return 'current';
  if (date < today) return 'past';
  return 'upcoming';
};

const getStatusLabel = (event) => {
  const status = String(event?.status || '').toUpperCase();
  if (status === 'PREVIOUS') return 'Previous';
  if (status === 'CURRENT') return 'Today';
  if (status === 'UPCOMING') return 'Upcoming';
  const computed = getEventDateState(event);
  if (computed === 'current') return 'Today';
  if (computed === 'past') return 'Previous';
  return 'Upcoming';
};

const getStatusTone = (event) => {
  const computed = getEventDateState(event);
  if (computed === 'current') return 'today';
  if (computed === 'past') return 'previous';
  return 'upcoming';
};

const STATUS_FILTERS = ['upcoming', 'current', 'past'];
const STATUS_LABELS = { upcoming: 'Upcoming', current: 'Happening Today', past: 'Past Events' };

function MultiOptionPicker({ visible, title, options, selected, onToggle, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color="#334155" />
            </Pressable>
          </View>
          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
            {options.map((value) => {
              const active = selected.includes(value);
              return (
                <Pressable
                  key={value}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => onToggle(value)}
                >
                  <View style={[styles.checkbox, active && styles.checkboxActive]}>
                    {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterDropdown({ visible, locations, eventTypes, tempLocations, tempTypes, tempStatuses, toggleLocation, toggleType, toggleStatus, onApply, onClear, onClose }) {
  const [pickerTarget, setPickerTarget] = useState(null);

  const locCount = tempLocations.length;
  const typeCount = tempTypes.length;
  const statusCount = tempStatuses.length;
  const activeCount = locCount + typeCount + statusCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dropdownBackdrop} onPress={onClose}>
        <Pressable style={styles.dropdownPanel} onPress={() => {}}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Filters</Text>
            {activeCount > 0 ? (
              <View style={styles.dropdownCountBadge}>
                <Text style={styles.dropdownCountText}>{activeCount}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.dropdownFields}>
            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('location')}>
              <Text style={styles.dropdownFieldLabel}>Event Location</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, locCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {locCount === 0 ? 'Any location' : `${locCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('type')}>
              <Text style={styles.dropdownFieldLabel}>Event Type</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, typeCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {typeCount === 0 ? 'Any type' : `${typeCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('status')}>
              <Text style={styles.dropdownFieldLabel}>Event Status</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, statusCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {statusCount === 0 ? 'Any status' : `${statusCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>
          </View>

          <View style={styles.dropdownActions}>
            {activeCount > 0 ? (
              <Pressable style={styles.dropdownClearBtn} onPress={onClear}>
                <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
                <Text style={styles.dropdownClearText}>Clear Filter</Text>
              </Pressable>
            ) : <View style={{ flex: 1 }} />}
            <Pressable style={styles.dropdownApplyBtn} onPress={onApply}>
              <Text style={styles.dropdownApplyText}>Apply Filter</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      <MultiOptionPicker
        visible={pickerTarget === 'location'}
        title="Event Location"
        options={locations}
        selected={tempLocations}
        onToggle={toggleLocation}
        onClose={() => setPickerTarget(null)}
      />
      <MultiOptionPicker
        visible={pickerTarget === 'type'}
        title="Event Type"
        options={eventTypes}
        selected={tempTypes}
        onToggle={toggleType}
        onClose={() => setPickerTarget(null)}
      />
      <MultiOptionPicker
        visible={pickerTarget === 'status'}
        title="Event Status"
        options={STATUS_FILTERS}
        selected={tempStatuses}
        onToggle={toggleStatus}
        onClose={() => setPickerTarget(null)}
      />
    </Modal>
  );
}

function EventImage({ path }) {
  const uri = imageUrl(path, API_ORIGIN);
  if (uri) return <Image source={{ uri }} style={styles.eventImage} />;
  return (
    <View style={[styles.eventImage, styles.placeholderImage]}>
      <Text style={styles.placeholderText}>No Event Image</Text>
    </View>
  );
}

export default function EventsListScreen({ navigation, route }) {
  const teacher = isTeacher();
  const openEventId = route?.params?.openEventId ? Number(route.params.openEventId) : null;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [previousExpanded, setPreviousExpanded] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [tempLocations, setTempLocations] = useState([]);
  const [tempTypes, setTempTypes] = useState([]);
  const [tempStatuses, setTempStatuses] = useState([]);

  const loadEvents = useCallback(async () => {
    const data = await eventService.getAll();
    setEvents(Array.isArray(data) ? data : []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);

      loadEvents()
        .catch((error) => {
          console.error('Failed to load events:', error?.message || error);
          Alert.alert('Error', 'Failed to load events.');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });

      const unsubCreated = realtimeClient.subscribe('event.created', () => {
        if (mounted) loadEvents().catch(() => {});
      });
      const unsubUpdated = realtimeClient.subscribe('event.updated', () => {
        if (mounted) loadEvents().catch(() => {});
      });
      const unsubDeleted = realtimeClient.subscribe('event.deleted', () => {
        if (mounted) loadEvents().catch(() => {});
      });
      const unsubAttendance = realtimeClient.subscribe('event.attendance.changed', () => {
        if (mounted) loadEvents().catch(() => {});
      });

      return () => {
        mounted = false;
        unsubCreated();
        unsubUpdated();
        unsubDeleted();
        unsubAttendance();
      };
    }, [loadEvents])
  );

  const uniqueLocations = useMemo(() => [...new Set(events.map(e => e.location).filter(Boolean))].sort(), [events]);
  const uniqueTypes = useMemo(() => [...new Set(events.map(e => String(e.type || '').trim()).filter(Boolean))].sort(), [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = events;

    if (q) {
      result = result.filter((event) => {
        const tagMatch = Array.isArray(event.tags) && event.tags.some(tag => String(tag || '').toLowerCase().includes(q));
        return [event.name, event.description, event.location, event.type]
          .map((v) => String(v || '').toLowerCase())
          .some((v) => v.includes(q)) || tagMatch;
      });
    }
    if (selectedLocations.length > 0) result = result.filter((e) => selectedLocations.includes(e.location));
    if (selectedTypes.length > 0) result = result.filter((e) => selectedTypes.includes(String(e.type || '').trim()));
    if (selectedStatuses.length > 0) {
      result = result.filter((e) => {
        const state = getEventDateState(e);
        return selectedStatuses.includes(state);
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'attendees') return Number(b.attendees || 0) - Number(a.attendees || 0);
      return new Date(a.date || 0) - new Date(b.date || 0);
    });

    return result;
  }, [events, query, selectedLocations, selectedTypes, selectedStatuses, sortBy]);

  const categorized = useMemo(() => {
    return filteredEvents.reduce((acc, event) => {
      const key = getEventDateState(event);
      acc[key].push(event);
      return acc;
    }, { upcoming: [], current: [], past: [] });
  }, [filteredEvents]);

  useEffect(() => {
    if (!openEventId || events.length === 0) return;
    const match = events.find((event) => Number(event.id) === openEventId);
    if (match) navigation.navigate('EventDetail', { eventId: match.id });
  }, [events, navigation, openEventId]);

  const activeFilterCount = selectedLocations.length + selectedTypes.length + selectedStatuses.length;

  const openFilter = () => {
    setTempLocations([...selectedLocations]);
    setTempTypes([...selectedTypes]);
    setTempStatuses([...selectedStatuses]);
    setShowFilterDropdown(true);
  };

  const toggleTempLocation = (v) => setTempLocations(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleTempType = (v) => setTempTypes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleTempStatus = (v) => setTempStatuses(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const applyFilter = () => {
    setSelectedLocations([...tempLocations]);
    setSelectedTypes([...tempTypes]);
    setSelectedStatuses([...tempStatuses]);
    setShowFilterDropdown(false);
  };

  const clearFilter = () => {
    setTempLocations([]);
    setTempTypes([]);
    setTempStatuses([]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Events</Text>
        <Text style={styles.screenSubtitle}>Find upcoming activities, today's events, and past gatherings.</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          <Pressable style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]} onPress={openFilter}>
            <Ionicons name="filter-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#475569'} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterToggleBadge}>
                <Text style={styles.filterToggleBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable style={styles.sortBtn} onPress={() => {
            Alert.alert('Sort By', 'Choose sort order', [
              { text: 'Date', onPress: () => setSortBy('date') },
              { text: 'Name', onPress: () => setSortBy('name') },
              { text: 'Attendees', onPress: () => setSortBy('attendees') },
              { text: 'Cancel', style: 'cancel' }
            ]);
          }}>
            <Ionicons name="swap-vertical" size={18} color="#475569" />
          </Pressable>
        </View>

        <FilterDropdown
          visible={showFilterDropdown}
          locations={uniqueLocations}
          eventTypes={uniqueTypes}
          tempLocations={tempLocations}
          tempTypes={tempTypes}
          tempStatuses={tempStatuses}
          toggleLocation={toggleTempLocation}
          toggleType={toggleTempType}
          toggleStatus={toggleTempStatus}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setShowFilterDropdown(false)}
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Showing {filteredEvents.length} of {events.length} events</Text>
        </View>

        {selectedStatuses.length === 0 ? (
          <View style={styles.chipRow}>
            <View style={[styles.statChip, styles.statChipUpcoming]}>
              <Text style={styles.statChipValue}>{categorized.upcoming.length}</Text>
              <Text style={styles.statChipLabel}>Upcoming</Text>
            </View>
            <View style={[styles.statChip, styles.statChipToday]}>
              <Text style={styles.statChipValue}>{categorized.current.length}</Text>
              <Text style={styles.statChipLabel}>Today</Text>
            </View>
            <View style={[styles.statChip, styles.statChipPrevious]}>
              <Text style={styles.statChipValue}>{categorized.past.length}</Text>
              <Text style={styles.statChipLabel}>Previous</Text>
            </View>
          </View>
        ) : null}

        {loading ? <LoadingState label="Loading events" /> : null}
        {!loading && filteredEvents.length === 0 ? <EmptyState title="No events found" description="Try adjusting your filters or search term." /> : null}

        {!loading && filteredEvents.length > 0 && (
          <View style={styles.sectionWrap}>
            {selectedStatuses.length === 0 ? (
              <>
                {categorized.current.length > 0 && (
                  <EventSection title="Current Event" count={categorized.current.length} events={categorized.current} navigation={navigation} teacher={teacher} />
                )}
                {categorized.upcoming.length > 0 && (
                  <EventSection title="Upcoming Events" count={categorized.upcoming.length} events={categorized.upcoming} navigation={navigation} teacher={teacher} />
                )}
                {categorized.past.length > 0 && (
                  <EventSection title="Previous Events" count={categorized.past.length} events={categorized.past} navigation={navigation} teacher={teacher} collapsible expanded={previousExpanded} onToggle={() => setPreviousExpanded((prev) => !prev)} />
                )}
              </>
            ) : (
              <EventSection
                title="Filtered Events"
                count={filteredEvents.length}
                events={filteredEvents}
                navigation={navigation}
                teacher={teacher}
              />
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function EventSection({ title, count, events, navigation, teacher, collapsible = false, expanded = true, onToggle = null }) {
  if (count === 0) return null;
  return (
    <View style={styles.sectionBlock}>
      <Pressable style={styles.sectionHeader} onPress={collapsible ? onToggle : undefined}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionMetaWrap}>
          <Text style={styles.sectionMetaCountText}>{count}</Text>
          {collapsible ? <Text style={styles.sectionCaret}>{expanded ? '^' : 'v'}</Text> : null}
        </View>
      </Pressable>

      {expanded && events.map((event) => {
        const typeColor = getTypeColor(event.type);
        return (
          <View key={event.id} style={styles.eventCard}>
            <Pressable onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
              <View style={styles.eventImageWrap}>
                <EventImage path={event.image} />
                <View style={styles.badgeRow}>
                  {event.type ? (
                    <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>{event.type}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.pastBadge}>{getStatusLabel(event)}</Text>
                  <View style={[styles.statusDot, styles[`statusDot${getStatusTone(event).charAt(0).toUpperCase()}${getStatusTone(event).slice(1)}`]]} />
                </View>
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventName}>{event.name}</Text>
                <Text style={styles.eventMeta}>{formatDate(event.date)}</Text>
                <Text style={styles.eventMeta}>{event.location || 'TBA'}</Text>
              </View>
            </Pressable>
            <View style={styles.eventActions}>
              <Pressable style={styles.viewDetailsBtn} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                <Text style={styles.viewDetailsText}>View Details</Text>
              </Pressable>
            </View>
            {teacher ? (
              <View style={styles.actions}>
                <Pressable style={styles.editBtn} onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}>
                  <Text style={styles.editText}>Manage</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 12
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  searchShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  filterToggleBtn: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 4
  },
  filterToggleBtnActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  sortBtn: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  filterToggleBadge: {
    position: 'absolute', top: -5, right: -3, minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5
  },
  filterToggleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  summaryRow: { marginBottom: 8 },
  summaryText: { color: '#334155', fontSize: 12, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statChipUpcoming: { backgroundColor: '#dbeafe' },
  statChipToday: { backgroundColor: '#dcfce7' },
  statChipPrevious: { backgroundColor: '#ede9fe' },
  statChipValue: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  statChipLabel: { fontSize: 11, color: '#475569' },
  sectionWrap: { gap: 10 },
  sectionBlock: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionLine: { width: 30, height: 2, backgroundColor: '#94a3b8' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0b1635' },
  sectionMetaWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionMetaCountText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  sectionCaret: { color: '#475569', fontSize: 14, fontWeight: '700' },
  eventCard: {
    borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
    overflow: 'hidden', paddingBottom: 12, shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1
  },
  badgeRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  pastBadge: {
    backgroundColor: '#f8fafc', color: '#0f172a', borderRadius: 999, borderWidth: 1,
    borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '700'
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotUpcoming: { backgroundColor: '#2563eb' },
  statusDotToday: { backgroundColor: '#16a34a' },
  statusDotPrevious: { backgroundColor: '#7c3aed' },
  eventImage: { width: '100%', height: 180, backgroundColor: '#dbeafe' },
  eventImageWrap: { position: 'relative' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  eventBody: { paddingHorizontal: 14, paddingTop: 12, gap: 2 },
  eventName: { fontSize: 21, fontWeight: '700', color: '#0f172a' },
  eventMeta: { marginTop: 2, color: '#64748b', fontSize: 12 },
  eventActions: { paddingHorizontal: 14, paddingTop: 8 },
  viewDetailsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10
  },
  viewDetailsText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  actions: { marginTop: 10, paddingHorizontal: 14, flexDirection: 'row', gap: 10 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#dbeafe', alignSelf: 'flex-start' },
  editText: { color: '#1e3a8a', fontWeight: '700' },
  dropdownBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.38)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dropdownPanel: { width: '100%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  dropdownCountBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  dropdownCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dropdownFields: { padding: 18, gap: 0 },
  dropdownField: { paddingVertical: 14 },
  dropdownFieldLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  dropdownFieldValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownFieldValueText: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  dropdownFieldValuePlaceholder: { color: '#94a3b8', fontWeight: '400' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9' },
  dropdownActions: { flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingHorizontal: 18, paddingBottom: 18 },
  dropdownClearBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca'
  },
  dropdownClearText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
  dropdownApplyBtn: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  dropdownApplyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.38)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickerCard: { width: '100%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  pickerList: { padding: 10 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 2 },
  pickerOptionActive: { backgroundColor: '#eff6ff' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pickerOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#334155' },
  pickerOptionTextActive: { color: '#1e3a8a', fontWeight: '700' }
});
