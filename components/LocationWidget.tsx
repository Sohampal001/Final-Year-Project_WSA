// components/LocationWidget.tsx
import { theme } from '@/components/theme';
import * as Location from 'expo-location';
import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  query: string; // text searched in Google Maps, e.g. "police station"
};

const LocationWidget: React.FC<Props> = ({ title, subtitle, query }) => {
  const handlePress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Location permission is required to search nearby places.',
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      let url = '';
      if (Platform.OS === 'android') {
        url = `geo:${latitude},${longitude}?q=${encodeURIComponent(query)}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          query,
        )}`;
      }

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Error', 'Cannot open Maps on this device.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to open Maps.');
    }
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
};

export default LocationWidget;

const styles = StyleSheet.create({
  card: {
    ...theme.components.card,
    ...theme.shadow.card,
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.text.sectionTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.text.contactPhone,
  },
});
