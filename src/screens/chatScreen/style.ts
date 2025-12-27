import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: '#000',
    },
    messagesList: {
      paddingHorizontal: 10,
    },
    messageContainer: {
      marginVertical: 5,
      padding: 10,
      borderRadius: 10,
      maxWidth: '80%',
    },
    myMessage: {
      backgroundColor: '#DCF8C6',
      alignSelf: 'flex-end',
    },
    theirMessage: {
      backgroundColor: '#ECECEC',
      alignSelf: 'flex-start',
    },
    messageText: {
      fontSize: 16,
      color: '#000',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderTopWidth: 1,
      borderColor: '#333',
      backgroundColor: '#000',
    },
    input: {
      flex: 1,
      height: 40,
      borderColor: '#666',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginRight: 10,
      backgroundColor: '#111',
      color: '#fff',
      fontSize: 16,
    },
    gameButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#4CAF50',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    gameButtonText: {
      fontSize: 20,
    },
    gameInvitationContainer: {
      minWidth: 200,
      alignItems: 'center',
    },
    acceptButton: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#4CAF50',
      borderRadius: 8,
    },
    acceptButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
    waitingText: {
      marginTop: 8,
      fontSize: 12,
      color: '#666',
      fontStyle: 'italic',
    },
    sendButton: {
      backgroundColor: '#4CAF50',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });