"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Language = "en" | "hi";

const translations: Record<string, string> = {
  "Transport desk": "परिवहन डेस्क",
  "Choose a workspace action.": "कार्यस्थल कार्रवाई चुनें।",
  "Sign out": "साइन आउट",
  "New transport request": "नया परिवहन अनुरोध",
  "Vendor Master": "वेंडर मास्टर",
  "Consignee Master": "कंसाइनी मास्टर",
  "Company users": "कंपनी उपयोगकर्ता",
  "Compare vendor quotes": "वेंडर कोटेशन तुलना",
  Shipments: "शिपमेंट",
  "Live notifications": "लाइव सूचनाएं",
  "No notifications yet": "अभी कोई सूचना नहीं",
  Dashboard: "डैशबोर्ड",
  "Shipment workflow": "शिपमेंट वर्कफ्लो",
  "Active shipments": "सक्रिय शिपमेंट",
  "No shipments yet": "अभी कोई शिपमेंट नहीं",
  "Truck and driver details": "ट्रक और ड्राइवर विवरण",
  "Approve driver details": "ड्राइवर विवरण स्वीकृत करें",
  Loading: "लोडिंग",
  "Start loading": "लोडिंग शुरू करें",
  "Add loading point": "लोडिंग पॉइंट जोड़ें",
  "Upload weight slip": "वजन पर्ची अपलोड करें",
  "Move to In Transit": "ट्रांजिट में भेजें",
  "Delivery POD approvals": "डिलीवरी POD स्वीकृति",
  "POD pending": "POD लंबित",
  "Approve POD": "POD स्वीकृत करें",
  "Approve final delivery": "अंतिम डिलीवरी स्वीकृत करें",
  "Invoice and payment": "इनवॉइस और भुगतान",
  "Open invoice": "इनवॉइस खोलें",
  "Verify invoice": "इनवॉइस स्वीकृत करें",
  "Payment processed": "भुगतान प्रोसेस हुआ",
  "Payment completed": "भुगतान पूर्ण हुआ",
  "Close order": "ऑर्डर बंद करें",
  "Recent notifications": "हाल की सूचनाएं",
  "Shipment timeline": "शिपमेंट टाइमलाइन",
  "Vendor quote": "वेंडर कोटेशन",
  "Request details": "अनुरोध विवरण",
  Route: "मार्ग",
  Source: "स्रोत",
  Destination: "गंतव्य",
  Dispatch: "डिस्पैच",
  "Bidding closes": "बोली बंद होने का समय",
  Load: "लोड",
  "Need clarification?": "स्पष्टीकरण चाहिए?",
  "Final quote": "अंतिम कोटेशन",
  "Order confirmation": "ऑर्डर पुष्टि",
  "Order details": "ऑर्डर विवरण",
  Pickup: "पिकअप",
  Invoice: "इनवॉइस",
  "Truck, driver, and invoice": "ट्रक, ड्राइवर और इनवॉइस",
  "Driver and vehicle documents": "ड्राइवर और वाहन दस्तावेज",
  "Truck number": "ट्रक नंबर",
  "Driver mobile": "ड्राइवर मोबाइल",
  "Driver name": "ड्राइवर का नाम",
  "Driver license image": "ड्राइवर लाइसेंस छवि",
  "Vehicle RC image": "वाहन RC छवि",
  "Truck image": "ट्रक छवि",
  "Submit for verification": "सत्यापन के लिए जमा करें",
  "Delivery Bilty and GRN/POD uploads": "डिलीवरी बिल्टी और GRN/POD अपलोड",
  "Upload Bilty and POD": "बिल्टी और POD अपलोड करें",
  "Admin approval required": "एडमिन स्वीकृति आवश्यक",
  "POD approved": "POD स्वीकृत",
  "Invoice upload": "इनवॉइस अपलोड",
  "Invoice number": "इनवॉइस नंबर",
  "Invoice amount": "इनवॉइस राशि",
  "Upload invoice PDF/photo": "इनवॉइस PDF/फोटो अपलोड करें",
  "Submit invoice": "इनवॉइस जमा करें",
  Pending: "लंबित",
  "Current status": "वर्तमान स्थिति",
  "Submit Quote": "कोटेशन जमा करें",
  Material: "सामग्री",
  Quantity: "मात्रा",
  "Truck Requirement": "ट्रक आवश्यकता",
  "Bid Closing Date & Time": "बोली बंद होने की तारीख और समय",
  "Request No": "अनुरोध संख्या",
  "Target Delivery": "लक्षित डिलीवरी",
  English: "English",
  Hindi: "हिन्दी"
};

function applyLanguage(language: Language) {
  document.documentElement.lang = language === "hi" ? "hi" : "en";
  document.querySelectorAll<HTMLElement>("body *").forEach((node) => {
    if (node.children.length > 0 || node.dataset.i18nSkip === "true") {
      return;
    }

    if (!node.dataset.i18nSource) {
      const text = node.textContent?.trim();
      if (text) {
        node.dataset.i18nSource = text;
      }
    }

    const source = node.dataset.i18nSource;
    if (!source) {
      return;
    }

    node.textContent = language === "hi" ? translations[source] ?? source : source;
  });
}

export function LanguageTools() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    return window.localStorage.getItem("tms_language") === "hi" ? "hi" : "en";
  });

  useEffect(() => {
    const apply = () => applyLanguage(language);
    apply();
    const timer = window.setTimeout(apply, 50);
    window.localStorage.setItem("tms_language", language);
    return () => window.clearTimeout(timer);
  }, [language, pathname]);

  return (
    <div className="language-switcher" data-i18n-skip="true" aria-label="Language">
      <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>
        English
      </button>
      <button className={language === "hi" ? "active" : ""} type="button" onClick={() => setLanguage("hi")}>
        हिन्दी
      </button>
    </div>
  );
}
