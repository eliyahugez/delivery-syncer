
export function openNavigation(address: string) {
  // Open in navigation app
  const encodedAddress = encodeURIComponent(address);
  
  // Check if on mobile device
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // On mobile, try to use Waze
    window.open(`https://waze.com/ul?q=${encodedAddress}`, '_blank');
  } else {
    // On desktop, open in Google Maps
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  }
}

export function openWhatsApp(phone: string, message: string = 'היי זה שליח') {
  // Format the phone number (remove +, spaces, etc.)
  const formattedPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
}

export function makePhoneCall(phone: string) {
  window.open(`tel:${phone}`, '_blank');
}
