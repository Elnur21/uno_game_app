import { CardsProvider } from '../../Contexts/CardsContext';
import { Table } from '../../Components/Table';
import { OfflineGameScreenNavigationProp } from '../../types/navigationProps';
import {useRoute} from '@react-navigation/native';
import { useEffect } from 'react';
import { Alert } from 'react-native';

interface GameScreenProps {
  navigation: OfflineGameScreenNavigationProp;
}

interface RouteParams {
  botCount?: number;
}

export function OfflineGameScreen({ navigation }: GameScreenProps) {
  const route = useRoute();
  const {botCount = 1}: RouteParams = route.params || {};

  // Handle all navigation exits (back button, gestures, programmatic navigation)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Don't show confirmation if navigating to WonScreen (game ended) or MainMenu (from restart)
      const action = e.data.action as { type: string; payload?: any };
      const targetRoute = 
        (action.type === 'NAVIGATE' && action.payload?.name) ||
        (action.type === 'REPLACE' && action.payload?.name) ||
        (action.type === 'RESET' && action.payload?.routes?.[action.payload?.index]?.name);
      
      if (targetRoute === 'WonScreen' || targetRoute === 'MainMenu') {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Exit Game',
        'Are you sure you want to leave the game? Your progress will be saved.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
        { cancelable: true }
      );
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <CardsProvider botCount={botCount}>
      <Table navigation={navigation} />
    </CardsProvider>
  );
}