import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from './types';

export type MainMenuNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainMenu'
>;
export type OfflineGameScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OfflineGameScreen'
>;
export type OnlineGameScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OnlineGameScreen'
>;
export type WonScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'WonScreen'
>;
export type AuthScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AuthScreen'
>;
export type UsersScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'UsersScreen'
>;
export type ChatroomScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChatroomScreen'
>;