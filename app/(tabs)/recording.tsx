// app/(tabs)/recording.tsx
// @ts-nocheck
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface RecItem {
  id: number;
  uri: string;
  title: string;
}

export default function RecordingScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<RecItem[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // ---------- RECORD ----------
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please enable microphone permission.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.log('Error starting recording', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);

      if (uri) {
        const newId = Date.now();
        setRecordings(prev => [
          ...prev,
          {
            id: newId,
            uri,
            title: `Recording ${prev.length + 1}`,
          },
        ]);
      }

      setRecording(null);
    } catch (err) {
      console.log('Error stopping recording', err);
      Alert.alert('Error', 'Could not stop recording.');
    }
  };

  const toggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ---------- PLAYBACK ----------
  const stopSoundIfAny = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      console.log('Error stopping sound', e);
    } finally {
      setSound(null);
      setPlayingId(null);
    }
  };

  const playRecording = async (rec: RecItem) => {
    try {
      // If the same recording is already playing, pause/stop it
      if (playingId === rec.id) {
        await stopSoundIfAny();
        return;
      }

      // Stop any existing sound first
      await stopSoundIfAny();

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: rec.uri },
        { shouldPlay: true },
        (status: any) => {
          if (status.didJustFinish) {
            stopSoundIfAny();
          }
        }
      );

      setSound(newSound);
      setPlayingId(rec.id);
    } catch (err) {
      console.log('Error playing recording', err);
      Alert.alert('Error', 'Could not play recording.');
    }
  };

  // ---------- DELETE ----------
  const deleteRecording = async (id: number) => {
    if (playingId === id) {
      await stopSoundIfAny();
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
    // If you also want to delete file from storage, use expo-file-system here.
  };

  const deleteAll = async () => {
    await stopSoundIfAny();
    setRecordings([]);
  };

  return (
    <SafeAreaView style={styles.recordSafe}>
      <View style={styles.recordHeader}>
        <View style={styles.recordHeaderInner}>
          <Text style={styles.recordTitle}>Recording</Text>
        </View>
      </View>

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={styles.centerSection}>
          <TouchableOpacity
            style={[
              styles.recordMicButton,
              { backgroundColor: isRecording ? '#b91c1c' : '#ef4444' },
            ]}
            onPress={toggleRecord}
          >
            <Ionicons
              name={isRecording ? 'pause' : 'mic-outline'}
              size={48}
              color="#ffffff"
            />
          </TouchableOpacity>

          {isRecording && (
            <Text style={styles.recordingStatusText}>Recording in progress...</Text>
          )}
        </View>

        {recordings.length > 0 && (
          <>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderText}>
                {recordings.length} recording(s)
              </Text>
              <TouchableOpacity style={styles.deleteAllBtn} onPress={deleteAll}>
                <Ionicons name="trash-outline" size={16} color="#ffffff" />
                <Text style={styles.deleteAllText}>Delete All</Text>
              </TouchableOpacity>
            </View>

            {recordings.map(rec => (
              <View key={rec.id} style={styles.recordCard}>
                <Text style={styles.recordCardTitle}>{rec.title}</Text>
                <View style={styles.recordRow}>
                  <TouchableOpacity
                    style={styles.recordPlayBtn}
                    onPress={() => playRecording(rec)}
                  >
                    <Ionicons
                      name={playingId === rec.id ? 'pause' : 'play'}
                      size={20}
                      color="#0f766e"
                    />
                  </TouchableOpacity>
                  <View style={styles.recordProgressBar}>
                    <View style={styles.recordProgressFill} />
                  </View>
                  <TouchableOpacity
                    style={styles.recordDeleteBtn}
                    onPress={() => deleteRecording(rec.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  recordSafe: {
    flex: 1,
    backgroundColor: '#ecfeff',
  },
  recordHeader: {
    backgroundColor: '#0ea5e9',
    elevation: 4,
  },
  recordHeaderInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  recordMicButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  recordingStatusText: {
    marginTop: 8,
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '600',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deleteAllText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    elevation: 4,
  },
  recordCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  recordProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    marginRight: 8,
  },
  recordProgressFill: {
    width: '30%',
    height: '100%',
    backgroundColor: '#0f766e',
  },
  recordDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
