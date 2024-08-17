import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Stack from './src/routes/stack.routes';
import {UserProvider} from './src/Contexts/UserContext';

function App(): React.JSX.Element {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack />
      </NavigationContainer>
    </UserProvider>
  );
}

export default App;
