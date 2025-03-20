
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUpRightSquare, AlertCircle, CheckCircle, Upload, Link2 } from "lucide-react";
import Papa from "papaparse";
import { Progress } from "@/components/ui/progress";
import { analyzeColumns, normalizeSheetData } from "@/utils/sheetAnalyzer";
import { STORAGE_KEYS, saveToStorage } from "@/utils/localStorage";

interface DeliveryImportProps {
  onImportComplete: (data: any[], mappings: Record<string, string>) => void;
  onClose?: () => void;
}

const DeliveryImport: React.FC<DeliveryImportProps> = ({ onImportComplete, onClose }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("file");
  const [importProgress, setImportProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [detectedFormat, setDetectedFormat] = useState<string>("unknown");
  const [sheetsUrl, setSheetsUrl] = useState<string>("");
  const [fileData, setFileData] = useState<{
    headers: string[];
    data: any[][];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsAnalyzing(true);
    setImportProgress(10);
    
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setImportProgress(40);
          
          try {
            // Extract headers and data
            const headers = results.data[0] as string[];
            const data = results.data.slice(1) as any[][];
            
            setFileData({ headers, data });
            
            // Analyze columns and detect mappings
            setImportProgress(60);
            analyzeImportedData(headers, data);
            
            setImportProgress(100);
            
            toast({
              title: "קובץ נטען בהצלחה",
              description: `זוהו ${headers.length} עמודות ו-${data.length} שורות נתונים`,
            });
          } catch (error) {
            console.error("Error processing file:", error);
            
            toast({
              title: "שגיאה בעיבוד הקובץ",
              description: "פורמט הקובץ אינו תקין או שאין מספיק נתונים לניתוח",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "שגיאה בטעינת הקובץ",
            description: "הקובץ ריק או לא בפורמט הנכון",
            variant: "destructive",
          });
        }
        
        setIsAnalyzing(false);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        
        toast({
          title: "שגיאה בטעינת הקובץ",
          description: error.message,
          variant: "destructive",
        });
        
        setIsAnalyzing(false);
      },
    });
  };
  
  // Handle Google Sheets URL import
  const handleSheetsImport = async () => {
    if (!sheetsUrl) {
      toast({
        title: "כתובת חסרה",
        description: "נא להזין קישור לגיליון Google Sheets",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(10);
    
    try {
      // Save the sheets URL for future use
      saveToStorage(STORAGE_KEYS.USER_PREFERENCES, {
        lastSheetsUrl: sheetsUrl
      });
      
      // Continue with existing fetch logic for now
      // In the future we'll implement direct API access
      
      toast({
        title: "מייבא נתונים מ-Google Sheets",
        description: "אנא המתן בזמן שאנו מייבאים את הנתונים",
      });
      
      // We'll just forward this to the parent component for now
      // Later we'll implement direct Sheets API access
      onImportComplete([], { sheetsUrl });
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error importing from Google Sheets:", error);
      
      toast({
        title: "שגיאה בייבוא נתונים",
        description: error instanceof Error ? error.message : "שגיאה לא ידועה בייבוא מ-Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };
  
  // Analyze imported data
  const analyzeImportedData = (headers: string[], data: any[][]) => {
    const sampleSize = Math.min(data.length, 50); // Use up to 50 rows for analysis
    const sampleData = data.slice(0, sampleSize);
    
    // Get previous mappings from localStorage if available
    const prevMappings = {};
    
    const analysisResult = analyzeColumns(headers, sampleData, prevMappings);
    
    setColumnMappings(analysisResult.columnMappings);
    setConfidence(analysisResult.confidence);
    setUnmappedColumns(analysisResult.unmappedColumns);
    setDetectedFormat(analysisResult.detectedFormat);
    
    console.log("Analysis results:", analysisResult);
  };
  
  // Update the manual column mapping
  const updateColumnMapping = (fieldName: string, headerName: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [fieldName]: headerName
    }));
    
    // Recalculate unmapped columns
    const requiredFields = ['trackingNumber', 'name', 'address', 'phone', 'status'];
    const updatedMappings = {
      ...columnMappings,
      [fieldName]: headerName
    };
    
    const newUnmapped = requiredFields.filter(field => !updatedMappings[field]);
    setUnmappedColumns(newUnmapped);
  };
  
  // Complete the import process
  const completeImport = () => {
    if (!fileData) return;
    
    try {
      const normalizedData = normalizeSheetData(
        fileData.data,
        fileData.headers,
        columnMappings
      );
      
      onImportComplete(normalizedData, columnMappings);
      
      toast({
        title: "ייבוא הושלם בהצלחה",
        description: `${normalizedData.length} משלוחים יובאו בהצלחה`,
      });
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error completing import:", error);
      
      toast({
        title: "שגיאה בהשלמת הייבוא",
        description: error instanceof Error ? error.message : "שגיאה לא ידועה בעיבוד הנתונים",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>ייבוא משלוחים</CardTitle>
        <CardDescription>
          ייבא משלוחים מקובץ CSV או גיליון Google Sheets
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">ייבוא מקובץ</TabsTrigger>
            <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">בחר קובץ CSV/Excel</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isAnalyzing}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  בחר קובץ
                </Button>
              </div>
            </div>
            
            {(isAnalyzing || importProgress > 0) && (
              <div className="space-y-2">
                <Label>מתבצע ניתוח...</Label>
                <Progress value={importProgress} />
              </div>
            )}
            
            {unmappedColumns.length > 0 && fileData && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-semibold text-amber-800">זוהו {unmappedColumns.length} שדות חסרים</h4>
                    <p className="text-amber-700 text-sm">
                      נא למפות את העמודות החסרות באופן ידני:
                    </p>
                    
                    <div className="space-y-3 mt-3">
                      {unmappedColumns.map(field => (
                        <div key={field} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Label className="w-32 text-amber-800">{getFieldHebrewName(field)}:</Label>
                          <select 
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            onChange={(e) => updateColumnMapping(field, e.target.value)}
                            value={columnMappings[field] || ''}
                          >
                            <option value="">--- בחר עמודה ---</option>
                            {fileData.headers.map((header, idx) => (
                              <option key={idx} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {fileData && Object.keys(columnMappings).length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mt-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-semibold text-emerald-800">זוהו {Object.keys(columnMappings).length} שדות בהצלחה</h4>
                    <p className="text-emerald-700 text-sm">
                      זיהינו את המבנה הבא בקובץ: <span className="font-semibold">{formatDetectedType(detectedFormat)}</span>
                    </p>
                    
                    <div className="mt-3 space-y-1">
                      {Object.entries(columnMappings).map(([field, header]) => (
                        <div key={field} className="flex items-center text-sm">
                          <span className="font-medium w-32 text-emerald-800">{getFieldHebrewName(field)}:</span>
                          <span className="text-emerald-700">{header}</span>
                          <span className="text-emerald-500 text-xs mr-2">
                            ({Math.round(confidence[field] || 0)}% בטוח)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sheets" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheets-url">הזן קישור לגיליון Google Sheets</Label>
              <div className="flex gap-2">
                <Input
                  id="sheets-url"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  disabled={isImporting}
                />
                <Button
                  variant="secondary"
                  onClick={handleSheetsImport}
                  disabled={isImporting || !sheetsUrl}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  ייבא
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                הגיליון חייב להיות משותף לציבור עם הרשאות קריאה לפחות
              </p>
            </div>
            
            {(isImporting || importProgress > 0) && (
              <div className="space-y-2">
                <Label>מתבצע ייבוא...</Label>
                <Progress value={importProgress} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          ביטול
        </Button>
        
        <Button 
          onClick={completeImport}
          disabled={
            isAnalyzing || 
            isImporting || 
            !fileData || 
            Object.keys(columnMappings).length === 0 ||
            unmappedColumns.length > 0
          }
        >
          <ArrowUpRightSquare className="h-4 w-4 mr-2" />
          סיים ייבוא
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper function to get Hebrew field names
function getFieldHebrewName(field: string): string {
  const fieldNames: Record<string, string> = {
    trackingNumber: 'מספר מעקב',
    name: 'שם לקוח',
    address: 'כתובת',
    phone: 'טלפון',
    status: 'סטטוס',
    assignedTo: 'שליח',
    scanDate: 'תאריך סריקה',
    statusDate: 'תאריך עדכון'
  };
  
  return fieldNames[field] || field;
}

// Helper function to format detected type name
function formatDetectedType(type: string): string {
  const typeNames: Record<string, string> = {
    unknown: 'לא ידוע',
    israel_post: 'דואר ישראל',
    generic_delivery: 'משלוחים כללי'
  };
  
  return typeNames[type] || type;
}

export default DeliveryImport;
