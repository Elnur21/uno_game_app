import {CardsProvider} from '../../Contexts/CardsContext';
import {Table} from '../../Components/Table';
import {OnlineGameScreenNavigationProp} from '../../types/navigationProps';

interface GameScreenProps {
  navigation: OnlineGameScreenNavigationProp;
}

export function OnlineGameScreen({navigation}: GameScreenProps) {
  return (
    <CardsProvider>
      <Table navigation={navigation} />
    </CardsProvider>
  );
}
