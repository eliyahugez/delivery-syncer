import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, ExternalLink, AlertTriangle, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const LoginForm: React.FC = () => {
  const [name, setName] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם",
        variant: "destructive",
      });
      return;
    }

    if (!sheetsUrl.trim() || !validateSheetUrl(sheetsUrl)) {
      toast({
        title: "שגיאה",
        description: "נא להזין קישור Google Sheets תקין",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a unique ID for the user
      const userId = uuidv4();
      await login({ name, sheetsUrl, id: userId });
      toast({
        title: "ברוך הבא!",
        description: `התחברת בהצלחה, ${name}`,
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "שגיאה בהתחברות",
        description: "אירעה שגיאה בעת התחברות למערכת, נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate Google Sheets URL
  const validateSheetUrl = (url: string): boolean => {
    return url.includes("docs.google.com/spreadsheets");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass max-w-md w-full mx-auto p-8 rounded-xl"
    >
      <h2 className="text-2xl font-semibold mb-6 text-center">כניסה למערכת</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">שם השליח</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הזן את שמך"
            className="input-glass"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sheetsUrl">קישור ל-Google Sheets</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <HelpCircle size={14} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm p-4" side="top">
                <h4 className="font-medium mb-2">מבנה גיליון מומלץ:</h4>
                <p className="mb-2">
                  המערכת תנסה לזהות אוטומטית את העמודות בגיליון, אך מומלץ להשתמש
                  בכותרות הבאות:
                </p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                  <li>מספר מעקב / Tracking</li>
                  <li>שם לקוח / Name</li>
                  <li>טלפון / Phone</li>
                  <li>כתובת / Address</li>
                  <li>סטטוס / Status</li>
                  <li>שליח / Courier</li>
                  <li>תאריך / Date</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            id="sheetsUrl"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="input-glass"
            dir="ltr"
          />
          <div className="flex items-start mt-2 text-xs text-muted-foreground">
            <Info size={14} className="mr-1 mt-0.5 flex-shrink-0" />
            <p>
              הקישור חייב להיות לגיליון Google Sheets עם הרשאות צפייה ציבוריות.
              המערכת תנסה לזהות אוטומטית את העמודות בגיליון שלך.
            </p>
          </div>
        </div>

        <Alert className="bg-secondary/50 border-primary/20">
          <AlertTitle className="text-sm font-medium">
            הנחיות להגדרת הגיליון
          </AlertTitle>
          <AlertDescription className="text-xs">
            <div className="flex flex-col space-y-2">
              <p>
                <strong>חשוב: </strong>
                עליך לפתוח את הרשאות השיתוף של הגיליון ל"כל מי שיש לו הקישור
                יכול לצפות".
              </p>
              <div className="flex items-start gap-2 mt-2">
                <AlertTriangle
                  size={16}
                  className="text-warning shrink-0 mt-0.5"
                />
                <p className="text-xs">
                  המערכת תזהה אוטומטית עמודות בגיליון אפילו אם הכותרות שונות
                  מהמומלץ. אם לחלק מהמשלוחים חסרים פרטים, הם יוצגו במערכת עם
                  ערכי ברירת מחדל.
                </p>
              </div>
              <a
                href="https://support.google.com/docs/answer/2494822?hl=iw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink size={12} />
                <span>למידע נוסף על שיתוף קבצים בגוגל</span>
              </a>
            </div>
          </AlertDescription>
        </Alert>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              מתחבר...
            </span>
          ) : (
            "כניסה"
          )}
        </Button>
      </form>
    </motion.div>
  );
};

export default LoginForm;
