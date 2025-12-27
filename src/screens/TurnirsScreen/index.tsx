import {TurnirsScreenNavigationProp} from '../../types/navigationProps';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import ListView from '../../Components/listView';
import {useEffect, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
import {User} from '../../types/types';
import {getData} from '../../storage/local';
import {styles} from './style';

interface TurnirsScreenProps {
  navigation: TurnirsScreenNavigationProp;
}

export function TurnirsScreen({navigation}: TurnirsScreenProps) {
  const [turnirs, setTurnirs] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getData('user', true);

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for turnirs
    const unsubscribe = firestore()
      .collection('turnirs')
      .onSnapshot(
        (snapshot) => {
          const turnirsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTurnirs(turnirsData as unknown as User[]);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to turnirs:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turnirs</Text>
        {user?.role == 'admin' && (
          <TouchableOpacity
          onPress={()=>navigation.navigate("CreateTurnirScreen")}
          >
            <Text  style={styles.createButton}>+</Text>
          </TouchableOpacity>
        )}
      </View>
      {turnirs?.length > 0 ? (
        <ListView data={turnirs} type="turnir" />
      ) : (
        <View style={styles.container}>
          <Text style={styles.notFound}>No turnirs found</Text>
        </View>
      )}
    </View>
  );
}
