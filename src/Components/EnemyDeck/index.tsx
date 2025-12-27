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

  if (onlineContext && (onlineContext as any).players && (onlineContext as any).playerDecks) {
    const players = (onlineContext as any).players as string[];
    const playerDecks = (onlineContext as any).playerDecks as {[playerId: string]: any[]};
    const playerInfo = (onlineContext as any).playerInfo as {[playerId: string]: {name: string}};
    const currentTurn = (onlineContext as any).currentTurn as string;
    
    const enemyPlayers = players.filter((id: string) => id !== currentUser?.uid);

    return (
      <View style={styles.multiPlayerContainer}>
        {enemyPlayers.map((playerId: string) => {
          const playerDeck = playerDecks[playerId] || [];
          const playerName = playerInfo?.[playerId]?.name || 'Player';
          const isTheirTurn = currentTurn === playerId;
          
          return (
            <View key={playerId} style={styles.playerSection}>
              <Text style={styles.playerName}>{playerName} ({playerDeck.length})</Text>
              <View style={[styles.container, { opacity: isTheirTurn ? 1 : 0.5 }]}>
                {playerDeck.slice(0, 4).map((card: any, index: number) => (
                  <View key={index} style={{ opacity: playerTurn ? 0.2 : 1 }}>
                    <CardBack />
                  </View>
                ))}
                {playerDeck.length > 4 && (
                  <Text style={styles.moreCardsText}>+{playerDeck.length - 4}</Text>
                )}
              </View>
            </View>
          );
        })}
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