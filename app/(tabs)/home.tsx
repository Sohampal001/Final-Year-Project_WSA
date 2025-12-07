// app/(tabs)/home.tsx
import LocationWidget from '@/components/LocationWidget';
import { theme } from '@/components/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

const HomePage: React.FC = () => {
  return (
    <LinearGradient
      colors={[theme.colors.bgTop, theme.colors.bgBottom]}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appTitle}>Suraksha</Text>
        <Text style={styles.subtitle}>Tap a card to find nearby help</Text>

        {/* Nearest Police Station */}
        <LocationWidget
          title="Nearest Police Station"
          subtitle="Open Google Maps and see police stations near you."
          query="police station"
        />

        {/* Nearest Hospital */}
        <LocationWidget
          title="Nearest Hospital"
          subtitle="Open Google Maps and see hospitals near you."
          query="hospital"
        />

        {/* Nearest Pharmacy */}
        <LocationWidget
          title="Nearest Pharmacy"
          subtitle="Open Google Maps and see pharmacies / medical shops near you."
          query="pharmacy"
        />
      </ScrollView>
    </LinearGradient>
  );
};

export default HomePage;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.xl,
  },
  appTitle: {
    ...theme.text.logo,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.text.chipLabel,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
