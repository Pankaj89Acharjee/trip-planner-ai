"use client";

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Car, Clock, MapPin, AlertCircle, CheckCircle, Activity, Navigation, Route, CloudRain } from 'lucide-react';
import { realTimeMonitoringService, type TravelDisruption, type TrafficData } from '@/lib/realTimeMonitoringService';

interface TrafficMonitoringProps {
  itinerary: any;
  travelDates?: { startDate: string; endDate: string };
}

function TrafficMonitoringComponent({ itinerary, travelDates }: TrafficMonitoringProps) {
  const [disruptions, setDisruptions] = useState<TravelDisruption[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringStatus, setMonitoringStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const hasInitialized = useRef(false);

  // Memoize travel dates to prevent unnecessary re-renders
  const stableTravelDates = useMemo(() => {
    if (travelDates?.startDate && travelDates?.endDate) {
      return travelDates;
    }
    return {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }, [travelDates?.startDate, travelDates?.endDate]);

  // Memoize itinerary reference to prevent unnecessary re-runs
  const itineraryRef = useRef<any>(null);
  const itineraryString = useMemo(() => JSON.stringify(itinerary), [itinerary]);

  useEffect(() => {
    if (!itinerary) return;

    // Prevent multiple initializations - check if already monitoring the same itinerary
    if (hasInitialized.current) {
      if (itineraryRef.current === itineraryString) {
        // Same itinerary, don't re-initialize
        return;
      } else {
        // Different itinerary, stop previous monitoring first
        realTimeMonitoringService.stopMonitoring();
        hasInitialized.current = false;
      }
    }

    itineraryRef.current = itineraryString;
    hasInitialized.current = true;

    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    // Subscribe to disruptions
    unsubscribe = realTimeMonitoringService.subscribe((newDisruptions) => {
      if (!isCancelled) {
        setDisruptions(newDisruptions);
      }
    });

    // Start monitoring
    realTimeMonitoringService.startMonitoring(itinerary, stableTravelDates).then(() => {
      if (!isCancelled) {
        setIsMonitoring(true);
        setMonitoringStatus('active');
      }
    }).catch((error) => {
      if (!isCancelled) {
        console.error('Failed to start monitoring:', error);
        setMonitoringStatus('error');
      }
    });

    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
      realTimeMonitoringService.stopMonitoring();
      setIsMonitoring(false);
      setMonitoringStatus('idle');
      hasInitialized.current = false;
    };
  }, [itineraryString, stableTravelDates]);

  const trafficDisruptions = disruptions.filter(d => d.type === 'traffic');
  const weatherDisruptions = disruptions.filter(d => d.type === 'weather');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMonitoringIcon = () => {
    switch (monitoringStatus) {
      case 'active':
        return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {getMonitoringIcon()}
          <span>Real-Time Monitoring</span>
          {isMonitoring && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monitoringStatus === 'error' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Failed to start monitoring. Please check your API configuration.
          </div>
        )}

        {monitoringStatus === 'active' && disruptions.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>No disruptions detected. Your itinerary looks good!</span>
          </div>
        )}

        {trafficDisruptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Car className="h-4 w-4" />
              <span>Traffic Alerts ({trafficDisruptions.length})</span>
            </div>
            {trafficDisruptions.map((disruption) => (
              <div key={disruption.id} className={`p-3 rounded-lg border ${getSeverityColor(disruption.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-xs mb-1">{disruption.title}</div>
                    <div className="text-xs opacity-90">{disruption.description}</div>
                    {disruption.affected_locations.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <MapPin className="h-3 w-3" />
                        <span>{disruption.affected_locations[0]}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {disruption.severity}
                  </Badge>
                </div>
                {disruption.estimated_duration > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>Delay: {Math.round(disruption.estimated_duration)} minutes</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {weatherDisruptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <CloudRain className="h-4 w-4" />
              <span>Weather Alerts ({weatherDisruptions.length})</span>
            </div>
            {weatherDisruptions.map((disruption) => (
              <div key={disruption.id} className={`p-3 rounded-lg border ${getSeverityColor(disruption.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-xs mb-1">{disruption.title}</div>
                    {disruption.affected_locations && disruption.affected_locations.length > 0 && (
                      <div className="flex items-center gap-1 mb-1 text-xs font-semibold">
                        <MapPin className="h-3 w-3" />
                        <span className="capitalize">{disruption.affected_locations[0]}</span>
                      </div>
                    )}
                    <div className="text-xs opacity-90">{disruption.description}</div>
                    {disruption.suggested_alternatives.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-medium">Alternatives: </span>
                        <span>{disruption.suggested_alternatives.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {disruption.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMonitoring && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-2">
              <Route className="h-3 w-3" />
              <span>Monitoring routes between locations every 6 hours</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Activity className="h-3 w-3" />
              <span>Checking weather conditions and traffic delays</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
export const TrafficMonitoring = memo(TrafficMonitoringComponent, (prevProps, nextProps) => {
  // Only re-render if itinerary or travel dates actually changed
  const prevItineraryStr = JSON.stringify(prevProps.itinerary);
  const nextItineraryStr = JSON.stringify(nextProps.itinerary);
  const prevDatesStr = JSON.stringify(prevProps.travelDates);
  const nextDatesStr = JSON.stringify(nextProps.travelDates);
  
  return prevItineraryStr === nextItineraryStr && prevDatesStr === nextDatesStr;
});

