"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, CloudRain, Car, Plane, CheckCircle, XCircle, Clock, DollarSign, Brain, Bell, IndianRupee, MapPin, Activity, Cloud, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { smartAdjustmentAgent, type AdjustmentRecommendation, type SmartAdjustment } from '@/lib/smartAdjustmentAgent';
import { realTimeMonitoringService, type MonitoringStatus } from '@/lib/realTimeMonitoringService';

interface SmartAdjustmentNotificationsProps {
  itinerary: any;
  onAdjustmentAccepted?: (adjustment: SmartAdjustment, updatedItinerary?: any) => void;
  onAdjustmentRejected?: (adjustment: SmartAdjustment) => void;
  userPreferences?: any;
}

export function SmartAdjustmentNotifications({
  itinerary,
  onAdjustmentAccepted,
  onAdjustmentRejected,
  userPreferences = {}
}: SmartAdjustmentNotificationsProps) {
  const [recommendations, setRecommendations] = useState<AdjustmentRecommendation | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [processingAdjustments, setProcessingAdjustments] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!itinerary) return;

    let statusUnsubscribe: (() => void) | undefined;
    let recommendationsUnsubscribe: (() => void) | undefined;
    let isCancelled = false;

    const startMonitoring = async () => {
      try {
        // Subscribe to monitoring status updates FIRST
        statusUnsubscribe = realTimeMonitoringService.subscribeToStatus((status) => {
          if (!isCancelled) {
            console.log('Status update received:', status);
            setMonitoringStatus(status);
            setIsMonitoring(status.isActive);
          }
        });

        // Start the agent monitoring
        await smartAdjustmentAgent.startMonitoring(itinerary, userPreferences);

        // Subscribe to recommendations
        recommendationsUnsubscribe = smartAdjustmentAgent.subscribe((newRecommendations) => {
          if (!isCancelled) {
            setRecommendations(newRecommendations);
          }
        });

        // Get initial status immediately
        const initialStatus = realTimeMonitoringService.getStatus();
        if (initialStatus) {
          setMonitoringStatus(initialStatus);
          setIsMonitoring(initialStatus.isActive);
        }

      } catch (error) {
        console.error('Failed to start monitoring:', error);
        if (!isCancelled) {
          toast({
            variant: "destructive",
            title: "Monitoring Error",
            description: "Failed to start real-time monitoring.",
          });
        }
      }
    };

    startMonitoring();

    return () => {
      isCancelled = true;
      if (statusUnsubscribe) {
        statusUnsubscribe();
      }
      if (recommendationsUnsubscribe) {
        recommendationsUnsubscribe();
      }
      smartAdjustmentAgent.stopMonitoring();
      setIsMonitoring(false);
    };
  }, [itinerary]);


  const handleAdjustmentAction = async (adjustment: SmartAdjustment, action: 'accept' | 'reject') => {
    setProcessingAdjustments(prev => new Set(prev).add(adjustment.id));

    try {
      if (action === 'accept') {
        // Apply the adjustment to the itinerary
        const updatedItinerary = applyAdjustmentToItinerary(itinerary, adjustment);

        // Call the parent's adjustment handler with the updated itinerary
        onAdjustmentAccepted?.(adjustment, updatedItinerary);

        toast({
          variant: "success",
          title: "Adjustment Applied",
          description: `Your itinerary has been updated. ${adjustment.originalActivity} replaced with ${adjustment.suggestedAlternative}.`,
        });
      } else {
        // Call the parent's rejection handler
        onAdjustmentRejected?.(adjustment);

        toast({
          title: "Adjustment Rejected",
          description: "The suggested change has been dismissed.",
        });
      }

      // Remove the processed adjustment from recommendations
      setRecommendations(prev => prev ? {
        ...prev,
        adjustments: prev.adjustments.filter(adj => adj.id !== adjustment.id)
      } : null);

    } catch (error) {
      console.error('Failed to process adjustment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process the adjustment. Please try again.",
      });
    } finally {
      setProcessingAdjustments(prev => {
        const newSet = new Set(prev);
        newSet.delete(adjustment.id);
        return newSet;
      });
    }
  };

  // Helper function to apply adjustment to itinerary
  const applyAdjustmentToItinerary = (currentItinerary: any, adjustment: SmartAdjustment) => {
    if (!currentItinerary?.itinerary) {
      toast({
        title: "No itinerary found",
        description: "Please try again.",
      });
      return currentItinerary;
    }

    const updatedItinerary = { ...currentItinerary };
    const affectedDay = updatedItinerary.itinerary.find((day: any) => day.day === adjustment.affectedDay);
    
    if (!affectedDay) {
      return currentItinerary;
    }

    const activityIndex = affectedDay.activities?.findIndex((activity: any) =>
      activity.name === adjustment.originalActivity
    );

    if (activityIndex !== -1 && activityIndex !== undefined) {
      const originalActivity = affectedDay.activities[activityIndex];
      
      // Replace the activity with the alternative
      const alternativeActivity = {
        ...originalActivity,
        name: adjustment.suggestedAlternative,
        description: `Alternative activity due to ${adjustment.reason}`,
        cost: (originalActivity.cost || 0) + adjustment.estimatedCostChange,
      };

      affectedDay.activities[activityIndex] = alternativeActivity;
      updatedItinerary.totalCost = calculateUpdatedTotalCost(updatedItinerary.itinerary);
    } else {
      toast({
        title: "Activity not found for replacement",
        description: "Please try again.",
      });
    }

    return updatedItinerary;
  };

  // Helper function to recalculate total cost
  const calculateUpdatedTotalCost = (itinerary: any[]) => {
    let totalCost = 0;
    itinerary.forEach(day => {
      if (day.accommodation?.costPerNight) {
        totalCost += day.accommodation.costPerNight;
      }
      if (day.activities) {
        day.activities.forEach((activity: any) => {
          if (activity.cost) {
            totalCost += activity.cost;
          }
        });
      }
    });
    return totalCost;
  };

  const getDisruptionIcon = (type: string) => {
    switch (type) {
      case 'weather': return <CloudRain className="h-4 w-4" />;
      case 'traffic': return <Car className="h-4 w-4" />;
      case 'transportation': return <Plane className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  
  // Format time helper
  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Never';
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 0) {
      const minsAgo = Math.abs(diffMins);
      if (minsAgo === 0) return 'Just now';
      if (minsAgo === 1) return '1 minute ago';
      return `${minsAgo} minutes ago`;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format time until next check
  const formatNextCheck = (timeString: string | null) => {
    if (!timeString) return 'Not scheduled';
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return 'Checking now...';
    if (diffMins === 1) return 'In 1 minute';
    return `In ${diffMins} minutes`;
  };

  if (!recommendations || recommendations.adjustments.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Brain className="h-5 w-5 animate-pulse" />
            Smart Monitoring Agent
            {monitoringStatus?.isActive && (
              <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monitoring Status */}
          {monitoringStatus?.isActive ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Real-time monitoring is active</span>
              </div>

              {/* Check Statistics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/60 p-2 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-600 mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">Last Check</span>
                  </div>
                  <div className="text-blue-900 font-semibold">
                    {formatTime(monitoringStatus.lastCheckTime)}
                  </div>
                </div>
                <div className="bg-white/60 p-2 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-600 mb-1">
                    <Activity className="h-3 w-3" />
                    <span className="font-medium">Next Check</span>
                  </div>
                  <div className="text-blue-900 font-semibold">
                    {formatNextCheck(monitoringStatus.nextCheckTime)}
                  </div>
                </div>
              </div>

              {/* Check Types */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/60 p-2 rounded border border-blue-200 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Cloud className="h-3 w-3" />
                    <span className="font-medium">Weather</span>
                  </div>
                  <div className="text-blue-900 font-bold">{monitoringStatus.weatherChecks}</div>
                </div>
                <div className="bg-white/60 p-2 rounded border border-blue-200 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Navigation className="h-3 w-3" />
                    <span className="font-medium">Traffic</span>
                  </div>
                  <div className="text-blue-900 font-bold">{monitoringStatus.trafficChecks}</div>
                </div>
                <div className="bg-white/60 p-2 rounded border border-blue-200 text-center">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <Activity className="h-3 w-3" />
                    <span className="font-medium">Total</span>
                  </div>
                  <div className="text-blue-900 font-bold">{monitoringStatus.totalChecks}</div>
                </div>
              </div>

              {/* Traffic Conditions */}
              {monitoringStatus.trafficData !== undefined && (
                <div className="bg-white/60 p-3 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-600 mb-2">
                    <Navigation className="h-3 w-3" />
                    <span className="font-medium text-sm">
                      Traffic Conditions ({monitoringStatus.trafficData?.length || 0} route(s))
                    </span>
                  </div>
                  {monitoringStatus.trafficData && monitoringStatus.trafficData.length > 0 ? (
                    <div className="space-y-2">
                      {monitoringStatus.trafficData.map((traffic, idx) => {
                        const getConditionColor = (condition: string) => {
                          switch (condition) {
                            case 'clear': return 'bg-green-100 text-green-800 border-green-300';
                            case 'slow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                            case 'congested': return 'bg-orange-100 text-orange-800 border-orange-300';
                            case 'blocked': return 'bg-red-100 text-red-800 border-red-300';
                            default: return 'bg-gray-100 text-gray-800 border-gray-300';
                          }
                        };

                        const getConditionIcon = (condition: string) => {
                          switch (condition) {
                            case 'clear': return '✓';
                            case 'slow': return '⚠';
                            case 'congested': return '⚠';
                            case 'blocked': return '✗';
                            default: return '•';
                          }
                        };

                        // Extract route names from location names
                        const routeParts = traffic.route.split(' to ');
                        const locationNames = monitoringStatus.locationNames instanceof Map
                          ? Object.fromEntries(monitoringStatus.locationNames)
                          : (monitoringStatus.locationNames || {});
                        const originName = locationNames[routeParts[0]] || routeParts[0];
                        const destinationName = locationNames[routeParts[1]] || (routeParts[1] || 'Unknown');
                        
                        return (
                          <div key={idx} className={`p-2 rounded border ${getConditionColor(traffic.condition)}`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-xs">{getConditionIcon(traffic.condition)}</span>
                                <span className="font-medium text-xs capitalize">{traffic.condition}</span>
                              </div>
                              {traffic.delay > 0 && (
                                <span className="text-xs font-semibold">+{Math.round(traffic.delay)} min</span>
                              )}
                            </div>
                            <div className="text-xs opacity-90 truncate" title={traffic.route}>
                              {originName} → {destinationName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-blue-600 py-2">
                      No traffic routes to monitor. Routes are only tracked between different locations.
                    </div>
                  )}
                </div>
              )}

              {/* Locations Being Monitored */}
              {monitoringStatus.checkedLocations.length > 0 && (
                <div className="bg-white/60 p-3 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-600 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span className="font-medium text-sm">Monitoring {monitoringStatus.checkedLocations.length} location(s)</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {monitoringStatus.checkedLocations.slice(0, 3).map((location, idx) => {
                      // Get location name from the map, fallback to coordinate if not available
                      const locationNames = monitoringStatus.locationNames instanceof Map
                        ? Object.fromEntries(monitoringStatus.locationNames)
                        : (monitoringStatus.locationNames || {});
                      const locationName = locationNames[location] || location;
                      
                      const displayName = locationName.length > 30 
                        ? `${locationName.substring(0, 27)}...` 
                        : locationName;
                      
                      return (
                        <Badge key={idx} variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300" title={locationName}>
                          {displayName}
                        </Badge>
                      );
                    })}
                    {monitoringStatus.checkedLocations.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                        +{monitoringStatus.checkedLocations.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-blue-600 pt-2 border-t border-blue-200">
                <p className="flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  We'll notify you immediately if any adjustments are needed due to weather, traffic, or other conditions.
                </p>
                <p className="mt-1 text-blue-500">
                  Checking every {monitoringStatus.checkInterval >= 60 ? `${monitoringStatus.checkInterval / 60} hour(s)` : `${monitoringStatus.checkInterval} minute(s)`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-blue-700 flex items-center gap-2">
                <Activity className="h-4 w-4 animate-spin" />
                {monitoringStatus === null ? 'Initializing monitoring service...' : 'Waiting for monitoring to start...'}
              </div>
              {monitoringStatus !== null && (
                <div className="text-xs text-blue-600">
                  Status: {monitoringStatus.isActive ? 'Active' : 'Not Active'} | Locations: {monitoringStatus.checkedLocations?.length || 0}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-300 bg-orange-50 shadow-lg w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <Bell className="h-5 w-5" />
          Smart Adjustments Available
          <Badge variant="outline" className="ml-auto text-xs bg-orange-100 text-orange-800 border-orange-300">
            {recommendations?.adjustments.length} suggestions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Impact Alert */}
        <Alert className={getPriorityColor(recommendations?.riskLevel || 'low')}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className='text-sm'>Impact Level: <strong className='font-bold capitalize'>{recommendations?.overallImpact}</strong></div>

            <div className='text-sm'>{recommendations?.adjustments.length} adjustments recommended due to real-time conditions.</div>

            {recommendations?.totalCostChange !== 0 && recommendations?.totalCostChange !== undefined && (
              <span className={recommendations.totalCostChange > 0 ? 'text-red-600 capitalize' : 'text-green-600 capitalize'}>
                {' '}Cost change: ₹{Math.abs(recommendations.totalCostChange).toLocaleString()}
                {recommendations.totalCostChange > 0 ? ' increase' : ' decrease'}
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Individual Adjustments */}
        <div className="space-y-3">
          {recommendations?.adjustments.map((adjustment) => (
            <Card key={adjustment.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getDisruptionIcon(adjustment.type)}
                    <h4 className="font-semibold">{adjustment.title}</h4>
                    <Badge className={getPriorityColor(adjustment.priority)}>
                      {adjustment.priority}
                    </Badge>
                  </div>

                </div>

                <div className="flex items-center gap-1 text-sm text-gray-500 mt-2 mb-4">
                  <Clock className="h-3 w-3" />
                  {new Date(adjustment.timestamp).toLocaleTimeString()}
                </div>

                <p className="text-sm text-gray-700 mb-3">{adjustment.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="font-medium">Day {adjustment.affectedDay}:</span>
                    <p className="text-gray-600">{adjustment.originalActivity}</p>
                  </div>
                  <div>
                    <span className="font-medium">Suggested:</span>
                    <p className="text-green-600">{adjustment.suggestedAlternative}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    <span className={adjustment.estimatedCostChange > 0 ? 'text-red-600' : 'text-green-600'}>
                      {adjustment.estimatedCostChange > 0 ? '+' : ''}₹{adjustment.estimatedCostChange.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    <span>{adjustment.confidence}% confidence</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAdjustmentAction(adjustment, 'accept')}
                    disabled={processingAdjustments.has(adjustment.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdjustmentAction(adjustment, 'reject')}
                    disabled={processingAdjustments.has(adjustment.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alternative Options */}
        {recommendations?.alternativeOptions && recommendations.alternativeOptions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-blue-900">Alternative Options:</h4>
            <div className="flex flex-wrap gap-2">
              {recommendations?.alternativeOptions.map((option, index) => (
                <Badge key={index} variant="outline" className="text-blue-700 border-blue-300">
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

