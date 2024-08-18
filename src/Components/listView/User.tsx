import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {styles} from './style';
import {User} from '../../types/types';

interface ItemViewProps {
  item: User;
  onPress: (item: User) => void;
}

const UserComponent: React.FC<ItemViewProps> = ({item, onPress}) => {
  return (
    <TouchableOpacity onPress={() => onPress(item)}>
      <View style={styles.item}>
        <Text style={styles.title}>{item.firstName + ' ' + item.lastName}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default UserComponent;
