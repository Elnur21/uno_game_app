import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import {removeData} from './local';

export const getUserByEmail = async (email: string) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user found.');
      return null;
    }

    // Fetch user document by UID (document ID) since user is already authenticated
    const userDocument = await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .get();

    if (userDocument.exists) {
      const userData = userDocument.data();
      console.log('User data:', userData);
      return userData;
    } else {
      console.log('No user found with this UID.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
};

export const logOut = () => {
  auth()
    .signOut()
    .then(() => {
      removeData('user');
      console.log('User signed out!');
    })
    .catch(error => console.error(error));
};

export const getAllData = async (collection: string) => {
  try {
    const snapshot = await firestore().collection(collection).get();
    const dataList = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    return dataList;
  } catch (err) {
    console.log(err);
  }
};

export const createData = async (collection: string, data: any) => {
  console.log(data);

  try {
    await firestore().collection(collection).add(data);
    console.log(`${collection} data added!`);
  } catch (error) {
    console.error(`Error adding ${collection}: `, error);
  }
};

export const joinTurnir = async (turnirId: string, email: string) => {
  return await firestore()
    .collection('turnirs')
    .doc(turnirId)
    .update({
      users: firestore.FieldValue.arrayUnion(email),
    });
};

export const getUserTurnirs = async (email: string) => {
  try {
    const turnirsSnapshot = await firestore()
      .collection('turnirs')
      .where('users', 'array-contains', email)
      .get();

    const userTurnirs = turnirsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by startDate (most recent first)
    return userTurnirs.sort((a: any, b: any) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching user turnirs:', error);
    return [];
  }
};

export const getChatId = (userId1: string, userId2: string) => {
  return userId1 > userId2
    ? `${userId1}-${userId2}`
    : `${userId2}-${userId1}`;
};

export const getAllChats = async (currentUserId: string) => {
  try {
    // Get all chat documents where the current user is a participant
    const chatsSnapshot = await firestore()
      .collection('chats')
      .get();

    const userChats: any[] = [];

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      
      // Check if this chat involves the current user
      const [uid1, uid2] = chatId.split('-');
      if (uid1 === currentUserId || uid2 === currentUserId) {
        const otherUserId = uid1 === currentUserId ? uid2 : uid1;
        
        // Get the other user's information
        const otherUserDoc = await firestore()
          .collection('users')
          .doc(otherUserId)
          .get();

        if (otherUserDoc.exists) {
          const otherUserData = otherUserDoc.data();
          const otherUser = {
            id: otherUserId,
            ...otherUserData,
          };

          // Get the last message
          const messagesSnapshot = await firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          let lastMessage = null;
          if (!messagesSnapshot.empty) {
            const lastMsgDoc = messagesSnapshot.docs[0];
            const lastMsgData = lastMsgDoc.data();
            lastMessage = {
              text: lastMsgData.text,
              createdAt: lastMsgData.createdAt,
            };
          }

          userChats.push({
            id: chatId,
            otherUser,
            lastMessage,
          });
        }
      }
    }

    // Sort by last message time (most recent first)
    return userChats.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      
      const timeA = a.lastMessage.createdAt?.toDate?.() || a.lastMessage.createdAt;
      const timeB = b.lastMessage.createdAt?.toDate?.() || b.lastMessage.createdAt;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
};

export const searchUsers = async (query: string, currentUserId: string) => {
  try {
    const allUsers = await getAllData('users');
    
    if (!allUsers) return [];

    // Filter out current user and search by name or email
    const queryLower = query.toLowerCase();
    const filtered = allUsers.filter((user: any) => {
      if (user.id === currentUserId) return false;
      
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      
      return (
        fullName.includes(queryLower) ||
        email.includes(queryLower)
      );
    });

    return filtered.slice(0, 20); // Limit to 20 results
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

export const findOrCreateChat = async (currentUserId: string, otherUserIdentifier: string) => {
  try {
    let otherUserId = otherUserIdentifier;

    // If identifier is email, find the user's UID
    if (!otherUserId || otherUserId.includes('@')) {
      const usersSnapshot = await firestore()
        .collection('users')
        .where('email', '==', otherUserIdentifier)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new Error('User not found');
      }

      otherUserId = usersSnapshot.docs[0].id;
    }

    // Generate chat ID
    const chatId = getChatId(currentUserId, otherUserId);

    // Check if chat exists
    const chatDoc = await firestore()
      .collection('chats')
      .doc(chatId)
      .get();

    if (!chatDoc.exists) {
      // Create chat document
      await firestore()
        .collection('chats')
        .doc(chatId)
        .set({
          participants: [currentUserId, otherUserId],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    }

    return chatId;
  } catch (error) {
    console.error('Error finding or creating chat:', error);
    throw error;
  }
};

export const createMatch = async (player1Id: string, player2Identifier: string, chatId?: string) => {
  try {
    let player2Id = player2Identifier;

    // If identifier is email, find the user's UID
    if (!player2Id || player2Id.includes('@')) {
      const usersSnapshot = await firestore()
        .collection('users')
        .where('email', '==', player2Identifier)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new Error('User not found');
      }

      player2Id = usersSnapshot.docs[0].id;
    }

    // Check if match already exists between these two players
    const existingMatch1 = await firestore()
      .collection('matches')
      .where('players', 'array-contains', player1Id)
      .where('status', 'in', ['pending', 'active'])
      .get();

    // Check if there's an existing match with both players
    for (const doc of existingMatch1.docs) {
      const matchData = doc.data();
      if (matchData.players && matchData.players.includes(player2Id)) {
        throw new Error('Match already exists');
      }
    }

    // Create match document with players array
    const matchRef = await firestore().collection('matches').add({
      players: [player1Id, player2Id],
      hostId: player1Id, // Host can add more players
      status: 'pending',
      createdAt: firestore.FieldValue.serverTimestamp(),
      currentTurn: player1Id, // Host starts
    });

    // Send game invitation message to chat if chatId provided
    if (chatId) {
      const player1Doc = await firestore().collection('users').doc(player1Id).get();
      const player1Data = player1Doc.data();
      const player1Name = `${player1Data?.firstName || ''} ${player1Data?.lastName || ''}`.trim();
      
      await firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          text: `🎮 ${player1Name} invited you to play UNO!`,
          type: 'game_invitation',
          matchId: matchRef.id,
          userId: player1Id,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    }

    return matchRef.id;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const addPlayerToMatch = async (matchId: string, playerIdentifier: string, chatId?: string) => {
  try {
    let playerId = playerIdentifier;

    // If identifier is email, find the user's UID
    if (!playerId || playerId.includes('@')) {
      const usersSnapshot = await firestore()
        .collection('users')
        .where('email', '==', playerIdentifier)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new Error('User not found');
      }

      playerId = usersSnapshot.docs[0].id;
    }

    const matchRef = firestore().collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new Error('Match not found');
    }

    const matchData = matchDoc.data();
    const players = matchData?.players || [];

    // Check if player is already in the match
    if (players.includes(playerId)) {
      throw new Error('Player already in match');
    }

    // Add player to match
    await matchRef.update({
      players: firestore.FieldValue.arrayUnion(playerId),
    });

    // Send invitation message if chatId provided
    if (chatId) {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const userName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
        
        await firestore()
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .add({
            text: `🎮 ${userName} added you to a UNO game!`,
            type: 'game_invitation',
            matchId: matchId,
            userId: currentUser.uid,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      }
    }

    return matchId;
  } catch (error) {
    console.error('Error adding player to match:', error);
    throw error;
  }
};

export const acceptMatch = async (matchId: string, userId: string) => {
  try {
    const matchRef = firestore().collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new Error('Match not found');
    }

    const matchData = matchDoc.data();
    const players = matchData?.players || [];

    // Check if user is in the players list
    if (!players.includes(userId)) {
      throw new Error('User not part of this match');
    }

    // If match is pending and user is not the host, accept it
    // If all players have accepted, set status to active
    await matchRef.update({
      status: 'active',
      acceptedPlayers: firestore.FieldValue.arrayUnion(userId),
    });
  } catch (error) {
    console.error('Error accepting match:', error);
    throw error;
  }
};

export const createGame = async (matchId: string, player1Id: string, player2Id: string) => {
  try {
    await firestore()
      .collection('games')
      .doc(matchId)
      .set({
        player1Id,
        player2Id,
        status: 'active',
        matchId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    return matchId;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

export const getMatch = async (matchId: string) => {
  try {
    const matchDoc = await firestore()
      .collection('matches')
      .doc(matchId)
      .get();

    if (matchDoc.exists) {
      return {id: matchDoc.id, ...matchDoc.data()};
    }
    return null;
  } catch (error) {
    console.error('Error getting match:', error);
    return null;
  }
};
