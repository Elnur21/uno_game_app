import React, { useContext } from 'react';
import { TouchableOpacity } from 'react-native';

import { CardBack } from '../CardBack';
import { CardsContext } from '../../Contexts/CardsContext';
import { OnlineCardsContext } from '../../Contexts/OnlineCardsContext';

export function DrawDeck() {
  const onlineContext = useContext(OnlineCardsContext);
  const offlineContext = useContext(CardsContext);
  const cardsContext = onlineContext || offlineContext;

  function drawCard() {
    cardsContext?.playerDraw();
  };

  return (
    <TouchableOpacity
      style={{ opacity: !cardsContext?.canDraw ? 0.2 : 1 }}
      disabled={!cardsContext?.canDraw} onPress={drawCard}
    >
      <CardBack />
    </TouchableOpacity>
  );
}