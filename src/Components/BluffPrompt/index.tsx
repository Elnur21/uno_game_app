import React, {useContext} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {OnlineCardsContext} from '../../Contexts/OnlineCardsContext';
import {styles} from './styles';

export function BluffPrompt() {
  const cardsContext = useContext(OnlineCardsContext) as any;
  const pending = cardsContext?.pendingPlus4Challenge;

  if (!pending?.active) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLUFF CHALLENGE</Text>
      <Text style={styles.subtitle}>Challenge +4 as bluff?</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.yesButton]} onPress={() => cardsContext?.resolvePlus4Challenge?.(true)}>
          <Text style={styles.buttonText}>YES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.noButton]} onPress={() => cardsContext?.resolvePlus4Challenge?.(false)}>
          <Text style={styles.buttonText}>NO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
