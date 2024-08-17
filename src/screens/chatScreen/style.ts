import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
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
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderTopWidth: 1,
      borderColor: '#CCC',
    },
    input: {
      flex: 1,
      height: 40,
      borderColor: '#CCC',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginRight: 10,
    },
  });