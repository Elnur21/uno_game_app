import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import {removeData} from './local';

export const getUserByEmail = async (email: string) => {
  try {
    const usersQuerySnapshot = await firestore()
      .collection('users')
      .where('email', '==', email)
      .get();

    if (!usersQuerySnapshot.empty) {
      const userDocument = usersQuerySnapshot.docs[0];
      console.log('User data:', userDocument.data());
      return userDocument.data();
    } else {
      console.log('No user found with this email.');
    }
  } catch (error) {
    console.error('Error fetching user by email:', error);
  }
};

export const logOut = () => {
  auth()
    .signOut()
    .then(() => {
      removeData('user');
      console.log('User signed out!');
    })
    .catch(error => console.error(error));
};

export const getAllData = async (collection: string) => {
  try {
    const snapshot = await firestore().collection(collection).get();
    const dataList = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    return dataList;
  } catch (err) {
    console.log(err);
  }
};
