import {OnlineCardsProvider} from '../../Contexts/OnlineCardsContext';
import {Table} from '../../Components/Table';
import {OnlineGameScreenNavigationProp} from '../../types/navigationProps';
import {useRoute} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import {useEffect} from 'react';
import {Alert} from 'react-native';

interface GameScreenProps {
  navigation: OnlineGameScreenNavigationProp;
}

interface RouteParams {
  matchId?: string;
  opponent?: any;
}

export function OnlineGameScreen({navigation}: GameScreenProps) {
  const route = useRoute();
  const {matchId, opponent}: RouteParams = route.params || {};
  const currentUser = auth().currentUser;
  const opponentId = opponent?.id || opponent?.uid;

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
        return; // Allow navigation without confirmation
      }

      // Prevent default behavior
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

  // If no matchId, this is a turnir game - use offline mode
  if (!matchId) {
    // For turnirs, we can still use the regular CardsProvider
    // or create a turnir-specific context later
    const {CardsProvider} = require('../../Contexts/CardsContext');
    return (
      <CardsProvider>
        <Table navigation={navigation} />
      </CardsProvider>
    );
  }

  return (
    <OnlineCardsProvider matchId={matchId} opponentId={opponentId}>
      <Table navigation={navigation} />
    </OnlineCardsProvider>
  );
}
