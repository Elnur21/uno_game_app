import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {styles} from './style';
import {AuthScreenNavigationProp} from '../../types/navigationProps';
import firestore from '@react-native-firebase/firestore';
import {config} from '../../../config';
import {User} from '../../types/types';

interface AuthNavigationProp {
  navigation: AuthScreenNavigationProp;
}

const SignUpScreen = ({navigation}: AuthNavigationProp) => {
  GoogleSignin.configure({
    webClientId: config.webClientId,
    offlineAccess: false,
    forceCodeForRefreshToken: true,
  });
  const [user, setUser] = useState<User>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (user?.password !== confirmPassword) {
      Alert.alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        user.email,
        user.password,
      );
      const res = userCredential?.user;
      await firestore().collection('users').doc(res?.uid).set({
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      });
      Alert.alert('Registration successful');
      navigation.navigate('AuthScreen');
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        Alert.alert('Email already in use. Please try signing in.');
      } else if (error?.code === 'auth/invalid-email') {
        Alert.alert('Invalid email address.');
      } else if (error?.code === 'auth/weak-password') {
        Alert.alert('Week password.');
      } else {
        Alert.alert('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices(); // Check if Google Play Services are available

      const {idToken} = await GoogleSignin.signIn(); // Perform the Google Sign-In
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential); // Sign in with Google credential
      Alert.alert('Google Sign-In successful');
      navigation.navigate('MainMenu');
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Something went wrong with Google Sign-In. Please try again.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        value={user.email}
        onChangeText={text => setUser({...user, email: text})}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="First name"
        keyboardType="email-address"
        value={user.firstName}
        onChangeText={text => setUser({...user, firstName: text})}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Last name"
        keyboardType="email-address"
        value={user.lastName}
        onChangeText={text => setUser({...user, lastName: text})}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={user.password}
        onChangeText={text => setUser({...user, password: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <Button
        title={loading ? 'Signing up...' : 'Signup'}
        onPress={handleSignUp}
        disabled={loading}
      />
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        style={styles.googleButton}>
        <Text style={styles.googleButtonText}>Sign up with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignUpScreen;
