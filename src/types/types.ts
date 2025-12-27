export type RootStackParamList = {
  MainMenu: undefined;
  OfflineGameScreen: undefined;
  OnlineGameScreen: {matchId?: string; opponent?: User};
  GameRoomScreen: {matchId: string};
  AuthScreen: undefined;
  SignUpScreen: undefined;
  UsersScreen: undefined;
  TurnirsScreen: undefined;
  CreateTurnirScreen: undefined;
  ProfileScreen: undefined;
  ChatsScreen: undefined;
  FindPlayersScreen: undefined;
  WonScreen: {winner: string};
  ChatroomScreen: {user: User; chatId?: string};
};

export type User = {
  [x: string]: string;
  // id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'member' | 'admin';
};

export interface Message {
  id: string;
  text: string;
  createdAt: any;
  userId: string;
  type?: 'text' | 'game_invitation';
  matchId?: string;
}

export interface Turnir {
  id: string;
  title: string;
  creator: string;
  createdAt: any;
  startDate: any;
  users: any;
}
