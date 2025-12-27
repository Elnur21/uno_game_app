import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {ProfileScreenNavigationProp} from '../../types/navigationProps';
import {getData} from '../../storage/local';
import {getUserTurnirs, logOut} from '../../storage/firebase';
import {Turnir} from '../../types/types';
import moment from 'moment';
import firestore from '@react-native-firebase/firestore';
import {useUserContext} from '../../Contexts/UserContext';

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

export function ProfileScreen({navigation}: ProfileScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [turnirs, setTurnirs] = useState<Turnir[]>([]);
  const [loading, setLoading] = useState(true);
  const {setIsSigned} = useUserContext();

  useEffect(() => {
    const userData = getData('user', true);
    setUser(userData);

    if (userData?.email) {
      setLoading(true);
      
      // Real-time listener for user's turnirs
      const unsubscribe = firestore()
        .collection('turnirs')
        .where('users', 'array-contains', userData.email)
        .onSnapshot(
          (snapshot) => {
            const userTurnirs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Turnir[];

            // Sort by startDate (most recent first)
            const sortedTurnirs = userTurnirs.sort((a: any, b: any) => {
              const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
              const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
              return dateB - dateA;
            });

            setTurnirs(sortedTurnirs);
            setLoading(false);
          },
          (error) => {
            console.error('Error listening to turnirs:', error);
            setLoading(false);
          }
        );

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{user?.role || 'member'}</Text>
        </View>
      </View>

      <View style={styles.gamesSection}>
        <Text style={styles.sectionTitle}>Games Played ({turnirs.length})</Text>
        {turnirs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No games played yet</Text>
          </View>
        ) : (
          turnirs.map((turnir, index) => (
            <TouchableOpacity
              key={turnir.id || index}
              style={styles.gameCard}
              onPress={() => {
                // Navigate to turnir details if needed
                navigation.navigate('TurnirsScreen');
              }}>
              <View style={styles.gameHeader}>
                <Text style={styles.gameTitle}>{turnir.title}</Text>
                <Text style={styles.gameStatus}>
                  {moment(turnir.startDate).isBefore(moment())
                    ? 'Completed'
                    : 'Upcoming'}
                </Text>
              </View>
              <View style={styles.gameDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created by:</Text>
                  <Text style={styles.detailValue}>{turnir.creator}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date:</Text>
                  <Text style={styles.detailValue}>
                    {moment(turnir.startDate).format('MMM DD, YYYY HH:mm')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {moment(turnir.createdAt).format('MMM DD, YYYY')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Participants:</Text>
                  <Text style={styles.detailValue}>
                    {Array.isArray(turnir.users)
                      ? turnir.users.length
                      : 0}{' '}
                    players
                  </Text>
                </View>
                {Array.isArray(turnir.users) && turnir.users.length > 0 && (
                  <View style={styles.participantsContainer}>
                    <Text style={styles.participantsLabel}>Players:</Text>
                    <Text style={styles.participantsList}>
                      {turnir.users.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
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
                  style: 'destructive',
                  onPress: () => {
                    logOut();
                    setIsSigned(false);
                    // @ts-ignore
                    navigation.navigate('AuthScreen');
                  },
                },
              ],
              {cancelable: false},
            );
          }}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  profileSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  gamesSection: {
    padding: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
  },
  gameCard: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  gameStatus: {
    fontSize: 12,
    color: '#4CAF50',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gameDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  participantsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  participantsLabel: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  participantsList: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  logoutSection: {
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b71c1c',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

