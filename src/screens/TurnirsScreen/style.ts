import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    padding: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  createButton: {
    borderRadius: 50,
    fontSize: 20,
    width: 30,
    height: 30,
    textAlign: 'center',
    marginRight: 10,
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  notFound: {
    fontSize: 18,
    padding: 16,
    color: '#fff',
    textAlign: 'center',
  },
  createContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: '#000',
  },
  input: {
    height: 50,
    borderColor: '#666',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#fff',
  },
  createButton: {
    marginTop: 8,
    padding: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
