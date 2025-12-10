import { theme } from '@/components/theme';
import * as Location from 'expo-location';
import React from 'react';
import {
  Alert,
  Image,
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
  query: string; // e.g. "police station"
  icon?: any;    // image source for future logo
};

const LocationWidget: React.FC<Props> = ({ title, subtitle, query, icon }) => {
  const handlePress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Location permission is required to search nearby places.'
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
          query
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
      {/* floating icon bubble */}
      <View style={styles.iconBubble}>
        {icon ? (
          <Image source={icon} style={styles.iconImage} />
        ) : (
          <Text style={styles.iconEmoji}>📍</Text>
        )}
      </View>

      <View style={styles.textContainer}>
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
    paddingLeft: 72, // space for floating icon
    paddingVertical: 18,
    position: 'relative',
  },
  iconBubble: {
    position: 'absolute',
    left: 18,
    top: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  iconEmoji: {
    fontSize: 24,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    ...theme.text.sectionTitle,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.text.contactPhone,
  },
});
