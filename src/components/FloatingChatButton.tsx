import React, { useState } from 'react';
import { Bot, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ChatAssistant from '@/components/ChatAssistant';

interface Email {
  id: string;
  subject: string;
  sender: string;
  received_date: string;
  classification: string | null;
  threat_level: string | null;
  confidence: number | null;
  keywords: string[] | null;
  content?: string;
  raw_content?: string;
}

interface FloatingChatButtonProps {
  selectedEmail: Email | null;
  emails: Email[];
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ selectedEmail, emails }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-center justify-center">
              {isOpen ? (
                <X className="h-6 w-6 text-primary-foreground" />
              ) : (
                <Bot className="h-6 w-6 text-primary-foreground animate-pulse" />
              )}
            </div>
            
            {/* Pulse animation ring */}
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            
            {/* Chat indicator */}
            {!isOpen && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent 
          side="right" 
          className="w-[400px] sm:w-[500px] p-0 border-border/20 bg-card/95 backdrop-blur-sm"
        >
          <div className="h-full">
            <ChatAssistant selectedEmail={selectedEmail} emails={emails} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FloatingChatButton;