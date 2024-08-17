import React, {useEffect, useState} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {MainMenu} from '../screens/MainMenu';
import {OfflineGameScreen} from '../screens/GameScreen';
import {WonScreen} from '../screens/WonScreen';
import {OnlineGameScreen} from '../screens/GameScreen/online';
import AuthScreen from '../screens/auth';
import SignUpScreen from '../screens/auth/signup';
import {getData} from '../storage/local';
import SignOutButton from '../Components/buttons/SignOutButton';

const {Navigator, Screen} = createStackNavigator();

export default function Stack() {
  const user = getData('user', true);

  console.log(user);

  return (
    <Navigator
      initialRouteName={user ? 'MainMenu' : 'AuthScreen'}
      screenOptions={{
        headerRight: () => user && <SignOutButton />,
        title: user && user?.firstName + ' ' + user?.lastName,
        headerShown: user ? true : false,
      }}>
      <Screen name="MainMenu" component={MainMenu} />
      <Screen name="OfflineGameScreen" component={OfflineGameScreen} />
      <Screen name="OnlineGameScreen" component={OnlineGameScreen} />
      <Screen name="WonScreen" component={WonScreen} />
      <Screen name="AuthScreen" component={AuthScreen} />
      <Screen name="SignUpScreen" component={SignUpScreen} />
    </Navigator>
  );
}
