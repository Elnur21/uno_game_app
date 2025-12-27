import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {ChatsScreenNavigationProp} from '../../types/navigationProps';
import {searchUsers, findOrCreateChat, createMatch} from '../../storage/firebase';
import {User} from '../../types/types';
import {Alert} from 'react-native';
import moment from 'moment';

interface Chat {
  id: string;
  otherUser: User;
  lastMessage?: {
    text: string;
    createdAt: any;
  };
  unreadCount?: number;
}

interface ChatsScreenProps {
  navigation: ChatsScreenNavigationProp;
}

export function ChatsScreen({navigation}: ChatsScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const chatsMap = new Map<string, Chat>();
    const messageUnsubscribes = new Map<string, () => void>();

    const chatsUnsubscribe = firestore()
      .collection('chats')
      .onSnapshot(
        async (chatsSnapshot) => {
          const processedChatIds = new Set<string>();

          for (const chatDoc of chatsSnapshot.docs) {
            const chatId = chatDoc.id;
            const [uid1, uid2] = chatId.split('-');

            if (uid1 === currentUser.uid || uid2 === currentUser.uid) {
              processedChatIds.add(chatId);
              const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;

              if (!chatsMap.has(chatId)) {
                try {
                  const otherUserDoc = await firestore()
                    .collection('users')
                    .doc(otherUserId)
                    .get();

                  if (otherUserDoc.exists) {
                    const otherUserData = otherUserDoc.data();
                    const otherUser = {
                      id: otherUserId,
                      ...otherUserData,
                    } as unknown as User;

                    chatsMap.set(chatId, {
                      id: chatId,
                      otherUser,
                    });

                    const messagesUnsubscribe = firestore()
                      .collection('chats')
                      .doc(chatId)
                      .collection('messages')
                      .orderBy('createdAt', 'desc')
                      .limit(1)
                      .onSnapshot((messagesSnapshot) => {
                        let lastMessage = null;
                        if (!messagesSnapshot.empty) {
                          const lastMsgDoc = messagesSnapshot.docs[0];
                          const lastMsgData = lastMsgDoc.data();
                          lastMessage = {
                            text: lastMsgData.text,
                            createdAt: lastMsgData.createdAt,
                          };
                        }

                        const existingChat = chatsMap.get(chatId);
                        if (existingChat) {
                          chatsMap.set(chatId, {
                            ...existingChat,
                            lastMessage: lastMessage as { text: string; createdAt: any } | undefined,
                          });

                          const sortedChats = Array.from(chatsMap.values()).sort((a, b) => {
                            if (!a.lastMessage && !b.lastMessage) return 0;
                            if (!a.lastMessage) return 1;
                            if (!b.lastMessage) return -1;

                            const timeA = a.lastMessage.createdAt?.toDate?.() || a.lastMessage.createdAt;
                            const timeB = b.lastMessage.createdAt?.toDate?.() || b.lastMessage.createdAt;
                            return new Date(timeB).getTime() - new Date(timeA).getTime();
                          });

                          setChats(sortedChats);
                          setLoading(false);
                        }
                      });

                    messageUnsubscribes.set(chatId, messagesUnsubscribe);
                  }
                } catch (error) {
                  console.error('Error loading chat:', error);
                }
              }
            }
          }

          for (const [chatId] of chatsMap) {
            if (!processedChatIds.has(chatId)) {
              chatsMap.delete(chatId);
              const unsubscribe = messageUnsubscribes.get(chatId);
              if (unsubscribe) {
                unsubscribe();
                messageUnsubscribes.delete(chatId);
              }
            }
          }

          if (chatsMap.size > 0) {
            const sortedChats = Array.from(chatsMap.values()).sort((a, b) => {
              if (!a.lastMessage && !b.lastMessage) return 0;
              if (!a.lastMessage) return 1;
              if (!b.lastMessage) return -1;

              const timeA = a.lastMessage.createdAt?.toDate?.() || a.lastMessage.createdAt;
              const timeB = b.lastMessage.createdAt?.toDate?.() || b.lastMessage.createdAt;
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });
            setChats(sortedChats);
          } else {
            setChats([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to chats:', error);
          setLoading(false);
        }
      );

    return () => {
      chatsUnsubscribe();
      messageUnsubscribes.forEach((unsubscribe) => unsubscribe());
      messageUnsubscribes.clear();
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

  const handleUserSelect = async (user: User) => {
    if (!currentUser?.uid) return;

    try {
      // Find or create chat
      const chatId = await findOrCreateChat(currentUser.uid, user.id || user.email);
      
      // Navigate to chatroom
      navigation.navigate('ChatroomScreen', {
        user: user,
        chatId: chatId,
      });
      
      // Reset search
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
      
      // Chats will update automatically via real-time listener
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate('ChatroomScreen', {
      user: chat.otherUser,
      chatId: chat.id,
    });
  };

  const handleInviteToPlay = async (chat: Chat) => {
    if (!currentUser?.uid) return;

    try {
      const matchId = await createMatch(
        currentUser.uid,
        chat.otherUser.id || chat.otherUser.email,
        chat.id // Pass chatId to send invitation message
      );
      Alert.alert('Invitation Sent', `You've invited ${chat.otherUser.firstName} ${chat.otherUser.lastName} to play!`);
    } catch (error: any) {
      if (error.message === 'Match already exists') {
        Alert.alert('Match Exists', 'You already have an active or pending match with this player.');
      } else {
        Alert.alert('Error', 'Failed to send invitation. Please try again.');
      }
    }
  };

  const renderChatItem = ({item}: {item: Chat}) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.otherUser.firstName} {item.otherUser.lastName}
          </Text>
          {item.lastMessage?.createdAt && (
            <Text style={styles.chatTime}>
              {moment(item.lastMessage.createdAt.toDate?.() || item.lastMessage.createdAt).fromNow()}
            </Text>
          )}
        </View>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage.text}
          </Text>
        )}
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleInviteToPlay(item);
          }}>
          <Text style={styles.inviteButtonText}>🎮 Invite to Play</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({item}: {item: User}) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleUserSelect(item)}>
      <Text style={styles.searchResultText}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.searchResultEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setShowSearch(true)}
        />
        {showSearch && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
              setSearchResults([]);
            }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSearch && searchQuery.length >= 2 ? (
        <View style={styles.searchResultsContainer}>
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={item => item.id || item.email}
            />
          ) : (
            <Text style={styles.noResultsText}>No users found</Text>
          )}
        </View>
      ) : (
        <View style={styles.chatsContainer}>
          {chats.length > 0 ? (
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={item => item.id}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>
                Search for users to start a conversation
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchResultText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  searchResultEmail: {
    color: '#aaa',
    fontSize: 14,
  },
  noResultsText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  chatsContainer: {
    flex: 1,
  },
  chatItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#111',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  chatTime: {
    color: '#aaa',
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    color: '#aaa',
    fontSize: 14,
  },
  inviteButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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

