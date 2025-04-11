import React, { useState, useEffect , useCallback} from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList,Image,PermissionsAndroid, Platform,NativeModules} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'react-native-fs';
import ScheduleCard from './ScheduleCard';
import color from '../assets/Color';
import PushNotification, { Importance } from 'react-native-push-notification';
import WeatherService from '../service/WeatherService';
import DailyTipsCard from './DailyTipsCard';
const { AlarmModule } = NativeModules;

// notification 
PushNotification.getChannels(channels => {
  console.log('Available channels:', channels);
});

PushNotification.createChannel(
  {
    channelId: 'activities', // A unique ID for the channel
    channelName: 'Crop Activities and Weather', // User-visible name
    channelDescription: 'Notifications for crop task reminders and daily weather updates', // Description
    playSound: true,
    soundName: 'default',
    importance: Importance.HIGH,  // High importance for heads-up notifications
    vibrate: true,
  },
  (created) =>{ console.log(`Notification channel 'activities' created: ${created}`);
  
  }
);

const HomeScreen = () => {
  const [location, setLocation] = useState('');
  const [cropType, setCropType] = useState('');
  const [activities, setActivities] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastDays, setForecastDays] = useState(30); 
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState([]);
  const [selectedScheduleIndex, setSelectedScheduleIndex] = useState(-1);
  const [showDailyTips, setShowDailyTips] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [channelCreated, setChannelCreated] = useState(false);


  const findCurrentActivity = () => {
    if (!activities || activities.length === 0) {
      return null;
    }
    
    const today = new Date();
    
    // Find an activity that's currently active (today falls between start and end dates)
    const active = activities.find(activity => {
      const startDate = new Date(activity.startDate);
      const endDate = new Date(activity.endDate);
      return today >= startDate && today <= endDate;
    });
    
    if (active) {
      return active;
    }
    
    // If no active activity found, return the upcoming one
    const upcoming = activities
      .filter(activity => new Date(activity.startDate) > today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    
    if (upcoming) {
      return upcoming;
    }
    
    // If no upcoming activity, return the most recent one
    return activities
      .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
  };
  

  const maharashtraLocations = [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati',
    'Kolhapur', 'Thane', 'Jalgaon', 'Akola', 'Nanded', 'Chandrapur', 'Latur',
    'Sangli', 'Ahmednagar', 'Dhule', 'Jalna', 'Ratnagiri', 'Bhandara'
  ];

  const maharashtraCrops = [
    'Rice', 'Wheat', 'Sugarcane', 'Cotton', 'Soybean', 'Groundnut', 'Maize',
    'Jowar', 'Bajra', 'Tur', 'Gram', 'Sunflower', 'Onion', 'Potato', 'Tomato',
    'Chilli', 'Brinjal', 'Cabbage', 'Cauliflower', 'Banana', 'Grapes'
  ];

  // Load saved schedules on component mount
  useEffect(() => {
    loadSavedSchedules();
  }, []);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (location) {
        try {
          const data = await WeatherService.getWeatherForecast(location);
          setWeatherData(data);
        } catch (error) {
          console.error("Error fetching weather data:", error);
          Alert.alert("Error", "Failed to fetch weather data. Please try again.");
          setWeatherData(null); 
        }
      }
    };

    fetchWeatherData();
  }, [location]);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      // Only Android 13+ (API 33+) needs runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          // Check current permission status first
          const status = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          console.log('Notification permission status:', status);
          
          // If already granted, no need to ask again
          if (status) {
            console.log('Notification permission already granted');
            return true;
          }
          
          // Request permission
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs notification permission to send you updates about your crops.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          console.log('Permission request result:', granted);
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Notification permission granted');
            return true;
          } else {
            console.log('Notification permission denied');
            
            return false;
          }
        } catch (err) {
          console.error('Error requesting notification permission:', err);
          return false;
        }
      }
      // For Android < 13, no runtime permission needed
      return true;
    };

    requestNotificationPermission();
  }, [channelCreated]);

  

 // Set up daily weather notifications when savedSchedules changes
  useEffect(() => {
    if (savedSchedules.length > 0) {
      scheduleDailyWeatherNotifications();
    }
  }, [savedSchedules, scheduleDailyWeatherNotifications])

  

  // Load saved schedules from storage
  const loadSavedSchedules = async () => {
    try {
      const schedulesFilePath = fs.DocumentDirectoryPath + '/all_crop_schedules.json';
      
      // Check if file exists
      const fileExists = await fs.exists(schedulesFilePath);
      if (fileExists) {
        const content = await fs.readFile(schedulesFilePath, 'utf8');
        const schedules = JSON.parse(content);
        setSavedSchedules(schedules);
      } else {
        // Create empty file if it doesn't exist
        await fs.writeFile(schedulesFilePath, JSON.stringify([]), 'utf8');
      }
    } catch (error) {
      console.error('Error loading saved schedules:', error);
      // Initialize with empty array if there's an error
      setSavedSchedules([]);
    }
  };

  // Save schedule to storage
  const saveSchedule = async (schedule) => {
    try {
      const schedulesFilePath = fs.DocumentDirectoryPath + '/all_crop_schedules.json';
      
      // Add timestamp and unique ID
      const schedulesToSave = [
        ...savedSchedules,
        {
          ...schedule,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        }
      ];
      
      await fs.writeFile(schedulesFilePath, JSON.stringify(schedulesToSave), 'utf8');
      setSavedSchedules(schedulesToSave);
      
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      return false;
    }
  };

  // Delete a saved schedule
  const deleteSchedule = async (indexToDelete) => {
    try {
      Alert.alert(
        "Delete Schedule",
        "Are you sure you want to delete this schedule?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Create a new array without the schedule to delete
              const updatedSchedules = savedSchedules.filter((_, index) => index !== indexToDelete);
              const schedulesFilePath = fs.DocumentDirectoryPath + '/all_crop_schedules.json';
              
              // Save updated schedules to file
              await fs.writeFile(schedulesFilePath, JSON.stringify(updatedSchedules), 'utf8');
              
              // Update state
              setSavedSchedules(updatedSchedules);
              
              // Reset selected schedule if the deleted one was selected
              if (selectedScheduleIndex === indexToDelete) {
                setSelectedScheduleIndex(-1);
                setActivities([]);
              } else if (selectedScheduleIndex > indexToDelete) {
                // Adjust selectedScheduleIndex if necessary
                setSelectedScheduleIndex(selectedScheduleIndex - 1);
              }
              
              Alert.alert("Success", "Schedule deleted successfully.");
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting schedule:', error);
      Alert.alert('Error', 'Failed to delete schedule. Please try again.');
    }
  };

  const generateSchedule = async () => {
    setIsScheduleLoading(true);
    try {
      if (!location || !cropType) {
        Alert.alert("Error", "Please select both location and crop type.");
        setIsScheduleLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: 'AIzaSyD22Q92JHrZb0Pwh7EyxYWTmHhKybMOeKQ' });  

      const prompt = `Generate a crop schedule for ${cropType} in ${location} based on the upcoming weather forecast, return the information in JSON format.
      Include tips needed for the given activity and requirements for that activity. The weather forecast should be considered only for description content (not for crop activity time line ), for the next ${forecastDays} days.
      ${weatherData ? `The weather forecast is: ${JSON.stringify(weatherData.forecast.forecastday)}` : 'No weather forecast available.'}
      Return the schedule in strict JSON format:
      {
        "crop": "${cropType}",
        "location": "${location}",
        "schedule": [
          {
            "month": "June - July",
            "activity": "Field Preparation and Sowing",
            "description": "Deep ploughing (25-30 cm) is crucial for good root development. Ensure a well-pulverized and leveled seedbed for uniform germination. Apply basal dose of fertilizers based on soil test recommendations (N:P:K ratio). Use healthy, disease-free setts (seed pieces) with 2-3 buds. Treat setts with fungicide solution (e.g., Carbendazim) to prevent sett-borne diseases and improve germination. Plant setts in furrows or trenches at a spacing of 90-120 cm between rows and 30-45 cm between setts. Ensure proper soil moisture during planting to facilitate sprouting. Consider pre-emergence herbicides to control weeds early on."
          },
          {
            "month": "July - August",
            "activity": "Weeding and Thinning",
            "description": "Sugarcane is susceptible to weed competition during the early growth stages.  Perform 2-3 hand weedings or hoeings.  Alternatively, use post-emergence herbicides selectively, ensuring they are appropriate for sugarcane and the weeds present. Remove excess shoots (thinning) to maintain optimum plant population. This helps in better light penetration and air circulation, leading to healthier plants and better yields. Thinning should be done when shoots are about 30 cm tall.",
          },
          {
            "month": "June-October",
            "activity": "Irrigation (if rainfall insufficient)",
            "description": "Sugarcane requires consistent moisture, especially during critical growth stages like tillering and elongation. Irrigate at intervals of 7-10 days during dry spells. Drip irrigation is highly recommended for efficient water use and fertilizer application (fertigation). Monitor soil moisture levels regularly to avoid water stress. Water requirements vary depending on the stage of crop growth and weather conditions. Ensure proper drainage to avoid waterlogging, which can lead to root rot and reduced yields. Consider alternate furrow irrigation to conserve water.",
          },
          {
            "month": "July - September",
            "activity": "Pest and Disease Management",
            "description": "Monitor the crop regularly (at least weekly) for pests like early shoot borer, stem borer, pyrilla, and white grub. Common diseases include red rot, smut, and wilt. Implement integrated pest and disease management (IPM) practices, including using resistant varieties (if available) and biological control agents.  Early detection is key to successful control.",
          },
          {
            "month": "October - November",
            "activity": "Harvesting",
            "description": "Harvest sugarcane when it reaches maturity (typically 10-12 months). Maturity is indicated by the brix reading (sugar content), which should be at its peak. Use a refractometer to measure brix. Cut the cane close to the ground to avoid leaving stubble.  Remove the leaves before transporting the cane to the sugar factory. Harvested cane should be processed within 24-48 hours to prevent sugar loss (inversion). Coordinate with the sugar factory for harvesting and transportation schedules. Stubble shaving can promote ratoon crop growth.",
          }
        ]
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const jsonString = response.candidates[0]?.content.parts[0]?.text?.replace(/```json|```/g, "").trim();
      const parsedResponse = JSON.parse(jsonString);

      if (!parsedResponse.schedule) {
        throw new Error('Invalid response format');
      }
      
      const formattedActivities = parsedResponse.schedule.map((item) => {
        if (!item || !item.month) {
          console.warn("Skipping activity due to missing item or month:", item);
          return null; 
        }
      
        try {
          const monthParts = item.month.split('-');
          const startMonth = monthParts[0].trim();
          const endMonth = monthParts[1] ? monthParts[1].trim() : startMonth; 
      
          return {
            activityName: item.activity,
            startDate: `2025-${getMonthNumber(startMonth)}-01`,
            endDate: `2025-${getMonthNumber(endMonth)}-28`,
            description: item.description,
          };
        } catch (error) {
          console.error("Error processing activity:", item, error);
          return null; 
        }
      }).filter(item => item !== null);
      
      setActivities(formattedActivities);

      // Individual schedule file (for compatibility)
      const fileUri = fs.DocumentDirectoryPath + '/crop_schedule.json';
      await fs.writeFile(fileUri, JSON.stringify(parsedResponse, null, 2), 'utf8');

      // Save to collection of schedules
      const scheduleToSave = {
        crop: parsedResponse.crop,
        location: parsedResponse.location,
        activities: formattedActivities,
        weatherSnapshot: weatherData ? weatherData.forecast.forecastday.slice(0, 5) : null
      };
      
      const success = await saveSchedule(scheduleToSave);
      if (success) {
        Alert.alert('Success', 'Schedule generated and saved successfully!');
        // Select the newly added schedule
        setSelectedScheduleIndex(savedSchedules.length);
      }

    } catch (error) {
      console.error('Error generating schedule:', error);
      Alert.alert('Error', 'Failed to generate schedule. Please try again.');
    } finally {
      setIsScheduleLoading(false); 
    }
  };

  const getMonthNumber = (month) => {
    const months = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12',
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return months[month] || '01';
  };

  const selectSchedule = (index) => {
    setSelectedScheduleIndex(index);
    const selectedSchedule = savedSchedules[index];
    if (selectedSchedule) {
      setActivities(selectedSchedule.activities);
      setCropType(selectedSchedule.crop);
      setLocation(selectedSchedule.location);
    }
  };

  const renderScheduleItem = ({ item, index }) => (
    <View style={styles.scheduleItemContainer}>
      <TouchableOpacity 
        style={[
          styles.scheduleListItem, 
          selectedScheduleIndex === index && styles.selectedScheduleItem
        ]}
        onPress={() => selectSchedule(index)}
      >
        <Text style={[
          styles.scheduleItemTitle, 
          selectedScheduleIndex === index && styles.selectedItemText
        ]}>
          {item.crop} - {item.location}
        </Text>
        <Text style={[
          styles.scheduleItemDate,
          selectedScheduleIndex === index && styles.selectedItemText
        ]}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteSchedule(index)}
      >
        <Image style={styles.iconimage} source={require('../assets/icon/delete_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.png')}/>
        {/* <Icon name="delete" size={24} color="#FF3B30" /> */}
      </TouchableOpacity>
    </View>
  );

  PushNotification.getChannels(channels => {
     console.log('Available channels:', channels);
  });


  const scheduleActivityReminder = async (activity) => {
    try {
      const startDate = new Date(activity.startDate);
      const reminderDate = new Date(startDate);
      const now = new Date();
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0);
  
      if (reminderDate < new Date()) {
        console.log("Skipping past date:", reminderDate);
        return;
      }
  
      console.log("Scheduling notification for:", activity.activityName); 
      console.log("Reminder Date:", reminderDate.toLocaleString());
      
      // Create a unique ID for the notification
      const notificationId = `activity-${activity.activityName.replace(/\s+/g, '-').toLowerCase()}-${now.getTime()}`;
      
      // Schedule the notification
      PushNotification.localNotificationSchedule({
        id: notificationId, // Unique numeric ID
        channelId: 'activities',
        title: `Upcoming Activity: ${activity.activityName}`,
        message: `Tomorrow you need to start: ${activity.activityName}. ${activity.description.substring(0, 100)}...`,
        date: reminderDate,
        allowWhileIdle: true, // Deliver notification even when app is in background
        bigText: activity.description, // Big text style for Android
        vibrate: true,
        vibration: 300,
        playSound: true,
      });
  
      console.log(`Reminder scheduled for ${activity.activityName} on ${reminderDate.toLocaleString()}`);
    } catch (error) {
      console.error("Error scheduling activity reminder:", error);
      Alert.alert("Scheduling Error", `Failed to schedule reminder: ${error.message}`);
    }
  };

  // Function to schedule notifications for all activities
  const scheduleAllActivityReminders = () => {
    if (!activities || activities.length === 0) {
      Alert.alert("No Activities", "There are no activities to schedule reminders for.");
      return;
    }
    
    Promise.all(activities.map(scheduleActivityReminder))
      .then(() => {
        Alert.alert("Success", "Activity reminders have been scheduled.");
      })
      .catch(error => {
        console.error("Error scheduling reminders:", error);
        Alert.alert("Error", "Failed to schedule some reminders.");
      });
  };

  const generateScheduleAndSetReminders = async () => {
    // First generate the schedule
    await generateSchedule();
    
    // Then, if activities were created, schedule reminders
    // We need to wait a moment to ensure activities state is updated
    setTimeout(() => {
      if (activities.length > 0) {
        scheduleAllActivityReminders();
        scheduleDailyWeatherNotifications();
      }
    }, 1000); // Wait 1 second after generating schedule
  };


  //daily weather notification.................................


  // Function to schedule daily weather notifications at 7 AM
  // const scheduleDailyWeatherNotifications = useCallback(async () => {
  //   try {
  //     // Cancel any existing weather notifications
  //     PushNotification.cancelAllLocalNotifications();

  //     // Schedule weather notifications for each saved schedule
  //     for (const schedule of savedSchedules) {
  //       // Set up a trigger for 7 AM daily
  //       const now = new Date();
  //       const triggerDate = new Date();
  //       triggerDate.setHours(7, 0, 0, 0);

  //       // If it's already past 7 AM, schedule for tomorrow
  //       if (now.getHours() >= 7) {
  //         triggerDate.setDate(triggerDate.getDate() + 1);
  //       }

  //       // Fetch latest weather data for the location
  //       try {
  //         const weatherData = await WeatherService.getWeatherForecast(schedule.location);
  //         const todayForecast = weatherData.forecast.forecastday[0];

  //         // Create the daily trigger notification
  //         PushNotification.localNotificationSchedule({
  //           id: `weather-${schedule.location}`, // make sure id is string type.
  //           channelId: 'activities',
  //           title: `Weather Update for ${schedule.crop} in ${schedule.location}`,
  //           message: `Today's forecast: ${todayForecast.day.condition.text}, ${todayForecast.day.avgtemp_c}°C.`,
  //           date: triggerDate,
  //           allowWhileIdle: true,
  //           repeatType: 'day', // Daily repetition
  //           vibrate: true,
  //           vibration: 300,
  //           playSound: true,
  //         });

  //         console.log(`Daily weather notification scheduled for ${schedule.crop} in ${schedule.location} at 7:00 AM`);
  //       } catch (error) {
  //         console.error(`Failed to schedule weather notification for ${schedule.location}:`, error);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error scheduling daily weather notifications:", error);
  //   }
  // }, [savedSchedules]);
  const scheduleDailyWeatherNotifications = useCallback(async () => {
    try {
      // Cancel any existing weather notifications
      PushNotification.cancelAllLocalNotifications();
  
      // Schedule weather notifications for each saved schedule
      for (const schedule of savedSchedules) {
        // Set up a trigger for every 1 minute from now
        const now = new Date();
        const triggerDate = new Date(now.getTime() + 60000); // 60000 milliseconds = 1 minute
  
        // Fetch latest weather data for the location
        try {
          const weatherData = await WeatherService.getWeatherForecast(schedule.location);
          const todayForecast = weatherData.forecast.forecastday[0];
  
          // Create the daily trigger notification
          PushNotification.localNotificationSchedule({
            id: `weather-${schedule.location}-${now.getTime()}`, // Unique string ID
            channelId: 'activities',
            title: `Weather Update for ${schedule.crop} in ${schedule.location}`,
            message: `Today's forecast: ${todayForecast.day.condition.text}, ${todayForecast.day.avgtemp_c}°C.`,
            date: triggerDate,
            allowWhileIdle: true,
            repeatType: 'minute', // Repeat every minute
            vibrate: true,
            vibration: 300,
            playSound: true,
          });
  
          console.log(`Weather notification scheduled for ${schedule.crop} in ${schedule.location} every minute`);
        } catch (error) {
          console.error(`Failed to schedule weather notification for ${schedule.location}:`, error);
        }
      }
    } catch (error) {
      console.error("Error scheduling daily weather notifications:", error);
    }
  }, [savedSchedules]);


  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Crop Schedule</Text>
        <TouchableOpacity onPress={() => {
          const activity = findCurrentActivity();
          if (activity) {
            setCurrentActivity(activity);
            setShowDailyTips(true);
          } else {
            Alert.alert("No Activity Found", "Please generate or select a schedule first.");
          }
        }}>
          <Image style={styles.iconimage} source={require('../assets/icon/notifications_22dp_000000_FILL0_wght400_GRAD0_opsz24.png')}/>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollableContent}>
        <View style={styles.body}>
          {savedSchedules.length > 0 && (
            <View style={styles.savedSchedulesContainer}>
              <Text style={styles.sectionTitle}>Saved Schedules</Text>
              <FlatList
                data={savedSchedules}
                renderItem={renderScheduleItem}
                keyExtractor={(item) => item.id || String(savedSchedules.indexOf(item))}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.schedulesList}
              />
            </View>
          )}
          <Text style={styles.sectionTitle}>Create New Schedule</Text>
          <Picker
            selectedValue={location}
            onValueChange={(itemValue) => setLocation(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Location" value="" />
            {maharashtraLocations.map((loc, index) => (
              <Picker.Item key={index} label={loc} value={loc} />
            ))}
          </Picker>
          <Picker
            selectedValue={cropType}
            onValueChange={(itemValue) => setCropType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select Crop Type" value="" />
            {maharashtraCrops.map((crop, index) => (
              <Picker.Item key={index} label={crop} value={crop} />
            ))}
          </Picker>

          {weatherData && (
            <View style={styles.weatherContainer}>
              <Text style={styles.weatherTitle}>Weather Forecast for {location}</Text>
              <ScrollView horizontal>
                {weatherData.forecast.forecastday.map((day, index) => (
                  <View key={index} style={styles.weatherDay}>
                    <Text>Date: {day.date}</Text>
                    <Text>Condition: {day.day.condition.text}</Text>
                    <Text>Avg Temp: {day.day.avgtemp_c}°C</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={generateScheduleAndSetReminders} >
            <Text style={styles.buttonText}>Generate Schedule</Text>
          </TouchableOpacity>

          {isScheduleLoading ? (
            <ActivityIndicator size="large" color={color.primaryDark} style={styles.scheduleLoader} />
          ) : activities.length > 0 ? (
            <View style={styles.scheduleCardContainer}>
              <Text style={styles.scheduleTitle}>
                {selectedScheduleIndex >= 0 ? 'Selected Schedule:' : 'Generated Schedule:'}
              </Text>
              <ScheduleCard activities={activities} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <DailyTipsCard
        visible={showDailyTips}
        onClose={() => setShowDailyTips(false)}
        currentActivity={currentActivity}
        weatherData={weatherData}
        cropType={cropType}
        location={location}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.lightAccent,
  },
  titleContainer: {
    backgroundColor: color.primaryDark,
    height: 60,
    justifyContent:'space-between',
    flexDirection:'row',
    paddingLeft: 15,
    alignItems:'center',
    paddingEnd:20,
  },
  title: {
    color: color.white,
    fontWeight: 'bold',
    fontSize: 30,
  },
  body: {
    padding: 15,
    backgroundColor: color.lightAccent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: color.primaryDark,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 15,
    backgroundColor: color.lightPrimary,
  },
  button: {
    backgroundColor: color.primaryDark,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row', 
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollableContent: {
    flexGrow: 1,
  },
  scheduleLoader: {  
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  weatherContainer: {
    // marginTop: 20,
    padding: 10,
    backgroundColor: color.lightSecondary,
    borderRadius: 5,
  },
  weatherTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  weatherDay: {
    marginRight: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: color.primaryDark,
    borderRadius: 5,
    backgroundColor: color.lightGray,
  },
  savedSchedulesContainer: {
    marginBottom: 20,
  },
  schedulesList: {
    // paddingBottom: 10,
  },
  iconimage: {
    width: 30, 
    height: 30, 
  },
  scheduleItemContainer: {
    flexDirection: 'row',
    backgroundColor: color.lightPrimary,
    alignItems: 'center',
    marginRight: 10,
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleListItem: {
    padding: 5,
    borderRadius: 8,
    
  },
  selectedScheduleItem: {
    backgroundColor: color.primaryDark,
  },
  scheduleItemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  scheduleItemDate: {
    fontSize: 12,
    marginTop: 4,
    color: color.black,
  },
  selectedItemText: {
    color: '#FFF',
  },
  scheduleCardContainer: {
    marginTop: 20,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    backgroundColor: color.lightPrimary,
    borderRadius: 5,
  },
});

export default HomeScreen;