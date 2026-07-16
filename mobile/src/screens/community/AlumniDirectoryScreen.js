import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { communityService } from '../../services/communityService';
import { adminService } from '../../services/adminService';
import { getSystemUserId, listenToConversationSummaries } from '../../services/firebaseChatService';
import { realtimeClient } from '../../services/realtimeClient';
import { imageUrl } from '../../utils/formatters';
import { dataEmitter } from '../../utils/EventEmitter';
import { getGroups, getCachedGroups } from '../../services/configService';

const DEFAULT_LEVEL_OPTIONS = ['ALL', 'Integrated School', 'Night High', 'Senior High', 'College', 'ETEEAP', 'Grad School'];

const DEFAULT_GROUP_SECTIONS = [
  {
    key: 'integrated-school',
    title: 'Integrated School',
    items: [
      { value: 'Integrated School - Elementary', label: 'Elementary' },
      { value: 'Integrated School - Junior High', label: 'Junior High' }
    ]
  },
  {
    key: 'night-high',
    title: 'Night High',
    items: [
      { value: 'Night High', label: 'Night High' }
    ]
  },
  {
    key: 'senior-high',
    title: 'Senior High School',
    items: [
      { value: 'Academic Track - ABM (Accountancy, Business & Management)', label: 'ABM', description: 'Academic Track | Accountancy, Business & Management' },
      { value: 'Academic Track - HUMSS (Humanities & Social Sciences)', label: 'HUMSS', description: 'Academic Track | Humanities & Social Sciences' },
      { value: 'Academic Track - STEM (Science, Technology, Engineering & Mathematics)', label: 'STEM', description: 'Academic Track | Science, Technology, Engineering & Mathematics' },
      { value: 'Arts & Design Track - Visual Arts', label: 'Visual Arts', description: 'Arts & Design Track' },
      { value: 'Arts & Design Track - Architectural Drafting', label: 'Architectural Drafting', description: 'Arts & Design Track' },
      { value: 'TVL - Home Economics', label: 'Home Economics', description: 'Technical-Vocational-Livelihood' },
      { value: 'TVL - Tourism', label: 'Tourism', description: 'Technical-Vocational-Livelihood' },
      { value: 'TVL - ICT (Information & Communications Technology)', label: 'ICT', description: 'Technical-Vocational-Livelihood | Information & Communications Technology' }
    ]
  },
  {
    key: 'college',
    title: 'College',
    items: [
      { value: 'SARFAID', label: 'SARFAID' },
      { value: 'SHTM', label: 'SHTM' },
      { value: 'SBIT', label: 'SBIT' },
      { value: 'SSLATE', label: 'SSLATE' }
    ]
  },
  {
    key: 'eteeap',
    title: 'ETEEAP',
    items: [
      { value: 'ETEEAP - BSIT', label: 'BSIT' },
      { value: 'ETEEAP - BSBA', label: 'BSBA' },
      { value: 'ETEEAP - BSED', label: 'BSED' }
    ]
  },
  {
    key: 'grad-school',
    title: 'Graduate School',
    items: [
      { value: 'M.A. in Education', label: 'M.A. in Education' },
      { value: 'M.S. in Management', label: 'M.S. in Management' },
      { value: 'Master of Education (MEd)', label: 'Master of Education (MEd)' }
    ]
  }
];

const mapBackendToGroupSections = (backend) => {
  if (!backend || !backend.groupSectionDefinitions) return DEFAULT_GROUP_SECTIONS;
  return backend.groupSectionDefinitions.map((sec) => ({
    key: sec.key || (sec.title || '').toLowerCase().replace(/\s+/g, '-'),
    title: sec.title || sec.key,
    items: (sec.items || []).map((it) => ({ value: it.value, label: it.label, description: it.description }))
  }));
};

const groupMatcherMap = {
  'Integrated School - Elementary': ['integrated school', 'elementary'],
  'Integrated School - Junior High': ['integrated school', 'junior high'],
  'Night High': ['night high'],
  'Academic Track - ABM (Accountancy, Business & Management)': ['abm', 'accountancy', 'business', 'management'],
  'Academic Track - HUMSS (Humanities & Social Sciences)': ['humss', 'humanities', 'social sciences'],
  'Academic Track - STEM (Science, Technology, Engineering & Mathematics)': ['stem', 'science', 'technology', 'engineering', 'mathematics'],
  'Arts & Design Track - Visual Arts': ['visual arts'],
  'Arts & Design Track - Architectural Drafting': ['architectural drafting'],
  'TVL - Home Economics': ['home economics'],
  'TVL - Tourism': ['tourism'],
  'TVL - ICT (Information & Communications Technology)': ['ict', 'information', 'communications technology'],
  SARFAID: ['sarfaid', 'architecture', 'fine arts', 'interior design'],
  SHTM: ['shtm', 'hospitality', 'tourism', 'hotel', 'restaurant'],
  SBIT: ['sbit', 'bsit', 'information technology', 'computer science'],
  SSLATE: ['sslate', 'education', 'liberal arts', 'science'],
  'ETEEAP - BSIT': ['eteeap', 'bsit'],
  'ETEEAP - BSBA': ['eteeap', 'bsba'],
  'ETEEAP - BSED': ['eteeap', 'bsed'],
  'M.A. in Education': ['graduate school', 'master', 'ma', 'education'],
  'M.S. in Management': ['graduate school', 'master', 'ms', 'management'],
  'Master of Education (MEd)': ['graduate school', 'master of education', 'med', 'education']
};

const normalizeLevel = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[_\s]+/g, ' ');
  const map = {
    integrated_school: 'integrated school',
    night_high: 'night high',
    senior_high: 'senior high',
    senior_high_school: 'senior high',
    college: 'college',
    eteeap: 'eteeap',
    grad_school: 'grad school',
    graduate_school: 'grad school'
  };
  return map[String(value || '').trim().toLowerCase()] || key;
};

const getEducationHistory = (item = {}) => {
  const explicit = item.education_history || item.educationHistory || [];
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit;
  }
  if (item.level || item.batch || item.graduation_year || item.graduationYear) {
    return [{
      level: item.level,
      batch: item.batch,
      graduationYear: item.graduationYear || item.graduation_year
    }];
  }
  return [];
};

const getPrimaryEducation = (item = {}) => {
  const history = getEducationHistory(item);
  if (history.length > 0) return history[history.length - 1];
  return { level: item.level, batch: item.batch };
};

const getDisplayName = (item = {}) => {
  const username = item.user?.username || item.username || '';
  if (username) return username;

  const full = `${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || ''}`.trim();
  return full || 'Unknown Alumni';
};

export default function AlumniDirectoryScreen({ navigation, user }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [erroredImages, setErroredImages] = useState(new Set());
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [batchOfficers, setBatchOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [showOfficersModal, setShowOfficersModal] = useState(false);
  const [levelOptionsState, setLevelOptionsState] = useState(DEFAULT_LEVEL_OPTIONS);
  const [groupSectionsState, setGroupSectionsState] = useState(DEFAULT_GROUP_SECTIONS);
  const insets = useSafeAreaInsets();
  const currentUserId = getSystemUserId(user);

  useEffect(() => {
    if (!currentUserId) {
      setConversationSummaries({});
      return undefined;
    }

    return listenToConversationSummaries(currentUserId, setConversationSummaries);
  }, [currentUserId]);

  const totalUnreadMessages = useMemo(
    () =>
      Object.values(conversationSummaries).reduce(
        (sum, summary) => sum + (Number(summary?.unreadCount) || 0),
        0
      ),
    [conversationSummaries]
  );

  const loadAlumni = React.useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true);
    communityService.getAllAlumni()
      .then((data) => {
        // Keep directory focused on alumni accounts only.
        const filtered = (data || []).filter((item) => !String(item?.email || item?.user?.email || '').toLowerCase().endsWith('@lccbonline.com'));
        setList(filtered);
      })
      .catch((error) => console.error('Failed to load alumni:', error?.message || error))
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Initial load
    loadAlumni(true);

    // Listen for profile updates and refresh instantly
    const unsubscribe = dataEmitter.on('profileUpdated', () => {
      loadAlumni(true);
    });
    const unsubProfileRealtime = realtimeClient.subscribe('profile.updated', () => loadAlumni(false));
    const unsubAlumniRealtime = realtimeClient.subscribe('alumni.updated', () => loadAlumni(false));
    const unsubAlumniCreated = realtimeClient.subscribe('alumni.created', () => loadAlumni(false));
    const unsubAlumniDeleted = realtimeClient.subscribe('alumni.deleted', () => loadAlumni(false));

    return () => {
      unsubscribe();
      unsubProfileRealtime();
      unsubAlumniRealtime();
      unsubAlumniCreated();
      unsubAlumniDeleted();
    };
  }, [loadAlumni]);

  useFocusEffect(
    React.useCallback(() => {
      loadAlumni(true);
      return () => {};
    }, [loadAlumni])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await getCachedGroups();
        if (mounted && cached) {
          if (cached.levelOptions) setLevelOptionsState(['ALL', ...cached.levelOptions.filter(lo => (lo.label || lo).toLowerCase() !== 'all levels').map(lo => (lo.label || lo))]);
          if (cached.groupSectionDefinitions) setGroupSectionsState(mapBackendToGroupSections(cached));
        }
      } catch (e) {
        // ignore
      }

      const fetched = await getGroups();
      if (!mounted) return;
      if (fetched) {
        if (fetched.levelOptions) setLevelOptionsState(['ALL', ...fetched.levelOptions.filter(lo => (lo.label || lo).toLowerCase() !== 'all levels').map(lo => (lo.label || lo))]);
        if (fetched.groupSectionDefinitions) setGroupSectionsState(mapBackendToGroupSections(fetched));
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedBatch || selectedBatch === 'ALL') {
      setBatchOfficers([]);
      return;
    }

    setOfficersLoading(true);
    adminService.getBatchOfficers(selectedBatch)
      .then((data) => setBatchOfficers(data || []))
      .catch((err) => console.error('Failed to load batch officers:', err?.message || err))
      .finally(() => setOfficersLoading(false));
  }, [selectedBatch]);

  const levelOptions = useMemo(() => levelOptionsState, [levelOptionsState]);

  const batchOptions = useMemo(() => {
    const values = [];
    list.forEach((item) => {
      const history = getEducationHistory(item);
      history.forEach((entry) => {
        if (entry?.batch) values.push(String(entry.batch).trim());
      });
      if (!history.length && item.batch) values.push(String(item.batch).trim());
    });

    const unique = Array.from(new Set(values.filter(Boolean)));
    unique.sort((a, b) => {
      const an = Number(a);
      const bn = Number(b);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return bn - an;
      return a.localeCompare(b);
    });
    return ['ALL', ...unique];
  }, [list]);

  const groupSections = useMemo(() => groupSectionsState.map((section) => ({ ...section })), [groupSectionsState]);

  const groupOptions = useMemo(() => ['ALL', ...groupSections.flatMap((section) => section.items.map((item) => item.value))], [groupSections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((item) => {
      const history = getEducationHistory(item);
      const primaryEducation = getPrimaryEducation(item);
      const levels = history.length > 0 ? history.map((entry) => normalizeLevel(entry.level)) : [normalizeLevel(primaryEducation.level)];
      const batches = history.length > 0 ? history.map((entry) => String(entry.batch || '').trim()) : [String(primaryEducation.batch || '').trim()];
      const group = String(item.course || '').trim();
      const name = getDisplayName(item).toLowerCase();
      const course = String(item.course || '').toLowerCase();
      const email = String(item.email || item.user?.email || '').toLowerCase();
      const company = String(item.company || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();

      const matchesQuery = !q || name.includes(q) || course.includes(q) || email.includes(q) || company.includes(q) || location.includes(q);
      const matchesLevel = selectedLevel === 'ALL' || levels.includes(normalizeLevel(selectedLevel));
      const matchesBatch = selectedBatch === 'ALL' || batches.includes(selectedBatch);
      const matchers = groupMatcherMap[selectedGroup] || [selectedGroup];
      const matchesGroup = selectedGroup === 'ALL' || matchers.some((value) => {
        const token = String(value || '').toLowerCase();
        return group.toLowerCase().includes(token) || course.includes(token) || name.includes(token) || company.includes(token) || location.includes(token);
      });

      return matchesQuery && matchesLevel && matchesBatch && matchesGroup;
    });
  }, [list, query, selectedBatch, selectedLevel, selectedGroup]);

  const levelLabel = selectedLevel === 'ALL' ? 'All Levels' : selectedLevel;
  const batchLabel = selectedBatch === 'ALL' ? 'All Batches' : selectedBatch;
  const groupLabelMap = useMemo(() => {
    const map = {};
    groupSections.forEach((section) => {
      section.items.forEach((item) => { map[item.value] = item.label; });
    });
    return map;
  }, [groupSections]);
  const groupLabel = selectedGroup === 'ALL' ? 'All Program' : (groupLabelMap[selectedGroup] || selectedGroup);

  return (
    <View style={styles.screenRoot}>
    <ScreenContainer>
      <View style={styles.heroWrap}>
        <Text style={styles.heroTitle}>Alumni Directory</Text>
        <Text style={styles.heroSubtitle}>Browse and connect with fellow LCCB alumni across all batches and programs.</Text>
      </View>

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>Search and Filters</Text>

        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, course, email, company, location"
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#94a3b8"
          />
          {query ? (
            <Pressable style={styles.searchClearButton} onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterGrid}>
          <Pressable style={styles.filterButton} onPress={() => setLevelPickerOpen(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="school-outline" size={13} color="#1d4ed8" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{levelLabel}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.filterButton} onPress={() => setBatchPickerOpen(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="calendar-outline" size={13} color="#1d4ed8" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{batchLabel}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.filterButton} onPress={() => setGroupPickerOpen(true)}>
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="people-outline" size={13} color="#1d4ed8" />
              </View>
              <Text style={styles.filterButtonText} numberOfLines={1} ellipsizeMode="tail">{groupLabel}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.filterButton, selectedBatch === 'ALL' ? styles.officersButtonDisabled : styles.officersButtonActive]}
            onPress={() => setShowOfficersModal(true)}
            disabled={selectedBatch === 'ALL'}
          >
            <View style={styles.filterButtonInner}>
              <View style={styles.filterIconPill}>
                <Ionicons name="people-outline" size={13} color="#1d4ed8" />
              </View>
              <Text style={[styles.filterButtonText, selectedBatch === 'ALL' && styles.filterTextDisabled]} numberOfLines={1} ellipsizeMode="tail">Batch Officers</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Showing {filtered.length} of {list.length} alumni</Text>
        </View>
      </View>

      <View style={styles.listWrap}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeadLeft}>PROFILE</Text>
        </View>

        {loading ? <LoadingState label="Loading alumni directory" /> : null}
        {!loading && filtered.length === 0 ? <EmptyState title="No alumni found" /> : null}

        {!loading && filtered.map((item) => {
          const img = imageUrl(item.profile_image || item.profileImage, API_ORIGIN);
          const fullName = getDisplayName(item);
          const role = item.current_position || item.course || 'Alumni Member';
          const company = item.company || item.location || '';
          const hasErrored = erroredImages.has(item.id);

          return (
            <Pressable key={item.id} style={styles.rowWrap} onPress={() => navigation.navigate('AlumniDetail', { alumniId: item.id })}>
              <View style={styles.rowContent}>
                {img && !hasErrored ? (
                  <Image
                    source={{ uri: img }}
                    style={styles.avatar}
                    resizeMode="cover"
                    onError={() => setErroredImages((prev) => new Set(prev).add(item.id))}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{fullName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.infoBlock}>
                  <Text style={styles.name}>{fullName}</Text>
                  <Text style={styles.metaLine}>{role}</Text>
                  {company ? <Text style={styles.metaLine}>{company}</Text> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <OptionPicker
        visible={levelPickerOpen}
        title="Select Level"
        options={levelOptions}
        selected={selectedLevel}
        onSelect={(value) => {
          setSelectedLevel((prev) => (prev === value ? 'ALL' : value));
          setLevelPickerOpen(false);
        }}
        onClose={() => setLevelPickerOpen(false)}
        displayValue={(value) => (value === 'ALL' ? 'All Levels' : value)}
      />

      <OptionPicker
        visible={batchPickerOpen}
        title="Select Batch"
        options={batchOptions}
        selected={selectedBatch}
        onSelect={(value) => {
          setSelectedBatch((prev) => (prev === value ? 'ALL' : value));
          setBatchPickerOpen(false);
        }}
        onClose={() => setBatchPickerOpen(false)}
        displayValue={(value) => (value === 'ALL' ? 'All Batches' : value)}
      />

      <OptionPicker
        visible={groupPickerOpen}
        title="All Program"
        sections={groupSections}
        selected={selectedGroup}
        onSelect={(value) => {
          setSelectedGroup((prev) => (prev === value ? 'ALL' : value));
          setGroupPickerOpen(false);
        }}
        onClose={() => setGroupPickerOpen(false)}
        displayValue={(value) => (value === 'ALL' ? 'All Program' : value)}
      />

      <Modal visible={showOfficersModal} transparent animationType="fade" onRequestClose={() => setShowOfficersModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOfficersModal(false)}>
          <Pressable style={[styles.modalCard, { width: '96%' }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Batch Officers</Text>
                <Text style={styles.modalTitle}>{selectedBatch === 'ALL' ? 'No batch selected' : `Batch ${selectedBatch}`}</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowOfficersModal(false)} hitSlop={10}>
                <Ionicons name="close" size={18} color="#334155" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} showsVerticalScrollIndicator={false}>
              {officersLoading ? <LoadingState label="Loading officers" /> : null}
              {!officersLoading && (!batchOfficers || batchOfficers.length === 0) ? (
                <EmptyState title={selectedBatch === 'ALL' ? 'Select a batch to view officers' : 'No officers found for this batch'} />
              ) : null}

              {!officersLoading && batchOfficers.map((off) => {
                const officerImg = imageUrl(off.profile_image, API_ORIGIN);
                const officerName = `${off.first_name || off.firstName || ''} ${off.last_name || off.lastName || ''}`.trim() || off.username || 'Officer';
                const officerErrored = erroredImages.has(`off-${off.id}`);
                return (
                <View key={off.id} style={[styles.rowContent, { paddingVertical: 12 }]}>
                  {officerImg && !officerErrored ? (
                    <Image
                      source={{ uri: officerImg }}
                      style={styles.avatar}
                      resizeMode="cover"
                      onError={() => setErroredImages((prev) => new Set(prev).add(`off-${off.id}`))}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>{officerName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.infoBlock}>
                    <Text style={styles.name}>{officerName}</Text>
                    <Text style={styles.metaLine}>{off.position || off.role || 'Officer'}</Text>
                  </View>
                </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
      <Pressable
        style={[styles.floatingMessageButton, { bottom: Math.max(22, insets.bottom + 16) }]}
        onPress={() => navigation.navigate('AlumniChat')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={
          totalUnreadMessages > 0
            ? `Open messages, ${totalUnreadMessages > 99 ? '99 plus' : totalUnreadMessages} unread`
            : 'Open messages'
        }
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
        {totalUnreadMessages > 0 ? (
          <View style={styles.floatingMessageUnreadBadge}>
            <Text style={styles.floatingMessageUnreadText}>
              {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

// Fetch officers whenever selectedBatch changes (prefetch like web)
// (Placed after component so hooks are inside component scope)

function OptionPicker({ visible, title, options, sections, selected, onSelect, onClose, displayValue }) {
  return (
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
            {sections ? (
              <View style={styles.sectionList}>
                {sections.map((section) => (
                  <View key={section.key} style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>{section.title}</Text>
                    <View style={styles.optionGrid}>
                      {section.items.map((item) => {
                        const active = item.value === selected;
                        return (
                          <Pressable key={item.value} style={[styles.optionCard, active && styles.optionCardActive]} onPress={() => onSelect(item.value)}>
                            <View style={styles.optionCardHeader}>
                              <Text style={[styles.optionCardLabel, active && styles.optionCardLabelActive]}>{item.label}</Text>
                              {active ? <Ionicons name="checkmark-circle" size={16} color="#1e3a8a" /> : null}
                            </View>
                            {item.description ? <Text style={styles.optionCardDescription}>{item.description}</Text> : null}
                            {active ? <Text style={styles.optionCardHint}>Tap again to clear selection</Text> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              options.map((value) => {
                const active = value === selected;
                return (
                  <Pressable key={value} style={[styles.simpleOptionCard, active && styles.simpleOptionCardActive]} onPress={() => onSelect(value)}>
                    <View style={styles.simpleOptionRow}>
                      <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{displayValue(value)}</Text>
                      {active ? <Ionicons name="checkmark-circle" size={16} color="#1e3a8a" /> : null}
                    </View>
                    {active ? <Text style={styles.optionCardHint}>Tap again to clear selection</Text> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  heroWrap: {
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 12
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20
  },
  floatingMessageButton: {
    position: 'absolute',
    right: 22,
    zIndex: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8
  },
  floatingMessageUnreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    shadowColor: '#991b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 10
  },
  floatingMessageUnreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center'
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
  officersButtonActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff'
  },
  officersButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#fff'
  },
  filterTextDisabled: {
    color: '#94a3b8'
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
  listWrap: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 0,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  tableHeader: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    height: 32,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tableHeadLeft: {
    flex: 1,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
    color: '#64748b'
  },
  rowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden'
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  infoBlock: {
    flex: 1,
    gap: 1
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a'
  },
  metaLine: {
    fontSize: 11,
    color: '#64748b'
  },
  schoolId: {
    width: 60,
    textAlign: 'right',
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
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
    color: '#0f172a',
  },
  modalList: {
    paddingHorizontal: 12,
    paddingTop: 12
  },
  modalListContent: {
    paddingBottom: 20
  },
  simpleOptionCard: {
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
  simpleOptionCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    shadowOpacity: 0.08,
    elevation: 2
  },
  simpleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  sectionList: {
    gap: 16
  },
  sectionBlock: {
    gap: 10
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#64748b',
    paddingHorizontal: 4
  },
  optionGrid: {
    gap: 10
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
    elevation: 1
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
  optionCardDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17
  },
  optionCardHint: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '600'
  },
  modalOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8
  },
  modalOptionActive: {
    backgroundColor: '#dbeafe'
  },
  modalOptionText: {
    fontSize: 14,
    color: '#334155'
  },
  modalOptionTextActive: {
    color: '#1e3a8a',
    fontWeight: '700'
  }
});
