import React, {useState} from 'react';
import {View, Text, TextInput, Button, Alert} from 'react-native';
import auth from '@react-native-firebase/auth';
import {styles} from './style';
import {AuthScreenNavigationProp} from '../../types/navigationProps';

interface AuthNavigationProp {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen = ({navigation}: AuthNavigationProp) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Login successful');
      navigation.navigate('MainMenu');
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
    </View>
  );
};

export default AuthScreen;
