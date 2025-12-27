import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { styles } from './style';
import { Message } from '../../types/types';
import { acceptMatch, createMatch, getMatch } from '../../storage/firebase';
import { useNavigation } from '@react-navigation/native';

const ChatroomScreen = ({ route }: any) => {
  const user = route.params?.user || route.params?.item;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [otherUserUid, setOtherUserUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const navigation = useNavigation();

  const currentUser: any = auth().currentUser;

  useEffect(() => {
    if (user) {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Chat';
      navigation.setOptions({
        title: userName,
      });
    }
  }, [user, navigation]);

  useEffect(() => {
    if (!user || !currentUser) {
      setLoading(false);
      return;
    }

    const fetchOtherUserUid = async () => {
      try {
        if (user.id) {
          setOtherUserUid(user.id);
          setLoading(false);
          return;
        }

        if (user.email) {
          const usersSnapshot = await firestore()
            .collection('users')
            .where('email', '==', user.email)
            .limit(1)
            .get();

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            setOtherUserUid(userDoc.id);
          } else {
            console.error('User not found in Firestore');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user UID:', error);
        setLoading(false);
      }
    };

    fetchOtherUserUid();
  }, [user, currentUser]);

  useEffect(() => {
    if (!currentUser?.uid || !otherUserUid) {
      return;
    }

    const providedChatId = route.params?.chatId;
    const getChatId = (userId1: string, userId2: string) => {
      return userId1 > userId2
        ? `${userId1}-${userId2}`
        : `${userId2}-${userId1}`;
    };

    const chatId = providedChatId || getChatId(currentUser.uid, otherUserUid);

    const unsubscribe = firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const loadedMessages: Message[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              text: data.text,
              createdAt: data.createdAt,
              userId: data.userId,
              type: data.type || 'text',
              matchId: data.matchId,
            });

            if (data.type === 'game_invitation' && data.matchId) {
              if (data.userId !== currentUser?.uid) {
                setPendingMatchId(data.matchId);
              }
            }
          });
          setMessages(loadedMessages);
        },
        error => {
          console.error('Error fetching messages:', error);
        }
      );

    return () => unsubscribe();
  }, [currentUser?.uid, otherUserUid, route.params?.chatId]);

  const getChatId = (userId1: string, userId2: string) => {
    return userId1 > userId2
      ? `${userId1}-${userId2}`
      : `${userId2}-${userId1}`;
  };

  const sendMessage = () => {
    if (!input.trim() || !currentUser?.uid || !otherUserUid) return;

    const providedChatId = route.params?.chatId;
    const chatId = providedChatId || getChatId(currentUser.uid, otherUserUid);

    firestore().collection('chats').doc(chatId).collection('messages').add({
      text: input,
      createdAt: firestore.FieldValue.serverTimestamp(),
      userId: currentUser.uid,
    });
    setInput('');
  };

  const handleAcceptGame = async (matchId: string) => {
    if (!currentUser?.uid || !otherUserUid) return;

    try {
      const match = await getMatch(matchId);
      if (!match) {
        Alert.alert('Error', 'Match not found');
        return;
      }

      const matchData: any = match;

      const players = matchData.players || [];
      if (matchData.status === 'pending') {
        if (!players.includes(currentUser.uid)) {
          Alert.alert('Error', 'You are not part of this game invitation.');
          return;
        }

        await acceptMatch(matchId, currentUser.uid);

        await firestore().collection('matches').doc(matchId).update({
          status: 'active',
        });

        const chatId = route.params?.chatId || getChatId(currentUser.uid, otherUserUid);
        await firestore()
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .add({
            text: '✅ Game accepted! Starting game...',
            type: 'text',
            userId: currentUser.uid,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        // @ts-ignore
        navigation.navigate('GameRoomScreen', {
          matchId: matchId,
        });
      } else if (matchData.status === 'active') {
        const gameDoc = await firestore().collection('games').doc(matchId).get();
        if (gameDoc.exists && gameDoc.data()?.gameState) {
          // @ts-ignore
          navigation.navigate('OnlineGameScreen', {
            matchId: matchId,
            opponent: user,
          });
        } else {
          // @ts-ignore
          navigation.navigate('GameRoomScreen', {
            matchId: matchId,
          });
        }
      } else {
        Alert.alert('Error', 'This game is no longer available');
      }
    } catch (error) {
      console.error('Error accepting game:', error);
      Alert.alert('Error', 'Failed to start game');
    }
  };

  const handleInviteToPlay = async () => {
    if (!currentUser?.uid || !otherUserUid) return;

    try {
      const chatId = route.params?.chatId || getChatId(currentUser.uid, otherUserUid);
      const matchId = await createMatch(currentUser.uid, otherUserUid, chatId);
      Alert.alert('Invitation Sent', 'Game invitation sent!');
    } catch (error: any) {
      if (error.message === 'Match already exists') {
        Alert.alert('Match Exists', 'You already have an active or pending match with this player.');
      } else {
        Alert.alert('Error', 'Failed to send invitation. Please try again.');
      }
    }
  };

  const GameInvitationMessage = React.memo(({ item }: { item: Message }) => {
    const [matchStatus, setMatchStatus] = useState<string>('pending');
    const isMyInvitation = item.userId === currentUser?.uid;

    useEffect(() => {
      if (!item.matchId) return;

      const unsubscribe = firestore()
        .collection('matches')
        .doc(item.matchId)
        .onSnapshot((doc) => {
          if (doc.exists) {
            setMatchStatus(doc.data()?.status || 'pending');
          }
        });
      return () => unsubscribe();
    }, [item.matchId]);

    return (
      <View
        style={[
          styles.messageContainer,
          styles.gameInvitationContainer,
          isMyInvitation ? styles.myMessage : styles.theirMessage,
        ]}>
        <Text style={styles.messageText}>{item.text}</Text>
        {!isMyInvitation && matchStatus === 'pending' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptGame(item.matchId!)}>
            <Text style={styles.acceptButtonText}>Accept & Play</Text>
          </TouchableOpacity>
        )}
        {!isMyInvitation && matchStatus === 'active' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('OnlineGameScreen', {
                matchId: item.matchId,
                opponent: user,
              });
            }}>
            <Text style={styles.acceptButtonText}>Join Game</Text>
          </TouchableOpacity>
        )}
        {isMyInvitation && matchStatus === 'pending' && (
          <Text style={styles.waitingText}>Waiting for response...</Text>
        )}
        {isMyInvitation && matchStatus === 'active' && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('OnlineGameScreen', {
                matchId: item.matchId,
                opponent: user,
              });
            }}>
            <Text style={styles.acceptButtonText}>Join Game</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  });

  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === 'game_invitation' && item.matchId) {
      return <GameInvitationMessage item={item} />;
    }

    return (
      <View
        style={[
          styles.messageContainer,
          item.userId === currentUser?.uid
            ? styles.myMessage
            : styles.theirMessage,
        ]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  if (loading || !user || !currentUser) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!otherUserUid) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
          Unable to load chat. User information is missing.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted
        style={styles.messagesList}
      />
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.gameButton}
          onPress={handleInviteToPlay}>
          <Text style={styles.gameButtonText}>🎮</Text>
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatroomScreen;
