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
import { getAlumniChatUserId, getSystemUserId, listenToConversationSummaries, listenToUserStatuses } from '../../services/firebaseChatService';
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

const getLevelDisplayLabel = (value) => {
  const normalized = normalizeLevel(value);
  const map = {
    'integrated school': 'Integrated School',
    'night high': 'Night High',
    'senior high': 'Senior High',
    college: 'College',
    eteeap: 'ETEEAP',
    'grad school': 'Grad School'
  };
  return map[normalized] || value || 'Level not provided';
};

const getProgramSectionsForLevel = (sections = [], selectedLevel = 'ALL') => {
  if (!selectedLevel || selectedLevel === 'ALL') return sections;

  const normalizedLevel = normalizeLevel(selectedLevel);

  return sections
    .map((section) => {
      const sectionLevel = normalizeLevel(section.key || section.title);
      let items = section.items || [];

      if (normalizedLevel === 'integrated school' && sectionLevel === 'integrated school') {
        items = items.filter((item) => normalizeLevel(item.value) !== 'night high');
      } else if (normalizedLevel === 'night high' && sectionLevel === 'integrated school') {
        items = items.filter((item) => normalizeLevel(item.value) === 'night high');
      } else if (normalizedLevel !== sectionLevel) {
        items = [];
      }

      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
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

function AlumniFilterDropdown({
  visible,
  levelOptions,
  batchOptions,
  groupSections,
  groupLabelMap,
  tempLevel,
  tempBatch,
  tempGroup,
  setTempLevel,
  setTempBatch,
  setTempGroup,
  onApply,
  onClear,
  onClose
}) {
  const [pickerTarget, setPickerTarget] = useState(null);
  const activeCount = (tempLevel !== 'ALL' ? 1 : 0) + (tempBatch !== 'ALL' ? 1 : 0) + (tempGroup !== 'ALL' ? 1 : 0);
  const levelLabel = tempLevel === 'ALL' ? 'All Levels' : tempLevel;
  const batchLabel = tempBatch === 'ALL' ? 'All Batches' : tempBatch;
  const groupLabel = tempGroup === 'ALL' ? 'All Program' : (groupLabelMap[tempGroup] || tempGroup);
  const filteredGroupSections = getProgramSectionsForLevel(groupSections, tempLevel);

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
            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('level')}>
              <Text style={styles.dropdownFieldLabel}>Level</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, tempLevel === 'ALL' && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {levelLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('batch')}>
              <Text style={styles.dropdownFieldLabel}>Batch</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, tempBatch === 'ALL' && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {batchLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('program')}>
              <Text style={styles.dropdownFieldLabel}>Program</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, tempGroup === 'ALL' && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {groupLabel}
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

      <OptionPicker
        visible={pickerTarget === 'level'}
        title="Select Level"
        options={levelOptions}
        selected={tempLevel}
        onSelect={(value) => {
          const nextLevel = tempLevel === value ? 'ALL' : value;
          const nextSections = getProgramSectionsForLevel(groupSections, nextLevel);
          const groupStillAvailable = tempGroup === 'ALL' || nextSections.some((section) =>
            section.items.some((item) => item.value === tempGroup)
          );
          setTempLevel(nextLevel);
          if (!groupStillAvailable) {
            setTempGroup('ALL');
          }
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
        displayValue={(value) => (value === 'ALL' ? 'All Levels' : value)}
      />

      <OptionPicker
        visible={pickerTarget === 'batch'}
        title="Select Batch"
        options={batchOptions}
        selected={tempBatch}
        onSelect={(value) => {
          setTempBatch(tempBatch === value ? 'ALL' : value);
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
        displayValue={(value) => (value === 'ALL' ? 'All Batches' : value)}
      />

      <OptionPicker
        visible={pickerTarget === 'program'}
        title={tempLevel === 'ALL' ? 'All Program' : `${levelLabel} Programs`}
        sections={filteredGroupSections}
        selected={tempGroup}
        onSelect={(value) => {
          setTempGroup(tempGroup === value ? 'ALL' : value);
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
        displayValue={(value) => (value === 'ALL' ? 'All Program' : value)}
      />
    </Modal>
  );
}

export default function AlumniDirectoryScreen({ navigation, user }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [erroredImages, setErroredImages] = useState(new Set());
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [userStatuses, setUserStatuses] = useState({});
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [tempLevel, setTempLevel] = useState('ALL');
  const [tempBatch, setTempBatch] = useState('ALL');
  const [tempGroup, setTempGroup] = useState('ALL');
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

  const statusUserIdKey = useMemo(() => {
    const ids = list.map((item) => getAlumniChatUserId(item)).filter(Boolean);
    return Array.from(new Set(ids)).join('|');
  }, [list]);

  useEffect(() => {
    const ids = statusUserIdKey ? statusUserIdKey.split('|') : [];
    return listenToUserStatuses(ids, setUserStatuses);
  }, [statusUserIdKey]);

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
      } catch (_e) {
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

  const filteredGroupSections = useMemo(() => getProgramSectionsForLevel(groupSections, selectedLevel), [groupSections, selectedLevel]);

  useEffect(() => {
    if (selectedGroup === 'ALL') return;

    const groupStillAvailable = filteredGroupSections.some((section) =>
      section.items.some((item) => item.value === selectedGroup)
    );

    if (!groupStillAvailable) {
      setSelectedGroup('ALL');
    }
  }, [filteredGroupSections, selectedGroup]);

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

  const groupLabelMap = useMemo(() => {
    const map = {};
    groupSections.forEach((section) => {
      section.items.forEach((item) => { map[item.value] = item.label; });
    });
    return map;
  }, [groupSections]);
  const activeFilterCount = (selectedLevel !== 'ALL' ? 1 : 0) + (selectedBatch !== 'ALL' ? 1 : 0) + (selectedGroup !== 'ALL' ? 1 : 0);

  const openFilter = () => {
    setTempLevel(selectedLevel);
    setTempBatch(selectedBatch);
    setTempGroup(selectedGroup);
    setShowFilterDropdown(true);
  };

  const applyFilter = () => {
    setSelectedLevel(tempLevel);
    setSelectedBatch(tempBatch);
    setSelectedGroup(tempGroup);
    setShowFilterDropdown(false);
  };

  const clearFilter = () => {
    setTempLevel('ALL');
    setTempBatch('ALL');
    setTempGroup('ALL');
  };

  return (
    <View style={styles.screenRoot}>
    <ScreenContainer>
      <View style={styles.heroWrap}>
        <Text style={styles.heroTitle}>Alumni Directory</Text>
        <Text style={styles.heroSubtitle}>Browse and connect with fellow LCCB alumni across all batches and programs.</Text>
      </View>

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>Search and Filters</Text>

        <View style={styles.searchRow}>
          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search alumni..."
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

          <Pressable style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]} onPress={openFilter}>
            <Ionicons name="filter-outline" size={18} color={activeFilterCount > 0 ? '#fff' : '#475569'} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterToggleBadge}>
                <Text style={styles.filterToggleBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {selectedBatch !== 'ALL' ? (
          <Pressable
            style={styles.officersActionButton}
            onPress={() => setShowOfficersModal(true)}
          >
            <Ionicons name="people-outline" size={15} color="#1d4ed8" />
            <Text style={styles.officersActionText} numberOfLines={1} ellipsizeMode="tail">Batch {selectedBatch} Officers</Text>
          </Pressable>
        ) : null}

        <AlumniFilterDropdown
          visible={showFilterDropdown}
          levelOptions={levelOptions}
          batchOptions={batchOptions}
          groupSections={groupSections}
          groupLabelMap={groupLabelMap}
          tempLevel={tempLevel}
          tempBatch={tempBatch}
          tempGroup={tempGroup}
          setTempLevel={setTempLevel}
          setTempBatch={setTempBatch}
          setTempGroup={setTempGroup}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setShowFilterDropdown(false)}
        />

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
          const primaryEducation = getPrimaryEducation(item);
          const course = item.course || 'Course not provided';
          const level = getLevelDisplayLabel(primaryEducation.level || item.level);
          const educationSummary = [course, level].filter(Boolean).join(' \u00b7 ');
          const userStatus = userStatuses[getAlumniChatUserId(item)];
          const avatarStatusStyle = userStatus?.online ? styles.avatarOnline : styles.avatarOffline;
          const hasErrored = erroredImages.has(item.id);

          return (
            <Pressable key={item.id} style={styles.rowWrap} onPress={() => navigation.navigate('AlumniDetail', { alumniId: item.id, alumni: item })}>
              <View style={styles.rowContent}>
                {img && !hasErrored ? (
                  <Image
                    source={{ uri: img }}
                    style={[styles.avatar, avatarStatusStyle]}
                    resizeMode="cover"
                    onError={() => setErroredImages((prev) => new Set(prev).add(item.id))}
                  />
                ) : (
                  <View style={[styles.avatarFallback, avatarStatusStyle]}>
                    <Text style={styles.avatarInitial}>{fullName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.infoBlock}>
                  <Text style={styles.name}>{fullName}</Text>
                  <Text style={styles.metaLine} numberOfLines={1} ellipsizeMode="tail">{educationSummary}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

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
  searchRow: {
    flexDirection: 'row',
    gap: 8
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
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 4
  },
  filterToggleBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a'
  },
  filterToggleBadge: {
    position: 'absolute',
    top: -5,
    right: -3,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5
  },
  filterToggleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  officersActionButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    maxWidth: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  officersActionText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700'
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  dropdownPanel: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  dropdownCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdownCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  dropdownFields: {
    padding: 18,
    gap: 0
  },
  dropdownField: {
    paddingVertical: 14
  },
  dropdownFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6
  },
  dropdownFieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownFieldValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1
  },
  dropdownFieldValuePlaceholder: {
    color: '#94a3b8',
    fontWeight: '400'
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9'
  },
  dropdownActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 18
  },
  dropdownClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  dropdownClearText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700'
  },
  dropdownApplyBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdownApplyText: {
    color: '#fff',
    fontSize: 15,
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
    backgroundColor: '#e2e8f0'
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarOnline: {
    boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #22c55e'
  },
  avatarOffline: {
    boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #d1d5db'
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
    color: '#64748b',
    maxWidth: '100%'
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
