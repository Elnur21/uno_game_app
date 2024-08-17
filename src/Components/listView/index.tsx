import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { styles } from './style';
import { User } from '../../types/types';

interface ListViewProps {
    data: User[];
  }

const ListView: React.FC<ListViewProps> = ({ data }) => {
  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.firstName+" "+item.lastName}</Text>
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
    />
  );
};



export default ListView;
