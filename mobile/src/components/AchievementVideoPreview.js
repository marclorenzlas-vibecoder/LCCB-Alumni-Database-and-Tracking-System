import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';

export default function AchievementVideoPreview({ uri, style, resizeMode = 'cover', muted = false }) {
  const isFocused = useIsFocused();

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = muted;
  });

  useEffect(() => {
    if (!isFocused && player) {
      try {
        player.pause();
      } catch {
        // ignore
      }
    }
  }, [isFocused, player]);

  if (!uri) return null;

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        contentFit={resizeMode === 'contain' ? 'contain' : 'cover'}
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#0f172a'
  }
});
