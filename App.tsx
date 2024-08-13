/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Stack from './src/routes/stack.routes';

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack />
    </NavigationContainer>
  );
}

export default App;
