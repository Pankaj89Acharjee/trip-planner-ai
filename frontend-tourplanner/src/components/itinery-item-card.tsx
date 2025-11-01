"use client";

import { useState, useEffect } from "react";
import type { Activity, Accommodation, Transportation } from "@/lib/interfaces";
import { 
  BedDouble, Bike, Bus, Car, Clock, Landmark, PartyPopper, Plane, Sparkles, Train, Wallet,
  Thermometer, Droplets, Cloud, Eye, CloudRain, Wind
} from "lucide-react";

type ItemType = "activity" | "accommodation" | "transportation";

type ItineraryItemCardProps = {
  item: Activity | Accommodation | Transportation;
  type: ItemType;
  day: number;
  index?: number;
};

type WeatherData = {
  main: {
    temp: number | null;
    feels_like: number | null;
    humidity: number | null;
    pressure: number | null;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  rain?: {
    "1h": number;
  };
  raw?: {
    precipitation?: {
      probability?: {
        percent: number;
        type: string;
      };
      snowQpf?: {
        quantity: number;
        unit: string;
      };
      qpf?: {
        quantity: number;
        unit: string;
      };
    };
  };
};

const getIcon = (type: ItemType, item: any) => {
  if (type === "accommodation") return <BedDouble className="h-6 w-6 text-primary" />;
  if (type === "transportation") {
    switch (item.mode?.toLowerCase()) {
      case "flight":
        return <Plane className="h-6 w-6 text-primary" />;
      case "train":
        return <Train className="h-6 w-6 text-primary" />;
      case "bus":
        return <Bus className="h-6 w-6 text-primary" />;
      case "car":
        return <Car className="h-6 w-6 text-primary" />;
      default:
        return <Sparkles className="h-6 w-6 text-primary" />;
    }
  }
  
  return <Sparkles className="h-6 w-6 text-primary" />;
};

// Extract location from item
const extractLocation = (item: any): string | null => {
  if (!item.location) return null;

  // If location is a string with coordinates
  if (typeof item.location === 'string') {
    if (/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(item.location)) {
      return item.location.trim();
    }
    return item.location;
  }

  // If location is an object
  if (typeof item.location === 'object') {
    if (item.location.latitude !== undefined && item.location.longitude !== undefined) {
      return `${item.location.latitude},${item.location.longitude}`;
    }
    if (item.location.lat !== undefined && item.location.lng !== undefined) {
      return `${item.location.lat},${item.location.lng}`;
    }
    return item.location.address || item.location.city || item.location.name || null;
  }

  return null;
};

export function ItineraryItemCard({
  item,
  type,
}: ItineraryItemCardProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const stripCustomMarker = (text?: string): string => {
    const input = text ?? "";
    return input.replace(/\s*\[custom:[^\]]+\]\s*/g, " ").trim();
  };

  const cost =
    "cost" in item
      ? item.cost
      : "costPerNight" in item
        ? item.costPerNight
        : 0;
  const duration = "duration" in item ? item.duration : null;

  const displayName = 'name' in item ? stripCustomMarker(item.name) : item.mode;
  const displayDescription = stripCustomMarker((item as any).description);

  // Fetch weather data when component mounts or location changes
  useEffect(() => {
    const location = extractLocation(item);
    if (!location) {
      setWeatherData(null);
      return;
    }

    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const response = await fetch('/api/weather-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setWeatherError(errorData.error || 'Failed to fetch weather');
          setWeatherData(null);
          return;
        }

        const data = await response.json();
        setWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherError('Failed to load weather data');
        setWeatherData(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [item]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-card/50 border">
      <div className="w-10 h-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center mt-1">
        {getIcon(type, item)}
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold">{displayName}</h4>
        <p className="text-sm text-muted-foreground">{displayDescription}</p>
        
        {/* Price, Duration, and Weather Info */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
          {cost > 0 && (
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>₹{cost.toLocaleString()}</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration} hours</span>
            </div>
          )}

          {/* Weather Information */}
          {weatherLoading && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Cloud className="h-4 w-4 animate-pulse" />
              <span>Loading weather...</span>
            </div>
          )}

          {weatherError && !weatherLoading && (
            <div className="flex items-center gap-1.5 text-orange-600 text-xs">
              <Cloud className="h-4 w-4" />
              <span>Weather unavailable</span>
            </div>
          )}

          {weatherData && !weatherLoading && (
            <>
              {weatherData.main.temp !== null && (
                <div className="flex items-center gap-1.5" title="Temperature">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  <span className="font-medium">{Math.round(weatherData.main.temp)}°C</span>
                </div>
              )}
              {weatherData.main.feels_like !== null && (
                <div className="flex items-center gap-1.5 text-muted-foreground" title="Feels like">
                  <Thermometer className="h-3.5 w-3.5" />
                  <span className="text-xs">Feels {Math.round(weatherData.main.feels_like)}°C</span>
                </div>
              )}
              {weatherData.main.humidity !== null && (
                <div className="flex items-center gap-1.5" title="Humidity">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span>Humidity {weatherData.main.humidity}%</span>
                </div>
              )}
              {weatherData.weather[0] && (
                <div className="flex items-center gap-1.5" title="Weather Condition">
                  <Cloud className="h-4 w-4 text-gray-500" />
                  <span className="capitalize">{weatherData.weather[0].description}</span>
                </div>
              )}
              {weatherData.rain && weatherData.rain["1h"] > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600" title="Rain">
                  <CloudRain className="h-4 w-4" />
                  <span>{weatherData.rain["1h"].toFixed(1)}mm</span>
                </div>
              )}
              {weatherData.raw?.precipitation?.probability && (
                <div className="flex items-center gap-1.5 text-blue-600" title="Precipitation Probability">
                  <CloudRain className="h-4 w-4" />
                  <span>Rain Chance {weatherData.raw.precipitation.probability.percent}%</span>
                </div>
              )}
              {weatherData.raw?.precipitation?.snowQpf && weatherData.raw.precipitation.snowQpf.quantity > 0 && (
                <div className="flex items-center gap-1.5 text-cyan-600" title="Snow">
                  <CloudRain className="h-4 w-4" />
                  <span>{weatherData.raw.precipitation.snowQpf.quantity.toFixed(1)}mm</span>
                </div>
              )}
              {weatherData.raw?.precipitation?.qpf && weatherData.raw.precipitation.qpf.quantity > 0 && (
                <div className="flex items-center gap-1.5 text-blue-500" title="Quantitative Precipitation">
                  <Droplets className="h-4 w-4" />
                  <span>{weatherData.raw.precipitation.qpf.quantity.toFixed(1)}mm</span>
                </div>
              )}
              {weatherData.visibility && (
                <div className="flex items-center gap-1.5" title="Visibility">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <span>Visibility {weatherData.visibility}km</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
