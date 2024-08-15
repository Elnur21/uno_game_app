import { CardsProvider } from '../../Contexts/CardsContext';
import { Table } from '../../Components/Table';
import { OfflineGameScreenNavigationProp } from '../../types/navigationProps';

interface GameScreenProps {
  navigation: OfflineGameScreenNavigationProp;
}

export function OfflineGameScreen({ navigation }: GameScreenProps) {
  return (
    <CardsProvider>
      <Table navigation={navigation} />
    </CardsProvider>
  );
}