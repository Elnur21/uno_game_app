import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {GameRoomScreenNavigationProp} from '../../types/navigationProps';
import {User} from '../../types/types';
import * as actions from '../../Contexts/CardsContext/actions';

interface RouteParams {
  matchId?: string;
}

export function GameRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation<GameRoomScreenNavigationProp>();
  const {matchId}: RouteParams = route.params || {};
  const currentUser = auth().currentUser;

  const [players, setPlayers] = useState<string[]>([]);
  const [playerInfo, setPlayerInfo] = useState<{[playerId: string]: User}>({});
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownStartedRef = useRef<boolean>(false);
  const countdownTimeRef = useRef<number>(10);

  useEffect(() => {
    if (!matchId || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    const matchRef = firestore().collection('matches').doc(matchId);
    const gameRef = firestore().collection('games').doc(matchId);

    const matchUnsubscribe = matchRef.onSnapshot(async (matchDoc) => {
      if (!matchDoc.exists) {
        Alert.alert('Error', 'Match not found');
        navigation.goBack();
        return;
      }

      const matchData = matchDoc.data();
      const matchPlayers = matchData?.players || [];
      setPlayers(matchPlayers);

      const infoPromises = matchPlayers.map(async (playerId: string) => {
        const userDoc = await firestore().collection('users').doc(playerId).get();
        const userData = userDoc.data();
        return {
          playerId,
          user: {id: playerId, ...userData} as unknown as User,
        };
      });

      const infoResults = await Promise.all(infoPromises);
      const infoMap: {[playerId: string]: User} = {};
      infoResults.forEach(({playerId, user}) => {
        infoMap[playerId] = user;
      });
      setPlayerInfo(infoMap);
      setLoading(false);

      gameRef.get().then((gameDoc) => {
        if (gameDoc.exists) {
          const gameData = gameDoc.data();
          if (gameData?.status === 'active' && gameData?.gameState) {
            setGameStarted(true);
            navigation.replace('OnlineGameScreen', {matchId});
          }
        }
      });
    });

    const checkAndStartGame = async () => {
      if (countdownStartedRef.current || gameStarted) return;

      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) return;

      const matchData = matchDoc.data();
      const matchPlayers = matchData?.players || [];

      if (matchPlayers.length >= 2) {
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists || !gameDoc.data()?.gameState) {
          if (!countdownStartedRef.current) {
            countdownStartedRef.current = true;
            countdownTimeRef.current = 10;
            setCountdown(10);

            countdownIntervalRef.current = setInterval(() => {
              countdownTimeRef.current -= 1;
              setCountdown(countdownTimeRef.current);

              if (countdownTimeRef.current <= 0) {
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                }
                startGame();
              }
            }, 1000);
          }
        }
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          countdownStartedRef.current = false;
          setCountdown(null);
        }
      }
    };

    const checkInterval = setInterval(checkAndStartGame, 2000);
    checkAndStartGame();

    return () => {
      matchUnsubscribe();
      clearInterval(checkInterval);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      countdownStartedRef.current = false;
    };
  }, [matchId, currentUser?.uid, navigation]);

  const startGame = async () => {
    if (!matchId) return;

    try {
      const matchRef = firestore().collection('matches').doc(matchId);
      const gameRef = firestore().collection('games').doc(matchId);
      const matchDoc = await matchRef.get();
      
      if (!matchDoc.exists) return;

      const matchData = matchDoc.data();
      const matchPlayers = matchData?.players || [];

      if (matchPlayers.length < 2) {
        Alert.alert('Not Enough Players', 'Need at least 2 players to start the game.');
        return;
      }

      const gameDoc = await gameRef.get();
      if (!gameDoc.exists || !gameDoc.data()?.gameState) {
        const initialState = actions.shuffleDrawDeckForMultiplayer(matchPlayers);
        const initialTurnIndex = 0;

        await gameRef.set({
          matchId,
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
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      await matchRef.update({
        status: 'active',
      });
      
      setGameStarted(true);
      navigation.replace('OnlineGameScreen', {matchId});
    } catch (error) {
      console.error('Error starting game:', error);
      Alert.alert('Error', 'Failed to start game');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading game room...</Text>
      </View>
    );
  }

  const isHost = players[0] === currentUser?.uid;
  const canStart = players.length >= 2 && !gameStarted;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Room</Text>
      
      <View style={styles.playersContainer}>
        <Text style={styles.playersTitle}>Players ({players.length})</Text>
        {players.map((playerId, index) => {
          const player = playerInfo[playerId];
          const isCurrentUser = playerId === currentUser?.uid;
          const playerName = player
            ? `${player.firstName} ${player.lastName}`.trim() || player.email
            : 'Loading...';

          return (
            <View key={playerId} style={styles.playerItem}>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, isCurrentUser && styles.currentPlayer]}>
                  {isCurrentUser ? 'You' : playerName}
                  {index === 0 && ' 👑'}
                </Text>
                {isCurrentUser && <Text style={styles.youLabel}>(You)</Text>}
              </View>
              {player && (
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, styles.readyDot]} />
                  <Text style={styles.statusText}>Ready</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {players.length < 2 && (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>
            Waiting for more players...
          </Text>
          <Text style={styles.waitingSubtext}>
            Need at least 2 players to start
          </Text>
        </View>
      )}

      {canStart && countdown !== null && countdown > 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>Game starting in</Text>
          <Text style={styles.countdownNumber}>{countdown}</Text>
        </View>
      )}

      {canStart && countdown === null && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={startGame}
          disabled={!isHost}>
          <Text style={styles.startButtonText}>
            {isHost ? 'Start Game' : 'Waiting for host...'}
          </Text>
        </TouchableOpacity>
      )}

      {gameStarted && (
        <View style={styles.startingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.startingText}>Starting game...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  playersContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  playersTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  currentPlayer: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  youLabel: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  readyDot: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 18,
    color: '#FF9800',
    fontWeight: '500',
    marginBottom: 5,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#aaa',
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  countdownText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  startingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  startingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
});

