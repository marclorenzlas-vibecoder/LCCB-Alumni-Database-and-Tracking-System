import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import LoadingState from '../components/LoadingState';
import { API_ORIGIN } from '../config/api';
import { dashboardService } from '../services/dashboardService';
import { getAlumniId } from '../utils/auth';
import { formatDate, imageUrl } from '../utils/formatters';

const isVideoMedia = (path) => /\.(mp4|mov|avi|mkv|webm)$/i.test(String(path || '').split('?')[0]);

export default function HomeScreen({ navigation, user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const loadSnapshot = useCallback(async () => {
    const alumniId = getAlumniId(user);
    const data = await dashboardService.getSnapshot(alumniId);
    setSnapshot(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      loadSnapshot()
        .catch((error) => {
          console.error('Failed to load dashboard snapshot:', error?.message || error);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [loadSnapshot])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSnapshot();
    } finally {
      setRefreshing(false);
    }
  };

  const events = snapshot?.events || [];
  const achievements = snapshot?.achievements || [];
  const jobs = snapshot?.jobs || [];
  const donations = snapshot?.donations || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = [...events]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3);

  const recentAchievements = [...achievements]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3);

  const latestJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at || b.application_deadline || 0) - new Date(a.created_at || a.application_deadline || 0))
    .slice(0, 3);

  const topCauses = donations.slice(0, 3);

  const stats = useMemo(
    () => ({
      totalAlumni: Number(snapshot?.stats?.totalAlumni || 0),
      activeMembers: Number(snapshot?.stats?.activeMembers || 0),
      upcomingEvents: Number(snapshot?.stats?.upcomingEvents || upcomingEvents.length),
      jobOpportunities: Number(snapshot?.stats?.jobOpportunities || jobs.length)
    }),
    [jobs.length, snapshot?.stats?.activeMembers, snapshot?.stats?.jobOpportunities, snapshot?.stats?.totalAlumni, snapshot?.stats?.upcomingEvents, upcomingEvents.length]
  );

  if (loading) {
    return (
      <ScreenContainer noTopPadding>
        <LoadingState label="Loading home" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noTopPadding refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <HeroSection navigation={navigation} />

      <View style={styles.statsGrid}>
        <StatBox value={stats.totalAlumni} label="Total Alumni" />
        <StatBox value={stats.activeMembers} label="Active Members" />
        <StatBox value={stats.upcomingEvents} label="Upcoming Events" />
        <StatBox value={stats.jobOpportunities} label="Job Opportunities" />
      </View>

      <SectionHeading title="ABOUT" subtitle="Your comprehensive platform for staying connected with the LCCB community" />

      <InfoCard
        title="Our Mission"
        content="The LCCB Alumni Database and Tracking System is designed to bridge the gap between past and present, creating a vibrant ecosystem where alumni can reconnect, collaborate, and support each other's professional and personal growth."
      />

      <FeatureListCard
        title="What We Provide"
        items={[
          'Comprehensive alumni directory with advanced search and filtering',
          'Real-time event management and RSVP tracking',
          'Career services including job postings and application support'
        ]}
      />

      <View style={styles.highlightCard}>
        <Text style={styles.highlightTitle}>Platform Highlights</Text>
        <HighlightRow icon="people" value={`${stats.totalAlumni}+`} label="Registered Alumni" />
        <HighlightRow icon="briefcase" value={`${jobs.length}+`} label="Job Opportunities" />
        <HighlightRow icon="calendar" value={`${stats.upcomingEvents}+`} label="Annual Events" />
      </View>

      <FeatureListCard
        title="Key Features"
        items={[
          'Secure account management',
          'Interactive alumni profiles',
          'Mobile-responsive design',
          'Real-time notifications'
        ]}
      />

      <SectionHeading title="What We Offer" subtitle="Everything you need to stay connected and grow professionally" />

      <OfferCard
        icon="people"
        bg="#dbeafe"
        iconBg="#1e3a8a"
        title="Professional Network"
        desc="Connect with alumni across various industries. Find mentors, collaborators, and lifelong friends."
        action="Browse Directory"
        onPress={() => navigation.navigate('Alumni')}
      />

      <OfferCard
        icon="calendar"
        bg="#d1fae5"
        iconBg="#16a34a"
        title="Events & Workshops"
        desc="Stay informed about reunions, workshops, networking events, and career development sessions."
        action="View Events"
        onPress={() => navigation.navigate('Events', { screen: 'EventsList' })}
      />

      <OfferCard
        icon="briefcase"
        bg="#ede9fe"
        iconBg="#9333ea"
        title="Career Opportunities"
        desc="Discover job openings shared by fellow alumni and expand your professional horizons."
        action="Browse Jobs"
        onPress={() => navigation.navigate('Employment')}
      />

      <SectionHeaderRow title="Upcoming Events" subtitle="Don't miss out on our latest activities" actionLabel="View All" onPress={() => navigation.navigate('Events', { screen: 'EventsList' })} />
      <CarouselSection
        data={upcomingEvents}
        keyPrefix="event"
        renderItem={(item) => (
          <EntityCard
            image={imageUrl(item.image, API_ORIGIN)}
            title={item.name}
            description={item.description || 'Alumni event details available inside this event page.'}
            meta={formatDate(item.date)}
            onPress={() => navigation.navigate('Events', { screen: 'EventDetail', params: { eventId: item.id } })}
          />
        )}
      />

      <SectionHeaderRow title="Recent Achievements" subtitle="Celebrating our alumni successes" actionLabel="View All" onPress={() => navigation.navigate('Achievements')} />
      <CarouselSection
        data={recentAchievements}
        keyPrefix="achievement"
        renderItem={(item) => (
          <EntityCard
            image={imageUrl(item.image, API_ORIGIN)}
            isVideo={isVideoMedia(item.image)}
            mediaStyle={styles.achievementEntityImage}
            title={item.title}
            description={item.description || 'Achievement details available in the achievements module.'}
            meta={formatDate(item.date)}
            onPress={() => navigation.navigate('Achievements', { screen: 'AchievementDetail', params: { achievement: item } })}
            showReadMore
            onReadMore={() => navigation.navigate('Achievements', { screen: 'AchievementDetail', params: { achievement: item } })}
          />
        )}
      />

      <SectionHeaderRow title="Career Opportunities" subtitle="Latest job postings from our network" actionLabel="View All" onPress={() => navigation.navigate('Employment')} />
      <CarouselSection
        data={latestJobs}
        keyPrefix="job"
        renderItem={(job) => (
          <JobCard job={job} onPress={() => navigation.navigate('Employment', { screen: 'JobDetail', params: { jobId: job.id } })} />
        )}
      />

      <SectionHeaderRow title="Support Our Causes" subtitle="Make a difference with your contribution" actionLabel="View All" onPress={() => navigation.navigate('Donations', { screen: 'DonationsList' })} />
      <CarouselSection
        data={topCauses}
        keyPrefix="cause"
        renderItem={(item) => (
          <CauseCard item={item} onPress={() => navigation.navigate('Donations', { screen: 'DonationDetail', params: { donationId: item.id } })} />
        )}
      />

      <ContactCards />
    </ScreenContainer>
  );
}

function HeroSection({ navigation }) {
  return (
    <ImageBackground source={require('../../assets/homeimage.jpg')} style={styles.heroBg} resizeMode="cover">
      <View style={styles.heroOverlay}>
        <Text style={styles.heroTitle}>Welcome to LCCB{'\n'}<Text style={styles.heroTitleAccent}>Alumni Network</Text></Text>
        <Text style={styles.heroSub}>Connect, grow, and stay updated with your fellow LCCB alumni. Our platform helps you maintain professional connections, discover career opportunities, and stay informed about alumni events.</Text>
        <Pressable style={styles.heroPrimaryBtn} onPress={() => navigation.navigate('Alumni')}>
          <Text style={styles.heroPrimaryText}>Explore Alumni Directory</Text>
        </Pressable>
        <Pressable style={styles.heroGhostBtn} onPress={() => navigation.navigate('Events', { screen: 'EventsList' })}>
          <Text style={styles.heroGhostText}>View Upcoming Events</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

function ContactCards() {
  return (
    <>
      <View style={styles.contactCard}>
        <View style={styles.contactBlock}>
          <Ionicons name="time-outline" size={16} color="#1e3a8a" />
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactTitle}>Office Hours</Text>
            <Text style={styles.contactText}>Mondays to Fridays: 8:00 AM to 5:00 PM{`\n`}(We observe Noon Break)</Text>
          </View>
        </View>
        <View style={styles.contactDivider} />
        <View style={styles.contactBlock}>
          <Ionicons name="location-outline" size={16} color="#1e3a8a" />
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactTitle}>Location</Text>
            <Text style={styles.contactText}>G/F, L-Shaped Building, La Consolacion College Bacolod, Corner Galo-Gatuslao Streets, Bacolod City 6100</Text>
          </View>
        </View>
      </View>

      <View style={styles.contactCard}>
        <View style={styles.contactBlock}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color="#1e3a8a" />
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactTitle}>Stay Connected</Text>
            <Text style={styles.contactText}>Follow us on social media for the latest updates, news, and alumni stories.</Text>
          </View>
        </View>
        <View style={styles.socialGrid}>
          <SocialItem icon="logo-facebook" label="Facebook" bg="#dbeafe" color="#2563eb" />
          <SocialItem icon="logo-instagram" label="Instagram" bg="#fce7f3" color="#db2777" />
          <SocialItem icon="logo-youtube" label="YouTube" bg="#fee2e2" color="#dc2626" />
          <SocialItem icon="location" label="Google Map" bg="#dcfce7" color="#16a34a" />
        </View>
      </View>
    </>
  );
}

function SocialItem({ icon, label, bg, color }) {
  return (
    <View style={styles.socialItem}>
      <View style={[styles.socialIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.socialLabel}>{label}</Text>
    </View>
  );
}

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingTitle}>{title}</Text>
      <Text style={styles.sectionHeadingSub}>{subtitle}</Text>
    </View>
  );
}

function InfoCard({ icon, iconBg, title, content }) {
  return (
    <View style={styles.infoCard}>
      {icon ? (
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={16} color="#ffffff" />
        </View>
      ) : null}
      <View style={icon ? styles.infoBody : styles.infoBodyFull}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{content}</Text>
      </View>
    </View>
  );
}

function FeatureListCard({ icon, iconBg, iconColor, title, items }) {
  return (
    <View style={styles.infoCard}>
      {icon ? (
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <View style={icon ? styles.infoBody : styles.infoBodyFull}>
        <Text style={styles.infoTitle}>{title}</Text>
        {items.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HighlightRow({ icon, value, label }) {
  return (
    <View style={styles.highlightRow}>
      <View style={styles.highlightIconWrap}>
        <Ionicons name={icon} size={18} color="#dbeafe" />
      </View>
      <View>
        <Text style={styles.highlightValue}>{value}</Text>
        <Text style={styles.highlightLabel}>{label}</Text>
      </View>
    </View>
  );
}

function OfferCard({ icon, bg, iconBg, title, desc, action, onPress }) {
  return (
    <View style={[styles.offerCard, { backgroundColor: bg }]}>
      <View style={[styles.offerIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#ffffff" />
      </View>
      <Text style={styles.offerTitle}>{title}</Text>
      <Text style={styles.offerDesc}>{desc}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.offerAction}>{action}  ›</Text>
      </Pressable>
    </View>
  );
}

function SectionHeaderRow({ title, subtitle, actionLabel, onPress }) {
  return (
    <View style={styles.sectionRowWrap}>
      <View style={styles.sectionRowLeft}>
        <Text style={styles.sectionRowTitle}>{title}</Text>
        <Text style={styles.sectionRowSub}>{subtitle}</Text>
      </View>
      <Pressable style={styles.viewAllBtn} onPress={onPress}>
        <Text style={styles.viewAllText}>{actionLabel}{`\n`}→</Text>
      </Pressable>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const CAROUSEL_GAP = 10;
const CAROUSEL_SIDE_PAD = Math.round((SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2);

function PaginationDots({ count, activeIndex }) {
  if (count <= 1) return null;
  return (
    <View style={styles.paginationRow}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.paginationDot, i === activeIndex && styles.paginationDotActive]}
        />
      ))}
    </View>
  );
}

function CarouselSection({ data, renderItem, keyPrefix, initialIndex }) {
  const scrollRef = useRef(null);
  // Default to middle card (index 1) when there are 3 items
  const startIndex = initialIndex !== undefined ? initialIndex : (data && data.length >= 3 ? 1 : 0);
  const [activeIndex, setActiveIndex] = useState(startIndex);

  const onScroll = useCallback((e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CAROUSEL_ITEM_WIDTH + CAROUSEL_GAP));
    setActiveIndex(Math.max(0, Math.min(idx, data.length - 1)));
  }, [data.length]);

  // Scroll to the middle card after layout
  const handleLayout = useCallback(() => {
    if (startIndex > 0 && scrollRef.current) {
      const offset = startIndex * (CAROUSEL_ITEM_WIDTH + CAROUSEL_GAP);
      scrollRef.current.scrollTo({ x: offset, animated: false });
    }
  }, [startIndex]);

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.carouselWrap} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_ITEM_WIDTH + CAROUSEL_GAP}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: CAROUSEL_SIDE_PAD }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {data.map((item, index) => (
          <View
            key={`${keyPrefix}-${item.id ?? index}`}
            style={{
              width: CAROUSEL_ITEM_WIDTH,
              marginRight: index < data.length - 1 ? CAROUSEL_GAP : 0
            }}
          >
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>
      <PaginationDots count={data.length} activeIndex={activeIndex} />
    </View>
  );
}

function EntityCard({ image, isVideo, mediaStyle, title, description, meta, onPress, showReadMore, onReadMore }) {
  const [descLines, setDescLines] = useState(4);

  const handleTitleLayout = (e) => {
    const lines = Math.ceil(e.nativeEvent.lines.length);
    setDescLines(lines <= 1 ? 5 : 4);
  };

  return (
    <Pressable style={styles.entityCard} onPress={onPress}>
      {image ? (
        isVideo ? (
          <Video
            source={{ uri: image }}
            style={[styles.entityImage, mediaStyle]}
            useNativeControls
            resizeMode="cover"
            shouldPlay={false}
          />
        ) : (
          <Image source={{ uri: image }} style={[styles.entityImage, mediaStyle]} />
        )
      ) : null}
      <View style={styles.entityBody}>
        <Text style={styles.entityTitle} onTextLayout={handleTitleLayout}>{title}</Text>
        <View style={{ height: 95, overflow: 'hidden' }}>
          <Text style={styles.entityDesc} numberOfLines={descLines}>{description}</Text>
        </View>
        {showReadMore && onReadMore && (
          <Pressable style={styles.readMoreBtn} onPress={onReadMore}>
            <Text style={styles.readMoreText}>Read More</Text>
          </Pressable>
        )}
        <View style={styles.entityMetaRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.entityMeta}>{meta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function JobCard({ job, onPress }) {
  return (
    <Pressable style={styles.jobCard} onPress={onPress}>
      <Text style={styles.jobTitle}>{job.job_title}</Text>
      <Text style={styles.jobCompany}>{job.company || 'Company not specified'}</Text>
      <View style={styles.jobMetaRow}><Ionicons name="location-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.location || 'Location not set'}</Text></View>
      <View style={styles.jobMetaRow}><Ionicons name="grid-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.department || 'Department not set'}</Text></View>
      <View style={styles.jobMetaRow}><Ionicons name="time-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.job_type || 'Employment type not set'}</Text></View>
    </Pressable>
  );
}

function CauseCard({ item, onPress }) {
  const amount = Number(item.amount || 0);
  const goal = Number(item.goal || 50000);
  const progress = Math.max(0, Math.min(100, Math.round((amount / Math.max(1, goal)) * 100)));
  const image = imageUrl(item.image, API_ORIGIN);

  return (
    <Pressable style={styles.causeCard} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.causeImage} /> : null}
      <View style={styles.causeBody}>
        <Text style={styles.causeBadge}>{item.category || 'Community'}</Text>
        <Text style={styles.causeTitle}>{item.purpose || 'Support this cause'}</Text>
        <Text style={styles.causeDesc} numberOfLines={2}>{item.description || 'Help provide support for our alumni and community initiatives.'}</Text>
        <View style={styles.causeAmountRow}>
          <Text style={styles.causeAmount}>₱{amount.toLocaleString()}</Text>
          <Text style={styles.causeAmount}>₱{goal.toLocaleString()}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress}% Complete</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroBg: {
    marginHorizontal: -18,
    marginTop: 0,
    overflow: 'hidden',
    minHeight: 400,
    backgroundColor: '#1e3a8a'
  },
  heroOverlay: {
    backgroundColor: 'rgba(30, 58, 138, 0.55)',
    paddingHorizontal: 20,
    paddingVertical: 48,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 14,
    justifyContent: 'center'
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center'
  },
  heroTitleAccent: {
    color: '#93c5fd'
  },
  heroSub: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center'
  },
  heroBtnRow: {
    width: '100%'
  },
  heroPrimaryBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center'
  },
  heroPrimaryText: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 13
  },
  heroGhostBtn: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  heroGhostText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 0
  },
  statBox: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  statLabel: {
    marginTop: 4,
    color: '#334155',
    fontSize: 12
  },
  sectionHeading: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8
  },
  sectionHeadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionHeadingSub: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 15,
    lineHeight: 24
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  infoBody: {
    flex: 1,
    gap: 8
  },
  infoBodyFull: {
    flex: 1,
    gap: 8
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  infoText: {
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 27
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6
  },
  bulletText: {
    flex: 1,
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 24
  },
  highlightCard: {
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    padding: 16,
    gap: 12
  },
  highlightTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  highlightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  highlightValue: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800'
  },
  highlightLabel: {
    color: '#dbeafe',
    fontSize: 13
  },
  offerCard: {
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  offerIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  offerTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 17
  },
  offerDesc: {
    color: '#1f2937',
    lineHeight: 24,
    fontSize: 14
  },
  offerAction: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  sectionRowWrap: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  sectionRowLeft: {
    flex: 1,
    gap: 2
  },
  sectionRowTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionRowSub: {
    color: '#334155',
    fontSize: 14
  },
  viewAllBtn: {
    minWidth: 76,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  viewAllText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center'
  },
  entityCard: {
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    flexDirection: 'column'
  },
  entityImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#dbeafe'
  },
  achievementEntityImage: {
    height: 210
  },
  entityBody: {
    padding: 12,
    gap: 6,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  entityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  entityDesc: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19
  },
  entityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  entityMeta: {
    color: '#64748b',
    fontSize: 12
  },
  readMoreBtn: {
    marginTop: 10,
    marginBottom: 10,
  },
  readMoreText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline'
  },
  jobCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  jobCompany: {
    color: '#1f2937',
    fontSize: 14
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  jobMeta: {
    color: '#64748b',
    fontSize: 13
  },
  causeCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  causeImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#dbeafe'
  },
  causeBody: {
    padding: 12,
    gap: 6
  },
  causeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    color: '#1e3a8a',
    backgroundColor: '#dbeafe'
  },
  causeTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16
  },
  causeDesc: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19
  },
  causeAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2
  },
  causeAmount: {
    color: '#334155',
    fontSize: 12
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e3a8a'
  },
  contactCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 12
  },
  contactBlock: {
    flexDirection: 'row',
    gap: 10
  },
  contactTextWrap: {
    flex: 1,
    gap: 4
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  contactText: {
    color: '#1f2937',
    lineHeight: 23,
    fontSize: 14
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#e2e8f0'
  },
  socialGrid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10
  },
  socialItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  socialIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  socialLabel: {
    color: '#0f172a',
    fontSize: 14
  },
  carouselWrap: {
    marginHorizontal: -18
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#cbd5e1'
  },
  paginationDotActive: {
    backgroundColor: '#1e3a8a',
    width: 20
  }
});
