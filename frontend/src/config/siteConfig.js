// 🎨 SITE CONFIGURATION - Easy to change colors, text, and settings

export const siteConfig = {
  // 🎨 COLORS - Change these to match your school colors
  colors: {
    primary: 'blue',      // Main color (blue, green, purple, red, etc.)
    secondary: 'gray',    // Secondary color
    accent: 'yellow'      // Accent color for highlights
  },

  // 🏫 SCHOOL INFORMATION
  school: {
    name: 'LCCB - La Consolacion College of Biñan',
    shortName: 'LCCB',
    location: 'Biñan, Laguna, Philippines',
    website: 'https://lccb.edu.ph'
  },

  // 📊 STATISTICS - Change these numbers
  statistics: {
    totalAlumni: '2,500+',
    activeMembers: '1,200+',
    eventsThisYear: '45+',
    jobPlacements: '180+'
  },

  // 🎯 FEATURES - Enable/disable features
  features: {
    showAuth: false,        // Show login/register (set to true to enable)
    showSearch: true,       // Show search functionality
    showFilters: true,      // Show filter options
    showSocialLinks: true   // Show social media links
  },

  // 📱 CONTACT INFORMATION
  contact: {
    email: 'alumni@lccb.edu.ph',
    phone: '+63 2 1234 5678',
    address: 'LCCB Campus, Biñan, Laguna'
  }
};

// 🎨 COLOR CLASSES - Don't change these unless you know CSS
export const colorClasses = {
  primary: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    border: 'border-blue-600',
    hover: 'hover:bg-blue-700'
  },
  secondary: {
    bg: 'bg-gray-600',
    text: 'text-gray-600',
    border: 'border-gray-600',
    hover: 'hover:bg-gray-700'
  }
};
