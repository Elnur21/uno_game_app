import React, {ReactNode, createContext, useEffect, useState, useRef, useCallback} from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Card, DrewCard, PlayedCard} from '../CardsContext/types';
import {CardsContextProps} from '../CardsContext/props';
import * as actions from '../CardsContext/actions';

interface Props {
  children: ReactNode;
  matchId?: string;
  opponentId?: string;
}

interface PendingPlus4Challenge {
  active: boolean;
  playedBy: string;
  targetPlayerId: string;
  previousColor: string;
  isBluff: boolean;
}

export const OnlineCardsContext = createContext<CardsContextProps | undefined>(undefined);

export const OnlineCardsProvider = ({children, matchId, opponentId}: Props) => {
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
  const [gameInitialized, setGameInitialized] = useState(false);
  
  const [players, setPlayers] = useState<string[]>([]);
  const [playerDecks, setPlayerDecks] = useState<{[playerId: string]: Card[]}>({});
  const [playerInfo, setPlayerInfo] = useState<{[playerId: string]: {name: string; email: string}}>({});
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [turnDirection, setTurnDirection] = useState(1); // 1 for forward, -1 for reverse
  const [pendingPlus4Challenge, setPendingPlus4Challenge] = useState<PendingPlus4Challenge | null>(null);
  
  const currentUser = auth().currentUser;
  const playerIndexRef = useRef<number>(-1);
  const playerHadCardsRef = useRef<boolean>(false);
  const playerHasPlayedRef = useRef<boolean>(false); // Track if player has actually played
  const initializationAttemptedRef = useRef<boolean>(false);
  const playerInfoRef = useRef<{[playerId: string]: {name: string; email: string}}>({});
  const opponentHadCardsRef = useRef<{[playerId: string]: boolean}>({});
  
  // Refs to track previous values and prevent unnecessary updates
  const prevDrawDeckRef = useRef<string>('');
  const prevTableDeckRef = useRef<string>('');
  const prevPlayerDecksRef = useRef<string>('');
  const prevPlayerDeckRef = useRef<string>('');
  const prevEnemyDeckRef = useRef<string>('');
  const prevTurnIndexRef = useRef<number>(-1);
  const prevPlayerTurnRef = useRef<boolean>(true);
  const prevTurnDirectionRef = useRef<number>(1);
  const prevChoosingColorRef = useRef<boolean>(false);

  const getNextPlayer = (currentIndex: number, direction: number) => {
    if (players.length === 0) return currentIndex;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = players.length - 1;
    if (nextIndex >= players.length) nextIndex = 0;
    return nextIndex;
  };

  const isPlus2Card = (value: string) => value === '+2' || value === '2+';
  const isPlus4Card = (value: string) => value === '+4' || value === '4+';

  const drawCardsForTarget = (
    targetPlayerId: string,
    cardsToDraw: number,
    sourceDrawDeck: Card[],
    sourcePlayerDecks: {[playerId: string]: Card[]},
    sourceTableDeck: Card[]
  ) => {
    const updatedDrawDeck = [...sourceDrawDeck];
    const updatedTableDeck = [...sourceTableDeck];
    const updatedPlayerDecks = {...sourcePlayerDecks};
    const targetDeck = [...(updatedPlayerDecks[targetPlayerId] || [])];

    const refillIfNeeded = () => {
      if (updatedDrawDeck.length > 0 || updatedTableDeck.length <= 1) return;
      const topCard = updatedTableDeck[updatedTableDeck.length - 1];
      const recyclableCards = updatedTableDeck.slice(0, -1);
      for (let i = recyclableCards.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        const tmp = recyclableCards[i];
        recyclableCards[i] = recyclableCards[randomIndex];
        recyclableCards[randomIndex] = tmp;
      }
      updatedDrawDeck.splice(0, updatedDrawDeck.length, ...recyclableCards);
      updatedTableDeck.splice(0, updatedTableDeck.length, topCard);
    };

    for (let i = 0; i < cardsToDraw; i++) {
      refillIfNeeded();
      if (updatedDrawDeck.length === 0) break;
      const randomNum = Math.floor(Math.random() * updatedDrawDeck.length);
      targetDeck.push(updatedDrawDeck[randomNum]);
      updatedDrawDeck.splice(randomNum, 1);
    }

    updatedPlayerDecks[targetPlayerId] = targetDeck;
    return {updatedDrawDeck, updatedPlayerDecks, updatedTableDeck};
  };

  const getPlayerIndexById = (playerId: string) => {
    const index = players.findIndex(id => id === playerId);
    return index >= 0 ? index : 0;
  };

  useEffect(() => {
    if (!matchId || !currentUser?.uid) return;

    playerHadCardsRef.current = false;
    playerHasPlayedRef.current = false;
    initializationAttemptedRef.current = false;
    opponentHadCardsRef.current = {};
    setWinner(null);
    setGameInitialized(false);

    const matchRef = firestore().collection('matches').doc(matchId);
    const gameRef = firestore().collection('games').doc(matchId);

    const matchUnsubscribe = matchRef.onSnapshot(async (matchDoc) => {
      if (!matchDoc.exists) return;

      const matchData = matchDoc.data();
      const matchPlayers = matchData?.players || [];
      
      if (matchPlayers.length === 0) return;

      setPlayers(matchPlayers);
      
      const currentIndex = matchPlayers.findIndex((id: string) => id === currentUser.uid);
      playerIndexRef.current = currentIndex;

      const infoPromises = matchPlayers.map(async (playerId: string) => {
        const userDoc = await firestore().collection('users').doc(playerId).get();
        const userData = userDoc.data();
        return {
          playerId,
          name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Unknown',
          email: userData?.email || '',
        };
      });

      const infoResults = await Promise.all(infoPromises);
      const infoMap: {[playerId: string]: {name: string; email: string}} = {};
      infoResults.forEach(({playerId, name, email}) => {
        infoMap[playerId] = {name, email};
      });
      setPlayerInfo(infoMap);
      playerInfoRef.current = infoMap;

      gameRef.get().then((gameDoc) => {
        if (gameDoc.exists) {
          const gameData = gameDoc.data();
          const state = gameData?.gameState;

          if (state) {
            setDrawDeck(state.drawDeck || []);
            setTableDeck(state.tableDeck || []);
            setPlayerDecks(state.playerDecks || {});
            
            if (state.playerDecks && state.playerDecks[currentUser.uid]) {
              const deck = state.playerDecks[currentUser.uid];
              setPlayerDeck(deck);
              playerHadCardsRef.current = deck.length > 0;
            } else {
              const newPlayerDecks = {...state.playerDecks};
              const initialHandSize = state.initialHandSize || Math.max(1, Math.floor(((state.drawDeck?.length || 0) - 1) / Math.max(1, matchPlayers.length)));
              if (!newPlayerDecks[currentUser.uid] && state.drawDeck && state.drawDeck.length >= initialHandSize) {
                const newPlayerDeck: Card[] = [];
                const updatedDrawDeck = [...state.drawDeck];
                for (let i = 0; i < initialHandSize; i++) {
                  const randomNum = Math.floor(Math.random() * updatedDrawDeck.length);
                  newPlayerDeck.push(updatedDrawDeck[randomNum]);
                  updatedDrawDeck.splice(randomNum, 1);
                }
                newPlayerDecks[currentUser.uid] = newPlayerDeck;
                setPlayerDeck(newPlayerDeck);
                setDrawDeck(updatedDrawDeck);
                playerHadCardsRef.current = newPlayerDeck.length > 0;
                gameRef.update({
                  'gameState.playerDecks': newPlayerDecks,
                  'gameState.drawDeck': updatedDrawDeck,
                  'gameState.initialHandSize': initialHandSize,
                });
              } else {
                playerHadCardsRef.current = false;
              }
            }

            const enemyDecks: Card[] = [];
            matchPlayers.forEach((playerId: string) => {
              if (playerId !== currentUser.uid && state.playerDecks?.[playerId]) {
                enemyDecks.push(...state.playerDecks[playerId]);
              }
            });
            setEnemyDeck(enemyDecks);

            const currentTurnId = state.currentTurn || matchPlayers[0];
            const turnIndex = matchPlayers.findIndex((id: string) => id === currentTurnId);
            setCurrentTurnIndex(turnIndex >= 0 ? turnIndex : 0);
            setPlayerTurn(currentTurnId === currentUser.uid);
            setTurnDirection(state.turnDirection || 1);
            const choosingColorPlayerId = state.choosingColorPlayerId;
            setChoosingColor(state.choosingColor && choosingColorPlayerId === currentUser.uid);
            
            setTimeout(() => {
              setGameInitialized(true);
            }, 500);
          } else {
            if (matchData?.status === 'active' && matchPlayers.length >= 2) {
              const initialState = actions.shuffleDrawDeckForMultiplayer(matchPlayers);
              const initialTurnIndex = 0;
              
              gameRef.update({
                players: matchPlayers,
                status: 'active',
                gameState: {
                  drawDeck: initialState.drawDeck,
                  playerDecks: initialState.playerDecks,
                  tableDeck: initialState.tableDeck,
                  initialHandSize: initialState.handSize,
                  currentTurn: matchPlayers[initialTurnIndex],
                  currentTurnIndex: initialTurnIndex,
                  turnDirection: 1,
                },
              });

              setDrawDeck(initialState.drawDeck);
              setPlayerDecks(initialState.playerDecks);
              const playerDeck = initialState.playerDecks[currentUser.uid] || [];
              setPlayerDeck(playerDeck);
              playerHadCardsRef.current = playerDeck.length > 0;
              
              const enemyDecks: Card[] = [];
              matchPlayers.forEach((playerId: string) => {
                if (playerId !== currentUser.uid && initialState.playerDecks[playerId]) {
                  enemyDecks.push(...initialState.playerDecks[playerId]);
                }
              });
              setEnemyDeck(enemyDecks);
              
              setTableDeck(initialState.tableDeck);
              setCurrentTurnIndex(initialTurnIndex);
              setPlayerTurn(matchPlayers[initialTurnIndex] === currentUser.uid);
              
              setTimeout(() => {
                setGameInitialized(true);
              }, 500);
            }
          }
        } else {
          setGameInitialized(false);
        }
      });
    });

    const gameUnsubscribe = gameRef.onSnapshot((gameDoc) => {
      if (!gameDoc.exists) return;

      const gameData = gameDoc.data();
      const state = gameData?.gameState;

      if (state) {
        const newDrawDeck = state.drawDeck || [];
        const newTableDeck = state.tableDeck || [];
        const newPlayerDecks = state.playerDecks || {};
        const newPendingPlus4Challenge = state.pendingPlus4Challenge || null;
        
        // Only update if values actually changed (using refs for comparison)
        const drawDeckStr = JSON.stringify(newDrawDeck);
        const tableDeckStr = JSON.stringify(newTableDeck);
        const playerDecksStr = JSON.stringify(newPlayerDecks);
        
        if (drawDeckStr !== prevDrawDeckRef.current) {
          prevDrawDeckRef.current = drawDeckStr;
          setDrawDeck(newDrawDeck);
        }
        
        if (tableDeckStr !== prevTableDeckRef.current) {
          prevTableDeckRef.current = tableDeckStr;
          setTableDeck(newTableDeck);
        }
        
        if (playerDecksStr !== prevPlayerDecksRef.current) {
          prevPlayerDecksRef.current = playerDecksStr;
          setPlayerDecks(newPlayerDecks);
          
          // Recalculate enemy decks when playerDecks change
          const currentPlayers = players.length > 0 ? players : gameData?.players || [];
          const enemyDecks: Card[] = [];
          currentPlayers.forEach((playerId: string) => {
            if (playerId !== currentUser.uid && newPlayerDecks?.[playerId]) {
              enemyDecks.push(...newPlayerDecks[playerId]);
            }
          });
          const enemyDecksStr = JSON.stringify(enemyDecks);
          if (enemyDecksStr !== prevEnemyDeckRef.current) {
            prevEnemyDeckRef.current = enemyDecksStr;
            setEnemyDeck(enemyDecks);
          }
        }
        setPendingPlus4Challenge(newPendingPlus4Challenge);
        
        if (newPlayerDecks && newPlayerDecks[currentUser.uid]) {
          const deck = newPlayerDecks[currentUser.uid];
          const deckStr = JSON.stringify(deck);
          if (deckStr !== prevPlayerDeckRef.current) {
            prevPlayerDeckRef.current = deckStr;
            setPlayerDeck(deck);
            if (deck.length > 0) {
              playerHadCardsRef.current = true;
            }
          }
        }

        const currentPlayers = players.length > 0 ? players : gameData?.players || [];
        if (currentPlayers.length > 0 && players.length === 0) {
          setPlayers(currentPlayers);
        }

        const currentTurnId = state.currentTurn;
        if (currentTurnId) {
          const currentPlayers = players.length > 0 ? players : gameData?.players || [];
          const turnIndex = currentPlayers.findIndex((id: string) => id === currentTurnId);
          if (turnIndex >= 0) {
            if (turnIndex !== prevTurnIndexRef.current) {
              prevTurnIndexRef.current = turnIndex;
              setCurrentTurnIndex(turnIndex);
            }
            
            const newPlayerTurn = currentTurnId === currentUser.uid;
            if (newPlayerTurn !== prevPlayerTurnRef.current) {
              prevPlayerTurnRef.current = newPlayerTurn;
              setPlayerTurn(newPlayerTurn);
            }
          }
        }
        
        const newTurnDirection = state.turnDirection || 1;
        if (newTurnDirection !== prevTurnDirectionRef.current) {
          prevTurnDirectionRef.current = newTurnDirection;
          setTurnDirection(newTurnDirection);
        }
        
        const choosingColorPlayerId = state.choosingColorPlayerId;
        const newChoosingColor = state.choosingColor && choosingColorPlayerId === currentUser.uid;
        if (newChoosingColor !== prevChoosingColorRef.current) {
          prevChoosingColorRef.current = newChoosingColor;
          setChoosingColor(newChoosingColor);
        }
        
        if (!initializationAttemptedRef.current && state.playerDecks && Object.keys(state.playerDecks).length > 0 && state.playerDecks[currentUser.uid]) {
          initializationAttemptedRef.current = true;
          setTimeout(() => {
            setGameInitialized(true);
          }, 100);
        }

        if (state.winner && gameInitialized) {
          if (matchId) {
            firestore().collection('games').doc(matchId).update({
              status: 'completed',
            }).catch(() => {});
            firestore().collection('matches').doc(matchId).update({
              status: 'completed',
            }).catch(() => {});
          }
          
          if (state.winner === currentUser.uid) {
            setWinner('YOU WON');
          } else {
            if (playerInfoRef.current[state.winner]?.name) {
              setWinner(`${playerInfoRef.current[state.winner].name} WON`);
            } else {
              firestore().collection('users').doc(state.winner).get().then((userDoc) => {
                if (userDoc.exists) {
                  const userData = userDoc.data();
                  const winnerName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Player';
                  setWinner(`${winnerName} WON`);
                } else {
                  setWinner('SOMEONE WON');
                }
              }).catch(() => {
                setWinner('SOMEONE WON');
              });
            }
          }
        }
      }
    });

    return () => {
      matchUnsubscribe();
      gameUnsubscribe();
    };
  }, [matchId, currentUser?.uid]);

  const syncGameState = (updates: any) => {
    if (!matchId || !currentUser?.uid) return;

    const gameRef = firestore().collection('games').doc(matchId);
    
    gameRef.get().then((doc) => {
      if (doc.exists) {
        const currentState = doc.data()?.gameState || {};
        
        let mergedPlayerDecks = {...(currentState.playerDecks || {})};
        if (updates.playerDecks) {
          mergedPlayerDecks = {
            ...mergedPlayerDecks,
            ...updates.playerDecks,
          };
        }
        
        const newState = {
          ...currentState,
          ...updates,
          playerDecks: mergedPlayerDecks,
        };

        gameRef.update({
          gameState: newState,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        }).catch((error) => {
          console.error('Error syncing game state:', error);
        });
      }
    }).catch((error) => {
      console.error('Error getting game document for sync:', error);
    });
  };

  const playerDrawOnline = () => {
    if (!playerTurn || isDrawing || choosingColor) return;
    if (pendingPlus4Challenge?.active && pendingPlus4Challenge.targetPlayerId === currentUser?.uid) return;

    setIsDrawing(true);
    const newDrawDeck = [...drawDeck];
    const newPlayerDeck = [...playerDeck];

    if (newDrawDeck.length === 0) {
      setIsDrawing(false);
      return;
    }

    const randomNum = Math.floor(Math.random() * newDrawDeck.length);
    const drewCardValue = newDrawDeck[randomNum];
    newDrawDeck.splice(randomNum, 1);
    newPlayerDeck.push(drewCardValue);

    playerHasPlayedRef.current = true;
    if (newPlayerDeck.length > 0) {
      playerHadCardsRef.current = true;
    }

    setDrawDeck(newDrawDeck);
    setPlayerDeck(newPlayerDeck);
    setDrewCard({isPlayer: true});

    const updatedPlayerDecks = {
      ...playerDecks,
      [currentUser?.uid || '']: newPlayerDeck,
    };
    setPlayerDecks(updatedPlayerDecks);

    setTimeout(() => {
      setDrewCard(null);
      setIsDrawing(false);
       
      const canPlayDrawnCard = actions.canPlay(drewCardValue, tableDeck, null, null, false);
      
      if (canPlayDrawnCard) {
        setPlayerTurn(true);
        syncGameState({
          drawDeck: newDrawDeck,
          playerDecks: updatedPlayerDecks,
        });
      } else {
        const nextIndex = getNextPlayer(currentTurnIndex, turnDirection);
        const nextPlayerId = players[nextIndex];
        
        setPlayerTurn(false);
        setCurrentTurnIndex(nextIndex);
        
        syncGameState({
          drawDeck: newDrawDeck,
          playerDecks: updatedPlayerDecks,
          currentTurn: nextPlayerId,
          currentTurnIndex: nextIndex,
        });
      }
    }, 500);
  };

  const playPlayerCardOnline = (card: Card) => {
    if (!playerTurn || isDrawing || choosingColor) return;
    if (pendingPlus4Challenge?.active && pendingPlus4Challenge.targetPlayerId === currentUser?.uid) return;
    if (!actions.canPlay(card, tableDeck, playedCard, drewCard, isDrawing)) return;

    const cardIndex = playerDeck.findIndex(
      c => c.value === card.value && c.color === card.color
    );
    if (cardIndex === -1) return;

    const newPlayerDeck = [...playerDeck];
    newPlayerDeck.splice(cardIndex, 1);
    const newTableDeck = [...tableDeck, card];
    const newDrawDeck = [...drawDeck];

    if (playerDeck.length > 0) {
      playerHadCardsRef.current = true;
      playerHasPlayedRef.current = true;
    }

    setPlayerDeck(newPlayerDeck);
    setTableDeck(newTableDeck);
    setPlayedCard({...card, isPlayer: true});
    setDrewCard(null);

    const updatedPlayerDecks = {
      ...playerDecks,
      [currentUser?.uid || '']: newPlayerDeck,
    };
    setPlayerDecks(updatedPlayerDecks);

    setTimeout(() => {
      setPlayedCard(null);

      let nextIndex = currentTurnIndex;
      let newDirection = turnDirection;
      let needsColorChoice = false;
      let cardsToDraw = 0;
      let targetPlayerId: string | null = null;
      let nextPendingPlus4Challenge: PendingPlus4Challenge | null = null;
      const previousCard = tableDeck[tableDeck.length - 1];

      if (isPlus4Card(card.value) || card.value === 'change') {
        needsColorChoice = true;
        setChoosingColor(true);
        if (isPlus4Card(card.value)) {
          nextIndex = getNextPlayer(currentTurnIndex, newDirection);
          targetPlayerId = players[nextIndex];
          const hasPreviousColorCard = newPlayerDeck.some(
            deckCard => deckCard.color !== 'black' && deckCard.color === previousCard?.color
          );
          nextPendingPlus4Challenge = {
            active: true,
            playedBy: currentUser?.uid || '',
            targetPlayerId: targetPlayerId || '',
            previousColor: previousCard?.color || '',
            isBluff: hasPreviousColorCard,
          };
          setPendingPlus4Challenge(nextPendingPlus4Challenge);
        }
      } else if (card.value === 'skip' || card.value === 'block') {
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
        nextIndex = getNextPlayer(nextIndex, newDirection);
      } else if (card.value === 'reverse' || card.value === 'invert') {
        newDirection = -newDirection;
        setTurnDirection(newDirection);
        if (players.length === 2) {
          nextIndex = currentTurnIndex;
        } else {
          nextIndex = getNextPlayer(currentTurnIndex, newDirection);
        }
      } else if (isPlus2Card(card.value)) {
        // Next player draws 2 cards and their turn is skipped
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
        targetPlayerId = players[nextIndex];
        cardsToDraw = 2;
        // Skip the player who drew cards
        nextIndex = getNextPlayer(nextIndex, newDirection);
      } else {
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
      }

      const nextPlayerId = players[nextIndex];

      if (cardsToDraw > 0 && targetPlayerId) {
        const drawResult = drawCardsForTarget(
          targetPlayerId,
          cardsToDraw,
          newDrawDeck,
          updatedPlayerDecks,
          newTableDeck
        );
        newDrawDeck.splice(0, newDrawDeck.length, ...drawResult.updatedDrawDeck);
        Object.assign(updatedPlayerDecks, drawResult.updatedPlayerDecks);
        newTableDeck.splice(0, newTableDeck.length, ...drawResult.updatedTableDeck);
      }

      setDrawDeck(newDrawDeck);
      setPlayerDecks(updatedPlayerDecks);
      setTableDeck(newTableDeck);
      
      if (newDirection !== turnDirection) {
        setTurnDirection(newDirection);
      }

      if (!needsColorChoice) {
        setPlayerTurn(false);
        setCurrentTurnIndex(nextIndex);
      }

      syncGameState({
        drawDeck: newDrawDeck,
        playerDecks: updatedPlayerDecks,
        tableDeck: newTableDeck,
        currentTurn: needsColorChoice ? currentUser?.uid || '' : nextPlayerId,
        currentTurnIndex: needsColorChoice ? currentTurnIndex : nextIndex,
        turnDirection: newDirection,
        choosingColor: needsColorChoice,
        choosingColorPlayerId: needsColorChoice ? currentUser?.uid || '' : null,
        pendingPlus4Challenge: nextPendingPlus4Challenge,
        lastPlayedCard: card,
      });
    }, 500);
  };

  const finishGameOnline = async () => {
    if (!matchId || !currentUser?.uid || winner) return;

    try {
      const allPlayerDecks = {
        ...playerDecks,
        [currentUser?.uid || '']: playerDeck,
      };

      let minCards = Infinity;
      let winnerId: string | null = null;

      Object.keys(allPlayerDecks).forEach((playerId) => {
        const cardCount = allPlayerDecks?.[playerId]?.length || 0;
        if (cardCount < minCards) {
          minCards = cardCount;
          winnerId = playerId;
        }
      });

      if (!winnerId) return;

      if (winnerId === currentUser.uid) {
        setWinner('YOU WON');
      } else {
        if (playerInfo[winnerId]?.name) {
          setWinner(`${playerInfo?.[winnerId]?.name || 'Unknown Player'} WON`);
        } else {
          try {
            const userDoc = await firestore().collection('users').doc(winnerId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              const winnerName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Unknown Player';
              setWinner(`${winnerName} WON`);
            } else {
              setWinner('SOMEONE WON');
            }
          } catch (error) {
            setWinner('SOMEONE WON');
          }
        }
      }

      await firestore().collection('games').doc(matchId).update({
        'gameState.winner': winnerId,
        status: 'completed',
      });

      await firestore().collection('matches').doc(matchId).update({
        status: 'completed',
      });
    } catch (error) {
      console.error('Error finishing game:', error);
    }
  };

  const chooseColorOnline = (color: string) => {
    if (!choosingColor) return;

    const newTableDeck = [...tableDeck];
    if (newTableDeck.length > 0) {
      const lastCard = {...newTableDeck[newTableDeck.length - 1]};
      const wasPlus4 = isPlus4Card(lastCard.value);
      lastCard.color = color;
      newTableDeck[newTableDeck.length - 1] = lastCard;

      setTableDeck(newTableDeck);
      setChoosingColor(false);
      
      let finalNextIndex = getNextPlayer(currentTurnIndex, turnDirection);
      let finalNextPlayerId = players[finalNextIndex];
      
      const updatedPlayerDecks = {...playerDecks};
      let updatedDrawDeck = [...drawDeck];
      
      if (wasPlus4 && pendingPlus4Challenge?.active) {
        // Wait for target player's bluff decision first.
        finalNextPlayerId = pendingPlus4Challenge.targetPlayerId;
        finalNextIndex = getPlayerIndexById(finalNextPlayerId);
      }
      
      setPlayerTurn(false);
      setCurrentTurnIndex(finalNextIndex);

      syncGameState({
        tableDeck: newTableDeck,
        drawDeck: updatedDrawDeck,
        playerDecks: updatedPlayerDecks,
        choosingColor: false,
        choosingColorPlayerId: null,
        currentTurn: finalNextPlayerId,
        currentTurnIndex: finalNextIndex,
        pendingPlus4Challenge,
      });
    }
  };

  const resolvePlus4ChallengeOnline = (challenge: boolean) => {
    if (!pendingPlus4Challenge?.active || !currentUser?.uid || !matchId) return;
    if (pendingPlus4Challenge.targetPlayerId !== currentUser.uid) return;

    let updatedDrawDeck = [...drawDeck];
    const updatedPlayerDecks = {...playerDecks};
    const updatedTableDeck = [...tableDeck];

    const currentTargetId = pendingPlus4Challenge.targetPlayerId;
    const playedById = pendingPlus4Challenge.playedBy;

    let nextTurnPlayerId = currentTargetId;
    let nextTurnIndex = getPlayerIndexById(currentTargetId);

    if (!challenge) {
      const drawResult = drawCardsForTarget(
        currentTargetId,
        4,
        updatedDrawDeck,
        updatedPlayerDecks,
        updatedTableDeck
      );
      updatedDrawDeck = drawResult.updatedDrawDeck;
      Object.assign(updatedPlayerDecks, drawResult.updatedPlayerDecks);
      updatedTableDeck.splice(0, updatedTableDeck.length, ...drawResult.updatedTableDeck);

      nextTurnIndex = getNextPlayer(getPlayerIndexById(currentTargetId), turnDirection);
      nextTurnPlayerId = players[nextTurnIndex];
    } else if (pendingPlus4Challenge.isBluff) {
      const drawResult = drawCardsForTarget(
        playedById,
        4,
        updatedDrawDeck,
        updatedPlayerDecks,
        updatedTableDeck
      );
      updatedDrawDeck = drawResult.updatedDrawDeck;
      Object.assign(updatedPlayerDecks, drawResult.updatedPlayerDecks);
      updatedTableDeck.splice(0, updatedTableDeck.length, ...drawResult.updatedTableDeck);
      // Bluff was true, challenger takes normal turn.
      nextTurnIndex = getPlayerIndexById(currentTargetId);
      nextTurnPlayerId = currentTargetId;
    } else {
      const drawResult = drawCardsForTarget(
        currentTargetId,
        6,
        updatedDrawDeck,
        updatedPlayerDecks,
        updatedTableDeck
      );
      updatedDrawDeck = drawResult.updatedDrawDeck;
      Object.assign(updatedPlayerDecks, drawResult.updatedPlayerDecks);
      updatedTableDeck.splice(0, updatedTableDeck.length, ...drawResult.updatedTableDeck);
      // Failed challenge -> target is skipped.
      nextTurnIndex = getNextPlayer(getPlayerIndexById(currentTargetId), turnDirection);
      nextTurnPlayerId = players[nextTurnIndex];
    }

    setDrawDeck(updatedDrawDeck);
    setPlayerDecks(updatedPlayerDecks);
    setTableDeck(updatedTableDeck);
    setPendingPlus4Challenge(null);
    setCurrentTurnIndex(nextTurnIndex);
    setPlayerTurn(nextTurnPlayerId === currentUser.uid);

    syncGameState({
      drawDeck: updatedDrawDeck,
      playerDecks: updatedPlayerDecks,
      tableDeck: updatedTableDeck,
      currentTurn: nextTurnPlayerId,
      currentTurnIndex: nextTurnIndex,
      pendingPlus4Challenge: null,
    });
  };

  useEffect(() => {
    if (!gameInitialized || winner) return;

    const hasGameStarted = tableDeck.length > 0 && Object.keys(playerDecks).length > 0;
    if (!hasGameStarted) return;

    const playerDeckInState = playerDecks[currentUser?.uid || ''];
    
    if (!playerDeckInState) {
      return;
    }

    if (!playerHadCardsRef.current) {
      return;
    }

    if (!playerHasPlayedRef.current) {
      return;
    }

    const playerHasCardsInState = (playerDecks[currentUser?.uid || '']?.length || 0) > 0;
    const playerHasCardsLocally = playerDeck.length > 0;
    
    if (playerHasCardsInState && !playerHasCardsLocally) {
      return;
    }

    const playerDeckCountInState = playerDecks[currentUser?.uid || '']?.length || 0;
    const playerDeckCountLocally = playerDeck.length;
    
    if (playerDeckCountLocally === 0 && 
        playerDeckCountInState === 0 &&
        tableDeck.length > 0 && 
        playerHadCardsRef.current &&
        playerHasPlayedRef.current &&
        playerDeckInState !== undefined) {
      setWinner('YOU WON');
      if (matchId) {
        firestore().collection('games').doc(matchId).update({
          'gameState.winner': currentUser?.uid,
          status: 'completed',
        }).then(() => {
          firestore().collection('matches').doc(matchId).update({
            status: 'completed',
          }).catch(() => {});
        }).catch(() => {});
      }
      return;
    }
    
    Object.keys(playerDecks).forEach((playerId) => {
      if (playerId !== currentUser?.uid) {
        const playerDeckCount = playerDecks[playerId]?.length || 0;
        const playerHadCards = opponentHadCardsRef.current[playerId] || false;

        if (playerDeckCount > 0) {
          opponentHadCardsRef.current[playerId] = true;
          return;
        }
        
        if (playerDeckCount === 0 && tableDeck.length > 0 && playerHadCards) {
          if (playerInfo[playerId]?.name) {
            setWinner(`${playerInfo[playerId].name} WON`);
          } else {
            firestore().collection('users').doc(playerId).get().then((userDoc) => {
              if (userDoc.exists) {
                const userData = userDoc.data();
                const winnerName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email || 'Player';
                setWinner(`${winnerName} WON`);
              } else {
                setWinner('SOMEONE WON');
              }
            }).catch(() => {
              setWinner('SOMEONE WON');
            });
          }
          
          if (matchId) {
            firestore().collection('games').doc(matchId).update({
              'gameState.winner': playerId,
              status: 'completed',
            }).then(() => {
              firestore().collection('matches').doc(matchId).update({
                status: 'completed',
              }).catch(() => {});
            }).catch(() => {});
          }
        }
      }
    });
  }, [playerDeck, playerDecks, tableDeck, matchId, currentUser?.uid, playerInfo, gameInitialized, winner]);

  useEffect(() => {
    setCanDraw(
      actions.canDraw(tableDeck, playerDeck, playedCard, isDrawing, choosingColor) &&
      playerTurn &&
      !isDrawing &&
      !drewCard
    );
  }, [playerTurn, isDrawing, choosingColor, drewCard, playedCard, tableDeck, playerDeck]);

  const contextValue: CardsContextProps & {
    players?: string[];
    playerDecks?: {[playerId: string]: Card[]};
    playerInfo?: {[playerId: string]: {name: string; email: string}};
    currentTurn?: string;
    localPlayerId?: string;
    pendingPlus4Challenge?: PendingPlus4Challenge | null;
    resolvePlus4Challenge?: (challenge: boolean) => void;
  } = {
    drawDeck,
    setDrawDeck,
    enemyDeck,
    setEnemyDeck,
    playerDeck,
    setPlayerDeck,
    playerTurn,
    setPlayerTurn,
    playerDraw: playerDrawOnline,
    playPlayerCard: playPlayerCardOnline,
    tableDeck,
    getLastCardInTable: () => actions.getLastCardInTable(tableDeck),
    canPlay: (card: Card) => actions.canPlay(card, tableDeck, playedCard, drewCard, isDrawing),
    choosingColor,
    setChoosingColor,
    chooseColor: chooseColorOnline,
    canDraw,
    winner,
    playedCard,
    drewCard,
    players,
    playerDecks,
    playerInfo,
    currentTurn: players[currentTurnIndex] || undefined,
    localPlayerId: currentUser?.uid,
    pendingPlus4Challenge,
    resolvePlus4Challenge: resolvePlus4ChallengeOnline,
    finishGame: finishGameOnline,
  };

  return (
    <OnlineCardsContext.Provider value={contextValue}>
      {children}
    </OnlineCardsContext.Provider>
  );
};
