// FloatingLabelInput.js

import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, Text, Animated, StyleSheet } from "react-native";

const FloatingLabelInput = ({ label, value, onChangeText, keyboardType }) => {
  const [isFocused, setIsFocused] = useState(false);
  const moveText = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(moveText, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, moveText]);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(moveText, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(moveText, {
        toValue: 0,
        duration: 215,
        useNativeDriver: true,
      }).start();
    }
  };

  const labelStyle = {
    position: 'absolute',
    left: 15,
    backgroundColor: '#132746', // This fixes the issue by covering the border
    paddingHorizontal: 4, // Adds padding to create a clean gap in the border
    transform: [{
      translateY: moveText.interpolate({
        inputRange: [0, 1],
        outputRange: [14, -10],
      }),
    }, {
      scale: moveText.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1],
      }),
    }],
    color: isFocused ? '#FFFFFF' : '#FFFFFF',
  };

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
      <Animated.Text style={labelStyle}>
        {label}
      </Animated.Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType={keyboardType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    position: "relative",
    backgroundColor: '#132746',
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: 25,
    width: '90%', // Ensures it's centered
    alignSelf: 'center',
  },
  input: {
    color: "#FFFFFF",
    fontSize: 13,
    height: 36,
    paddingHorizontal: 0,
  },
  inputFocused: {
    borderColor: '#FFFFFF',
  },
});

export default FloatingLabelInput;