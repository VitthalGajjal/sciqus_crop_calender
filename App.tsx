import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import HomeScreen from './screens/HomeScreen';  // Import the HomeScreen component
// import PushNotification, { Importance } from 'react-native-push-notification';


// PushNotification.configure({
//   onNotification: function(notification) {
//     console.log('NOTIFICATION RECEIVED:', notification);
//     // IMPORTANT: If your notification was received when the app is in the background or terminated,
//     // the headless task registered below will run to process it.
//   },
//   popInitialNotification: true,
//   // For iOS, request permissions; Android permissions are handled separately.
//   requestPermissions: Platform.OS === 'ios',
// });


const App = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <HomeScreen />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default App;