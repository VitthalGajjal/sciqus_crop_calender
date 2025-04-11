import React, { useState, useEffect ,useCallback} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { GoogleGenAI } from '@google/genai';
import color from '../assets/Color';

const DailyTipsCard = ({ visible, onClose, currentActivity, weatherData, cropType, location }) => {
  const [tips, setTips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    if (visible && weatherData && currentActivity) {
      setCurrentDate(new Date().toDateString());
      generateDailyTips();
    }
  }, [visible, weatherData, currentActivity, generateDailyTips]);

  const generateDailyTips = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get today's weather
      const today = new Date().toISOString().split('T')[0];
      const todayWeather = weatherData.forecast.forecastday.find(day => 
        day.date === today || day.date.startsWith(today)
      ) || weatherData.forecast.forecastday[0];

      const ai = new GoogleGenAI({ apiKey: 'AIzaSyD22Q92JHrZb0Pwh7EyxYWTmHhKybMOeKQ' });

      const prompt = `Generate 3-5 specific daily tips for a farmer growing ${cropType} in ${location} 
      who is currently in the "${currentActivity.activityName}" phase.
      
      Current weather conditions:
      - Date: ${todayWeather.date}
      - Average Temperature: ${todayWeather.day.avgtemp_c}°C
      - Condition: ${todayWeather.day.condition.text}
      - Max Temperature: ${todayWeather.day.maxtemp_c}°C
      - Min Temperature: ${todayWeather.day.mintemp_c}°C
      - Total Precipitation: ${todayWeather.day.totalprecip_mm}mm
      - Humidity: ${todayWeather.day.avghumidity}%
      - UV Index: ${todayWeather.day.uv}
      
      Activity description: ${currentActivity.description}
      
      Return the tips in JSON format:
      {
        "tips": [
          {
            "title": "Short tip title",
            "description": "Detailed explanation with actionable advice for today's specific weather conditions",
            "category": "One of: Watering, Pest Control, Fertilization, Protection, Timing, Resource Management"
          }
        ]
      }
      
      Make tips extremely specific to today's weather and current activity phase.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const jsonString = response.candidates[0]?.content.parts[0]?.text?.replace(/```json|```/g, "").trim();
      const parsedResponse = JSON.parse(jsonString);

      if (parsedResponse && parsedResponse.tips) {
        setTips(parsedResponse.tips);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating daily tips:', error);
      setTips([
        {
          title: 'Check soil moisture levels',
          description: 'With today\'s weather conditions, monitor soil moisture and adjust irrigation as needed.',
          category: 'Watering'
        },
        {
          title: 'Watch for pest activity',
          description: 'Current conditions may promote pest activity. Inspect plants closely and take preventive measures.',
          category: 'Pest Control'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [weatherData, currentActivity, cropType, location]);

  const renderTipItem = ({ item }) => (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipCategory}>{item.category}</Text>
      </View>
      <Text style={styles.tipTitle}>{item.title}</Text>
      <Text style={styles.tipDescription}>{item.description}</Text>
    </View>
  );

  const getCurrentWeatherIcon = () => {
    if (!weatherData) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const todayWeather = weatherData.forecast.forecastday.find(day => 
      day.date === today || day.date.startsWith(today)
    ) || weatherData.forecast.forecastday[0];
    
    // This is a placeholder. In a real app, you would map conditions to local image assets
    return todayWeather.day.condition.text.toLowerCase().includes('rain') 
      ? require('../assets/icon/rainy_22dp_000000_FILL0_wght400_GRAD0_opsz24.png')
      : todayWeather.day.condition.text.toLowerCase().includes('sun') 
        ? require('../assets/icon/sunny_22dp_000000_FILL0_wght400_GRAD0_opsz24.png')
        : require('../assets/icon/ac_unit_22dp_000000_FILL0_wght400_GRAD0_opsz24.png');
  };

  const getTodayWeather = () => {
    if (!weatherData) return null;
    
    const today = new Date().toISOString().split('T')[0];
    return weatherData.forecast.forecastday.find(day => 
      day.date === today || day.date.startsWith(today)
    ) || weatherData.forecast.forecastday[0];
  };

  const todayWeather = getTodayWeather();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Daily Tips</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.currentInfo}>
            <View style={styles.dateContainer}>
              <Text style={styles.currentDate}>{currentDate}</Text>
              <Text style={styles.currentActivity}>{currentActivity?.activityName}</Text>
            </View>
            
            {todayWeather && (
              <View style={styles.weatherInfo}>
                <Image source={getCurrentWeatherIcon()} style={styles.weatherIcon} />
                <View>
                  <Text style={styles.weatherTemp}>{todayWeather.day.avgtemp_c}°C</Text>
                  <Text style={styles.weatherCondition}>{todayWeather.day.condition.text}</Text>
                </View>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Generating tips based on today's conditions...</Text>
            </View>
          ) : (
            <FlatList
              data={tips}
              renderItem={renderTipItem}
              keyExtractor={(item, index) => `tip-${index}`}
              contentContainerStyle={styles.tipsList}
              showsVerticalScrollIndicator={false}
            />
          )}
          
          <TouchableOpacity style={styles.refreshButton} onPress={generateDailyTips}>
            <Text style={styles.refreshButtonText}>Refresh Tips</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: color.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    backgroundColor: color.primaryDark,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: color.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: color.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: color.lightPrimary,
  },
  dateContainer: {
    flex: 1,
  },
  currentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: color.primaryDark,
  },
  currentActivity: {
    fontSize: 14,
    color: color.black,
    marginTop: 4,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  weatherTemp: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherCondition: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: color.primaryDark,
    fontSize: 16,
  },
  tipsList: {
    padding: 15,
  },
  tipCard: {
    backgroundColor: color.lightAccent,
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  tipCategory: {
    fontSize: 12,
    color: color.primaryDark,
    fontWeight: 'bold',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: color.black,
  },
  tipDescription: {
    fontSize: 14,
    color: color.black,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: color.primaryDark,
    padding: 12,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: color.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DailyTipsCard;


