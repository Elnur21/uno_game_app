import {View, TouchableOpacity, Text, Image} from 'react-native';
import {styles} from './styles';
import {MainMenuNavigationProp} from '../../types/navigationProps';

import logo from '../../../assets/uno-logo2.png';

interface MainMenuProps {
  navigation: MainMenuNavigationProp;
}

export function MainMenu({navigation}: MainMenuProps) {
  function startOnlineGame() {
    navigation.navigate('TurnirsScreen');
  }
  function startOfflineGame() {
    navigation.navigate('OfflineGameScreen');
  }

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.image} />
      <TouchableOpacity style={styles.button} onPress={startOnlineGame}>
        <Text style={styles.text}>START ONLINE GAME</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={startOfflineGame}>
        <Text style={styles.text}>START OFFLINE GAME</Text>
      </TouchableOpacity>
    </View>
  );
}
