// Intelligent Agent for automatic itinerary adjustments based on real-time conditions
import { realTimeMonitoringService, type TravelDisruption, type ItineraryImpact } from './realTimeMonitoringService';

export interface SmartAdjustment {
  id: string;
  type: 'automatic' | 'suggested' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  affectedDay: number;
  originalActivity: string;
  suggestedAlternative: string;
  reason: string;
  estimatedCostChange: number;
  confidence: number; // 0-100
  requiresApproval: boolean;
  timestamp: string;
}

export interface AdjustmentRecommendation {
  itineraryId: string;
  adjustments: SmartAdjustment[];
  overallImpact: 'minimal' | 'moderate' | 'significant';
  totalCostChange: number;
  riskLevel: 'low' | 'medium' | 'high';
  alternativeOptions: string[];
  timestamp: string;
}

class SmartAdjustmentAgent {
  private isActive: boolean = false;
  private currentItinerary: any = null;
  private subscribers: Array<(recommendations: AdjustmentRecommendation) => void> = [];

  // Start monitoring and providing smart adjustments
  async startMonitoring(itinerary: any, userPreferences: any = {}) {
    this.currentItinerary = itinerary;
    this.isActive = true;

    // Subscribe to real-time disruptions
    realTimeMonitoringService.subscribe(async (disruptions: TravelDisruption[]) => {
      if (this.isActive && disruptions.length > 0) {        
        const recommendations = await this.generateAdjustmentRecommendations(disruptions, itinerary, userPreferences);        
        this.notifySubscribers(recommendations);
      }
    });

    // Start monitoring
    const travelDates = this.extractTravelDates(itinerary);
    await realTimeMonitoringService.startMonitoring(itinerary, travelDates);
  }

  // Stop monitoring
  stopMonitoring() {
    this.isActive = false;
    realTimeMonitoringService.stopMonitoring();
  }

  // Subscribe to adjustment recommendations
  subscribe(callback: (recommendations: AdjustmentRecommendation) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Generate smart adjustment recommendations
  private async generateAdjustmentRecommendations(
    disruptions: TravelDisruption[], 
    itinerary: any, 
    userPreferences: any
  ): Promise<AdjustmentRecommendation> {
    
    const adjustments: SmartAdjustment[] = [];
    let totalCostChange = 0;

    // Analyze each disruption
    for (const disruption of disruptions) {
      const disruptionAdjustments = await this.analyzeDisruption(disruption, itinerary, userPreferences);
      adjustments.push(...disruptionAdjustments);
      totalCostChange += disruptionAdjustments.reduce((sum, adj) => sum + adj.estimatedCostChange, 0);
    }

    // Calculate overall impact
    const overallImpact = this.calculateOverallImpact(adjustments);
    const riskLevel = this.calculateRiskLevel(disruptions);

    return {
      itineraryId: itinerary.id || 'current',
      adjustments,
      overallImpact,
      totalCostChange,
      riskLevel,
      alternativeOptions: this.generateAlternativeOptions(adjustments),
      timestamp: new Date().toISOString()
    };
  }

  // Analyze individual disruption
  private async analyzeDisruption(
    disruption: TravelDisruption, 
    itinerary: any, 
    userPreferences: any
  ): Promise<SmartAdjustment[]> {
    const adjustments: SmartAdjustment[] = [];
    const affectedDays = this.findAffectedDays(disruption, itinerary);

    for (const day of affectedDays) {
      const dayAdjustments = await this.generateDayAdjustments(disruption, day, userPreferences);
      adjustments.push(...dayAdjustments);
    }

    return adjustments;
  }

  // Find days affected by disruption
  private findAffectedDays(disruption: TravelDisruption, itinerary: any): any[] {
    if (!itinerary?.itinerary) return [];

    return itinerary.itinerary.filter((day: any) => {
      const dayActivityNames = [
        ...(day.activities?.map((activity: any) => activity.name) || [])
      ].filter(Boolean);

      // Check if any activity name matches affected locations
      return dayActivityNames.some((activityName: string) => {
        const activityLower = activityName.toLowerCase();
        return disruption.affected_locations.some((affectedLocation: string) => {
          const locationLower = affectedLocation.toLowerCase();
          return activityLower === locationLower ||
                 activityLower.includes(locationLower) ||
                 locationLower.includes(activityLower) ||
                 (activityLower.includes('tour') && locationLower.includes('tour')) ||
                 (activityLower.includes('visit') && locationLower.includes('visit'));
        });
      });
    });
  }

  // Generate adjustments for a specific day
  private async generateDayAdjustments(
    disruption: TravelDisruption, 
    day: any, 
    userPreferences: any
  ): Promise<SmartAdjustment[]> {
    const adjustments: SmartAdjustment[] = [];

    switch (disruption.type) {
      case 'weather':
        const weatherAdjustments = await this.generateWeatherAdjustments(disruption, day, userPreferences);
        adjustments.push(...weatherAdjustments);
        break;
      case 'traffic':
        const trafficAdjustments = await this.generateTrafficAdjustments(disruption, day, userPreferences);
        adjustments.push(...trafficAdjustments);
        break;
      case 'transportation':
        const transportAdjustments = await this.generateTransportAdjustments(disruption, day, userPreferences);
        adjustments.push(...transportAdjustments);
        break;
    }

    return adjustments;
  }

  // Generate weather-specific adjustments
  private async generateWeatherAdjustments(
    disruption: TravelDisruption, 
    day: any, 
    userPreferences: any
  ): Promise<SmartAdjustment[]> {
    const adjustments: SmartAdjustment[] = [];
    const weatherType = this.extractWeatherType(disruption.title);

    if (day.activities) {
      for (const activity of day.activities) {
        const weatherImpact = this.assessWeatherImpact(activity, weatherType);
        
        if (weatherImpact.needsAdjustment) {
          const alternative = await this.findWeatherAlternative(activity, weatherType, userPreferences);
          
          if (alternative) {
            const adjustment = {
              id: `weather_${day.day}_${activity.name}_${Date.now()}`,
              type: (weatherImpact.severity === 'critical' ? 'automatic' : 'suggested') as 'automatic' | 'suggested',
              priority: this.mapSeverityToPriority(weatherImpact.severity),
              title: `Weather Adjustment: ${activity.name}`,
              description: `${weatherType} weather makes ${activity.name} unsuitable. Suggested alternative: ${alternative.name}`,
              affectedDay: day.day,
              originalActivity: activity.name,
              suggestedAlternative: alternative.name,
              reason: `Weather condition: ${weatherType}. ${weatherImpact.reason}`,
              estimatedCostChange: alternative.cost - activity.cost,
              confidence: weatherImpact.confidence,
              requiresApproval: weatherImpact.severity !== 'critical',
              timestamp: new Date().toISOString()
            };
            adjustments.push(adjustment);
          }
        }
      }
    }

    return adjustments;
  }

  // Generate traffic-specific adjustments
  private async generateTrafficAdjustments(
    disruption: TravelDisruption, 
    day: any, 
    userPreferences: any
  ): Promise<SmartAdjustment[]> {
    
    const adjustments: SmartAdjustment[] = [];
    
    // If traffic delay is significant, suggest rescheduling
    if (disruption.estimated_duration > 60) {
      adjustments.push({
        id: `traffic_${day.day}_${Date.now()}`,
        type: 'suggested',
        priority: disruption.estimated_duration > 120 ? 'high' : 'medium',
        title: `Traffic Delay: Reschedule Activities`,
        description: `Traffic delay of ${disruption.estimated_duration} minutes. Consider rescheduling outdoor activities.`,
        affectedDay: day.day,
        originalActivity: 'Outdoor activities',
        suggestedAlternative: 'Indoor alternatives or later timing',
        reason: `Traffic disruption: ${disruption.description}`,
        estimatedCostChange: 0,
        confidence: 85,
        requiresApproval: true,
        timestamp: new Date().toISOString()
      });
    }

    return adjustments;
  }

  // Generate transportation-specific adjustments
  private async generateTransportAdjustments(
    disruption: TravelDisruption, 
    day: any, 
    userPreferences: any
  ): Promise<SmartAdjustment[]> {
    
    const adjustments: SmartAdjustment[] = [];
    
    // If transportation is delayed, suggest alternative arrangements
    if (disruption.estimated_duration > 30) {
      adjustments.push({
        id: `transport_${day.day}_${Date.now()}`,
        type: 'suggested',
        priority: 'medium',
        title: `Transportation Delay: Alternative Arrangements`,
        description: `Transportation delay of ${disruption.estimated_duration} minutes. Consider alternative transportation or reschedule.`,
        affectedDay: day.day,
        originalActivity: 'Scheduled transportation',
        suggestedAlternative: 'Alternative transportation or reschedule',
        reason: `Transportation disruption: ${disruption.description}`,
        estimatedCostChange: 500, // Estimated cost for alternative transport
        confidence: 80,
        requiresApproval: true,
        timestamp: new Date().toISOString()
      });
    }

    return adjustments;
  }

  // Helper methods
  private extractTravelDates(itinerary: any): { startDate: string; endDate: string } {
    // Extract travel dates from itinerary metadata or form values
    return {
      startDate: itinerary.travelDates?.startDate || new Date().toISOString().split('T')[0],
      endDate: itinerary.travelDates?.endDate || new Date().toISOString().split('T')[0]
    };
  }

  private extractWeatherType(title: string): string {
    const weatherKeywords = {
      'rain': ['rain', 'rainy', 'precipitation'],
      'storm': ['storm', 'stormy', 'thunderstorm'],
      'snow': ['snow', 'snowy', 'blizzard'],
      'fog': ['fog', 'foggy', 'mist'],
      'heat': ['heat', 'hot', 'extreme heat'],
      'cold': ['cold', 'freezing', 'extreme cold']
    };

    const lowerTitle = title.toLowerCase();
    for (const [weather, keywords] of Object.entries(weatherKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return weather;
      }
    }
    return 'unknown';
  }

  private assessWeatherImpact(activity: any, weatherType: string): {
    needsAdjustment: boolean;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    reason: string;
    confidence: number;
  } {
    const outdoorActivities = ['hiking', 'beach', 'outdoor', 'park', 'garden', 'monument'];
    const isOutdoor = outdoorActivities.some(keyword => 
      activity.name.toLowerCase().includes(keyword) || 
      activity.description.toLowerCase().includes(keyword)
    );

    if (!isOutdoor) {
      return { needsAdjustment: false, severity: 'low', reason: 'Indoor activity', confidence: 90 };
    }

    const weatherImpact = {
      'rain': { needsAdjustment: true, severity: 'high' as const, reason: 'Rain makes outdoor activities unsafe', confidence: 95 },
      'storm': { needsAdjustment: true, severity: 'critical' as const, reason: 'Storms are dangerous for outdoor activities', confidence: 100 },
      'snow': { needsAdjustment: true, severity: 'moderate' as const, reason: 'Snow may affect outdoor activities', confidence: 80 },
      'fog': { needsAdjustment: true, severity: 'low' as const, reason: 'Fog reduces visibility', confidence: 70 },
      'heat': { needsAdjustment: true, severity: 'moderate' as const, reason: 'Extreme heat is uncomfortable', confidence: 85 },
      'cold': { needsAdjustment: true, severity: 'moderate' as const, reason: 'Extreme cold is uncomfortable', confidence: 85 }
    };

    const impact = weatherImpact[weatherType as keyof typeof weatherImpact];
    return impact || { needsAdjustment: false, severity: 'low', reason: 'No significant impact', confidence: 50 };
  }

  private async findWeatherAlternative(activity: any, weatherType: string, userPreferences: any): Promise<any> {
    try {
      // Get real alternative places based on weather condition and location
      const alternatives = await this.getRealWeatherAlternatives(activity, weatherType, userPreferences);
      return alternatives[0] || null;
    } catch (error) {
      console.error('Error finding weather alternatives:', error);
      // Fallback to smart mock data based on activity type
      return this.getSmartMockAlternative(activity, weatherType);
    }
  }

  // Get real alternatives from Google Places API or similar service
  private async getRealWeatherAlternatives(activity: any, weatherType: string, userPreferences: any): Promise<any[]> {
    try {
      const location = this.extractActivityLocation(activity);
      const activityType = this.categorizeActivity(activity);
      
      // Call our API to get real alternatives
      const response = await fetch('/api/weather-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          weatherType,
          activityType,
          originalActivity: activity.name,
          budget: activity.cost
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.alternatives || [];
      }
    } catch (error) {
      console.error('Error fetching real alternatives:', error);
    }
    
    return [];
  }

  // Smart fallback that creates realistic alternatives based on activity type
  private getSmartMockAlternative(activity: any, weatherType: string): any {
    const activityName = activity.name.toLowerCase();
    const originalCost = activity.cost || 500;
    
    // Generate realistic alternatives based on activity type and weather
    if (activityName.includes('tour') || activityName.includes('visit') || activityName.includes('monument')) {
      if (weatherType === 'rain' || weatherType === 'storm') {
        return {
          name: 'Indoor Heritage Museum',
          cost: Math.round(originalCost * 0.8),
          description: 'Educational indoor museum experience',
          duration: activity.duration || 2,
          location: activity.location
        };
      }
    }
    
    if (activityName.includes('beach') || activityName.includes('outdoor') || activityName.includes('park')) {
      if (weatherType === 'rain' || weatherType === 'storm') {
        return {
          name: 'Shopping Mall & Entertainment Center',
          cost: Math.round(originalCost * 1.1),
          description: 'Indoor shopping and entertainment experience',
          duration: activity.duration || 3,
          location: activity.location
        };
      }
    }

    if (activityName.includes('adventure') || activityName.includes('hiking')) {
      return {
        name: 'Indoor Adventure Park',
        cost: Math.round(originalCost * 1.2),
        description: 'Weather-protected adventure activities',
        duration: activity.duration || 2,
        location: activity.location
      };
    }

    // Generic indoor alternative
    return {
      name: 'Cultural Center & Museum',
      cost: Math.round(originalCost * 0.9),
      description: 'Indoor cultural experience',
      duration: activity.duration || 2,
      location: activity.location
    };
  }

  // Extract location from activity
  private extractActivityLocation(activity: any): string {
    if (typeof activity.location === 'string') return activity.location;
    if (activity.location?.city) return activity.location.city;
    if (activity.location?.name) return activity.location.name;
    if (typeof activity.location === 'object' && activity.location) {
      const lat = (activity.location as any).latitude ?? (activity.location as any).lat;
      const lng = (activity.location as any).longitude ?? (activity.location as any).lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return `${lat},${lng}`;
      }
    }
    return 'Delhi, India'; // Default
  }

  // Categorize activity type for better suggestions
  private categorizeActivity(activity: any): string {
    const name = activity.name.toLowerCase();
    const description = (activity.description || '').toLowerCase();
    
    if (name.includes('museum') || name.includes('gallery')) return 'cultural';
    if (name.includes('beach') || name.includes('park')) return 'outdoor';
    if (name.includes('tour') || name.includes('visit')) return 'sightseeing';
    if (name.includes('adventure') || name.includes('hiking')) return 'adventure';
    if (name.includes('shopping') || name.includes('mall')) return 'shopping';
    if (name.includes('food') || name.includes('restaurant')) return 'dining';
    
    return 'general';
  }

  private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' | 'urgent' {
    const mapping = {
      'low': 'low' as const,
      'moderate': 'medium' as const,
      'high': 'high' as const,
      'critical': 'urgent' as const
    };
    return mapping[severity as keyof typeof mapping] || 'medium';
  }

  private calculateOverallImpact(adjustments: SmartAdjustment[]): 'minimal' | 'moderate' | 'significant' {
    if (adjustments.length === 0) return 'minimal';
    
    const highPriorityCount = adjustments.filter(a => a.priority === 'high' || a.priority === 'urgent').length;
    const totalCostChange = Math.abs(adjustments.reduce((sum, a) => sum + a.estimatedCostChange, 0));
    
    if (highPriorityCount > 2 || totalCostChange > 2000) return 'significant';
    if (highPriorityCount > 0 || totalCostChange > 500) return 'moderate';
    return 'minimal';
  }

  private calculateRiskLevel(disruptions: TravelDisruption[]): 'low' | 'medium' | 'high' {
    const criticalDisruptions = disruptions.filter(d => d.severity === 'critical' || d.severity === 'high');
    
    if (criticalDisruptions.length > 2) return 'high';
    if (criticalDisruptions.length > 0) return 'medium';
    return 'low';
  }

  private generateAlternativeOptions(adjustments: SmartAdjustment[]): string[] {
    const options = new Set<string>();
    
    adjustments.forEach(adjustment => {
      options.add(`Reschedule to ${adjustment.suggestedAlternative}`);
      options.add(`Find indoor alternatives`);
      options.add(`Adjust timing for better conditions`);
      options.add(`Consider flexible booking options`);
    });
    
    return Array.from(options);
  }

  private notifySubscribers(recommendations: AdjustmentRecommendation) {
    this.subscribers.forEach(callback => callback(recommendations));
  }

}

// Export singleton instance
export const smartAdjustmentAgent = new SmartAdjustmentAgent();
