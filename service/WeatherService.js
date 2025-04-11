// WeatherService.js
import axios from 'axios';

const API_BASE_URL = 'https://api.weatherapi.com/v1';
export const API_KEY = '525d3c61063e4e429f650955252803';

const getWeatherForecast = async (location) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/forecast.json`, {
      params: {
        key: API_KEY,  // Use the API key
        q: location,     // Location (city, zip code, etc.)
        days: 30       // Number of forecast days 
      }
    });
    return response.data; // Return the entire data object
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    throw error; 
  }
};

export default { getWeatherForecast };