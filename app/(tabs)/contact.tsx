// app/(tabs)/contact.tsx
// @ts-nocheck
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';

type TrustedContact = {
  id: number;
  name: string;
  phone: string;
  relation: string;
};

export default function ContactScreen() {
  const [contacts, setContacts] = useState<TrustedContact[]>([
    { id: 1, name: 'Mother', phone: '9876543210', relation: 'Family' },
    { id: 2, name: 'Sister', phone: '9876543211', relation: 'Family' },
    { id: 3, name: 'Best Friend', phone: '9876543212', relation: 'Friend' },
  ]);

  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ----------- OPEN DEVICE CONTACT PICKER -------------
  const openContactPicker = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow contact permission in settings to add from phone contacts.'
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      const filtered = data.filter(
        (c) => c.phoneNumbers && c.phoneNumbers.length > 0
      );

      if (filtered.length === 0) {
        Alert.alert('No contacts', 'No contacts with phone numbers found.');
        return;
      }

      setDeviceContacts(filtered);
      setSearchQuery(''); // reset search everytime we open
      setPickerVisible(true);
    } catch (e) {
      console.log('Error loading contacts', e);
      Alert.alert('Error', 'Could not load phone contacts.');
    }
  };

  // ----------- ADD TRUSTED CONTACT FROM PICKER -------------
  const AddFromDeviceContact = (c: any) => {
    const phone = c.phoneNumbers[0]?.number || '';
    if (!phone) {
      Alert.alert('No number', 'Selected contact has no phone number.');
      return;
    }

    const newContact: TrustedContact = {
      id: Date.now(),
      name: c.name || 'Unknown',
      phone,
      relation: 'Trusted',
    };

    setContacts((prev) => [...prev, newContact]);
    setPickerVisible(false);
  };

  // ----------- DELETE TRUSTED CONTACT -------------
  const removeContact = (id: number) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // ----------- FILTERED DEVICE CONTACTS FOR SEARCH -------------
  const filteredDeviceContacts = deviceContacts.filter((item) => {
    const phone = item.phoneNumbers?.[0]?.number || '';
    const target = (item.name || '' + phone).toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  // ----------- UI -------------
  return (
    <SafeAreaView style={styles.contactSafe}>
      {/* Header */}
      <View style={styles.contactHeader}>
        <View style={styles.contactHeaderInner}>
          <View>
            <Text style={styles.contactTitle}>Trusted Contacts</Text>
            <Text style={styles.contactSubtitle}>Manage your safety network</Text>
          </View>

          {/* ONLY Add button (no big bottom one) */}
          <TouchableOpacity
            style={styles.contactAddIconBox}
            onPress={openContactPicker}
          >
            <Ionicons name="add" size={26} color="#7c2d12" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN LIST */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {contacts.map((c) => (
          <View key={c.id} style={styles.contactCard}>
            <View style={styles.rowCenter}>
              <View style={styles.contactAvatar}>
                <Ionicons name="person-outline" size={30} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <View style={styles.rowCenter}>
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color="#7c3aed"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
                <Text style={styles.contactTag}>{c.relation}</Text>
              </View>
            </View>

            {/* DELETE button only */}
            <TouchableOpacity
              style={styles.contactRemoveBtn}
              onPress={() => removeContact(c.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* CONTACT PICKER MODAL WITH SEARCH */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#9ca3af"
              style={{ marginHorizontal: 6 }}
            />
            <TextInput
              placeholder="Search by name or number"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={filteredDeviceContacts}
            keyExtractor={(item, index) =>
              item.id || item.recordID || String(index)
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const phone = item.phoneNumbers?.[0]?.number || '';
              return (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => AddFromDeviceContact(item)}
                >
                  <View style={styles.modalAvatar}>
                    <Ionicons name="person-outline" size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>{item.name}</Text>
                    <Text style={styles.modalPhone}>{phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contactSafe: {
    flex: 1,
    backgroundColor: '#fdf2f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  contactHeader: {
    backgroundColor: '#7c3aed',
    elevation: 4,
  },
  contactHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#fef3c7',
  },
  contactAddIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },
  contactAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  contactPhone: {
    fontSize: 13,
    color: '#4b5563',
  },
  contactTag: {
    marginTop: 4,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    alignSelf: 'flex-start',
  },
  contactRemoveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --------- Modal styles ----------
  modalSafe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    color: '#111827',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
    elevation: 2,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  modalPhone: {
    fontSize: 13,
    color: '#4b5563',
  },
});
