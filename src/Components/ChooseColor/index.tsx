import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { styles } from './styles';
import { CardsContext } from '../../Contexts/CardsContext';
import { OnlineCardsContext } from '../../Contexts/OnlineCardsContext';

export function ChooseColor() {
    const onlineContext = useContext(OnlineCardsContext);
    const offlineContext = useContext(CardsContext);
    const cardsContext = onlineContext || offlineContext;

    function chooseColor(color: string) {
        cardsContext?.chooseColor(color);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.text}>ESCOLHA UMA COR</Text>
            <View style={styles.squares}>
                <TouchableOpacity
                    style={{ ...styles.square, backgroundColor: 'blue' }}
                    onPress={() => { chooseColor('blue') }}
                />
                <TouchableOpacity
                    style={{ ...styles.square, backgroundColor: 'red' }}
                    onPress={() => { chooseColor('red') }}
                />
                <TouchableOpacity
                    style={{ ...styles.square, backgroundColor: 'green' }}
                    onPress={() => { chooseColor('green') }}
                />
                <TouchableOpacity
                    style={{ ...styles.square, backgroundColor: 'yellow' }}
                    onPress={() => { chooseColor('yellow') }}
                />
            </View>
        </View>
    );
}