import React from 'react';
import {
  View,
  Text,
  FlatList,
  Touchable,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {styles} from './style';
import {Turnir, User} from '../../types/types';
import {useNavigation} from '@react-navigation/native';
import UserComponent from './User';
import TurnirComponent from './Turnir';
import {getData} from '../../storage/local';
import {joinTurnir} from '../../storage/firebase';

interface ListViewProps {
  data: User[];
  type: 'user' | 'turnir';
}

const ListView: React.FC<ListViewProps> = ({data, type}) => {
  const navigation = useNavigation();
  const handlePress = (item: any) => {
    // @ts-ignore
    navigation.navigate('ChatroomScreen', {item});
  };
  function handleJoin(turnirId: string): void {
    const user = getData('user');
    joinTurnir(turnirId, user.email).then(_ =>
      Alert.alert('Joined successfully'),
    );
  }
  const renderItem = ({item}: {item: any}) => {
    if (type == 'user')
      return <UserComponent item={item} onPress={user => handlePress(user)} />;
    else
      return (
        <TurnirComponent
          item={item}
          onPress={turnir => handlePress(turnir)}
          onJoin={turnir => handleJoin(turnir.id)}
        />
      );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
    />
  );
};

export default ListView;
