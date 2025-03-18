
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoginForm from '@/components/login/LoginForm';
import Header from '@/components/layout/Header';
import { useAuth } from '@/context/AuthContext';

const Index: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      
      <div className="container px-4 py-8 mx-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold mb-4">סנכרון משלוחים</h1>
              <p className="text-muted-foreground text-lg">
                ניהול ומעקב אחר משלוחים בסנכרון עם Google Sheets
              </p>
            </motion.div>
          </div>
          
          <LoginForm />
          
          <div className="mt-12 glass p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">איך זה עובד?</h2>
            <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
              <li>התחבר עם שמך והזן קישור לגיליון Google Sheets המכיל את רשימת המשלוחים.</li>
              <li>צפה ברשימת המשלוחים המעודכנת בכל רגע.</li>
              <li>עדכן את סטטוס המשלוחים בקלות והשינויים יסתנכרנו עם הגיליון.</li>
              <li>התקשר ללקוחות ישירות מהאפליקציה.</li>
              <li>המערכת תמשיך לעבוד גם ללא חיבור לאינטרנט ותסנכרן כשהחיבור יחזור.</li>
            </ol>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
