import {UsersScreenNavigationProp} from '../../types/navigationProps';
import {ActivityIndicator, Text, View} from 'react-native';
import ListView from '../../Components/listView';
import {useEffect, useState} from 'react';
import {getAllData} from '../../storage/firebase';
import {User} from '../../types/types';
import {styles} from './style';

interface UsersScreenProps {
  navigation: UsersScreenNavigationProp;
  route: any;
}

export function UsersScreen({navigation, route}: UsersScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const {item, type} = route.params;
  useEffect(() => {
    if (type == 'turnir') {
      getAllData('users').then((data: any) => {
        let filteredData = data.filter((user: any) =>
          item.users.includes(user?.email),
        );
        setUsers(filteredData);
        setLoading(false);
      });
    } else {
      getAllData('users').then((data: any) => {
        setUsers(data);
        setLoading(false);
      });
    }
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      <ListView data={users} type="user" />
    </View>
  );
}
