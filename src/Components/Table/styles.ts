import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        paddingVertical: 40
    },
    text: {
        position: 'absolute',
        color: '#fff',
        fontSize: 22,
        paddingTop: 2,
        fontWeight: 'bold',
        top: 156,
        width: 50,
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 8,
        backgroundColor: '#000',
        zIndex: 3
    },
    rotatingCircle: {
        position: 'absolute',
        top: 78,
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 8,
        backgroundColor: '#000',
        zIndex: 3,
        padding: 10
    },
    finishButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#FF5722',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 10,
    },
    finishButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    }
});