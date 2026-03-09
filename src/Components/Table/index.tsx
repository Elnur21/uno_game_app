import React, {useContext} from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';

import {styles} from './styles';
import {Middle} from '../../Components/Middle';
import {PlayerDeck} from '../../Components/PlayerDeck';
import {EnemyDeck} from '../../Components/EnemyDeck';
import {ChooseColor} from '../../Components/ChooseColor';
import {BluffPrompt} from '../../Components/BluffPrompt';
import {CardsContext} from '../../Contexts/CardsContext';
import {OnlineCardsContext} from '../../Contexts/OnlineCardsContext';

import {
  OfflineGameScreenNavigationProp,
  OnlineGameScreenNavigationProp,
} from '../../types/navigationProps';
import {RotatingCircle} from '../RotatingCircle';

interface TableProps {
  navigation: OfflineGameScreenNavigationProp | OnlineGameScreenNavigationProp;
}

export function Table({navigation}: TableProps) {
  const onlineContext = useContext(OnlineCardsContext);
  const offlineContext = useContext(CardsContext);
  const cardsContext = onlineContext || offlineContext;
  const isMultiPlayerView = Boolean((cardsContext as any)?.players && ((cardsContext as any)?.players?.length || 0) > 2);
  const players = ((cardsContext as any)?.players || []) as string[];
  const playerDecks = ((cardsContext as any)?.playerDecks || {}) as {[playerId: string]: any[]};
  const currentTurn = (cardsContext as any)?.currentTurn as string | undefined;
  const playerInfo = ((cardsContext as any)?.playerInfo || {}) as {[playerId: string]: {name: string}};
  const localPlayerId = (cardsContext as any)?.localPlayerId || 'player';
  const enemyPlayers = players.filter((id: string) => id !== localPlayerId);
  const sideOpponentId = enemyPlayers.length > 8 ? enemyPlayers[8] : null;
  const sideOpponentCardsCount = sideOpponentId ? (playerDecks?.[sideOpponentId]?.length || 0) : 0;
  const pendingPlus4Challenge = (cardsContext as any)?.pendingPlus4Challenge;
  const shouldShowBluffPrompt = Boolean(
    pendingPlus4Challenge?.active &&
      pendingPlus4Challenge?.targetPlayerId === localPlayerId &&
      !cardsContext?.choosingColor
  );

  if (cardsContext?.winner) {
    setTimeout(() => {
      cardsContext?.winner &&
        navigation.replace('WonScreen', {winner: cardsContext?.winner});
    }, 10);
    return <View />;
  }

  const handleFinishGame = () => {
    Alert.alert(
      'Finish Game',
      'Are you sure you want to finish the game? The player with the fewest cards will win.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: () => {
            if (cardsContext?.finishGame) {
              cardsContext.finishGame();
            }
          },
        },
      ],
      {cancelable: true}
    );
  };

  return (
    <View style={styles.container}>
      <EnemyDeck />

      <Middle />

      <PlayerDeck />

      {isMultiPlayerView && sideOpponentId && (
        <View style={[(styles as any).sideOpponentSlot, currentTurn === sideOpponentId && (styles as any).sideOpponentSlotActive]}>
          <Text style={[(styles as any).sideOpponentText, currentTurn === sideOpponentId && (styles as any).sideOpponentTextActive]}>
            {playerInfo?.[sideOpponentId]?.name || 'Player'}
          </Text>
          <View style={(styles as any).sideOpponentCountBadge}>
            <Text style={(styles as any).sideOpponentCountText}>{sideOpponentCardsCount}</Text>
          </View>
        </View>
      )}

      {!isMultiPlayerView && (
        <Text style={styles.text}>{cardsContext?.enemyDeck.length}</Text>
      )}

      <View
        style={[
          styles.rotatingCircle,
          {opacity: cardsContext?.playerTurn ? 0 : 1},
        ]}>
        <RotatingCircle />
      </View>

      {cardsContext?.choosingColor && <ChooseColor />}
      {shouldShowBluffPrompt && <BluffPrompt />}

      <TouchableOpacity style={styles.finishButton} onPress={handleFinishGame}>
        <Text style={styles.finishButtonText}>FINISH GAME</Text>
      </TouchableOpacity>
    </View>
  );
}
