export type RootStackParamList = {
  MainMenu: undefined;
  OfflineGameScreen: undefined;
  OnlineGameScreen: undefined;
  AuthScreen: undefined;
  SignUpScreen: undefined;
  WonScreen: {winner: string};
};

export type User = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};
