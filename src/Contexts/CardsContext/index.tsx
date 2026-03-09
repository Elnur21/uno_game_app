import React, {ReactNode, createContext, useEffect, useRef, useState} from 'react';
import {CardsContextProps} from './props';
import {Card, DrewCard, PlayedCard} from './types';
import * as actions from './actions';

interface Props {
  children: ReactNode;
  botCount?: number;
}

type DeckMap = {[playerId: string]: Card[]};
type PlayerInfoMap = {[playerId: string]: {name: string; email: string}};

const LOCAL_PLAYER_ID = 'player';
const MAX_PLAYERS = 10;
const isPlus2Card = (value: string) => value === '+2' || value === '2+';
const isPlus4Card = (value: string) => value === '+4' || value === '4+';

export const CardsContext = createContext<CardsContextProps | undefined>(undefined);

export const CardsProvider = ({children, botCount = 1}: Props) => {
  const [drawDeck, setDrawDeck] = useState<Card[]>([]);
  const [playerDeck, setPlayerDeck] = useState<Card[]>([]);
  const [enemyDeck, setEnemyDeck] = useState<Card[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [tableDeck, setTableDeck] = useState<Card[]>([]);
  const [choosingColor, setChoosingColor] = useState(false);
  const [canDraw, setCanDraw] = useState(false);
  const [playedCard, setPlayedCard] = useState<PlayedCard | null>(null);
  const [drewCard, setDrewCard] = useState<DrewCard | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [players, setPlayers] = useState<string[]>([]);
  const [playerDecks, setPlayerDecks] = useState<DeckMap>({});
  const [playerInfo, setPlayerInfo] = useState<PlayerInfoMap>({});
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnDirection, setTurnDirection] = useState(1);

  const botActingRef = useRef(false);

  const getNextPlayerIndex = (index: number, direction: number, count: number) => {
    if (count === 0) return 0;
    let next = index + direction;
    if (next < 0) next = count - 1;
    if (next >= count) next = 0;
    return next;
  };

  const chooseBotColor = (deck: Card[]) => {
    const counts: {[color: string]: number} = {};
    deck.forEach(card => {
      if (card.color !== 'black') {
        counts[card.color] = (counts[card.color] || 0) + 1;
      }
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return top || ['blue', 'yellow', 'red', 'green'][Math.floor(Math.random() * 4)];
  };

  const getEnemyDeckFromMap = (allDecks: DeckMap, allPlayers: string[]) => {
    const result: Card[] = [];
    allPlayers.forEach(playerId => {
      if (playerId !== LOCAL_PLAYER_ID && allDecks[playerId]) {
        result.push(...allDecks[playerId]);
      }
    });
    return result;
  };

  const checkWinner = (allDecks: DeckMap) => {
    if (tableDeck.length === 0) return false;
    for (const playerId of players) {
      if ((allDecks[playerId]?.length || 0) === 0) {
        if (playerId === LOCAL_PLAYER_ID) {
          setWinner('YOU WON');
        } else {
          setWinner(`${playerInfo[playerId]?.name || 'BOT'} WON`);
        }
        return true;
      }
    }
    return false;
  };

  const refillDrawDeckIfNeeded = (sourceDrawDeck: Card[], sourceTableDeck: Card[]) => {
    if (sourceDrawDeck.length > 0 || sourceTableDeck.length <= 1) {
      return {nextDrawDeck: sourceDrawDeck, nextTableDeck: sourceTableDeck};
    }

    const topCard = sourceTableDeck[sourceTableDeck.length - 1];
    const recyclableCards = sourceTableDeck.slice(0, -1);
    const shuffled = [...recyclableCards];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[randomIndex];
      shuffled[randomIndex] = tmp;
    }

    return {
      nextDrawDeck: shuffled,
      nextTableDeck: [topCard],
    };
  };

  const applyDrawPenalty = (
    allDecks: DeckMap,
    targetPlayerId: string,
    count: number,
    sourceDrawDeck: Card[],
    sourceTableDeck: Card[]
  ) => {
    const nextDecks = {...allDecks};
    let nextDrawDeck = [...sourceDrawDeck];
    let nextTableDeck = [...sourceTableDeck];
    const targetDeck = [...(nextDecks[targetPlayerId] || [])];
    for (let i = 0; i < count; i++) {
      if (nextDrawDeck.length === 0) {
        const refilled = refillDrawDeckIfNeeded(nextDrawDeck, nextTableDeck);
        nextDrawDeck = refilled.nextDrawDeck;
        nextTableDeck = refilled.nextTableDeck;
      }
      if (nextDrawDeck.length === 0) break;
      const randomNum = Math.floor(Math.random() * nextDrawDeck.length);
      targetDeck.push(nextDrawDeck[randomNum]);
      nextDrawDeck.splice(randomNum, 1);
    }
    nextDecks[targetPlayerId] = targetDeck;
    return {nextDecks, nextDrawDeck, nextTableDeck};
  };

  const startGame = () => {
    const clampedBots = Math.max(1, Math.min(9, botCount));
    const totalPlayers = Math.min(MAX_PLAYERS, clampedBots + 1);
    const botIds = Array.from({length: totalPlayers - 1}, (_, i) => `bot-${i + 1}`);
    const allPlayers = [LOCAL_PLAYER_ID, ...botIds];
    const initialState = actions.shuffleDrawDeckForMultiplayer(allPlayers);

    const infoMap: PlayerInfoMap = {
      [LOCAL_PLAYER_ID]: {name: 'You', email: ''},
    };
    botIds.forEach((id, index) => {
      infoMap[id] = {name: `Bot ${index + 1}`, email: ''};
    });

    setPlayers(allPlayers);
    setPlayerInfo(infoMap);
    setDrawDeck(initialState.drawDeck);
    setPlayerDecks(initialState.playerDecks);
    setPlayerDeck(initialState.playerDecks[LOCAL_PLAYER_ID] || []);
    setEnemyDeck(getEnemyDeckFromMap(initialState.playerDecks, allPlayers));
    setTableDeck(initialState.tableDeck);
    setCurrentTurnIndex(0);
    setTurnDirection(1);
    setPlayerTurn(true);
    setChoosingColor(false);
    setIsDrawing(false);
    setPlayedCard(null);
    setDrewCard(null);
    setWinner(null);
  };

  const endTurn = (nextIndex: number, nextDirection = turnDirection) => {
    setTurnDirection(nextDirection);
    setCurrentTurnIndex(nextIndex);
    setPlayerTurn(players[nextIndex] === LOCAL_PLAYER_ID);
  };

  const playerDrawCard = () => {
    if (!playerTurn || isDrawing || choosingColor) return;

    setIsDrawing(true);
    let nextDrawDeck = [...drawDeck];
    let nextTableDeck = [...tableDeck];
    const nextPlayerDeck = [...playerDeck];
    const nextDecks = {...playerDecks};

    const refilled = refillDrawDeckIfNeeded(nextDrawDeck, nextTableDeck);
    nextDrawDeck = refilled.nextDrawDeck;
    nextTableDeck = refilled.nextTableDeck;
    if (nextDrawDeck.length === 0) {
      setIsDrawing(false);
      return;
    }

    const randomNum = Math.floor(Math.random() * nextDrawDeck.length);
    const drawn = nextDrawDeck[randomNum];
    nextDrawDeck.splice(randomNum, 1);
    nextPlayerDeck.push(drawn);
    nextDecks[LOCAL_PLAYER_ID] = nextPlayerDeck;

    setDrewCard({isPlayer: true});
    setDrawDeck(nextDrawDeck);
    setTableDeck(nextTableDeck);
    setPlayerDeck(nextPlayerDeck);
    setPlayerDecks(nextDecks);
    setEnemyDeck(getEnemyDeckFromMap(nextDecks, players));

    setTimeout(() => {
      const canPlayDrawn = actions.canPlay(drawn, nextTableDeck, null, null, false);
      setDrewCard(null);
      setIsDrawing(false);

      if (canPlayDrawn) {
        setPlayerTurn(true);
      } else {
        const nextIndex = getNextPlayerIndex(currentTurnIndex, turnDirection, players.length);
        endTurn(nextIndex);
      }
    }, 500);
  };

  const playHumanCard = (card: Card) => {
    if (!playerTurn || isDrawing || choosingColor) return;
    if (!actions.canPlay(card, tableDeck, playedCard, drewCard, isDrawing)) return;

    const cardIndex = playerDeck.findIndex(c => c.value === card.value && c.color === card.color);
    if (cardIndex === -1) return;

    const nextPlayerDeck = [...playerDeck];
    nextPlayerDeck.splice(cardIndex, 1);
    let nextTableDeck = [...tableDeck, card];
    let nextDrawDeck = [...drawDeck];
    let nextDecks: DeckMap = {...playerDecks, [LOCAL_PLAYER_ID]: nextPlayerDeck};

    setPlayedCard({...card, isPlayer: true});
    setPlayerDeck(nextPlayerDeck);
    setPlayerDecks(nextDecks);
    setTableDeck(nextTableDeck);
    setEnemyDeck(getEnemyDeckFromMap(nextDecks, players));
    setDrawDeck(nextDrawDeck);
    setDrewCard(null);

    if (nextPlayerDeck.length === 0) {
      setWinner('YOU WON');
      return;
    }

    let nextIndex = currentTurnIndex;
    let nextDirection = turnDirection;
    let needsColorChoice = false;

    const isSkip = card.value === 'skip' || card.value === 'block';
    const isReverse = card.value === 'reverse' || card.value === 'invert';

    if (card.value === 'change' || isPlus4Card(card.value)) {
      needsColorChoice = true;
      setChoosingColor(true);
    } else if (isSkip) {
      nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
      nextIndex = getNextPlayerIndex(nextIndex, nextDirection, players.length);
    } else if (isReverse) {
      nextDirection = -nextDirection;
      if (players.length === 2) {
        nextIndex = currentTurnIndex;
      } else {
        nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
      }
    } else if (isPlus2Card(card.value)) {
      const targetIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
      const targetPlayerId = players[targetIndex];
      const penalty = applyDrawPenalty(nextDecks, targetPlayerId, 2, nextDrawDeck, nextTableDeck);
      nextDecks = penalty.nextDecks;
      nextDrawDeck = penalty.nextDrawDeck;
      nextTableDeck = penalty.nextTableDeck;
      nextIndex = getNextPlayerIndex(targetIndex, nextDirection, players.length);
      setPlayerDecks(nextDecks);
      setEnemyDeck(getEnemyDeckFromMap(nextDecks, players));
      setDrawDeck(nextDrawDeck);
      setTableDeck(nextTableDeck);
    } else {
      nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
    }

    setTimeout(() => setPlayedCard(null), 400);

    if (!needsColorChoice) {
      endTurn(nextIndex, nextDirection);
    }
  };

  const chooseColor = (color: string) => {
    if (!choosingColor || tableDeck.length === 0) return;

    let nextTableDeck = [...tableDeck];
    const lastCard = {...nextTableDeck[nextTableDeck.length - 1]};
    const wasPlus4 = isPlus4Card(lastCard.value);
    lastCard.color = color;
    nextTableDeck[nextTableDeck.length - 1] = lastCard;

    let nextDecks: DeckMap = {...playerDecks};
    let nextDrawDeck = [...drawDeck];
    let nextIndex = getNextPlayerIndex(currentTurnIndex, turnDirection, players.length);

    if (wasPlus4) {
      const targetPlayerId = players[nextIndex];
      const penalty = applyDrawPenalty(nextDecks, targetPlayerId, 4, nextDrawDeck, nextTableDeck);
      nextDecks = penalty.nextDecks;
      nextDrawDeck = penalty.nextDrawDeck;
      nextTableDeck = penalty.nextTableDeck;
      nextIndex = getNextPlayerIndex(nextIndex, turnDirection, players.length);
    }

    setChoosingColor(false);
    setTableDeck(nextTableDeck);
    setPlayerDecks(nextDecks);
    setEnemyDeck(getEnemyDeckFromMap(nextDecks, players));
    setDrawDeck(nextDrawDeck);
    endTurn(nextIndex);
  };

  const playBotTurn = () => {
    if (botActingRef.current || winner || choosingColor) return;
    const currentPlayerId = players[currentTurnIndex];
    if (!currentPlayerId || currentPlayerId === LOCAL_PLAYER_ID) return;

    botActingRef.current = true;

    let nextDecks: DeckMap = {...playerDecks};
    let nextDrawDeck = [...drawDeck];
    let nextTableDeck = [...tableDeck];
    let nextDirection = turnDirection;
    let nextIndex = currentTurnIndex;
    const botDeck = [...(nextDecks[currentPlayerId] || [])];
    const playable = botDeck.find(card => actions.canPlay(card, nextTableDeck, null, null, false));

    const finishBotTurn = () => {
      setDrawDeck(nextDrawDeck);
      setTableDeck(nextTableDeck);
      setPlayerDecks(nextDecks);
      setPlayerDeck(nextDecks[LOCAL_PLAYER_ID] || []);
      setEnemyDeck(getEnemyDeckFromMap(nextDecks, players));
      endTurn(nextIndex, nextDirection);
      botActingRef.current = false;
    };

    const applyBotPlayedCard = (played: Card) => {
      const cardIdx = botDeck.findIndex(c => c.value === played.value && c.color === played.color);
      if (cardIdx >= 0) botDeck.splice(cardIdx, 1);
      nextDecks[currentPlayerId] = botDeck;
      nextTableDeck = [...nextTableDeck, played];
      setPlayedCard({...played, isPlayer: false});
      setTimeout(() => setPlayedCard(null), 400);

      if (botDeck.length === 0) {
        setWinner(`${playerInfo[currentPlayerId]?.name || 'BOT'} WON`);
        botActingRef.current = false;
        return;
      }

      const isSkip = played.value === 'skip' || played.value === 'block';
      const isReverse = played.value === 'reverse' || played.value === 'invert';

      if (played.value === 'change' || isPlus4Card(played.value)) {
        const changed = {...played, color: chooseBotColor(botDeck)};
        nextTableDeck[nextTableDeck.length - 1] = changed;

        let targetIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
        const targetPlayerId = players[targetIndex];

        if (isPlus4Card(played.value)) {
          const penalty = applyDrawPenalty(nextDecks, targetPlayerId, 4, nextDrawDeck, nextTableDeck);
          nextDecks = penalty.nextDecks;
          nextDrawDeck = penalty.nextDrawDeck;
          nextTableDeck = penalty.nextTableDeck;
          targetIndex = getNextPlayerIndex(targetIndex, nextDirection, players.length);
        }

        nextIndex = targetIndex;
      } else if (isPlus2Card(played.value)) {
        const targetIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
        const targetPlayerId = players[targetIndex];
        const penalty = applyDrawPenalty(nextDecks, targetPlayerId, 2, nextDrawDeck, nextTableDeck);
        nextDecks = penalty.nextDecks;
        nextDrawDeck = penalty.nextDrawDeck;
        nextTableDeck = penalty.nextTableDeck;
        nextIndex = getNextPlayerIndex(targetIndex, nextDirection, players.length);
      } else if (isSkip) {
        nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
        nextIndex = getNextPlayerIndex(nextIndex, nextDirection, players.length);
      } else if (isReverse) {
        nextDirection = -nextDirection;
        if (players.length === 2) {
          nextIndex = currentTurnIndex;
        } else {
          nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
        }
      } else {
        nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
      }

      finishBotTurn();
    };

    if (playable) {
      applyBotPlayedCard(playable);
      return;
    }

    const refilledForBot = refillDrawDeckIfNeeded(nextDrawDeck, nextTableDeck);
    nextDrawDeck = refilledForBot.nextDrawDeck;
    nextTableDeck = refilledForBot.nextTableDeck;
    if (nextDrawDeck.length > 0) {
      const randomNum = Math.floor(Math.random() * nextDrawDeck.length);
      const drawn = nextDrawDeck[randomNum];
      nextDrawDeck.splice(randomNum, 1);
      botDeck.push(drawn);
      nextDecks[currentPlayerId] = botDeck;

      if (actions.canPlay(drawn, nextTableDeck, null, null, false)) {
        applyBotPlayedCard(drawn);
        return;
      }
    }

    nextIndex = getNextPlayerIndex(currentTurnIndex, nextDirection, players.length);
    finishBotTurn();
  };

  useEffect(() => {
    startGame();
  }, [botCount]);

  useEffect(() => {
    if (winner || players.length === 0) return;
    if (checkWinner(playerDecks)) return;
    if (drawDeck.length === 0 && tableDeck.length > 1) {
      const refilled = refillDrawDeckIfNeeded(drawDeck, tableDeck);
      setDrawDeck(refilled.nextDrawDeck);
      setTableDeck(refilled.nextTableDeck);
    }
  }, [playerDecks, drawDeck, tableDeck, winner, players, playerInfo]);

  useEffect(() => {
    setCanDraw(
      actions.canDraw(tableDeck, playerDeck, playedCard, isDrawing, choosingColor) &&
        playerTurn &&
        !isDrawing &&
        !drewCard
    );
  }, [playerTurn, isDrawing, choosingColor, drewCard, playedCard, tableDeck, playerDeck]);

  useEffect(() => {
    if (winner || choosingColor || playerTurn || players.length === 0) return;
    const timeout = setTimeout(() => {
      playBotTurn();
    }, 700);
    return () => clearTimeout(timeout);
  }, [playerTurn, currentTurnIndex, winner, choosingColor, players, playerDecks, drawDeck, tableDeck, turnDirection]);

  const finishGame = () => {
    if (players.length === 0) return;
    let minCards = Infinity;
    let winnerId = LOCAL_PLAYER_ID;
    players.forEach(playerId => {
      const count = playerDecks[playerId]?.length || 0;
      if (count < minCards) {
        minCards = count;
        winnerId = playerId;
      }
    });
    setWinner(winnerId === LOCAL_PLAYER_ID ? 'YOU WON' : `${playerInfo[winnerId]?.name || 'BOT'} WON`);
  };

  const contextValue: CardsContextProps & {
    players?: string[];
    playerDecks?: {[playerId: string]: Card[]};
    playerInfo?: {[playerId: string]: {name: string; email: string}};
    currentTurn?: string;
    localPlayerId?: string;
  } = {
    drawDeck,
    setDrawDeck,
    enemyDeck,
    setEnemyDeck,
    playerDeck,
    setPlayerDeck,
    playerTurn,
    setPlayerTurn,
    playerDraw: playerDrawCard,
    playPlayerCard: playHumanCard,
    tableDeck,
    getLastCardInTable: () => actions.getLastCardInTable(tableDeck),
    canPlay: (card: Card) => actions.canPlay(card, tableDeck, playedCard, drewCard, isDrawing),
    choosingColor,
    setChoosingColor,
    chooseColor,
    canDraw,
    winner,
    playedCard,
    drewCard,
    finishGame,
    players,
    playerDecks,
    playerInfo,
    currentTurn: players[currentTurnIndex],
    localPlayerId: LOCAL_PLAYER_ID,
  };

  return <CardsContext.Provider value={contextValue}>{children}</CardsContext.Provider>;
};