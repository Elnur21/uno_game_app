import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {styles} from './style';
import {CreateTurnirScreenNavigationProp} from '../../types/navigationProps';
import DateTimePicker from '@react-native-community/datetimepicker';
import {createData} from '../../storage/firebase';
import {getData} from '../../storage/local';

interface CreateNavigationProp {
  navigation: CreateTurnirScreenNavigationProp;
}

const CreateTurnirScreen = ({navigation}: CreateNavigationProp) => {
  const [turnir, setTurnir] = useState<any>({
    title: '',
    startDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const creator = getData('user', true);
  console.log(creator);

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowPicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString();
      setTurnir({...turnir, startDate: formattedDate});
    }
  };

  const showDatePicker = () => {
    setShowPicker(true);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createData('turnirs', {
        title: turnir?.title,
        startDate: turnir?.startDate,
        creator: creator.email,
        createdAt: new Date().toISOString(),
        users: [creator.email],
      });
      Alert.alert('Turnir created successfully');
      navigation.navigate('TurnirsScreen');
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.createContainer}>
      <Text style={styles.title}>Create Turnir</Text>
      <TextInput
        style={styles.input}
        placeholder="Turnir name"
        value={turnir.title}
        onChangeText={text => setTurnir({...turnir, title: text})}
        autoCapitalize="none"
      />

      <TouchableOpacity onPress={showDatePicker}>
        <TextInput
          style={styles.input}
          placeholder="Start date"
          value={turnir.startDate}
          editable={false}
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={turnir.startDate ? new Date(turnir.startDate) : new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          //   onBlur={() => setShowPicker(false)}
        />
      )}
      <Button
        title={loading ? 'Creating...' : 'Create'}
        onPress={handleCreate}
        disabled={loading}
      />
    </View>
  );
};

export default CreateTurnirScreen;
