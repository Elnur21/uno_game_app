import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {fontSize: 24, padding: 16},
  createButton: {
    borderRadius: 50,
    fontSize: 20,
    width: 30,
    height: 30,
    textAlign: 'center',
    marginRight: 10,
    backgroundColor: 'blue',
    color: 'white',
  },
  notFound: {fontSize: 18, padding: 16},
  createContainer:{
    flex: 1,
    padding:10
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
});
