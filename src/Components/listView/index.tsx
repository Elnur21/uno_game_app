import React from 'react';
import {
  FlatList,
  Alert,
} from 'react-native';
import {styles} from './style';
import {User, Turnir} from '../../types/types';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../types/types';
import UserComponent from './User';
import TurnirComponent from './Turnir';
import {getData} from '../../storage/local';
import {joinTurnir} from '../../storage/firebase';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ListViewProps {
  data: (User | Turnir)[];
  type: 'user' | 'turnir';
}

const ListView: React.FC<ListViewProps> = ({data, type}) => {
  const navigation = useNavigation<NavigationProp>();
  const handlePress = (item: User | Turnir) => {
    if (type === 'turnir') {
      navigation.navigate('UsersScreen', {item: item as Turnir, type: 'turnir'});
    } else {
      navigation.navigate('ChatroomScreen', {user: item as User});
    }
  };
  function handleJoin(turnirId: string): void {
    const user = getData('user', true);
    joinTurnir(turnirId, user.email).then(_ =>
      Alert.alert('Joined successfully'),
    );
  }
  const renderItem = ({item}: {item: User | Turnir}) => {
    if (type == 'user')
      return <UserComponent item={item as User} onPress={user => handlePress(user)} />;
    else
      return (
        <TurnirComponent
          item={item as Turnir}
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
