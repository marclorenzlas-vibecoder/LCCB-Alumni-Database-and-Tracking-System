import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { eventService } from '../../services/eventService';
import { isTeacher } from '../../utils/auth';
import { formatDate, imageUrl } from '../../utils/formatters';

const STATUS_OPTIONS = [
  'all',
  'upcoming',
  'current',
  'past'
];

const SORT_OPTIONS = ['date', 'name', 'attendees'];

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
  if (!date || Number.isNaN(date.getTime())) {
    return 'upcoming';
  }

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

export default function EventsListScreen({ navigation, route }) {
  const teacher = isTeacher();
  const openEventId = route?.params?.openEventId ? Number(route.params.openEventId) : null;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(true);

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

      return () => {
        mounted = false;
      };
    }, [loadEvents])
  );

  const eventTypes = useMemo(() => {
    return Array.from(new Set(events.map((event) => String(event.type || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [events]);

  const typeOptions = useMemo(() => ['ALL', ...eventTypes], [eventTypes]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = events.filter((event) => {
      const matchesQuery = !q || [event.name, event.description, event.location, event.type]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(q));

      const matchesType = !selectedType || String(event.type || '') === selectedType;

      const eventState = getEventDateState(event);
      const matchesStatus = selectedStatus === 'all' || eventState === selectedStatus;

      return matchesQuery && matchesType && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (sortBy === 'attendees') {
        return Number(b.attendees || 0) - Number(a.attendees || 0);
      }
      return new Date(a.date || 0) - new Date(b.date || 0);
    });

    return result;
  }, [events, query, selectedStatus, selectedType, sortBy]);

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
    if (match) {
      navigation.navigate('EventDetail', { eventId: match.id });
    }
  }, [events, navigation, openEventId]);

  const clearFilters = () => {
    setQuery('');
    setSelectedType('');
    setSelectedStatus('all');
    setSortBy('date');
    setShowTypeMenu(false);
    setShowStatusMenu(false);
    setShowSortMenu(false);
  };

  const hasFilters = query || selectedType || selectedStatus !== 'all' || sortBy !== 'date';

  const renderPicker = ({ visible, title, selected, onClose, onSelect, options, displayValue }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Filter Options</Text>
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color="#334155" />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} showsVerticalScrollIndicator={false}>
            {options.map((value) => {
              const label = displayValue(value);
              const active = value === selected;
              return (
                <Pressable key={value} style={[styles.optionCard, active && styles.optionCardActive]} onPress={() => onSelect(value)}>
                  <View style={styles.optionCardHeader}>
                    <Text style={[styles.optionCardLabel, active && styles.optionCardLabelActive]}>{label}</Text>
                    {active ? <Ionicons name="checkmark-circle" size={16} color="#1e3a8a" /> : null}
                  </View>
                  {active ? <Text style={styles.optionCardHint}>Tap again to clear selection</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <ScreenContainer>
      <View style={styles.heroWrap}>
        <Text style={styles.heroTitle}>Events</Text>
        <Text style={styles.heroSubtitle}>Find upcoming activities, today&apos;s events, and past gatherings from the alumni network.</Text>
      </View>

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>Search and Filters</Text>

        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events by title, location, or type"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
          />
          {query ? (
            <Pressable style={styles.searchClearButton} onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterGrid}>
          <Pressable style={styles.filterButton} onPress={() => setShowTypeMenu(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="pricetag-outline" size={13} color="#1e3a8a" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{selectedType || 'All Types'}</Text>
            </View>
          </Pressable>

          <Pressable style={styles.filterButton} onPress={() => setShowStatusMenu(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="calendar-outline" size={13} color="#1e3a8a" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{selectedStatus === 'all' ? 'All Events' : selectedStatus === 'current' ? 'Happening Today' : selectedStatus === 'past' ? 'Past Events' : 'Upcoming'}</Text>
            </View>
          </Pressable>

          <Pressable style={styles.filterButton} onPress={() => setShowSortMenu(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="swap-vertical-outline" size={13} color="#1e3a8a" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{sortBy === 'date' ? 'Date' : sortBy === 'name' ? 'Name' : 'Attendees'}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Showing {filteredEvents.length} of {events.length} events</Text>
          {hasFilters ? (
            <Pressable style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedStatus === 'all' ? (
          <View style={styles.chipRow}>
            <StatChip label="Upcoming" value={String(categorized.upcoming.length)} tone="upcoming" />
            <StatChip label="Today" value={String(categorized.current.length)} tone="today" />
            <StatChip label="Previous" value={String(categorized.past.length)} tone="previous" />
          </View>
        ) : null}
      </View>

      {loading ? <LoadingState label="Loading events" /> : null}
      {!loading && filteredEvents.length === 0 ? <EmptyState title="No events found" description="Try adjusting your filters or search term." /> : null}

      {!loading && filteredEvents.length > 0 ? (
        selectedStatus === 'all' ? (
          <View style={styles.sectionWrap}>
            <EventSection title="Current Event" count={categorized.current.length} events={categorized.current} navigation={navigation} teacher={teacher} />
            <EventSection title="Upcoming Events" count={categorized.upcoming.length} events={categorized.upcoming} navigation={navigation} teacher={teacher} />
            <EventSection title="Previous Events" count={categorized.past.length} events={categorized.past} navigation={navigation} teacher={teacher} collapsible expanded={previousExpanded} onToggle={() => setPreviousExpanded((prev) => !prev)} />
          </View>
        ) : (
          <View style={styles.sectionWrap}>
            <EventSection
              title={selectedStatus === 'current' ? 'Current Event' : selectedStatus === 'past' ? 'Previous Events' : 'Upcoming Events'}
              count={filteredEvents.length}
              events={filteredEvents}
              navigation={navigation}
              teacher={teacher}
            />
          </View>
        )
      ) : null}

      <View style={styles.pickerHost}>
        {renderPicker({
          visible: showTypeMenu,
          title: 'Event Type',
          options: typeOptions,
          selected: selectedType || 'ALL',
          onClose: () => setShowTypeMenu(false),
          onSelect: (value) => {
            setSelectedType((prev) => (prev === value || value === 'ALL' ? '' : value));
            setShowTypeMenu(false);
          },
          displayValue: (value) => (value === 'ALL' ? 'All Types' : value)
        })}

        {renderPicker({
          visible: showStatusMenu,
          title: 'Status',
          options: STATUS_OPTIONS,
          selected: selectedStatus,
          onClose: () => setShowStatusMenu(false),
          onSelect: (value) => {
            setSelectedStatus(value);
            setShowStatusMenu(false);
          },
          displayValue: (value) => {
            if (value === 'all') return 'All Events';
            if (value === 'current') return 'Happening Today';
            if (value === 'past') return 'Past Events';
            return 'Upcoming';
          }
        })}

        {renderPicker({
          visible: showSortMenu,
          title: 'Sort By',
          options: SORT_OPTIONS,
          selected: sortBy,
          onClose: () => setShowSortMenu(false),
          onSelect: (value) => {
            setSortBy(value);
            setShowSortMenu(false);
          },
          displayValue: (value) => {
            if (value === 'date') return 'Date';
            if (value === 'name') return 'Name';
            return 'Attendees';
          }
        })}
      </View>
    </ScreenContainer>
  );
}

function StatChip({ label, value, tone }) {
  return (
    <View style={[styles.statChip, styles[`statChip${tone.charAt(0).toUpperCase()}${tone.slice(1)}`]]}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
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
              {event.description ? <Text style={styles.eventDescription} numberOfLines={4}>{event.description}</Text> : null}
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

function EventImage({ path }) {
  const uri = imageUrl(path, API_ORIGIN);
  if (uri) {
    return <Image source={{ uri }} style={styles.eventImage} />;
  }

  return (
    <View style={[styles.eventImage, styles.placeholderImage]}>
      <Text style={styles.placeholderText}>No Event Image</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 4
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b'
  },
  filterPanel: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  filterPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    fontSize: 14,
    color: '#0f172a'
  },
  searchClearButton: {
    marginLeft: 8
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  filterButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    backgroundColor: '#fff',
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  filterButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0
  },
  filterIconPill: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flexShrink: 1
  },
  filterCaret: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700'
  },
  summaryRow: {
    marginTop: 4,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8
  },
  summaryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500'
  },
  clearBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  clearBtnText: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 12
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  statChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statChipUpcoming: {
    backgroundColor: '#dbeafe'
  },
  statChipToday: {
    backgroundColor: '#dcfce7'
  },
  statChipPrevious: {
    backgroundColor: '#ede9fe'
  },
  statChipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  statChipLabel: {
    fontSize: 11,
    color: '#475569'
  },
  sectionWrap: {
    marginTop: 6,
    gap: 10
  },
  sectionBlock: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9
  },
  sectionLine: {
    width: 30,
    height: 2,
    backgroundColor: '#94a3b8'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b1635'
  },
  sectionMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  sectionMetaCountText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700'
  },
  sectionCaret: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700'
  },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    overflow: 'hidden',
    paddingBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  pastBadge: {
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusDotUpcoming: {
    backgroundColor: '#2563eb'
  },
  statusDotToday: {
    backgroundColor: '#16a34a'
  },
  statusDotPrevious: {
    backgroundColor: '#7c3aed'
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#111827'
  },
  eventImageWrap: {
    position: 'relative'
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600'
  },
  eventBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 2
  },
  eventName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a'
  },
  eventMeta: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12
  },
  eventDescription: {
    marginTop: 10,
    color: '#1f2937',
    lineHeight: 19,
    fontSize: 13
  },
  eventActions: {
    paddingHorizontal: 14,
    paddingTop: 8
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10
  },
  viewDetailsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  actions: {
    marginTop: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-start'
  },
  editText: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    maxHeight: '78%',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  modalEyebrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  modalList: {
    paddingHorizontal: 12,
    paddingTop: 12
  },
  modalListContent: {
    paddingBottom: 20
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 10
  },
  optionCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    shadowOpacity: 0.08,
    elevation: 2
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  optionCardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  optionCardLabelActive: {
    color: '#1e3a8a'
  },
  optionCardHint: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '600'
  },
  pickerHost: {
    height: 0,
    overflow: 'hidden'
  }
});
