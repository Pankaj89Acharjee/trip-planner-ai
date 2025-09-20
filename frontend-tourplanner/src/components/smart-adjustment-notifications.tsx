"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, CloudRain, Car, Plane, CheckCircle, XCircle, Clock, DollarSign, Brain, Bell, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { smartAdjustmentAgent, type AdjustmentRecommendation, type SmartAdjustment } from '@/lib/smartAdjustmentAgent';

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
  const [processingAdjustments, setProcessingAdjustments] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (itinerary && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        smartAdjustmentAgent.stopMonitoring();
        setIsMonitoring(false);
      }
    };
  }, [itinerary, isMonitoring]);

  const startMonitoring = async () => {
    try {
      await smartAdjustmentAgent.startMonitoring(itinerary, userPreferences);

      // Subscribe to recommendations
      const unsubscribe = smartAdjustmentAgent.subscribe((newRecommendations) => {
        setRecommendations(newRecommendations);
      });

      setIsMonitoring(true);

      return unsubscribe;
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast({
        variant: "destructive",
        title: "Monitoring Error",
        description: "Failed to start real-time monitoring.",
      });
    }
  };


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

  
  if (!recommendations || recommendations.adjustments.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Brain className="h-5 w-5" />
            Monitoring Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 text-sm">
            Real-time monitoring is active. We'll notify you if any adjustments are needed due to weather, traffic, or other conditions.
          </p>
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

