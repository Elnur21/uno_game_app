import {UsersScreenNavigationProp} from '../../types/navigationProps';
import {ActivityIndicator, Text, View} from 'react-native';
import ListView from '../../Components/listView';
import {useEffect, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
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
    setLoading(true);

    if (type == 'turnir') {
      // Real-time listener for users in this turnir
      const unsubscribe = firestore()
        .collection('users')
        .onSnapshot(
          (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            const filteredData = allUsers.filter((user: any) =>
              item.users.includes(user?.email),
            );
            setUsers(filteredData as unknown as User[]);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to users:', error);
            setLoading(false);
          }
        );

      return () => unsubscribe();
    } else {
      // Real-time listener for all users
      const unsubscribe = firestore()
        .collection('users')
        .onSnapshot(
          (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            }));
            setUsers(usersData as unknown as User[]);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to users:', error);
            setLoading(false);
          }
        );

      return () => unsubscribe();
    }
  }, [type, item]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      <ListView data={users} type="user" />
    </View>
  );
}
