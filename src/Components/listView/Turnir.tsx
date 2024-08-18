import React from 'react';
import {Button, Text, TouchableOpacity, View} from 'react-native';
import {styles} from './style';
import {Turnir} from '../../types/types';
import moment from 'moment';
import {getData} from '../../storage/local';

interface ItemViewProps {
  item: Turnir;
  onPress: (item: Turnir) => void;
  onJoin: (item: Turnir) => void;
}

const TurnirComponent: React.FC<ItemViewProps> = ({item, onPress, onJoin}) => {
  const user = getData('user', true);

  const isJoinDisabled = moment(item.startDate).isBefore(moment());
  return (
    <View style={styles.item}>
      <TouchableOpacity
        style={{
          marginBottom: 4,
        }}
        onPress={() => onPress(item)}>
        <Text style={styles.title}>{item.title}</Text>
      </TouchableOpacity>
      <Button
        title="Join"
        onPress={() => onJoin(item)}
        disabled={isJoinDisabled || item?.users.includes(user?.email)}
      />
    </View>
  );
};

export default TurnirComponent;
