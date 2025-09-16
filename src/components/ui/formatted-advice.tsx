import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedAdviceProps {
  content: string;
  className?: string;
}

export const FormattedAdvice = ({ content, className }: FormattedAdviceProps) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Skip empty lines but add spacing
        if (elements.length > 0) {
          elements.push(<div key={`space-${index}`} className="h-2" />);
        }
        return;
      }
      
      // Main headers (bold with **)
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        const headerText = trimmedLine.slice(2, -2);
        elements.push(
          <div key={index} className="mt-4 first:mt-0">
            <h3 className="font-semibold text-foreground text-base mb-2 text-orange-600 dark:text-orange-400">
              {headerText}
            </h3>
          </div>
        );
        return;
      }
      
      // Bullet points (• or -)
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        const bulletText = trimmedLine.replace(/^[•-]\s*/, '');
        
        // Check if it's a bold bullet point
        if (bulletText.startsWith('**') && bulletText.includes('**:')) {
          const parts = bulletText.split('**:');
          const boldPart = parts[0].replace('**', '');
          const regularPart = parts[1] || '';
          
          elements.push(
            <div key={index} className="flex items-start space-x-2 mb-2">
              <span className="text-orange-500 mt-1 text-sm font-bold">•</span>
              <div className="flex-1">
                <span className="font-medium text-foreground">{boldPart}:</span>
                <span className="text-muted-foreground ml-1">{regularPart}</span>
              </div>
            </div>
          );
        } else {
          elements.push(
            <div key={index} className="flex items-start space-x-2 mb-2">
              <span className="text-orange-500 mt-1 text-sm font-bold">•</span>
              <span className="text-muted-foreground flex-1 leading-relaxed">{bulletText}</span>
            </div>
          );
        }
        return;
      }
      
      // Numbered items
      if (trimmedLine.match(/^\d+\./)) {
        elements.push(
          <div key={index} className="mb-2">
            <span className="font-medium text-foreground leading-relaxed">{trimmedLine}</span>
          </div>
        );
        return;
      }
      
      // Regular paragraphs
      if (trimmedLine.length > 0) {
        // Check for inline bold text
        const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
        const formattedParts = parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <span key={partIndex} className="font-medium text-foreground">
                {part.slice(2, -2)}
              </span>
            );
          }
          return part;
        });
        
        elements.push(
          <p key={index} className="text-muted-foreground leading-relaxed mb-2">
            {formattedParts}
          </p>
        );
      }
    });
    
    return elements;
  };

  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <div className="space-y-1">
        {formatContent(content)}
      </div>
    </div>
  );
};