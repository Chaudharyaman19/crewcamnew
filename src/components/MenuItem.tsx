import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image } from 'react-native';

// Props interface
interface MenuItemProps {
  icon: any; // Local image require
  title: string;
  onPress?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={icon} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      <Image source={require('../assets/white_arrow.png')} style={styles.arrow} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#55e6ee',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 4,
    marginHorizontal: 22,
  },
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  arrow: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});

export default MenuItem;
