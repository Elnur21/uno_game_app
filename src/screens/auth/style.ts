import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  googleButton: {
    marginTop: 16,
    backgroundColor: '#4285F4',
    padding: 10,
    borderRadius: 5,
  },
  googleButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
