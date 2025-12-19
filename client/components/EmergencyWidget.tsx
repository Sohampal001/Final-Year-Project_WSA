import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { theme } from '@/components/theme';

type Props = {
  title: string;
  phone: string;
  icon?: any; // future logo image
};

const EmergencyWidget: React.FC<Props> = ({ title, phone, icon }) => {
  const handlePress = async () => {
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Error', 'Calling is not supported on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.iconBubble}>
        {icon ? (
          <Image source={icon} style={styles.iconImage} />
        ) : (
          <Text style={styles.iconEmoji}>📞</Text>
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{phone}</Text>
      </View>
    </Pressable>
  );
};

export default EmergencyWidget;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: 22,
    paddingVertical: 12,
    paddingLeft: 56,
    paddingRight: 12,
    marginHorizontal: 4,
    ...theme.shadow.card,
  },
  iconBubble: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  iconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    ...theme.text.sectionTitle,
    fontSize: 13,
  },
  subtitle: {
    ...theme.text.contactPhone,
    fontSize: 11,
  },
});
