import React, {useContext} from 'react';
import {View, Text} from 'react-native';

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
    </View>
  );
}
