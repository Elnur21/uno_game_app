import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {MainMenuNavigationProp} from '../../types/navigationProps';

interface OfflineSetupScreenProps {
  navigation: MainMenuNavigationProp;
}

export function OfflineSetupScreen({navigation}: OfflineSetupScreenProps) {
  const [botCount, setBotCount] = useState(1);

  const increaseBots = () => setBotCount(prev => Math.min(9, prev + 1));
  const decreaseBots = () => setBotCount(prev => Math.max(1, prev - 1));
  const startGame = () => navigation.navigate('OfflineGameScreen', {botCount});

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Setup</Text>
      <Text style={styles.subtitle}>Select bot count (1 to 9)</Text>

      <View style={styles.selectorRow}>
        <TouchableOpacity style={styles.adjustButton} onPress={decreaseBots}>
          <Text style={styles.adjustText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.countText}>{botCount}</Text>
        <TouchableOpacity style={styles.adjustButton} onPress={increaseBots}>
          <Text style={styles.adjustText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startGame}>
        <Text style={styles.startButtonText}>START OFFLINE GAME</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 28,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  adjustButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1f1f1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  adjustText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '600',
    marginTop: -2,
  },
  countText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
    marginHorizontal: 30,
    minWidth: 48,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
