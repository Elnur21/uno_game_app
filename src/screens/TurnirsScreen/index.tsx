import {TurnirsScreenNavigationProp} from '../../types/navigationProps';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import ListView from '../../Components/listView';
import {useEffect, useState} from 'react';
import {getAllData} from '../../storage/firebase';
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
    getAllData('turnirs').then((data: any) => {
      setTurnirs(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
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
