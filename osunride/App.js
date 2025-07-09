import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      {/* Logo or App Name */}
      <Text style={styles.logo}>OsunRide</Text>

      {/* Tagline */}
      <Text style={styles.tagline}>Your smooth ride across Osun 🌍</Text>

      {/* Book a Ride Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>🚘 Book a Ride</Text>
      </TouchableOpacity>

      {/* Driver Login or Become Driver */}
      <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
        <Text style={styles.secondaryText}>💼 Become a Driver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#2c3e50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#ecf0f1',
  },
  secondaryText: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});
