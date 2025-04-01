
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Sparkles, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const FinancialAdvisor = () => {
  const { toast } = useToast();
  const { userId } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Wealth AI Financial Advisor powered by Gemini 1.5. I can help you manage your finances, create budgets, suggest investment strategies, and more. How can I assist you today?"
    }
  ]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Call the Supabase edge function to get financial advice
      const { data, error } = await supabase.functions.invoke('financial-advice', {
        body: { 
          query: input,
          userId: userId // Pass the userId to the edge function
        }
      });

      if (error) {
        console.error("Error calling financial-advice function:", error);
        throw new Error(error.message || "Failed to get financial advice");
      }

      // Add the AI response to the chat
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: data?.response || "I apologize, but I'm unable to process your request at the moment. Please try again later."
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      toast({
        title: "AI Response Generated",
        description: "Your financial advice has been generated."
      });
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      
      // Add error message to the chat
      const errorMessage = { 
        role: 'assistant' as const, 
        content: "I apologize, but I encountered an error while generating financial advice. Please try again later."
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to generate financial advice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format message content with paragraphs and bullet points
  const formatMessageContent = (content: string) => {
    if (!content) return '';

    // Split the text by newlines to handle paragraphs
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // If paragraph starts with a bullet point (•), format as a list item
      if (paragraph.trim().startsWith('•')) {
        return (
          <ul key={index} className="list-disc pl-6 space-y-1 my-2">
            {paragraph.split('\n').map((line, lineIndex) => (
              <li key={`${index}-${lineIndex}`} className="text-sm">
                {line.trim().startsWith('•') ? line.trim().substring(1).trim() : line.trim()}
              </li>
            ))}
          </ul>
        );
      }
      
      // Handle lines with bullet points within a paragraph
      if (paragraph.includes('\n• ')) {
        const lines = paragraph.split('\n');
        const firstLine = lines[0];
        const bulletPoints = lines.slice(1).filter(line => line.trim().startsWith('•'));
        
        return (
          <div key={index} className="mb-2">
            <p className="text-sm mb-1">{firstLine}</p>
            <ul className="list-disc pl-6 space-y-1">
              {bulletPoints.map((point, pointIndex) => (
                <li key={`${index}-bullet-${pointIndex}`} className="text-sm">
                  {point.trim().startsWith('•') ? point.trim().substring(1).trim() : point.trim()}
                </li>
              ))}
            </ul>
          </div>
        );
      }
      
      // Regular paragraph
      return <p key={index} className="text-sm mb-2">{paragraph}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold">Financial Advisor</h1>
        <p className="text-muted-foreground mt-1 mb-6">
          Get personalized financial advice powered by Gemini 1.5 AI
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-270px)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot size={20} />
                  <span>AI Financial Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[calc(100%-5rem)]">
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'user' 
                            ? <User size={16} /> 
                            : <Sparkles size={16} className="text-primary" />
                          }
                          <span className="text-xs font-medium">
                            {message.role === 'user' ? 'You' : 'Wealth AI'}
                          </span>
                        </div>
                        <div className="text-sm">
                          {formatMessageContent(message.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-primary" />
                          <span className="text-xs font-medium">Wealth AI</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Ask for financial advice..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || loading}
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Suggested Topics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setInput("Based on my transaction history, how should I budget my monthly income?")}
                >
                  Budget planning
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setInput("Looking at my accounts, what investment strategies would you recommend for me?")}
                >
                  Investment advice
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setInput("Based on my spending patterns, how can I reduce my monthly expenses?")}
                >
                  Expense optimization
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setInput("Analyze my current financial situation and suggest ways to improve my savings.")}
                >
                  Savings goals
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setInput("What tax strategies should I consider based on my income and expenses?")}
                >
                  Tax optimization
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FinancialAdvisor;
