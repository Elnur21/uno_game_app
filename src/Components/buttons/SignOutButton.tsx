import {Alert, Pressable, Text, DevSettings} from 'react-native';
import {logOut} from '../../storage/firebase';
import {useNavigation} from '@react-navigation/native';
import {useUserContext} from '../../Contexts/UserContext';

export default function SignOutButton() {
  const navigation = useNavigation();
  const {setIsSigned} = useUserContext();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: () => {
            logOut();
            navigation.navigate('AuthScreen');
            // DevSettings.reload();
            setIsSigned(false);
          },
        },
      ],
      {cancelable: false},
    );
  };

  return (
    <Pressable
      style={{
        marginRight: 10,
        backgroundColor: 'red',
        padding: 5,
        borderRadius: 5,
      }}
      onPress={handleSignOut}>
      <Text style={{color: 'white'}}>Sign Out</Text>
    </Pressable>
  );
}
