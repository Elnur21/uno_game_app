import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {MainMenu} from '../screens/MainMenu';
import {OfflineGameScreen} from '../screens/GameScreen';
import {WonScreen} from '../screens/WonScreen';
import {OnlineGameScreen} from '../screens/GameScreen/online';
import AuthScreen from '../screens/auth';

const {Navigator, Screen} = createStackNavigator();

export default function Stack() {
  return (
    <Navigator
      initialRouteName="AuthScreen"
      screenOptions={{headerShown: false}}>
      <Screen name="MainMenu" component={MainMenu} />
      <Screen name="OfflineGameScreen" component={OfflineGameScreen} />
      <Screen name="OnlineGameScreen" component={OnlineGameScreen} />
      <Screen name="WonScreen" component={WonScreen} />
      <Screen name="AuthScreen" component={AuthScreen} />
    </Navigator>
  );
}
