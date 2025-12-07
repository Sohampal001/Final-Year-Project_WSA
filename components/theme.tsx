// src/theme.ts (or @/theme.ts)

export const theme = {
  // 🎨 COLORS – tuned to match that Her Shield UI
  colors: {
    // background gradient
    bgTop: '#FF4B6A',      // top pink
    bgBottom: '#FF6FB1',   // bottom pink

    primary: '#FF4B6A',    // main brand / SOS base
    primaryDark: '#D02148',
    primarySoft: '#FFE5F0',

    accent: '#FF9AC2',     // icons / small highlights
    accentSoft: 'rgba(255,154,194,0.25)',

    white: '#FFFFFF',
    card: 'rgba(255,255,255,0.98)',

    textMain: '#2B0A1A',   // dark text inside card
    textSoft: '#9B6A80',   // secondary text (phone no etc.)
    textOnPrimary: '#FFFFFF',

    chipBg: 'rgba(255,255,255,0.16)',
    chipBorder: 'rgba(255,255,255,0.45)',

    navIcon: '#FFFFFF',
    navIconInactive: 'rgba(255,255,255,0.55)',

    danger: '#FF2A5A',
    success: '#4CAF50',
  },

  // 🔤 TYPOGRAPHY – use with <Text style={theme.text.xxx}>
  text: {
    // app name “Her Shield”
    logo: {
      fontFamily: 'Poppins-Bold',
      fontSize: 20,
      letterSpacing: 0.5,
      color: '#D02148',
    },

    // big “SOS” text
    sos: {
      fontFamily: 'Poppins-ExtraBold',
      fontSize: 26,
      letterSpacing: 1.5,
      color: '#FFFFFF',
      textTransform: 'uppercase' as const,
    },

    // big background title “Her Shield” behind phone
    backgroundTitle: {
      fontFamily: 'Poppins-ExtraBold',
      fontSize: 110,
      letterSpacing: 2,
      color: 'rgba(255,255,255,0.18)',
    },

    // chip labels: “App Design”, “UI/UX”, “By …”
    chipLabel: {
      fontFamily: 'Poppins-Medium',
      fontSize: 12,
      color: '#FFE5F0',
    },

    // small pill buttons: “live location”, “mark location”
    pillLabel: {
      fontFamily: 'Poppins-Medium',
      fontSize: 12,
      color: '#FF4B6A',
    },

    // row section title: “Contacts”
    sectionTitle: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 14,
      color: '#2B0A1A',
    },

    // contact name
    contactName: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 14,
      color: '#2B0A1A',
    },

    // contact phone
    contactPhone: {
      fontFamily: 'Poppins-Regular',
      fontSize: 11,
      color: '#9B6A80',
    },

    // small labels under icons: “Record”, “Scan my area”, “Snap”
    actionLabel: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 12,
      color: '#2B0A1A',
    },

    // bottom nav text (if you use text)
    navLabelActive: {
      fontFamily: 'Poppins-Medium',
      fontSize: 10,
      color: '#FFFFFF',
    },
    navLabelInactive: {
      fontFamily: 'Poppins-Medium',
      fontSize: 10,
      color: 'rgba(255,255,255,0.55)',
    },
  },

  // 📏 RADIUS & SPACING
  radii: {
    screen: 0,
    card: 32,
    mapCard: 20,
    sos: 60,
    chip: 999,
    pill: 999,
    icon: 16,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
  },

  // 🌫 SHADOWS (for card & SOS)
  shadow: {
    card: {
      shadowColor: '#FF2A5A',
      shadowOpacity: 0.30,
      shadowRadius: 25,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
    sos: {
      shadowColor: '#FF2A5A',
      shadowOpacity: 0.45,
      shadowRadius: 25,
      shadowOffset: { width: 0, height: 16 },
      elevation: 16,
    },
  },

  // 🧩 READY COMPONENT STYLES (you can spread these)
  components: {
    chip: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
    },

    card: {
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderRadius: 32,
      padding: 18,
    },

    mapCard: {
      backgroundColor: 'rgba(255,75,106,0.06)',
      borderRadius: 20,
      overflow: 'hidden' as const,
      height: 140,
    },

    sosButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    actionPill: {
      flex: 1,
      marginHorizontal: 4,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 20,
      paddingVertical: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    bottomNavBar: {
      height: 64,
      backgroundColor: 'rgba(0,0,0,0.10)',
      borderRadius: 32,
      paddingHorizontal: 24,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
  },
};
