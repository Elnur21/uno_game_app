import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, FlatList, Text } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { styles } from './style';
import { Message } from '../../types/types';

const ChatroomScreen = ({ route }) => {
  const { user } = route.params; // The other user in the chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const currentUser = auth().currentUser;

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(getChatId(currentUser?.uid, user.id))
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const loadedMessages: Message[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            text: data.text,
            createdAt: data.createdAt,
            userId: data.userId,
          });
        });
        setMessages(loadedMessages);
      });

    return () => unsubscribe();
  }, []);

  const getChatId = (userId1: string, userId2: string) => {
    return userId1 > userId2 ? `${userId1}-${userId2}` : `${userId2}-${userId1}`;
  };

  const sendMessage = () => {
    if (input.trim()) {
      const chatId = getChatId(currentUser?.uid, user.id);
      firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .add({
          text: input,
          createdAt: firestore.FieldValue.serverTimestamp(),
          userId: currentUser?.uid,
        });
      setInput('');
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.userId === currentUser?.uid ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

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
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.input}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
};



export default ChatroomScreen;
