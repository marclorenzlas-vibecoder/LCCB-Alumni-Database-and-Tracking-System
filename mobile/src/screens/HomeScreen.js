import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import LoadingState from '../components/LoadingState';
import { API_ORIGIN } from '../config/api';
import { dashboardService } from '../services/dashboardService';
import { getAlumniId } from '../utils/auth';
import { formatDate, imageUrl } from '../utils/formatters';

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

  const upcomingEvents = events
    .filter((item) => {
      if (!item?.date) return false;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return false;
      date.setHours(0, 0, 0, 0);
      return date >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const recentAchievements = [...achievements]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 3);

  const latestJobs = [...jobs]
    .sort((a, b) => new Date(b.created_at || b.application_deadline || 0) - new Date(a.created_at || a.application_deadline || 0))
    .slice(0, 3);

  const topCauses = donations.slice(0, 2);

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
      <ScreenContainer>
        <LoadingState label="Loading home" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <HeroSection navigation={navigation} />

      <View style={styles.statsGrid}>
        <StatBox value={stats.totalAlumni} label="Total Alumni" />
        <StatBox value={stats.activeMembers} label="Active Members" />
        <StatBox value={stats.upcomingEvents} label="Upcoming Events" />
        <StatBox value={stats.jobOpportunities} label="Job Opportunities" />
      </View>

      <SectionHeading title="ABOUT" subtitle="Your comprehensive platform for staying connected with the LCCB community" />

      <InfoCard
        icon="flash"
        iconBg="#1e3a8a"
        title="Our Mission"
        content="The LCCB Alumni Database and Tracking System is designed to bridge the gap between past and present, creating a vibrant ecosystem where alumni can reconnect, collaborate, and support each other's professional and personal growth."
      />

      <FeatureListCard
        icon="checkmark-circle"
        iconBg="#dcfce7"
        iconColor="#16a34a"
        title="What We Provide"
        items={[
          'Comprehensive alumni directory with advanced search and filtering',
          'Real-time event management and RSVP tracking',
          'Career services including job postings and application support'
        ]}
      />

      <View style={styles.highlightCard}>
        <Text style={styles.highlightTitle}>Platform Highlights</Text>
        <HighlightRow icon="people" value="56+" label="Registered Alumni" />
        <HighlightRow icon="briefcase" value={`${jobs.length}+`} label="Job Opportunities" />
        <HighlightRow icon="calendar" value="20+" label="Annual Events" />
      </View>

      <FeatureListCard
        icon="sparkles"
        iconBg="#ede9fe"
        iconColor="#7c3aed"
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
      {upcomingEvents.map((item) => (
        <EntityCard
          key={`event-${item.id}`}
          image={imageUrl(item.image, API_ORIGIN)}
          title={item.name}
          description={item.description || 'Alumni event details available inside this event page.'}
          meta={formatDate(item.date)}
          onPress={() => navigation.navigate('Events', { screen: 'EventDetail', params: { eventId: item.id } })}
        />
      ))}

      <SectionHeaderRow title="Recent Achievements" subtitle="Celebrating our alumni successes" actionLabel="View All" onPress={() => navigation.navigate('Achievements')} />
      {recentAchievements.map((item) => (
        <EntityCard
          key={`achievement-${item.id}`}
          image={imageUrl(item.image, API_ORIGIN)}
          title={item.title}
          description={item.description || 'Achievement details available in the achievements module.'}
          meta={formatDate(item.date)}
          onPress={() => navigation.navigate('Achievements')}
        />
      ))}

      <SectionHeaderRow title="Career Opportunities" subtitle="Latest job postings from our network" actionLabel="View All" onPress={() => navigation.navigate('Employment')} />
      {latestJobs.map((job) => (
        <JobCard key={`job-${job.id}`} job={job} onPress={() => navigation.navigate('Employment', { screen: 'JobDetail', params: { jobId: job.id } })} />
      ))}

      <SectionHeaderRow title="Support Our Causes" subtitle="Make a difference with your contribution" actionLabel="View All" onPress={() => navigation.navigate('Donations', { screen: 'DonationsList' })} />
      {topCauses.map((item) => (
        <CauseCard key={`cause-${item.id}`} item={item} onPress={() => navigation.navigate('Donations', { screen: 'DonationDetail', params: { donationId: item.id } })} />
      ))}

      <ContactCards />
      <FooterBlock />
    </ScreenContainer>
  );
}

function HeroSection({ navigation }) {
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      <Text style={styles.heroTitle}>Welcome to{`\n`}LCCB Alumni{`\n`}Network</Text>
      <Text style={styles.heroSub}>Connect, grow, and stay updated with your fellow LCCB alumni. Our platform helps you maintain professional connections, discover career opportunities, and stay informed about alumni events.</Text>
      <Pressable style={styles.heroPrimaryBtn} onPress={() => navigation.navigate('Alumni')}>
        <Text style={styles.heroPrimaryText}>Explore Alumni Directory  →</Text>
      </Pressable>
      <Pressable style={styles.heroGhostBtn} onPress={() => navigation.navigate('Events', { screen: 'EventsList' })}>
        <Text style={styles.heroGhostText}>View Upcoming Events  🗓</Text>
      </Pressable>
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
      <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color="#ffffff" />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{content}</Text>
      </View>
    </View>
  );
}

function FeatureListCard({ icon, iconBg, iconColor, title, items }) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.infoBody}>
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

function EntityCard({ image, title, description, meta, onPress }) {
  return (
    <Pressable style={styles.entityCard} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.entityImage} /> : null}
      <View style={styles.entityBody}>
        <Text style={styles.entityTitle}>{title}</Text>
        <Text style={styles.entityDesc} numberOfLines={3}>{description}</Text>
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
      <View style={styles.jobMetaRow}><Ionicons name="location-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.location || 'Not specified'}</Text></View>
      <View style={styles.jobMetaRow}><Ionicons name="time-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.job_type || 'Not specified'}</Text></View>
      <View style={styles.jobMetaRow}><Ionicons name="cash-outline" size={13} color="#64748b" /><Text style={styles.jobMeta}> {job.salary_range || 'Not specified'}</Text></View>
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

function FooterBlock() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerTitle}>LCCB Alumni</Text>
      <Text style={styles.footerText}>Building bridges between graduates, fostering professional growth, and strengthening our community through meaningful connections and opportunities.</Text>

      <Text style={styles.footerHeading}>Quick Links</Text>
      <Text style={styles.footerLink}>Alumni Directory</Text>
      <Text style={styles.footerLink}>Events Calendar</Text>
      <Text style={styles.footerLink}>Career Opportunities</Text>
      <Text style={styles.footerLink}>Support LCCB</Text>

      <Text style={styles.footerHeading}>Get Involved</Text>
      <FooterBullet text="Network with fellow graduates" />
      <FooterBullet text="Attend exclusive events" />
      <FooterBullet text="Access career resources" />
      <FooterBullet text="Contribute to the community" />

      <Text style={styles.footerHeading}>Join Our Network</Text>
      <Text style={styles.footerText}>Become part of our growing alumni community today.</Text>
      <Pressable style={styles.footerPrimaryBtn}>
        <Text style={styles.footerPrimaryText}>Register Now</Text>
      </Pressable>
      <Pressable style={styles.footerGhostBtn}>
        <Text style={styles.footerGhostText}>Sign In</Text>
      </Pressable>
    </View>
  );
}

function FooterBullet({ text }) {
  return (
    <View style={styles.footerBulletRow}>
      <Ionicons name="checkmark-circle" size={12} color="#60a5fa" />
      <Text style={styles.footerLink}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    borderRadius: 0,
    marginHorizontal: -18,
    marginTop: -18,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingTop: 56,
    overflow: 'hidden',
    gap: 14
  },
  heroGlowOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -80,
    top: -60
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    left: -60,
    bottom: -90
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 50,
    lineHeight: 56,
    fontWeight: '800',
    textAlign: 'center'
  },
  heroSub: {
    color: '#dbeafe',
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'center'
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
    fontSize: 15
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
    fontSize: 15
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
    elevation: 1
  },
  entityImage: {
    width: '100%',
    height: 145,
    backgroundColor: '#0f172a'
  },
  entityBody: {
    padding: 12,
    gap: 6
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
    gap: 4,
    marginTop: 2
  },
  entityMeta: {
    color: '#64748b',
    fontSize: 12
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
    backgroundColor: '#111827'
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
  progressText: {
    color: '#64748b',
    fontSize: 12
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
  footer: {
    borderRadius: 0,
    marginHorizontal: -18,
    marginTop: 20,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 9
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800'
  },
  footerHeading: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8
  },
  footerText: {
    color: '#dbeafe',
    lineHeight: 25,
    fontSize: 14
  },
  footerLink: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 23
  },
  footerBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  footerPrimaryBtn: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center'
  },
  footerPrimaryText: {
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: '700'
  },
  footerGhostBtn: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center'
  },
  footerGhostText: {
    color: '#dbeafe',
    fontSize: 16,
    fontWeight: '700'
  }
});
