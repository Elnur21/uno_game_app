import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
        borderWidth: 3,
        borderColor: '#fff',
        height: 146,
        padding: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
        overflow: 'hidden'
    },
    multiPlayerContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        padding: 5,
    },
    playerSection: {
        alignItems: 'center',
        marginBottom: 10,
    },
    playerName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 5,
    },
    moreCardsText: {
        color: '#fff',
        fontSize: 10,
        marginLeft: 5,
    }
});