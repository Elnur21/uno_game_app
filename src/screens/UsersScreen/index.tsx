import {UsersScreenNavigationProp} from '../../types/navigationProps';
import {ActivityIndicator, Text, View} from 'react-native';
import ListView from '../../Components/listView';
import {useEffect, useState} from 'react';
import {getAllData} from '../../storage/firebase';
import {User} from '../../types/types';

interface UsersScreenProps {
  navigation: UsersScreenNavigationProp;
}

export function UsersScreen({navigation}: UsersScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getAllData('users').then((data: any) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }
  return (
    <View style={{flex: 1}}>
      <Text style={{fontSize: 24, padding: 16}}>My List</Text>
      <ListView data={users} />
    </View>
  );
}
