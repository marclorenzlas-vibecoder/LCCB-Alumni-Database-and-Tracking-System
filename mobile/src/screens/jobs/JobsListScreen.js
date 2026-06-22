import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import EmptyState from '../../components/EmptyState';
import LoadingState from '../../components/LoadingState';
import ScreenContainer from '../../components/ScreenContainer';
import { jobService } from '../../services/jobService';
import { getAlumniId } from '../../utils/auth';
import { timeAgo } from '../../utils/formatters';

const departments = ['Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
const workTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'];

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACCEPTED', label: 'Accepted', bg: '#d1fae5', color: '#065f46' },
  { key: 'REVIEWED', label: 'Under Review', bg: '#e0e7ff', color: '#3730a3' },
  { key: 'REJECTED', label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
  { key: 'SHORTLISTED', label: 'Shortlist', bg: '#dcfce7', color: '#166534' },
];

const STATUS_STYLES = {
  PENDING: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  REVIEWED: { label: 'Under Review', bg: '#e0e7ff', color: '#3730a3' },
  SHORTLISTED: { label: 'Shortlisted', bg: '#dcfce7', color: '#166534' },
  ACCEPTED: { label: 'Accepted', bg: '#d1fae5', color: '#065f46' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
};

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

function FilterDropdown({ visible, locations, tempLocations, tempDepartments, tempWorkTypes, toggleLocation, toggleDepartment, toggleWorkType, onApply, onClear, onClose }) {
  const [pickerTarget, setPickerTarget] = useState(null);

  const locCount = tempLocations.length;
  const deptCount = tempDepartments.length;
  const wtCount = tempWorkTypes.length;
  const activeCount = locCount + deptCount + wtCount;

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
              <Text style={styles.dropdownFieldLabel}>Location</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, locCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {locCount === 0 ? 'Any location' : `${locCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('department')}>
              <Text style={styles.dropdownFieldLabel}>Department</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, deptCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {deptCount === 0 ? 'Any department' : `${deptCount} selected`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
              </View>
            </Pressable>

            <View style={styles.dropdownDivider} />

            <Pressable style={styles.dropdownField} onPress={() => setPickerTarget('workType')}>
              <Text style={styles.dropdownFieldLabel}>Work Type</Text>
              <View style={styles.dropdownFieldValue}>
                <Text style={[styles.dropdownFieldValueText, wtCount === 0 && styles.dropdownFieldValuePlaceholder]} numberOfLines={1}>
                  {wtCount === 0 ? 'Any type' : `${wtCount} selected`}
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
        title="Location"
        options={locations}
        selected={tempLocations}
        onToggle={toggleLocation}
        onClose={() => setPickerTarget(null)}
      />
      <MultiOptionPicker
        visible={pickerTarget === 'department'}
        title="Department"
        options={departments}
        selected={tempDepartments}
        onToggle={toggleDepartment}
        onClose={() => setPickerTarget(null)}
      />
      <MultiOptionPicker
        visible={pickerTarget === 'workType'}
        title="Work Type"
        options={workTypes}
        selected={tempWorkTypes}
        onToggle={toggleWorkType}
        onClose={() => setPickerTarget(null)}
      />
    </Modal>
  );
}

function JobRow({ job, application, onPress }) {
  const meta = [job.location, job.department, job.job_type].filter(Boolean).join(' \u00B7 ');
  const status = application?.status;
  const statusStyle = status ? STATUS_STYLES[status] : null;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle} numberOfLines={2}>{job.job_title}</Text>
        {statusStyle ? (
          <View style={[styles.rowBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.rowBadgeText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        ) : null}
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      <Text style={styles.rowTimestamp}>Posted {timeAgo(job.created_at)}</Text>
    </Pressable>
  );
}

export default function JobsListScreen({ navigation, user }) {
  const alumniId = useMemo(() => getAlumniId(user), [user]);
  const [jobs, setJobs] = useState([]);
  const [applicationMap, setApplicationMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const [tempLocations, setTempLocations] = useState([]);
  const [tempDepartments, setTempDepartments] = useState([]);
  const [tempWorkTypes, setTempWorkTypes] = useState([]);

  const loadData = useCallback(async () => {
    const [jobsData, appsData] = await Promise.all([
      jobService.getAllJobs(),
      alumniId ? jobService.getApplicationsByAlumni(alumniId).catch(() => []) : Promise.resolve([])
    ]);
    setJobs(jobsData || []);

    const nextMap = new Map();
    (appsData || []).forEach((entry) => {
      const jobId = Number(entry?.job_posting_id || entry?.job_posting?.id);
      if (!Number.isNaN(jobId)) {
        nextMap.set(jobId, { id: entry.id, status: entry.status, appliedAt: entry.applied_at });
      }
    });
    setApplicationMap(nextMap);
  }, [alumniId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadData()
        .catch((error) => console.error('Failed to load jobs:', error?.message || error))
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [loadData])
  );

  const uniqueLocations = useMemo(() => [...new Set(jobs.map(j => j.location).filter(Boolean))], [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = jobs;

    if (q) {
      result = result.filter((job) => {
        const hay = [job.job_title, job.company, job.location, job.department]
          .map((v) => String(v || ''))
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (selectedLocations.length > 0) result = result.filter((j) => selectedLocations.includes(j.location));
    if (selectedDepartments.length > 0) result = result.filter((j) => selectedDepartments.includes(j.department));
    if (selectedWorkTypes.length > 0) result = result.filter((j) => selectedWorkTypes.includes(j.job_type));

    if (statusFilter) {
      result = result.filter((j) => {
        const app = applicationMap.get(Number(j.id));
        return app?.status === statusFilter;
      });
    }

    return result;
  }, [jobs, query, selectedLocations, selectedDepartments, selectedWorkTypes, statusFilter, applicationMap]);

  const activeFilterCount = selectedLocations.length + selectedDepartments.length + selectedWorkTypes.length;

  const openFilter = () => {
    setTempLocations([...selectedLocations]);
    setTempDepartments([...selectedDepartments]);
    setTempWorkTypes([...selectedWorkTypes]);
    setShowFilterDropdown(true);
  };

  const toggleTempLocation = (v) => setTempLocations(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleTempDepartment = (v) => setTempDepartments(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleTempWorkType = (v) => setTempWorkTypes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const applyFilter = () => {
    setSelectedLocations([...tempLocations]);
    setSelectedDepartments([...tempDepartments]);
    setSelectedWorkTypes([...tempWorkTypes]);
    setShowFilterDropdown(false);
  };

  const clearFilter = () => {
    setTempLocations([]);
    setTempDepartments([]);
    setTempWorkTypes([]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Job Board</Text>
        <Text style={styles.screenSubtitle}>Explore openings posted across alumni network.</Text>

        <View style={styles.statusTabRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabScroll}>
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.statusTab, active && styles.statusTabActive]}
                  onPress={() => setStatusFilter(statusFilter === tab.key ? '' : tab.key)}
                >
                  <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
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
        </View>

        <FilterDropdown
          visible={showFilterDropdown}
          locations={uniqueLocations}
          tempLocations={tempLocations}
          tempDepartments={tempDepartments}
          tempWorkTypes={tempWorkTypes}
          toggleLocation={toggleTempLocation}
          toggleDepartment={toggleTempDepartment}
          toggleWorkType={toggleTempWorkType}
          onApply={applyFilter}
          onClear={clearFilter}
          onClose={() => setShowFilterDropdown(false)}
        />

        <Pressable style={styles.myAppsButton} onPress={() => navigation.navigate('MyApplications')}>
          <Text style={styles.myAppsText}>View My Applications</Text>
        </Pressable>

        {loading ? <LoadingState label="Loading job postings" /> : null}
        {!loading && jobs.length === 0 ? <EmptyState title="No jobs available" /> : null}
        {!loading && jobs.length > 0 && filteredJobs.length === 0 ? <EmptyState title="No matching jobs" /> : null}

        {!loading && filteredJobs.map((job, index) => (
          <React.Fragment key={job.id}>
            <JobRow
              job={job}
              application={applicationMap.get(Number(job.id))}
              onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
            />
            {index < filteredJobs.length - 1 ? <View style={styles.divider} /> : null}
          </React.Fragment>
        ))}
      </ScrollView>
    </ScreenContainer>
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
  statusTabRow: {
    marginBottom: 12
  },
  statusTabScroll: {
    gap: 8
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff'
  },
  statusTabActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a'
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  statusTabTextActive: {
    color: '#ffffff'
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
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a'
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
  myAppsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    marginBottom: 16
  },
  myAppsText: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 14
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 4
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  rowTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    lineHeight: 24
  },
  rowBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start'
  },
  rowBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  rowMeta: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4
  },
  rowTimestamp: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0'
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
    backgroundColor: '#fff',
    borderRadius: 20,
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  pickerCard: {
    width: '100%',
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden'
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a'
  },
  pickerList: {
    padding: 10
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2
  },
  pickerOptionActive: {
    backgroundColor: '#eff6ff'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#334155'
  },
  pickerOptionTextActive: {
    color: '#1e3a8a',
    fontWeight: '700'
  }
});
