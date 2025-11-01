import jsPDF from 'jspdf';
import type { ItineraryDay } from '@/lib/interfaces';

export interface ItineraryData {
  destination: string;
  totalDays: number;
  totalCost: number;
  budget?: number;
  itinerary: ItineraryDay[];
  travelDates?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Format itinerary as plain text for sharing
 */
export function formatItineraryAsText(data: ItineraryData): string {
  let text = `🌍 ${data.destination.toUpperCase()} ITINERARY\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (data.travelDates) {
    text += `📅 Travel Dates: ${formatDate(data.travelDates.startDate)} - ${formatDate(data.travelDates.endDate)}\n`;
  }
  text += `📊 Duration: ${data.totalDays} day${data.totalDays > 1 ? 's' : ''}\n`;
  text += `💰 Total Cost: ₹${data.totalCost.toLocaleString()}\n`;
  if (data.budget) {
    text += `📈 Budget: ₹${data.budget.toLocaleString()}\n`;
  }
  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  data.itinerary.forEach((day: any) => {
    text += `📍 DAY ${day.day}${day.date ? ` - ${formatDate(day.date)}` : ''}\n`;
    text += `${'─'.repeat(30)}\n\n`;

    // Accommodation
    if (day.accommodation) {
      text += `🏨 ACCOMMODATION\n`;
      text += `   ${day.accommodation.name}\n`;
      const location = typeof day.accommodation.location === 'string' 
        ? day.accommodation.location 
        : day.accommodation.location?.address || day.accommodation.location?.city || `${day.accommodation.location?.latitude},${day.accommodation.location?.longitude}`;
      text += `   📍 ${location}\n`;
      text += `   💵 ₹${day.accommodation.costPerNight}/night\n`;
      if (day.accommodation.rating) {
        text += `   ⭐ ${day.accommodation.rating}/5\n`;
      }
      text += `\n`;
    }

    // Activities
    if (day.activities && day.activities.length > 0) {
      text += `🎯 ACTIVITIES\n`;
      day.activities.forEach((activity: any, idx: number) => {
        text += `\n   ${idx + 1}. ${activity.name}\n`;
        if (activity.time) {
          text += `      ⏰ ${activity.time}`;
          if (activity.duration) {
            text += ` (${activity.duration})`;
          }
          text += `\n`;
        }
        if (activity.description) {
          text += `      📝 ${activity.description}\n`;
        }
        const actLocation = typeof activity.location === 'string'
          ? activity.location
          : activity.location?.address || activity.location?.city || `${activity.location?.latitude},${activity.location?.longitude}`;
        text += `      📍 ${actLocation}\n`;
        text += `      💵 ₹${activity.cost}\n`;
      });
      text += `\n`;
    }

    // Transportation
    if (day.transportation) {
      text += `🚗 TRANSPORTATION\n`;
      text += `   Type: ${day.transportation.type || day.transportation.mode}\n`;
      text += `   Cost: ₹${day.transportation.cost}\n`;
      text += `\n`;
    }

    text += `\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `\n✨ Generated with TourPlanner AI\n`;
  text += `🌐 Plan your perfect trip!\n`;

  return text;
}

/**
 * Generate WhatsApp share URL with formatted itinerary
 */
export function shareToWhatsApp(data: ItineraryData): void {
  const text = formatItineraryAsText(data);
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  
  // Open WhatsApp in new window
  window.open(whatsappUrl, '_blank');
}

/**
 * Generate PDF from itinerary data
 */
export async function exportToPDF(data: ItineraryData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color[0], color[1], color[2]);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(fontSize * 0.5);
      pdf.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
  };

  // Title
  pdf.setFillColor(59, 130, 246); // Blue background
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.destination.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('Travel Itinerary', pageWidth / 2, 30, { align: 'center' });
  
  yPosition = 50;

  // Overview Section
  pdf.setDrawColor(200, 200, 200);
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'FD');
  
  yPosition += 7;
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  if (data.travelDates) {
    pdf.text(`Dates: ${formatDate(data.travelDates.startDate)} - ${formatDate(data.travelDates.endDate)}`, margin + 5, yPosition);
    yPosition += 6;
  }
  
  pdf.text(`Duration: ${data.totalDays} day${data.totalDays > 1 ? 's' : ''}`, margin + 5, yPosition);
  yPosition += 6;
  pdf.text(`Total Cost: Rs. ${data.totalCost.toLocaleString()}`, margin + 5, yPosition);
  yPosition += 6;
  
  if (data.budget) {
    pdf.text(`Budget: Rs. ${data.budget.toLocaleString()}`, margin + 5, yPosition);
    yPosition += 6;
  }
  
  yPosition += 10;

  // Iterate through days
  data.itinerary.forEach((day: any, dayIndex: number) => {
    checkPageBreak(20);
    
    // Day Header
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Day ${day.day}${day.date ? ` - ${formatDate(day.date)}` : ''}`, margin + 5, yPosition + 7);
    yPosition += 15;

    // Accommodation
    if (day.accommodation) {
      checkPageBreak(25);
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ACCOMMODATION', margin, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(day.accommodation.name, margin + 5, yPosition);
      yPosition += 5;
      const location = typeof day.accommodation.location === 'string'
        ? day.accommodation.location
        : day.accommodation.location?.address || day.accommodation.location?.city || `${day.accommodation.location?.latitude},${day.accommodation.location?.longitude}`;
      pdf.text(`Location: ${location}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Cost: Rs. ${day.accommodation.costPerNight}/night`, margin + 5, yPosition);
      
      if (day.accommodation.rating) {
        pdf.text(`Rating: ${day.accommodation.rating}/5`, margin + 60, yPosition);
      }
      yPosition += 8;
    }

    // Activities
    if (day.activities && day.activities.length > 0) {
      checkPageBreak(15);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ACTIVITIES', margin, yPosition);
      yPosition += 6;

      day.activities.forEach((activity: any, actIdx: number) => {
        checkPageBreak(20);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${actIdx + 1}. ${activity.name}`, margin + 5, yPosition);
        yPosition += 5;
        
        pdf.setFont('helvetica', 'normal');
        if (activity.time) {
          pdf.text(`Time: ${activity.time}${activity.duration ? ` (${activity.duration})` : ''}`, margin + 8, yPosition);
          yPosition += 5;
        }
        
        if (activity.description) {
          const descLines = pdf.splitTextToSize(activity.description, contentWidth - 10);
          descLines.forEach((line: string) => {
            checkPageBreak(5);
            pdf.text(line, margin + 8, yPosition);
            yPosition += 5;
          });
        }
        
        const actLocation = typeof activity.location === 'string'
          ? activity.location
          : activity.location?.address || activity.location?.city || `${activity.location?.latitude},${activity.location?.longitude}`;
        pdf.text(`Location: ${actLocation}`, margin + 8, yPosition);
        yPosition += 5;
        pdf.text(`Cost: Rs. ${activity.cost}`, margin + 8, yPosition);
        yPosition += 7;
      });
    }

    // Transportation
    if (day.transportation) {
      checkPageBreak(15);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TRANSPORTATION', margin, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Type: ${day.transportation.type || day.transportation.mode}`, margin + 5, yPosition);
      yPosition += 5;
      pdf.text(`Cost: Rs. ${day.transportation.cost}`, margin + 5, yPosition);
      yPosition += 8;
    }

    // Add spacing between days
    yPosition += 5;
    
    // Draw separator line if not last day
    if (dayIndex < data.itinerary.length - 1) {
      checkPageBreak(5);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
  });

  // Footer on last page
  checkPageBreak(20);
  yPosition = pageHeight - 20;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Generated with TourPlanner AI', pageWidth / 2, yPosition, { align: 'center' });
  pdf.text('Plan your perfect trip!', pageWidth / 2, yPosition + 5, { align: 'center' });

  // Save the PDF
  const fileName = `${data.destination.replace(/\s+/g, '_')}_Itinerary.pdf`;
  pdf.save(fileName);
}

/**
 * Copy itinerary text to clipboard
 */
export async function copyToClipboard(data: ItineraryData): Promise<void> {
  const text = formatItineraryAsText(data);
  await navigator.clipboard.writeText(text);
}

/**
 * Helper function to format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

