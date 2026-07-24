import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export default function AchievementVideoPreview({ uri, style, resizeMode = 'cover', muted = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) setIsPlaying(false);
  }, [isFocused, uri]);

  if (isPlaying) {
    return (
      <Video
        source={{ uri }}
        style={style}
        useNativeControls
        resizeMode={resizeMode}
        shouldPlay
        isMuted={muted}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Video
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        shouldPlay={false}
        isMuted
      />
      <View style={styles.scrim} />
      <Pressable
        style={styles.playOverlay}
        onPress={(event) => {
          event?.stopPropagation?.();
          setIsPlaying(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Play achievement video"
      >
        <View style={styles.playButton}>
          <Ionicons name="play" size={24} color="#ffffff" style={styles.playIcon} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#0f172a'
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.10)'
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  playIcon: {
    marginLeft: 2
  }
});
