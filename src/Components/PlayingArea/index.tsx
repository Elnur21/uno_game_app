import React, { useContext } from 'react';
import { View } from 'react-native';

import { styles } from './styles';
import { PlayerCard } from '../PlayerCard';
import { CardsContext } from '../../Contexts/CardsContext';
import { OnlineCardsContext } from '../../Contexts/OnlineCardsContext';

export function PlayingArea() {
  const onlineContext = useContext(OnlineCardsContext);
  const offlineContext = useContext(CardsContext);
  const cardsContext = onlineContext || offlineContext;

  const tableDeck = cardsContext?.tableDeck;

  return (
    <>

      {tableDeck && tableDeck.length > 0 ?
        <PlayerCard
          unavailable={false}
          cardValue={tableDeck[tableDeck.length - 1].value}
          cardColor={tableDeck[tableDeck.length - 1].color}
        />
        :
        <View style={styles.container} />
      }
    </>
  );
}