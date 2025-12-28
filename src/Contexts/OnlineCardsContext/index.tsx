import React, {ReactNode, createContext, useEffect, useState, useRef} from 'react';
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
  
  const currentUser = auth().currentUser;
  const playerIndexRef = useRef<number>(-1);
  const playerHadCardsRef = useRef<boolean>(false);
  const playerHasPlayedRef = useRef<boolean>(false); // Track if player has actually played
  const initializationAttemptedRef = useRef<boolean>(false);

  const getNextPlayer = (currentIndex: number, direction: number) => {
    if (players.length === 0) return currentIndex;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = players.length - 1;
    if (nextIndex >= players.length) nextIndex = 0;
    return nextIndex;
  };

  useEffect(() => {
    if (!matchId || !currentUser?.uid) return;

    playerHadCardsRef.current = false;
    playerHasPlayedRef.current = false;
    initializationAttemptedRef.current = false;
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
              if (!newPlayerDecks[currentUser.uid] && state.drawDeck && state.drawDeck.length >= 7) {
                const newPlayerDeck: Card[] = [];
                const updatedDrawDeck = [...state.drawDeck];
                for (let i = 0; i < 7; i++) {
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
        setDrawDeck(state.drawDeck || []);
        setTableDeck(state.tableDeck || []);
        setPlayerDecks(state.playerDecks || {});
        
        if (state.playerDecks && state.playerDecks[currentUser.uid]) {
          const deck = state.playerDecks[currentUser.uid];
          setPlayerDeck(deck);
          if (deck.length > 0) {
            playerHadCardsRef.current = true;
          }
        }

        const currentPlayers = players.length > 0 ? players : gameData?.players || [];
        if (currentPlayers.length > 0 && players.length === 0) {
          setPlayers(currentPlayers);
        }
        
        const enemyDecks: Card[] = [];
        currentPlayers.forEach((playerId: string) => {
          if (playerId !== currentUser.uid && state.playerDecks?.[playerId]) {
            enemyDecks.push(...state.playerDecks[playerId]);
          }
        });
        setEnemyDeck(enemyDecks);

        const currentTurnId = state.currentTurn;
        if (currentTurnId) {
          const currentPlayers = players.length > 0 ? players : gameData?.players || [];
          const turnIndex = currentPlayers.findIndex((id: string) => id === currentTurnId);
          if (turnIndex >= 0) {
            setCurrentTurnIndex(turnIndex);
            setPlayerTurn(currentTurnId === currentUser.uid);
          }
        }
        
        setTurnDirection(state.turnDirection || 1);
        const choosingColorPlayerId = state.choosingColorPlayerId;
        setChoosingColor(state.choosingColor && choosingColorPlayerId === currentUser.uid);
        
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
            if (playerInfo[state.winner]?.name) {
              setWinner(`${playerInfo[state.winner].name} WON`);
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
  }, [matchId, currentUser?.uid, playerInfo]);

  const syncGameState = (updates: any) => {
    if (!matchId || !currentUser?.uid) return;

    const gameRef = firestore().collection('games').doc(matchId);
    
    gameRef.get().then((doc) => {
      if (doc.exists) {
        const currentState = doc.data()?.gameState || {};
        const newState = {
          ...currentState,
          ...updates,
        };

        if (currentState.playerDecks) {
          newState.playerDecks = {
            ...currentState.playerDecks,
            ...(updates.playerDecks || {}),
          };
        }

        gameRef.update({
          gameState: newState,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  };

  const playerDrawOnline = () => {
    if (!playerTurn || isDrawing || choosingColor) return;

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
    }, 500);
  };

  const playPlayerCardOnline = (card: Card) => {
    if (!playerTurn || isDrawing || choosingColor) return;
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

      if (card.value === '+4' || card.value === 'change') {
        needsColorChoice = true;
        setChoosingColor(true);
      } else if (card.value === 'skip') {
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
        nextIndex = getNextPlayer(nextIndex, newDirection);
      } else if (card.value === 'reverse') {
        newDirection = -newDirection;
        setTurnDirection(newDirection);
        if (players.length === 2) {
          nextIndex = currentTurnIndex;
        } else {
          nextIndex = getNextPlayer(currentTurnIndex, newDirection);
        }
      } else if (card.value === '+2') {
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
      } else {
        nextIndex = getNextPlayer(currentTurnIndex, newDirection);
      }

      const nextPlayerId = players[nextIndex];

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
      lastCard.color = color;
      newTableDeck[newTableDeck.length - 1] = lastCard;

      setTableDeck(newTableDeck);
      setChoosingColor(false);
      
      const nextIndex = getNextPlayer(currentTurnIndex, turnDirection);
      const nextPlayerId = players[nextIndex];
      
      setPlayerTurn(false);
      setCurrentTurnIndex(nextIndex);

      syncGameState({
        tableDeck: newTableDeck,
        choosingColor: false,
        choosingColorPlayerId: null,
        currentTurn: nextPlayerId,
        currentTurnIndex: nextIndex,
      });
    }
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
        const playerHadCards = playerDeckCount > 0;
        
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
    finishGame: finishGameOnline,
  };

  return (
    <OnlineCardsContext.Provider value={contextValue}>
      {children}
    </OnlineCardsContext.Provider>
  );
};
