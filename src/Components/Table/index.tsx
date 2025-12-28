import React, {useContext} from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';

import {styles} from './styles';
import {Middle} from '../../Components/Middle';
import {PlayerDeck} from '../../Components/PlayerDeck';
import {EnemyDeck} from '../../Components/EnemyDeck';
import {ChooseColor} from '../../Components/ChooseColor';
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

      <Text style={styles.text}>{cardsContext?.enemyDeck.length}</Text>

      <View
        style={[
          styles.rotatingCircle,
          {opacity: cardsContext?.playerTurn ? 0 : 1},
        ]}>
        <RotatingCircle />
      </View>

      {cardsContext?.choosingColor && <ChooseColor />}

      <TouchableOpacity style={styles.finishButton} onPress={handleFinishGame}>
        <Text style={styles.finishButtonText}>FINISH GAME</Text>
      </TouchableOpacity>
    </View>
  );
}
