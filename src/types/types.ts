export type RootStackParamList = {
  MainMenu: undefined;
  OfflineGameScreen: undefined;
  OnlineGameScreen: undefined;
  AuthScreen: undefined;
  SignUpScreen: undefined;
  UsersScreen: undefined;
  TurnirsScreen: undefined;
  CreateTurnirScreen: undefined;
  WonScreen: {winner: string};
  ChatroomScreen: {user: User};
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
}

export interface Turnir {
  id: string;
  title: string;
  creator: string;
  createdAt: any;
  startDate: any;
  users: any;
}
