import {View, TouchableOpacity, Text, Image} from 'react-native';
import {styles} from './styles';
import {MainMenuNavigationProp} from '../../types/navigationProps';

import logo from '../../../assets/uno-logo2.png';

interface MainMenuProps {
  navigation: MainMenuNavigationProp;
}

export function MainMenu({navigation}: MainMenuProps) {
  function playWithFriend() {
    navigation.navigate('FindPlayersScreen');
  }
  function openTurnirs() {
    navigation.navigate('TurnirsScreen');
  }
  function startOfflineGame() {
    navigation.navigate('OfflineGameScreen');
  }
  function openProfile() {
    navigation.navigate('ProfileScreen');
  }
  function openChats() {
    navigation.navigate('ChatsScreen');
  }

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.image} />
      <TouchableOpacity style={styles.button} onPress={playWithFriend}>
        <Text style={styles.text}>PLAY WITH FRIEND</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={openTurnirs}>
        <Text style={styles.text}>TURNIRS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={startOfflineGame}>
        <Text style={styles.text}>START OFFLINE GAME</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={openChats}>
        <Text style={styles.text}>CHATS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={openProfile}>
        <Text style={styles.text}>PROFILE</Text>
      </TouchableOpacity>
    </View>
  );
}
