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
import {useUserContext} from '../Contexts/UserContext';
import {UsersScreen} from '../screens/UsersScreen';
import {Button, Pressable} from 'react-native';
import ChatroomScreen from '../screens/chatScreen';
import {TurnirsScreen} from '../screens/TurnirsScreen';
import CreateTurnirScreen from '../screens/TurnirsScreen/CreateTurnirScreen';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const {Navigator, Screen} = createStackNavigator();

export default function Stack() {
  const userLocal = getData('user', true);

  const {isSigned, user: userContext, setIsSigned} = useUserContext();

  const user = userLocal ? userLocal : userContext;

  useEffect(() => {
    if (user) setIsSigned(true);
  }, []);

  return (
    <Navigator
      initialRouteName={user ? 'MainMenu' : 'AuthScreen'}
      screenOptions={{
        headerRight: () => user && <SignOutButton />,
        title: user && user?.firstName + ' ' + user?.lastName,
        headerShown: isSigned ? true : false,
        headerLeft: () => null,
        headerStyle: {
          backgroundColor: 'black',
          borderBottomWidth: 1,
          borderBottomColor: 'white',
        },
        headerTitleStyle: {
          color: 'white',
        },
      }}>
      <Screen name="MainMenu" component={MainMenu} />
      <Screen name="OfflineGameScreen" component={OfflineGameScreen} />
      <Screen name="OnlineGameScreen" component={OnlineGameScreen} />
      <Screen name="WonScreen" component={WonScreen} />
      <Screen name="AuthScreen" component={AuthScreen} />
      <Screen name="SignUpScreen" component={SignUpScreen} />
      <Screen name="CreateTurnirScreen" component={CreateTurnirScreen} />
      <Screen
        options={({navigation}) => ({
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()}>
              <FontAwesome name="arrow-left" style={{marginLeft:10}} size={24} color="white" />
            </Pressable>
          ),
        })}
        name="UsersScreen"
        component={UsersScreen}
      />
      <Screen
        options={({navigation}) => ({
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()}>
              <FontAwesome name="arrow-left" style={{marginLeft:10}} size={24} color="white" />
            </Pressable>
          ),
        })}
        name="TurnirsScreen"
        component={TurnirsScreen}
      />
      <Screen
        options={({navigation}) => ({
          headerLeft: () => (
            <Pressable onPress={() => navigation.goBack()}>
              <FontAwesome name="arrow-left" style={{marginLeft:10}} size={24} color="white" />
            </Pressable>
          ),
        })}
        name="ChatroomScreen"
        component={ChatroomScreen}
      />
    </Navigator>
  );
}
