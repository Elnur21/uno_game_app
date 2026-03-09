import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {FindPlayersScreenNavigationProp} from '../../types/navigationProps';
import {searchUsers, createMatch, acceptMatch, addPlayerToMatch, findOrCreateChat} from '../../storage/firebase';
import {User} from '../../types/types';
import {getData} from '../../storage/local';

interface Match {
  id: string;
  players: string[];
  hostId: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: any;
  currentTurn?: string;
  playerInfo?: {[playerId: string]: User};
}

interface FindPlayersScreenProps {
  navigation: FindPlayersScreenNavigationProp;
}

export function FindPlayersScreen({navigation}: FindPlayersScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'find' | 'matches'>('find');

  const currentUser = auth().currentUser;
  const localUser = getData('user', true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe2: (() => void) | null = null;

    // Real-time listener for users
    const unsubscribe1 = firestore()
      .collection('users')
      .onSnapshot(
        (snapshot) => {
          const usersData = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((user: any) => user.id !== currentUser?.uid) as unknown as User[];
          setUsers(usersData);
        },
        (error) => {
          console.error('Error listening to users:', error);
        }
      );

    // Real-time listener for matches where user is a player
    const unsubscribeMatches = firestore()
      .collection('matches')
      .where('players', 'array-contains', currentUser.uid)
      .onSnapshot(
        async (snapshot) => {
          const matches = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const players = data.players || [];
              
              // Fetch info for all players
              const playerInfoPromises = players.map(async (playerId: string) => {
                const playerDoc = await firestore()
                  .collection('users')
                  .doc(playerId)
                  .get();
                return {
                  playerId,
                  user: {id: playerId, ...playerDoc.data()} as unknown as User,
                };
              });
              
              const playerInfoResults = await Promise.all(playerInfoPromises);
              const playerInfoMap: {[playerId: string]: User} = {};
              playerInfoResults.forEach(({playerId, user}) => {
                playerInfoMap[playerId] = user;
              });
              
              return {
                id: doc.id,
                players: players,
                hostId: data.hostId || players[0],
                status: data.status,
                createdAt: data.createdAt,
                currentTurn: data.currentTurn,
                playerInfo: playerInfoMap,
              };
            })
          );

          const sortedMatches = matches.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || a.createdAt;
            const timeB = b.createdAt?.toDate?.() || b.createdAt;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
          });
          
          setMyMatches(sortedMatches);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to matches:', error);
          setLoading(false);
        }
      );

    return () => {
      unsubscribe1();
      unsubscribeMatches();
    };
  }, [currentUser?.uid]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query, currentUser?.uid || '');
      setSearchResults(results as unknown as User[]);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInviteToPlay = async (user: User, existingMatchId?: string) => {
    if (!currentUser?.uid) return;

    try {
      if (existingMatchId) {
        // Add player to existing match
        // Find or create chat first
        const chatId = await findOrCreateChat(currentUser.uid, user.id || user.email);
        await addPlayerToMatch(existingMatchId, user.id || user.email, chatId);
        Alert.alert('Player Added', `${user.firstName} ${user.lastName} has been added to the game!`);
      } else {
        // Create new match
        // Find or create chat first so invitation appears in chat
        const chatId = await findOrCreateChat(currentUser.uid, user.id || user.email);
        const matchId = await createMatch(currentUser.uid, user.id || user.email, chatId);
        Alert.alert('Invitation Sent', `You've invited ${user.firstName} ${user.lastName} to play!`);
      }
    } catch (error: any) {
      if (error.message === 'Match already exists' || error.message === 'Player already in match') {
        Alert.alert('Already in Game', 'This player is already in the game.');
      } else if (error.message === 'Match is full') {
        Alert.alert('Game is Full', 'This game already has the maximum of 10 players.');
      } else {
        Alert.alert('Error', 'Failed to send invitation. Please try again.');
      }
    }
  };

  const handleJoinMatch = async (match: Match) => {
    if (!currentUser?.uid) return;
    
    const isHost = match.hostId === currentUser.uid;
    const isInMatch = match.players.includes(currentUser.uid);
    
    if (match.status === 'pending') {
      if (!isInMatch) {
        Alert.alert('Not Invited', 'You are not part of this match.');
        return;
      }
      
      // Accept the match
      try {
        await acceptMatch(match.id, currentUser.uid);
        
        // Check if all players have accepted (for now, just activate if host accepts)
        if (isHost || match.players.length >= 2) {
          await firestore().collection('matches').doc(match.id).update({
            status: 'active',
          });
        }
        
        navigation.navigate('GameRoomScreen', {
          matchId: match.id,
        });
      } catch (error) {
        console.error('Error accepting match:', error);
        Alert.alert('Error', 'Failed to start game');
      }
    } else if (match.status === 'active') {
      // Check if game already started
      const gameDoc = await firestore().collection('games').doc(match.id).get();
      if (gameDoc.exists && gameDoc.data()?.gameState) {
        // Game already started, go directly to game
        navigation.navigate('OnlineGameScreen', {
          matchId: match.id,
        });
      } else {
        // Game not started yet, go to room
        navigation.navigate('GameRoomScreen', {
          matchId: match.id,
        });
      }
    }
  };

  const renderUserItem = ({item}: {item: User}, matchId?: string) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleInviteToPlay(item, matchId)}>
      <View style={styles.userContent}>
        <Text style={styles.userName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => handleInviteToPlay(item, matchId)}>
        <Text style={styles.inviteButtonText}>
          {matchId ? 'Add to Game' : 'Invite to Play'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderMatchItem = ({item}: {item: Match}) => {
    if (!currentUser?.uid) return null;
    
    const otherPlayers = item.players.filter((id: string) => id !== currentUser.uid);
    const playerNames = otherPlayers
      .map((id: string) => {
        const player = item.playerInfo?.[id];
        return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
      })
      .join(', ');
    
    const isHost = item.hostId === currentUser.uid;
    const statusColor =
      item.status === 'active' ? '#4CAF50' : item.status === 'pending' ? '#FF9800' : '#9E9E9E';

    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => handleJoinMatch(item)}>
        <View style={styles.matchContent}>
          <View style={styles.matchPlayersContainer}>
            <Text style={styles.matchOpponent}>
              Players: {item.players.length} ({playerNames || 'You'})
            </Text>
            {isHost && (
              <Text style={styles.hostBadge}>HOST</Text>
            )}
          </View>
          <View style={styles.matchStatusContainer}>
            <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
            <Text style={styles.matchStatus}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.status === 'active' && (
          <Text style={styles.joinText}>Tap to continue game</Text>
        )}
        {item.status === 'pending' && (
          <Text style={styles.joinText}>
            {isHost ? 'Waiting for players to accept...' : 'Tap to accept and start game'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}>
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>
            Find Players
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            My Matches ({myMatches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'find' ? (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {searchQuery.length >= 2 ? (
            <View style={styles.resultsContainer}>
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={({item}) => renderUserItem({item})}
                  keyExtractor={item => item.id || item.email}
                />
              ) : (
                <Text style={styles.noResultsText}>No users found</Text>
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {users.length > 0 ? (
                <FlatList
                  data={users}
                  renderItem={({item}) => renderUserItem({item})}
                  keyExtractor={item => item.id || item.email}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No players available</Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.listContainer}>
          {myMatches.length > 0 ? (
            <FlatList
              data={myMatches}
              renderItem={renderMatchItem}
              keyExtractor={item => item.id}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matches yet</Text>
              <Text style={styles.emptySubtext}>
                Invite players to start a game
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  resultsContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userContent: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    color: '#aaa',
    fontSize: 14,
  },
  inviteButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  matchItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
  },
  matchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchPlayersContainer: {
    flex: 1,
    marginRight: 8,
  },
  matchOpponent: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  hostBadge: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  matchStatus: {
    color: '#aaa',
    fontSize: 12,
  },
  joinText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  noResultsText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
});

