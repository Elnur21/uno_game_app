import React from 'react';
import {View, Text, FlatList, Touchable, TouchableOpacity} from 'react-native';
import {styles} from './style';
import {User} from '../../types/types';
import {useNavigation} from '@react-navigation/native';

interface ListViewProps {
  data: User[];
}

const ListView: React.FC<ListViewProps> = ({data}) => {
  const navigation = useNavigation();
  const handlePress = (user: User) => {
    console.log(user);
    
    navigation.navigate('ChatroomScreen', {user});
  };
  const renderItem = ({item}: {item: User}) => (
    <TouchableOpacity onPress={()=>handlePress(item)}>
      <View style={styles.item}>
        <Text style={styles.title}>{item.firstName + ' ' + item.lastName}</Text>
      </View>
    </TouchableOpacity>
  );

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
