'use client';

import React, { useState } from 'react';
import { Share2, Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  shareToWhatsApp, 
  exportToPDF,
  type ItineraryData 
} from '@/lib/itineraryExport';

interface ItineraryShareExportProps {
  itineraryData: ItineraryData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ItineraryShareExport({ 
  itineraryData, 
  variant = 'default',
  size = 'default',
  showLabel = true 
}: ItineraryShareExportProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleWhatsAppShare = () => {
    try {
      shareToWhatsApp(itineraryData);
      toast({
        title: "Opening WhatsApp",
        description: "Your itinerary is ready to share!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: "Could not open WhatsApp. Please try again.",
      });
    }
  };

  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(itineraryData);
      toast({
        title: "PDF Downloaded",
        description: "Your itinerary has been exported as PDF.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="h-4 w-4" />
          {showLabel && <span className="ml-2">Share & Export</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-2 shadow-lg">
        <DropdownMenuLabel className="text-blue-700 dark:text-blue-400 font-semibold">
          Share Itinerary
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        
        <DropdownMenuItem 
          onClick={handleWhatsAppShare}
          className="hover:bg-green-50 dark:hover:bg-green-900/20 focus:bg-green-50 dark:focus:bg-green-900/20 cursor-pointer"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-gray-700 dark:text-gray-200">Share on WhatsApp</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
        <DropdownMenuLabel className="text-blue-700 dark:text-blue-400 font-semibold">
          Export
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={handlePDFExport} 
          disabled={isExporting}
          className="hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-gray-700 dark:text-gray-200">
            {isExporting ? 'Generating PDF...' : 'Download as PDF'}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

