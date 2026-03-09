import React, { useContext } from 'react';
import { View, Text } from 'react-native';
import auth from '@react-native-firebase/auth';

import { styles } from './styles';
import { CardBack } from '../CardBack';
import { CardsContext } from '../../Contexts/CardsContext';
import { OnlineCardsContext } from '../../Contexts/OnlineCardsContext';

export function EnemyDeck() {
  const onlineContext = useContext(OnlineCardsContext);
  const offlineContext = useContext(CardsContext);
  const cardsContext = onlineContext || offlineContext;
  
  const enemyDeck = cardsContext?.enemyDeck;
  const playerTurn = cardsContext?.playerTurn;
  const currentUser = auth().currentUser;

  if ((cardsContext as any)?.players && (cardsContext as any)?.playerDecks) {
    const players = (cardsContext as any).players as string[];
    const playerDecks = (cardsContext as any).playerDecks as {[playerId: string]: any[]};
    const playerInfo = (cardsContext as any).playerInfo as {[playerId: string]: {name: string}};
    const currentTurn = (cardsContext as any).currentTurn as string;
    const localPlayerId = onlineContext
      ? currentUser?.uid
      : (cardsContext as any).localPlayerId || 'player';
    const enemyPlayers = players.filter((id: string) => id !== localPlayerId);
    const maxTopSlots = 8;
    const topPlayers = enemyPlayers.slice(0, maxTopSlots);

    return (
      <View style={styles.multiPlayerContainer}>
        <View style={styles.topSlotsContainer}>
          {topPlayers.map((playerId: string) => {
            const playerName = playerInfo?.[playerId]?.name || 'Player';
            const isTheirTurn = currentTurn === playerId;
            const cardCount = playerDecks?.[playerId]?.length || 0;
            
            return (
              <View key={playerId} style={[styles.playerSlot, isTheirTurn && styles.playerSlotActive]}>
                <Text numberOfLines={1} style={[styles.playerName, isTheirTurn && styles.playerNameActive]}>
                  {playerName}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{cardCount}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {enemyDeck?.map((card, index) => (
        index < 4 &&
        <View key={index} style={{ opacity: playerTurn ? 0.2 : 1 }}>
          <CardBack />
        </View>
      ))}
    </View>
  );
}