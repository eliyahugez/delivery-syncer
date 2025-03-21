
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowRight, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Table, 
  X 
} from "lucide-react";

interface DeliveryImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sheetsUrl: string;
  onSubmit: (columnMappings: Record<string, number>) => void;
}

const DeliveryImportWizard: React.FC<DeliveryImportWizardProps> = ({
  isOpen,
  onClose,
  sheetsUrl,
  onSubmit
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, number>>({});
  
  // Field definitions
  const requiredFields = [
    { id: 'trackingNumber', label: 'מספר מעקב', required: true },
    { id: 'name', label: 'שם לקוח', required: true },
    { id: 'phone', label: 'טלפון', required: false },
    { id: 'address', label: 'כתובת', required: true },
    { id: 'status', label: 'סטטוס', required: false },
    { id: 'statusDate', label: 'תאריך עדכון', required: false },
    { id: 'assignedTo', label: 'שליח', required: false }
  ];
  
  // Fetch headers and sample data
  const fetchSheetData = async () => {
    if (!sheetsUrl) {
      toast({
        title: "שגיאה",
        description: "אנא הזן קישור לגיליון Google Sheets",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setProgress(20);
    
    try {
      // For now we'll simulate this - in a real implementation, you'd call the API endpoint
      // that reads the headers and first few rows from the sheet
      setTimeout(() => {
        // Sample data - in reality this would come from an API call
        const mockHeaders = ['מספר מעקב', 'סטטוס', 'תאריך', 'שם לקוח', 'כתובת', 'טלפון', 'הערות'];
        const mockData = [
          ['GWD12345678', 'נמסר', '18/3/2025', 'ישראל ישראלי', 'רח\' הרצל 1, תל אביב', '054-1234567', ''],
          ['GWD87654321', 'בדרך', '18/3/2025', 'משה כהן', 'שד\' רוטשילד 15, תל אביב', '050-7654321', '']
        ];
        
        setHeaders(mockHeaders);
        setSampleData(mockData);
        
        // Auto-detect mappings
        const autoMappings: Record<string, number> = {};
        mockHeaders.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          
          if (lowerHeader.includes('מעקב') || lowerHeader.includes('מספר')) {
            autoMappings.trackingNumber = index;
          } else if (lowerHeader.includes('סטטוס') || lowerHeader.includes('מצב')) {
            autoMappings.status = index;
          } else if (lowerHeader.includes('תאריך')) {
            autoMappings.statusDate = index;
          } else if (lowerHeader.includes('שם') || lowerHeader.includes('לקוח')) {
            autoMappings.name = index;
          } else if (lowerHeader.includes('כתובת')) {
            autoMappings.address = index;
          } else if (lowerHeader.includes('טלפון') || lowerHeader.includes('נייד')) {
            autoMappings.phone = index;
          } else if (lowerHeader.includes('שליח') || lowerHeader.includes('מחלק')) {
            autoMappings.assignedTo = index;
          }
        });
        
        setColumnMappings(autoMappings);
        setProgress(100);
        setIsLoading(false);
        setStep(2);
      }, 1500);
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את נתוני הגיליון. אנא נסה שנית.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  // Handle column mapping change
  const handleMappingChange = (fieldId: string, columnIndex: number | null) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev };
      
      if (columnIndex === null) {
        delete newMappings[fieldId];
      } else {
        newMappings[fieldId] = columnIndex;
      }
      
      return newMappings;
    });
  };
  
  // Check if all required fields are mapped
  const isReadyToImport = () => {
    return requiredFields
      .filter(field => field.required)
      .every(field => columnMappings[field.id] !== undefined);
  };
  
  // Handle submit
  const handleSubmit = () => {
    if (!isReadyToImport()) {
      toast({
        title: "שגיאה",
        description: "חסרים מיפויים לשדות נדרשים",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the mappings
    onSubmit(columnMappings);
    onClose();
  };
  
  // Get step content
  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              אשף זה יעזור לך למפות את העמודות בגיליון Google Sheets שלך למערכת.
              הקישור לגיליון הוא:
            </p>
            
            <div className="p-2 bg-muted rounded-md">
              <code className="text-xs break-all">{sheetsUrl}</code>
            </div>
            
            <p className="text-sm font-medium">
              לפני שנמשיך, וודא שהגיליון שלך:
            </p>
            
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>מוגדר לשיתוף פומבי (או לפחות לצפייה)</li>
              <li>כולל שורת כותרות בשורה הראשונה</li>
              <li>כולל את הנתונים הבאים: מספר מעקב, שם לקוח, כתובת</li>
            </ul>
            
            {isLoading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>טוען נתונים מהגיליון...</Label>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : (
              <Button onClick={fetchSheetData} className="w-full">
                <Database className="mr-2 h-4 w-4" />
                טען נתונים מהגיליון
              </Button>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              כעת מפה את העמודות מהגיליון שלך לשדות במערכת.
              בחר את העמודה המתאימה לכל שדה.
            </p>
            
            <div className="border rounded-md overflow-hidden mb-4">
              <div className="grid grid-cols-7 gap-1 bg-muted p-2 text-xs font-medium">
                {headers.map((header, i) => (
                  <div key={i} className="truncate" title={header}>
                    {header}
                  </div>
                ))}
              </div>
              
              {sampleData.slice(0, 2).map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-1 p-2 text-xs border-t">
                  {row.map((cell, cellIndex) => (
                    <div key={cellIndex} className="truncate" title={cell}>
                      {cell}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div className="space-y-3">
              {requiredFields.map(field => (
                <div key={field.id} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="text-right">
                    {field.label}
                    {field.required && <span className="text-destructive mr-1">*</span>}
                  </Label>
                  
                  <div className="col-span-2">
                    <Select
                      value={columnMappings[field.id]?.toString() || ""}
                      onValueChange={(value) => 
                        handleMappingChange(field.id, value ? parseInt(value) : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר עמודה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          <span className="text-muted-foreground">-- לא נבחר --</span>
                        </SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {columnMappings[field.id] !== undefined && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        דוגמה: {sampleData[0]?.[columnMappings[field.id]] || ''}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronRight className="mr-2 h-4 w-4" />
                חזרה
              </Button>
              
              <Button 
                onClick={handleSubmit} 
                disabled={!isReadyToImport()}
                className="gap-2"
              >
                {isReadyToImport() ? (
                  <>
                    <Check className="h-4 w-4" />
                    ייבא משלוחים
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    חסרים שדות נדרשים
                  </>
                )}
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>אשף ייבוא משלוחים</DialogTitle>
          <DialogDescription>
            מפה את העמודות מגיליון ה-Google Sheets שלך למערכת
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="flex mb-6">
            <div className="flex-1 text-center">
              <div className={`
                rounded-full h-9 w-9 flex items-center justify-center mx-auto
                ${step === 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}>
                1
              </div>
              <div className="mt-1 text-xs font-medium">
                טעינת נתונים
              </div>
            </div>
            
            <div className="w-16 flex items-center justify-center">
              <div className={`h-0.5 w-full ${step > 1 ? 'bg-primary' : 'bg-muted'}`}></div>
            </div>
            
            <div className="flex-1 text-center">
              <div className={`
                rounded-full h-9 w-9 flex items-center justify-center mx-auto
                ${step === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
              `}>
                2
              </div>
              <div className="mt-1 text-xs font-medium">
                מיפוי עמודות
              </div>
            </div>
          </div>
          
          {getStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryImportWizard;
