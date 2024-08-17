import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  DevSettings,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {styles} from './style';
import {AuthScreenNavigationProp} from '../../types/navigationProps';
import {config} from '../../../config';
import {getUserByEmail} from '../../storage/firebase';
import {setData} from '../../storage/local';
import {useUserContext} from '../../Contexts/UserContext';

interface AuthNavigationProp {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen = ({navigation}: AuthNavigationProp) => {
  GoogleSignin.configure({
    webClientId: config.webClientId,
    offlineAccess: false,
    forceCodeForRefreshToken: true,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const {setIsSigned, setUser} = useUserContext();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      getUserByEmail(email).then((user: any) => {
        setUser(user);
        setData('user', user);
        Alert.alert('Login successful');
        navigation.navigate('MainMenu');
      });

      // DevSettings.reload();
      setIsSigned(true);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        Alert.alert('No user found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Incorrect password.');
      } else {
        Alert.alert('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={loading ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        disabled={loading}
      />
      <View style={styles.separator} />
      <Text style={styles.title}>Don't have an account?</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('SignUpScreen')}
        style={styles.signUpButton}>
        <Text style={styles.signUpButtonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AuthScreen;
