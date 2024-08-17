import {MMKV} from 'react-native-mmkv';

const storage = new MMKV();

export const setData = (key: string, value: any) => {
  const convertedValue = JSON.stringify(value);
  storage.set(key, convertedValue);
};

export const getData = (key: string, json: boolean = false) => {
  const storedValue = storage.getString(key);
  return json && storedValue ? JSON.parse(storedValue) : storedValue;
};

export const removeData = (key: string) => {
  storage.delete(key);
};
