
import { useIsMobile } from '@/hooks/use-mobile';
import { translateAddressToHebrew } from './textCleaners';

export async function openNavigation(address: string) {
  if (!address) return;
  
  try {
    // First translate the address to Hebrew for better Waze results
    const translatedAddress = await translateAddressToHebrew(address);
    console.log(`Navigating to address: ${address}`);
    console.log(`Translated address: ${translatedAddress}`);
    
    // עיבוד הכתובת לפורמט מתאים
    const encodedAddress = encodeURIComponent(translatedAddress);
    
    // בדיקה אם המשתמש במובייל
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // במובייל, ננסה להשתמש בוויז (מועדף לשליחים)
      // אם וויז לא מותקן, יפתח את גוגל מפות
      try {
        window.location.href = `waze://?q=${encodedAddress}&navigate=yes`;
        
        // כגיבוי, אם וויז לא נפתח תוך 2 שניות, פתח בדפדפן
        setTimeout(() => {
          window.open(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`, '_blank');
        }, 2000);
      } catch (e) {
        // אם וויז נכשל, פתח בגוגל מפות
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
      }
    } else {
      // בדסקטופ, פתח בגוגל מפות
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  } catch (error) {
    console.error("Error in navigation:", error);
    // Fallback to original address if translation fails
    const encodedAddress = encodeURIComponent(address);
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = `waze://?q=${encodedAddress}&navigate=yes`;
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  }
}

export function openWhatsApp(phone: string, message: string = 'היי זה שליח מחברת המשלוחים, אני בדרך אליך עם החבילה שלך.') {
  if (!phone) return;
  
  // הסרת תווים שאינם ספרות מהטלפון
  const formattedPhone = phone.replace(/\D/g, '');
  
  // בדיקה אם המספר תקף
  if (formattedPhone.length < 9) return;
  
  // הוספת קידומת בינלאומית אם חסרה
  let internationalPhone = formattedPhone;
  if (formattedPhone.startsWith('0')) {
    internationalPhone = `972${formattedPhone.substring(1)}`;
  } else if (!formattedPhone.startsWith('972')) {
    internationalPhone = `972${formattedPhone}`;
  }
  
  const encodedMessage = encodeURIComponent(message);
  
  // פתיחת וואטסאפ עם הודעה מותאמת אישית
  window.open(`https://wa.me/${internationalPhone}?text=${encodedMessage}`, '_blank');
}

export function makePhoneCall(phone: string) {
  if (!phone) return;
  
  // הסרת תווים שאינם ספרות
  const formattedPhone = phone.replace(/\D/g, '');
  
  // פתיחת חייגן הטלפון
  window.open(`tel:${formattedPhone}`, '_blank');
}
