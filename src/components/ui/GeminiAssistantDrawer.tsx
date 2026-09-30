import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User,
  Mic,
  Square,
  AlertTriangle,
  Clock,
  Truck,
  ArrowLeftRight,
  FileText,
  Bell,
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Pill,
  CloudSun,
  MapPin,
  Compass
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  getCanonicalMedicineInventoryMetrics,
  getCanonicalOrderMetrics,
  getCanonicalAlertMetrics
} from '../../utils/datasetMetrics.ts';
import { getVoiceBcp47Locale } from '../../utils/registerVoiceCommandParser.ts';
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../../i18n/index.ts';

interface QuickActionItem {
  id: string;
  label: Record<SupportedLanguageCode, string>;
  prompt: Record<SupportedLanguageCode, string>;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const SUGGESTED_PROMPTS: QuickActionItem[] = [
  {
    id: 'summarize_risks',
    label: {
      en: "Summarize today's risks",
      hi: 'आज के जोखिमों का सारांश दें',
      pa: 'ਅੱਜ ਦੇ ਜੋਖਮਾਂ ਦਾ ਸਾਰ ਦਿਓ',
      ta: 'இன்றைய அபாயங்களைச் சுருக்கவும்',
      te: 'నేటి ప్రమాదాలను వివరించండి',
      ml: 'ഇന്നത്തെ അപകടസാധ്യതകൾ സംഗ്രഹിക്കുക'
    },
    prompt: {
      en: "Summarize today's operational risks.",
      hi: 'इस PHC में आज के परिचालन जोखिमों का सारांश दें।',
      pa: 'ਇਸ PHC ਵਿੱਚ ਅੱਜ ਦੇ ਸੰਚਾਲਨ ਜੋਖਮਾਂ ਦਾ ਸਾਰ ਦਿਓ।',
      ta: 'இன்றைய செயல்பாட்டு அபாயங்களைச் சுருக்கவும்.',
      te: 'నేటి ఆపరేషనల్ ప్రమాదాలను సంక్షిప్తంగా వివరించండి.',
      ml: 'ഈ പിഎച്ച്സിയിലെ ഇന്നത്തെ പ്രവർത്തന അപകടസാധ്യതകൾ സംഗ്രഹിക്കുക.'
    },
    icon: FileText,
    badgeColor: 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100'
  },
  {
    id: 'find_critical_stock',
    label: {
      en: 'Find critical stock',
      hi: 'गंभीर कम स्टॉक खोजें',
      pa: 'ਗੰਭੀਰ ਘੱਟ ਸਟਾਕ ਲੱਭੋ',
      ta: 'அவசர குறைந்த இருப்பு',
      te: 'అత్యవసర తక్కువ నిల్వ',
      ml: 'ഗുരുതരമായ കുറഞ്ഞ സ്റ്റോക്ക് കണ്ടെത്തുക'
    },
    prompt: {
      en: 'Which medicines are at highest risk and what should I reorder first?',
      hi: 'आज किन दवाइयों का स्टॉक कम है और मुझे सबसे पहले क्या री-ऑर्डर करना चाहिए?',
      pa: 'ਅੱਜ ਕਿਹੜੀਆਂ ਦਵਾਈਆਂ ਦਾ ਸਟਾਕ ਘੱਟ ਹੈ ਅਤੇ ਮੈਨੂੰ ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਕੀ ਆਰਡਰ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?',
      ta: 'இன்று எந்த மருந்துகள் குறைவாக உள்ளன மற்றும் எதை முதலில் ஆர்டர் செய்ய வேண்டும்?',
      te: 'ఈరోజు ఏ మందులు తక్కువగా ఉన్నాయి మరియు మొదట ఏమి ఆర్డర్ చేయాలి?',
      ml: 'ഇന്ന് ഏതൊക്കെ മരുന്നുകളാണ് കുറവുള്ളത്, ആദ്യം ഏതാണ് റീ-ഓർഡർ ചെയ്യേണ്ടത്?'
    },
    icon: AlertTriangle,
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
  },
  {
    id: 'explain_forecast',
    label: {
      en: 'Explain the demand forecast',
      hi: 'मांग पूर्वानुमान समझाएं',
      pa: 'ਮੰਗ ਪੂਰਵ-ਅਨੁਮਾਨ ਸਮਝਾਓ',
      ta: 'தேவை கணிப்பை விளக்கவும்',
      te: 'డిమాండ్ అంచనాను వివరించండి',
      ml: 'ഡിമാൻഡ് പ്രവചനം വിശദീകരിക്കുക'
    },
    prompt: {
      en: 'Explain this forecast in simple language and what the Medical Officer should do.',
      hi: 'वर्तमान मौसमी मांग पूर्वानुमान को सरल भाषा में समझाएं और चिकित्सा अधिकारी को क्या करना चाहिए।',
      pa: 'ਮੌਜੂਦਾ ਮੰਗ ਪੂਰਵ-ਅਨੁਮਾਨ ਨੂੰ ਸਰਲ ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਓ ਅਤੇ ਮੈਡੀਕਲ ਅਫਸਰ ਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ।',
      ta: 'தற்போதைய தேவை கணிப்பை எளிய மொழியில் விளக்கவும்.',
      te: 'ప్రస్తుత డిమాండ్ అంచనాను సరళమైన భాషలో వివరించండి.',
      ml: 'നിലവിലെ ഡിമാൻഡ് പ്രവചനം ലളിതമായ ഭാഷയിൽ വിശദീകരിക്കുക.'
    },
    icon: CloudSun,
    badgeColor: 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
  },
  {
    id: 'recommend_priority_actions',
    label: {
      en: 'Recommend priority actions',
      hi: 'प्राथमिकता कार्य सुझाएं',
      pa: 'ਤਰਜੀਹੀ ਕਾਰਵਾਈਆਂ ਸੁਝਾਓ',
      ta: 'முன்னுரிமை நடவடிக்கைகள்',
      te: 'ప్రాధాన్యత చర్యలను సూచించండి',
      ml: 'മുൻഗണനാ നടപടികൾ നിർദ്ദേശിക്കുക'
    },
    prompt: {
      en: 'What should I prioritize today and what actions should the Medical Officer take?',
      hi: 'आज मुझे किस चीज़ को प्राथमिकता देनी चाहिए और चिकित्सा अधिकारी को क्या कदम उठाने चाहिए?',
      pa: 'ਅੱਜ ਮੈਨੂੰ ਕਿਸ ਚੀਜ਼ ਨੂੰ ਤਰਜੀਹ ਦੇਣੀ ਚਾਹੀਦੀ ਹੈ ਅਤੇ ਮੈਡੀਕਲ ਅਫਸਰ ਨੂੰ ਕੀ ਕਦਮ ਚੁੱਕਣੇ ਚਾਹੀਦੇ ਹਨ?',
      ta: 'இன்று நான் எதற்கு முன்னுரிமை அளிக்க வேண்டும் மற்றும் மருத்துவ அதிகாரி என்ன நடவடிக்கை எடுக்க வேண்டும்?',
      te: 'ఈరోజు నేను దేనికి ప్రాధాన్యత ఇవ్వాలి మరియు వైద్యాధికారి ఏ చర్యలు తీసుకోవాలి?',
      ml: 'ഇന്ന് ഞാൻ എന്തിനാണ് മുൻഗണന നൽകേണ്ടത്, മെഡിക്കൽ ഓഫീസർ എന്ത് നടപടികൾ സ്വീകരിക്കണം?'
    },
    icon: ShieldCheck,
    badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
  },
  {
    id: 'expiring_soon',
    label: {
      en: 'FEFO Expiring Soon',
      hi: 'शीघ्र एक्सपायरी (FEFO)',
      pa: 'ਜਲਦ ਐਕਸਪਾਇਰੀ (FEFO)',
      ta: 'விரைவில் காலாவதி (FEFO)',
      te: 'త్వరలో గడువు ముగిసేవి (FEFO)',
      ml: 'ഉടൻ കാലാവധി കഴിയുന്നവ (FEFO)'
    },
    prompt: {
      en: 'Show me medicines approaching expiry and FEFO priority batches within 90 days.',
      hi: '90 दिनों के भीतर एक्सपायर होने वाली दवाइयां और FEFO प्राथमिकता वाले बैच दिखाएं।',
      pa: '90 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਐਕਸਪਾਇਰ ਹੋਣ ਵਾਲੀਆਂ ਦਵਾਈਆਂ ਅਤੇ FEFO ਤਰਜੀਹੀ ਬੈਚ ਦਿਖਾਓ।',
      ta: '90 நாட்களுக்குள் காலாவதியாகும் மருந்துகள் மற்றும் FEFO முன்னுரிமை பேட்ச்களைக் காட்டு.',
      te: '90 రోజుల్లో గడువు ముగిసే మందులు మరియు FEFO ప్రాధాన్యత బ్యాచ్‌లను చూపించు.',
      ml: '90 ദിവസത്തിനുള്ളിൽ കാലാവധി കഴിയുന്ന മരുന്നുകളും FEFO മുൻഗണനാ ബാച്ചുകളും കാണിക്കുക.'
    },
    icon: Clock,
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
  },
  {
    id: 'redistribution_help',
    label: {
      en: 'Peer Transfers & Map',
      hi: 'पुनर्वितरण और ट्रांसफर',
      pa: 'ਪੀਅਰ ਟ੍ਰਾਂਸਫਰ ਅਤੇ ਮੈਪ',
      ta: 'மறுபகிர்வு உதவி',
      te: 'పునఃపంపిణీ సహాయం',
      ml: 'പിയർ ট্রান্সഫറുകളും മാപ്പും'
    },
    prompt: {
      en: 'Where can stock be transferred from to reduce risk and which orders are pending?',
      hi: 'किन PHCs को तत्काल पुनर्वितरण की आवश्यकता है और किन साथी PHCs के पास साझा करने के लिए अतिरिक्त स्टॉक है?',
      pa: 'ਜੋਖਮ ਘਟਾਉਣ ਲਈ ਸਟਾਕ ਕਿੱਥੋਂ ਟ੍ਰਾਂਸਫਰ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ ਅਤੇ ਕਿਹੜੇ ਆਰਡਰ ਬਕਾਇਆ ਹਨ?',
      ta: 'எந்த PHC-களுக்கு அவசர மறுபகிர்வு தேவை மற்றும் எந்த PHC-களிடம் கூடுதல் இருப்பு உள்ளது?',
      te: 'ఏ PHCలకు అత్యవసర పునఃపంపిణీ అవసరం మరియు ఏ PHCలలో అదనపు నిల్వ ఉంది?',
      ml: 'അപകടസാധ്യത കുറയ്ക്കാൻ എവിടെ നിന്ന് സ്റ്റോക്ക് മാറ്റാം, ഏതൊക്കെ ഓർഡറുകൾ ബാക്കിയുണ്ട്?'
    },
    icon: ArrowLeftRight,
    badgeColor: 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
  }
];

const MODULE_LABELS: Record<string, Record<SupportedLanguageCode, string>> = {
  home: {
    en: 'Command Center Dashboard',
    hi: 'कमांड सेंटर डैशबोर्ड',
    pa: 'ਕਮਾਂਡ ਸੈਂਟਰ ਡੈਸ਼ਬੋਰਡ',
    ta: 'கட்டுப்பாட்டு மைய டாஷ்போர்டு',
    te: 'కమాండ్ సెంటర్ డాష్‌బోర్డ్',
    ml: 'കമാൻഡ് സെന്റർ ഡാഷ്‌ബോർഡ്'
  },
  dashboard: {
    en: 'Command Center Dashboard',
    hi: 'कमांड सेंटर डैशबोर्ड',
    pa: 'ਕਮਾਂਡ ਸੈਂਟਰ ਡੈਸ਼ਬੋਰਡ',
    ta: 'கட்டுப்பாட்டு மைய டாஷ்போர்டு',
    te: 'కమాండ్ సెంటర్ డాష్‌బోర్డ్',
    ml: 'കമാൻഡ് സെന്റർ ഡാഷ്‌ബോർഡ്'
  },
  medicine: {
    en: 'Medicine Inventory & FEFO',
    hi: 'दवा इन्वेंटरी और FEFO',
    pa: 'ਦਵਾਈ ਇਨਵੈਂਟਰੀ ਅਤੇ FEFO',
    ta: 'மருந்து இருப்பு & FEFO',
    te: 'మందుల నిల్వ & FEFO',
    ml: 'മരുന്ന് സ്റ്റോക്കും FEFO-യും'
  },
  orders: {
    en: 'Orders & PHC Transfers',
    hi: 'ऑर्डर और पुनर्वितरण',
    pa: 'ਆਰਡਰ ਅਤੇ PHC ਟ੍ਰਾਂਸਫਰ',
    ta: 'ஆர்டர்கள் & மறுபகிர்வு',
    te: 'ఆర్డర్లు & పునఃపంపిణీ',
    ml: 'ഓർഡറുകളും പിഎച്ച്സി മാറ്റങ്ങളും'
  },
  records: {
    en: 'Physical Register (OCR & Voice)',
    hi: 'भौतिक रजिस्टर (OCR और वॉइस)',
    pa: 'ਭੌਤਿਕ ਰਜਿਸਟਰ (OCR ਅਤੇ ਵੌਇਸ)',
    ta: 'இருப்புப் பதிவேடு (OCR & குரல்)',
    te: 'భౌతిక రిజిస్టర్ (OCR & వాయిస్)',
    ml: 'ഫിസിക്കൽ രജിസ്റ്റർ (OCR & വോയ്‌സ്)'
  },
  alerts: {
    en: 'Alerts & Thresholds',
    hi: 'अलर्ट और सीमाएं',
    pa: 'ਅਲਰਟ ਅਤੇ ਸੀਮਾਵਾਂ',
    ta: 'எச்சரிக்கைகள் & வரம்புகள்',
    te: 'హెచ్చరికలు & పరిమితులు',
    ml: 'അലേർട്ടുകളും പരിധികളും'
  },
  'offline-queue': {
    en: 'Offline Sync Queue',
    hi: 'ऑफ़लाइन सिंक कतार',
    pa: 'ਔਫਲਾਈਨ ਸਿੰਕ ਕਤਾਰ',
    ta: 'ஆஃப்லைன் வரிசை',
    te: 'ఆఫ్‌లైన్ క్యూ',
    ml: 'ഓഫ്‌ലൈൻ സിങ്ക് ക്യൂ'
  },
  preparedness: {
    en: 'Demand & Surge Forecast',
    hi: 'प्रकोप और मांग पूर्वानुमान',
    pa: 'ਮੰਗ ਅਤੇ ਸਰਜ ਪੂਰਵ-ਅਨੁਮਾਨ',
    ta: 'நோய் பரவல் & தேவை கணிப்பு',
    te: 'వ్యాప్తి & డిమాండ్ అంచనా',
    ml: 'ഡിമാൻഡ് & സർജ് പ്രവചനം'
  },
  attendance: {
    en: 'Staff & Biometric Attendance',
    hi: 'स्टाफ और उपस्थिति',
    pa: 'ਸਟਾਫ ਅਤੇ ਹਾਜ਼ਰੀ',
    ta: 'பணியாளர்கள் & வருகை',
    te: 'సిబ్బంది & హాజరు',
    ml: 'ജീവനക്കാരും ഹാജരും'
  },
  workforce: {
    en: 'Staff & Biometric Attendance',
    hi: 'स्टाफ और उपस्थिति',
    pa: 'ਸਟਾਫ ਅਤੇ ਹਾਜ਼ਰੀ',
    ta: 'பணியாளர்கள் & வருகை',
    te: 'సిబ్బంది & హాజరు',
    ml: 'ജീവനക്കാരും ഹാജരും'
  },
  map: {
    en: 'Network Stock Map',
    hi: 'नेटवर्क स्टॉक मैप',
    pa: 'ਨੈੱਟਵਰਕ ਸਟਾਕ ਮੈਪ',
    ta: 'நெட்வொர்க் இருப்பு வரைபடம்',
    te: 'నెట్‌వర్క్ నిల్వ మ్యాప్',
    ml: 'നെറ്റ്‌വർക്ക് സ്റ്റോക്ക് മാപ്പ്'
  },
  directory: {
    en: 'PHC & NLEM Catalogue',
    hi: 'PHC और NLEM निर्देशिका',
    pa: 'PHC ਅਤੇ NLEM ਕੈਟਾਲਾਗ',
    ta: 'PHC & NLEM பட்டியல்',
    te: 'PHC & NLEM జాబితా',
    ml: 'പിഎച്ച്സി & NLEM കാറ്റലോഗ്'
  },
  analytics: {
    en: 'Reports & Export',
    hi: 'विश्लेषण और ऑडिट रिपोर्ट',
    pa: 'ਰਿਪੋਰਟਾਂ ਅਤੇ ਐਕਸਪੋਰਟ',
    ta: 'பகுப்பாய்வு & தணிக்கை அறிக்கைகள்',
    te: 'విశ్లేషణ & ఆడిట్ నివేదికలు',
    ml: 'റിപ്പോർട്ടുകളും എക്സ്പോർട്ടും'
  },
  chatbot: {
    en: 'Gemini AI Workspace',
    hi: 'Gemini AI कार्यक्षेत्र',
    pa: 'Gemini AI ਵਰਕਸਪੇਸ',
    ta: 'Gemini AI பணியிடம்',
    te: 'Gemini AI వర్క్‌స్పేస్',
    ml: 'Gemini AI വർക്ക്‌സ്‌പേസ്'
  }
};

const MODULE_CONTEXT_PROMPTS: Record<string, Record<SupportedLanguageCode, string>> = {
  home: {
    en: 'Explain the current PHC situation and what I should prioritize today.',
    hi: 'इस PHC की वर्तमान स्थिति समझाएं और आज मुझे किस चीज़ को प्राथमिकता देनी चाहिए।',
    pa: 'ਇਸ PHC ਦੀ ਮੌਜੂਦਾ ਸਥਿਤੀ ਸਮਝਾਓ ਅਤੇ ਅੱਜ ਮੈਨੂੰ ਕਿਸ ਚੀਜ਼ ਨੂੰ ਤਰਜੀਹ ਦੇਣੀ ਚਾਹੀਦੀ ਹੈ।',
    ta: 'இந்த PHC-யின் தற்போதைய நிலையை விளக்கவும்.',
    te: 'ఈ PHC ప్రస్తుత పరిస్థితిని వివరించండి.',
    ml: 'ഈ പിഎച്ച്സിയുടെ നിലവിലെ അവസ്ഥ വിശദീകരിക്കുക, ഇന്ന് എന്തിനാണ് മുൻഗണന നൽകേണ്ടത്?'
  },
  dashboard: {
    en: 'Explain the current PHC situation and what I should prioritize today.',
    hi: 'इस PHC की वर्तमान स्थिति समझाएं और आज मुझे किस चीज़ को प्राथमिकता देनी चाहिए।',
    pa: 'ਇਸ PHC ਦੀ ਮੌਜੂਦਾ ਸਥਿਤੀ ਸਮਝਾਓ ਅਤੇ ਅੱਜ ਮੈਨੂੰ ਕਿਸ ਚੀਜ਼ ਨੂੰ ਤਰਜੀਹ ਦੇਣੀ ਚਾਹੀਦੀ ਹੈ।',
    ta: 'இந்த PHC-யின் தற்போதைய நிலையை விளக்கவும்.',
    te: 'ఈ PHC ప్రస్తుత పరిస్థితిని వివరించండి.',
    ml: 'ഈ പിഎച്ച്സിയുടെ നിലവിലെ അവസ്ഥ വിശദീകരിക്കുക, ഇന്ന് എന്തിനാണ് മുൻഗണന നൽകേണ്ടത്?'
  },
  medicine: {
    en: 'Explain the critical inventory risks visible on this page.',
    hi: 'इस पृष्ठ पर दिखने वाले गंभीर इन्वेंटरी जोखिमों को समझाएं।',
    pa: 'ਇਸ ਪੰਨੇ ਤੇ ਦਿਖਾਈ ਦੇਣ ਵਾਲੇ ਗੰਭੀਰ ਇਨਵੈਂਟਰੀ ਜੋਖਮਾਂ ਨੂੰ ਸਮਝਾਓ।',
    ta: 'இந்தப் பக்கத்தில் உள்ள முக்கிய மருந்து இருப்பு அபாயங்களை விளக்கவும்.',
    te: 'ఈ పేజీలో కనిపించే ముఖ్యమైన నిల్వ ప్రమాదాలను వివరించండి.',
    ml: 'ഈ പേജിൽ കാണുന്ന പ്രധാന മരുന്ന് സ്റ്റോക്ക് അപകടസാധ്യതകൾ വിശദീകരിക്കുക.'
  },
  preparedness: {
    en: 'Explain this forecast and what the Medical Officer should do.',
    hi: 'इस पूर्वानुमान को समझाएं और चिकित्सा अधिकारी को क्या करना चाहिए।',
    pa: 'ਇਸ ਪੂਰਵ-ਅਨੁਮਾਨ ਨੂੰ ਸਮਝਾਓ ਅਤੇ ਮੈਡੀਕਲ ਅਫਸਰ ਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ।',
    ta: 'இந்த தேவை கணிப்பை விளக்கி மருத்துவ அதிகாரி என்ன செய்ய வேண்டும் எனக் கூறவும்.',
    te: 'ఈ అంచనాను వివరించండి మరియు వైద్యాధికారి ఏమి చేయాలో చెప్పండి.',
    ml: 'ഈ പ്രവചനം വിശദീകരിക്കുക, മെഡിക്കൽ ഓഫീസർ എന്ത് ചെയ്യണം?'
  },
  orders: {
    en: 'Which replenishment actions should be prioritized?',
    hi: 'किन पुनःपूर्ति कार्यों को प्राथमिकता दी जानी चाहिए?',
    pa: 'ਕਿਹੜੇ ਰੀਸਟਾਕ ਕੰਮਾਂ ਨੂੰ ਪਹਿਲ ਦਿੱਤੀ ਜਾਣੀ ਚਾਹੀਦੀ ਹੈ?',
    ta: 'எந்த மருந்து ஆர்டர்களுக்கு முதலில் முன்னுரிமை அளிக்க வேண்டும்?',
    te: 'ఏ రీస్టాక్ చర్యలకు మొదట ప్రాధాన్యత ఇవ్వాలి?',
    ml: 'ഏതൊക്കെ റീസ്റ്റോക്ക് നടപടികൾക്കാണ് മുൻഗണന നൽകേണ്ടത്?'
  },
  map: {
    en: 'Where can stock be transferred from to reduce risk?',
    hi: 'जोखिम कम करने के लिए स्टॉक कहां से स्थानांतरित किया जा सकता है?',
    pa: 'ਜੋਖਮ ਘਟਾਉਣ ਲਈ ਸਟਾਕ ਕਿੱਥੋਂ ਟ੍ਰਾਂਸਫਰ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ?',
    ta: 'அபாயத்தைக் குறைக்க எந்த PHC-யிலிருந்து மருந்துகளை இடமாற்றம் செய்யலாம்?',
    te: 'ప్రమాదాన్ని తగ్గించడానికి ఏ PHC నుండి నిల్వను బదిలీ చేయవచ్చు?',
    ml: 'അപകടസാധ്യത കുറയ്ക്കാൻ എവിടെ നിന്ന് സ്റ്റോക്ക് മാറ്റാൻ കഴിയും?'
  },
  records: {
    en: 'How do I verify an OCR or voice register entry and what audit checks apply?',
    hi: 'मैं OCR या वॉइस रजिस्टर प्रविष्टि को कैसे सत्यापित करूं और कौन सी ऑडिट जांच लागू होती है?',
    pa: 'ਮੈਂ OCR ਜਾਂ ਵੌਇਸ ਰਜਿਸਟਰ ਐਂਟਰੀ ਦੀ ਪੁਸ਼ਟੀ ਕਿਵੇਂ ਕਰਾਂ ਅਤੇ ਕਿਹੜੀਆਂ ਆਡਿਟ ਜਾਂਚਾਂ ਲਾਗੂ ਹੁੰਦੀਆਂ ਹਨ?',
    ta: 'OCR அல்லது குரல் பதிவேடு பதிவை எவ்வாறு சரிபார்ப்பது?',
    te: 'OCR లేదా వాయిస్ రిజిస్టర్ ఎంట్రీని ఎలా ధృవీకరించాలి?',
    ml: 'OCR അല്ലെങ്കിൽ വോയ്‌സ് രജിസ്റ്റർ എൻട്രി എങ്ങനെ പരിശോധിച്ചുറപ്പിക്കാം?'
  },
  alerts: {
    en: 'Why is this medicine showing a warning and how should we resolve active alerts?',
    hi: 'समझाएं कि प्रत्येक सक्रिय गंभीर अलर्ट क्यों ट्रिगर हुआ।',
    pa: 'ਸਮਝਾਓ ਕਿ ਇਹ ਦਵਾਈ ਚੇਤਾਵਨੀ ਕਿਉਂ ਦਿਖਾ ਰਹੀ ਹੈ ਅਤੇ ਅਲਰਟ ਕਿਵੇਂ ਹੱਲ ਕਰੀਏ?',
    ta: 'ஒவ்வொரு முக்கிய எச்சரிக்கையும் ஏன் உருவாக்கப்பட்டது என்பதை விளக்கவும்.',
    te: 'ప్రతి ముఖ్యమైన హెచ్చరిక ఎందుకు వచ్చిందో వివరించండి.',
    ml: 'എന്തുകൊണ്ടാണ് ഈ മരുന്ന് മുന്നറിയിപ്പ് കാണിക്കുന്നത്, സജീവ അലേർട്ടുകൾ എങ്ങനെ പരിഹരിക്കാം?'
  },
  'offline-queue': {
    en: 'Explain the offline sync status and any pending or failed records.',
    hi: 'ऑफ़लाइन सिंक स्थिति और लंबित रिकॉर्ड समझाएं।',
    pa: 'ਔਫਲਾਈਨ ਸਿੰਕ ਸਥਿਤੀ ਅਤੇ ਬਕਾਇਆ ਜਾਂ ਅਸਫਲ ਰਿਕਾਰਡ ਸਮਝਾਓ।',
    ta: 'ஆஃப்லைன் ஒத்திசைவு நிலையை விளக்கவும்.',
    te: 'ఆఫ్‌లైన్ సింక్ స్థితిని వివరించండి.',
    ml: 'ഓഫ്‌ലൈൻ സിങ്ക് നിലയും ബാക്കിയുള്ള റെക്കോർഡുകളും വിശദീകരിക്കുക.'
  },
  attendance: {
    en: 'Summarize today’s staff attendance and operational readiness.',
    hi: 'आज की स्टाफ उपस्थिति और परिचालन तत्परता का सारांश दें।',
    pa: 'ਅੱਜ ਦੀ ਸਟਾਫ ਹਾਜ਼ਰੀ ਅਤੇ ਸੰਚਾਲਨ ਤਿਆਰੀ ਦਾ ਸਾਰ ਦਿਓ।',
    ta: 'இன்றைய பணியாளர் வருகை மற்றும் தயார்நிலையைச் சுருக்கவும்.',
    te: 'నేటి సిబ్బంది హాజరు మరియు సంసిద్ధతను వివరించండి.',
    ml: 'ഇന്നത്തെ ജീവനക്കാരുടെ ഹാജരും പ്രവർത്തന സജ്ജതയും സംഗ്രഹിക്കുക.'
  },
  workforce: {
    en: 'Summarize today’s staff attendance and operational readiness.',
    hi: 'आज की स्टाफ उपस्थिति और परिचालन तत्परता का सारांश दें।',
    pa: 'ਅੱਜ ਦੀ ਸਟਾਫ ਹਾਜ਼ਰੀ ਅਤੇ ਸੰਚਾਲਨ ਤਿਆਰੀ ਦਾ ਸਾਰ ਦਿਓ।',
    ta: 'இன்றைய பணியாளர் வருகை மற்றும் தயார்நிலையைச் சுருக்கவும்.',
    te: 'నేటి సిబ్బంది హాజరు మరియు సంసిద్ధతను వివరించండి.',
    ml: 'ഇന്നത്തെ ജീവനക്കാരുടെ ഹാജരും പ്രവർത്തന സജ്ജതയും സംഗ്രഹിക്കുക.'
  }
};

const UI_TEXT: Record<
  SupportedLanguageCode,
  {
    assistantTitle: string;
    assistantSubtitle: string;
    activeFacility: string;
    pageContext: string;
    quickActionsTitle: string;
    inputPlaceholder: string;
    send: string;
    clearChat: string;
    openFullView: string;
    thinking: string;
    readOnlyBadge: string;
    authorizedBadge: string;
    unlockAccess: string;
    safetyNotice: string;
  }
> = {
  en: {
    assistantTitle: 'Ask Gemini · AI Command Center',
    assistantSubtitle: 'Grounded in live MEDRESQ PHC context, forecast & inventory signals',
    activeFacility: 'Facility',
    pageContext: 'Context',
    quickActionsTitle: 'Suggested Prompts & Operational Checks',
    inputPlaceholder: 'Ask: "What should I prioritize today?" or "Which medicines are at highest risk?"...',
    send: 'Ask Gemini',
    clearChat: 'Clear chat',
    openFullView: 'Full AI Workspace',
    thinking: 'Gemini is analyzing PHC context…',
    readOnlyBadge: 'Demo / Read-Only Mode',
    authorizedBadge: 'Authorized Officer',
    unlockAccess: 'Unlock Officer Access',
    safetyNotice: 'Advisory Only · Grounded in live PHC telemetry · No autonomous prescribing'
  },
  hi: {
    assistantTitle: 'Ask Gemini · AI कमांड सेंटर',
    assistantSubtitle: 'लाइव MEDRESQ आपूर्ति-श्रृंखला डेटा पर आधारित',
    activeFacility: 'केंद्र (PHC)',
    pageContext: 'पृष्ठ संदर्भ',
    quickActionsTitle: 'सुझाए गए प्रश्न और त्वरित जांच',
    inputPlaceholder: 'पूछें: "आज किन दवाइयों का स्टॉक कम है?" या "आज मुझे क्या प्राथमिकता देनी चाहिए?"...',
    send: 'Ask Gemini',
    clearChat: 'चैट साफ़ करें',
    openFullView: 'पूर्ण कार्यक्षेत्र',
    thinking: 'Gemini PHC संदर्भ का विश्लेषण कर रहा है…',
    readOnlyBadge: 'डेमो / केवल-पढ़ने का मोड',
    authorizedBadge: 'अधिकृत अधिकारी',
    unlockAccess: 'अधिकारी एक्सेस अनलॉक करें',
    safetyNotice: 'केवल सलाहकार · कोई काल्पनिक डेटा नहीं · स्वायत्त दवा प्रेस्क्रिप्शन नहीं'
  },
  pa: {
    assistantTitle: 'Ask Gemini · AI ਕਮਾਂਡ ਸੈਂਟਰ',
    assistantSubtitle: 'ਲਾਈਵ MEDRESQ PHC ਸਪਲਾਈ-ਚੇਨ ਡੇਟਾ ਤੇ ਆਧਾਰਿਤ',
    activeFacility: 'ਕੇਂਦਰ (PHC)',
    pageContext: 'ਪੰਨਾ ਸੰਦਰਭ',
    quickActionsTitle: 'ਸੁਝਾਏ ਗਏ ਸਵਾਲ ਅਤੇ ਸੰਚਾਲਨ ਜਾਂਚਾਂ',
    inputPlaceholder: 'ਪੁੱਛੋ: "ਅੱਜ ਕਿਹੜੀਆਂ ਦਵਾਈਆਂ ਦਾ ਸਟਾਕ ਘੱਟ ਹੈ?" ਜਾਂ "ਮੈਨੂੰ ਕੀ ਤਰਜੀਹ ਦੇਣੀ ਚਾਹੀਦੀ ਹੈ?"...',
    send: 'Ask Gemini',
    clearChat: 'ਚੈਟ ਸਾਫ਼ ਕਰੋ',
    openFullView: 'ਪੂਰਾ AI ਵਰਕਸਪੇਸ',
    thinking: 'Gemini PHC ਸੰਦਰਭ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰ ਰਿਹਾ ਹੈ…',
    readOnlyBadge: 'ਡੈਮੋ / ਸਿਰਫ਼-ਪੜ੍ਹਨ ਮੋਡ',
    authorizedBadge: 'ਅਧਿਕਾਰਤ ਅਫਸਰ',
    unlockAccess: 'ਅਫਸਰ ਐਕਸੈਸ ਅਨਲੌਕ ਕਰੋ',
    safetyNotice: 'ਸਿਰਫ਼ ਸਲਾਹਕਾਰੀ · ਲਾਈਵ PHC ਟੈਲੀਮੈਟਰੀ ਤੇ ਆਧਾਰਿਤ'
  },
  ta: {
    assistantTitle: 'Ask Gemini · AI கட்டுப்பாட்டு மையம்',
    assistantSubtitle: 'நேரடி MEDRESQ விநியோகத் தரவு அடிப்படையிலானது',
    activeFacility: 'நிலையம் (PHC)',
    pageContext: 'பக்க சூழல்',
    quickActionsTitle: 'பரிந்துரைக்கப்பட்ட கேள்விகள்',
    inputPlaceholder: 'கேட்கவும்: "இன்று எந்த மருந்துகள் குறைவாக உள்ளன?"...',
    send: 'Ask Gemini',
    clearChat: 'உரையாடலை அழி',
    openFullView: 'முழு பணியிடம்',
    thinking: 'Gemini PHC சூழலை பகுப்பாய்வு செய்கிறது…',
    readOnlyBadge: 'டெமோ / படிக்க மட்டும்',
    authorizedBadge: 'அங்கீகரிக்கப்பட்ட அதிகாரி',
    unlockAccess: 'அதிகாரி அணுகலைத் திற',
    safetyNotice: 'ஆலோசனை மட்டுமே · கற்பனை தரவு இல்லை · தன்னிச்சையான மருந்து பரிந்துரை இல்லை'
  },
  te: {
    assistantTitle: 'Ask Gemini · AI కమాండ్ సెంటర్',
    assistantSubtitle: 'ప్రత్యక్ష MEDRESQ సరఫరా డేటా ఆధారంగా',
    activeFacility: 'కేంద్రం (PHC)',
    pageContext: 'పేజీ సందర్భం',
    quickActionsTitle: 'సూచించిన ప్రశ్నలు & తనిఖీలు',
    inputPlaceholder: 'అడగండి: "ఈరోజు ఏ మందులు తక్కువగా ఉన్నాయి?"...',
    send: 'Ask Gemini',
    clearChat: 'చాట్ క్లియర్ చేయి',
    openFullView: 'పూర్తి వర్క్‌స్పేస్',
    thinking: 'Gemini PHC సందర్భాన్ని విశ్లేషిస్తోంది…',
    readOnlyBadge: 'డెమో / రీడ్-ఓన్లీ మోడ్',
    authorizedBadge: 'అధికారిక అధికారి',
    unlockAccess: 'ఆఫీసర్ యాక్సెస్ అన్‌లాక్',
    safetyNotice: 'సలహా మాత్రమే · కల్పిత డేటా లేదు · స్వతంత్ర మందుల సూచన లేదు'
  },
  ml: {
    assistantTitle: 'Ask Gemini · AI കമാൻഡ് സെന്റർ',
    assistantSubtitle: 'തത്സമയ MEDRESQ PHC ഡാറ്റയെ അടിസ്ഥാനമാക്കിയുള്ളത്',
    activeFacility: 'കേന്ദ്രം (PHC)',
    pageContext: 'പേജ് പശ്ചാത്തലം',
    quickActionsTitle: 'നിർദ്ദേശിച്ച ചോദ്യങ്ങളും പരിശോധനകളും',
    inputPlaceholder: 'ചോദിക്കുക: "ഇന്ന് ഏതൊക്കെ മരുന്നുകളാണ് കുറവുള്ളത്?"...',
    send: 'Ask Gemini',
    clearChat: 'ചാറ്റ് മായ്ക്കുക',
    openFullView: 'പൂർണ്ണ AI വർക്ക്‌സ്‌പേസ്',
    thinking: 'Gemini പിഎച്ച്സി സാഹചര്യം വിശകലനം ചെയ്യുന്നു…',
    readOnlyBadge: 'ഡെമോ / റീഡ്-ഒൺലി മോഡ്',
    authorizedBadge: 'അംഗീകൃത ഓഫീസർ',
    unlockAccess: 'ഓഫീസർ ആക്സസ് അൺലോക്ക് ചെയ്യുക',
    safetyNotice: 'ഉപദേശം മാത്രം · തത്സമയ PHC ടെലിമെട്രി അടിസ്ഥാനമാക്കി'
  }
};

interface RelatedModuleAction {
  moduleId: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getRelatedModulesForContent(content: string, activeModule: string): RelatedModuleAction[] {
  const lower = content.toLowerCase();
  const actions: RelatedModuleAction[] = [];

  if (
    lower.includes('stock') ||
    lower.includes('inventory') ||
    lower.includes('fefo') ||
    lower.includes('batch') ||
    lower.includes('expir') ||
    lower.includes('ors') ||
    lower.includes('saline') ||
    lower.includes('oxytocin') ||
    lower.includes('paracetamol')
  ) {
    actions.push({ moduleId: 'medicine', label: 'View Medicine Inventory', icon: Pill });
  }
  if (
    lower.includes('forecast') ||
    lower.includes('surge') ||
    lower.includes('heat') ||
    lower.includes('monsoon') ||
    lower.includes('weather') ||
    lower.includes('demand')
  ) {
    actions.push({ moduleId: 'preparedness', label: 'View Demand Forecast', icon: CloudSun });
  }
  if (
    lower.includes('order') ||
    lower.includes('replenish') ||
    lower.includes('reorder') ||
    lower.includes('indent') ||
    lower.includes('transfer') ||
    lower.includes('redistribut')
  ) {
    actions.push({ moduleId: 'orders', label: 'Go to Orders & Transfers', icon: Truck });
  }
  if (lower.includes('map') || lower.includes('nearby') || lower.includes('peer') || lower.includes('chc')) {
    actions.push({ moduleId: 'map', label: 'Open Network Stock Map', icon: MapPin });
  }
  if (lower.includes('alert') || lower.includes('threshold') || lower.includes('warning')) {
    actions.push({ moduleId: 'alerts', label: 'Open Alert Centre', icon: Bell });
  }

  if (actions.length === 0) {
    if (activeModule !== 'medicine') {
      actions.push({ moduleId: 'medicine', label: 'View Medicine Inventory', icon: Pill });
    }
    if (activeModule !== 'orders') {
      actions.push({ moduleId: 'orders', label: 'Go to Orders & Transfers', icon: Truck });
    }
  }

  return actions.slice(0, 3);
}

export const GeminiAssistantDrawer: React.FC = () => {
  const {
    isGeminiAssistantOpen,
    setIsGeminiAssistantOpen,
    chatMessages,
    isChatLoading,
    assistantError,
    clearAssistantError,
    sendChatMessage,
    clearChatHistory,
    selectedPHC,
    activeModule,
    setActiveModule,
    medicines,
    weather,
    orders,
    redistributions,
    alerts,
    proactiveStockAlerts,
    inchargeSession,
    openAuthModal,
    language,
    transcribeAudio,
    isTranscribing
  } = useApp();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const langKey: SupportedLanguageCode =
    language === 'hi' ||
    language === 'pa' ||
    language === 'ta' ||
    language === 'te' ||
    language === 'ml'
      ? language
      : 'en';
  const ui = UI_TEXT[langKey];
  const currentLangMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === langKey) || SUPPORTED_LANGUAGES[0];

  // Canonical metrics for live header badges
  const inventoryMetrics = useMemo(
    () => getCanonicalMedicineInventoryMetrics(medicines),
    [medicines]
  );
  const orderMetrics = useMemo(
    () => getCanonicalOrderMetrics(orders, redistributions),
    [orders, redistributions]
  );
  const alertMetrics = useMemo(
    () => getCanonicalAlertMetrics(alerts, proactiveStockAlerts),
    [alerts, proactiveStockAlerts]
  );

  const facilityMetrics = useMemo(
    () => ({
      serviceReadinessScore: inventoryMetrics.healthyStockPercentage,
      stockoutRiskCount: inventoryMetrics.lowStockCount,
      criticalCount: inventoryMetrics.criticalCount,
      warningCount: inventoryMetrics.warningCount,
      expiringWithin90dCount: inventoryMetrics.expiringWithin90DaysCount,
      expiringWithin30dCount: inventoryMetrics.expiringSoonCount,
      pendingOrdersCount: orderMetrics.activePipelineOrdersCount,
      pendingTransfersCount: orderMetrics.pendingTransfersCount
    }),
    [inventoryMetrics, orderMetrics]
  );

  const moduleTitle =
    MODULE_LABELS[activeModule]?.[langKey] ||
    MODULE_LABELS.dashboard[langKey];

  const contextualPrompt =
    MODULE_CONTEXT_PROMPTS[activeModule]?.[langKey] ||
    MODULE_CONTEXT_PROMPTS.dashboard[langKey];

  const buildPageContextSummary = () => {
    const topCriticalNames = inventoryMetrics.criticalItems.map((m) => m.name).join(', ') || 'None';
    const topWarningNames = inventoryMetrics.warningItems.map((m) => m.name).join(', ') || 'None';
    const topSurge = weather?.vulnerableMedicines?.[0]
      ? `${weather.seasonalProfile} (+${weather.vulnerableMedicines[0].demandSurgePercent}% ${weather.vulnerableMedicines[0].medicineName})`
      : weather?.seasonalProfile || 'Standard';

    return [
      `Active Module: ${activeModule} (${moduleTitle})`,
      `Active PHC: ${selectedPHC.name} (${selectedPHC.id}, ${selectedPHC.district})`,
      `Readiness Score: ${facilityMetrics.serviceReadinessScore}%`,
      `Stockout Risk Count: ${facilityMetrics.stockoutRiskCount} (${facilityMetrics.criticalCount} critical [${topCriticalNames}], ${facilityMetrics.warningCount} warning [${topWarningNames}])`,
      `Forecast Context: ${topSurge} at ${weather?.temperatureC ?? 34}°C`,
      `Expiring <=90d: ${facilityMetrics.expiringWithin90dCount} (${facilityMetrics.expiringWithin30dCount} <=30d)`,
      `Pending Orders: ${facilityMetrics.pendingOrdersCount}`,
      `Pending Transfers: ${facilityMetrics.pendingTransfersCount}`,
      `Active Alerts: ${alertMetrics.activeAlertsCount}`
    ].join(' | ');
  };

  // Listen for custom 'medresq:ask-gemini' events from any card or module
  useEffect(() => {
    const handleAskGeminiEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string; autoSend?: boolean }>;
      setIsGeminiAssistantOpen(true);
      const requestedPrompt = customEvent.detail?.prompt;
      if (requestedPrompt) {
        if (customEvent.detail?.autoSend !== false) {
          void sendChatMessage(
            requestedPrompt,
            'clinical_officer',
            'general',
            buildPageContextSummary()
          );
        } else {
          setInput(requestedPrompt);
        }
      }
    };
    window.addEventListener('medresq:ask-gemini', handleAskGeminiEvent);
    return () => window.removeEventListener('medresq:ask-gemini', handleAskGeminiEvent);
  });

  // Auto-scroll on new messages when drawer is open
  useEffect(() => {
    if (isGeminiAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading, isGeminiAssistantOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isGeminiAssistantOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isGeminiAssistantOpen]);

  // Close on Escape key without losing page state
  useEffect(() => {
    if (!isGeminiAssistantOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGeminiAssistantOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGeminiAssistantOpen, setIsGeminiAssistantOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    const msg = input.trim();
    setInput('');
    await sendChatMessage(msg, 'clinical_officer', 'general', buildPageContextSummary());
  };

  const handleQuickPrompt = async (promptText: string) => {
    if (isChatLoading) return;
    await sendChatMessage(promptText, 'clinical_officer', 'general', buildPageContextSummary());
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        const voiceLocale = getVoiceBcp47Locale(language);
        const text = await transcribeAudio(audioBlob, voiceLocale);
        if (text) {
          setInput((prev) => (prev ? `${prev} ${text}` : text));
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error in GeminiAssistantDrawer:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!isGeminiAssistantOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px] transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsGeminiAssistantOpen(false);
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ui.assistantTitle}
        className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Top Header */}
        <div className="px-4 py-3.5 bg-linear-to-r from-slate-900 via-teal-950 to-emerald-950 text-white border-b border-teal-800/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold tracking-tight text-white truncate">
                    ✨ {ui.assistantTitle}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                    {currentLangMeta.nativeLabel}
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/90 truncate mt-0.5">
                  {ui.assistantSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsGeminiAssistantOpen(false);
                  setActiveModule('chatbot');
                }}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={ui.openFullView}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearChatHistory}
                className="p-1.5 rounded-lg text-teal-200 hover:text-rose-200 hover:bg-white/10 transition-colors cursor-pointer"
                title={ui.clearChat}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGeminiAssistantOpen(false)}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Gemini AI Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context & Authorization Bar */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-teal-100 truncate">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold truncate">{selectedPHC.name}</span>
              <span className="text-teal-400">·</span>
              <span className="text-teal-200 font-mono text-[10px] truncate">{moduleTitle}</span>
            </div>

            {inchargeSession ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                {ui.authorizedBadge} ({inchargeSession.officerId})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('officer', selectedPHC)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                title={ui.unlockAccess}
              >
                <Lock className="w-3 h-3 text-amber-300" />
                <span>{ui.readOnlyBadge}</span>
              </button>
            )}
          </div>

          {/* Live Canonical Snapshot Pills */}
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] font-mono uppercase text-teal-300">Readiness</div>
              <div className="text-xs font-bold font-mono text-white">
                {facilityMetrics.serviceReadinessScore}%
              </div>
            </div>
            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] font-mono uppercase text-rose-300">Low Stock</div>
              <div className="text-xs font-bold font-mono text-rose-200">
                {facilityMetrics.stockoutRiskCount}
              </div>
            </div>
            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] font-mono uppercase text-amber-300">Expiring ≤90d</div>
              <div className="text-xs font-bold font-mono text-amber-200">
                {facilityMetrics.expiringWithin90dCount}
              </div>
            </div>
            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[9px] font-mono uppercase text-blue-300">Transfers</div>
              <div className="text-xs font-bold font-mono text-blue-200">
                {facilityMetrics.pendingTransfersCount}
              </div>
            </div>
          </div>
        </div>

        {/* Context-Aware Prompt & Suggested Prompts Strip */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          {/* Context-Aware Active Module Prompt Card */}
          <div className="p-2.5 rounded-xl bg-linear-to-r from-indigo-50/90 via-teal-50/80 to-emerald-50/80 border border-teal-200/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800">
                <Compass className="w-3 h-3 text-teal-600 shrink-0" />
                <span>Context-Aware · {moduleTitle}</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-800 truncate mt-0.5">
                “{contextualPrompt}”
              </p>
            </div>
            <button
              type="button"
              disabled={isChatLoading}
              onClick={() => handleQuickPrompt(contextualPrompt)}
              className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-teal-200" />
              <span>Ask Now</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
              {ui.quickActionsTitle}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {SUGGESTED_PROMPTS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={isChatLoading}
                  onClick={() => handleQuickPrompt(action.prompt[langKey])}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${action.badgeColor}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{action.label[langKey]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Banner if any */}
        {assistantError && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{assistantError}</span>
            </div>
            <button
              type="button"
              onClick={clearAssistantError}
              className="text-[10px] font-mono font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            const relatedModules = !isUser
              ? getRelatedModulesForContent(msg.content, activeModule)
              : [];
            const topRiskMed = inventoryMetrics.criticalItems[0] || inventoryMetrics.warningItems[0];

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-900 text-teal-400 border border-slate-800'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-teal-700 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs space-y-2.5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase ${
                        isUser ? 'text-teal-100' : 'text-teal-700'
                      }`}
                    >
                      {isUser ? 'You · Question' : '✨ Gemini Operational Response'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isUser && msg.modelUsed && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {msg.modelUsed}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-mono ${
                          isUser ? 'text-teal-200' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap break-words font-sans">{msg.content}</div>

                  {/* Structured Operational Context Footer for Gemini Responses */}
                  {!isUser && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {/* Live PHC Risk & Recommended Action Strip when relevant */}
                      {topRiskMed && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold uppercase text-[9px] text-rose-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Active PHC Risk Signal · {selectedPHC.code}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">
                              {facilityMetrics.criticalCount} Crit · {facilityMetrics.warningCount} Warn
                            </span>
                          </div>
                          <div className="text-slate-700">
                            <strong>Key Finding:</strong> {topRiskMed.name} ({topRiskMed.currentStock}{' '}
                            {topRiskMed.unit} vs min {topRiskMed.minStockLevel} {topRiskMed.unit}).
                          </div>
                          <div className="text-teal-900 font-medium">
                            <strong>Recommended Action:</strong> Review safety buffer replenishment or approve lateral PHC transfer.
                          </div>
                        </div>
                      )}

                      {/* View Related Module / Go to Source Action Buttons */}
                      {relatedModules.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            Go to source:
                          </span>
                          {relatedModules.map((mod) => {
                            const ModIcon = mod.icon;
                            return (
                              <button
                                key={mod.moduleId}
                                type="button"
                                onClick={() => {
                                  setActiveModule(mod.moduleId);
                                  setIsGeminiAssistantOpen(false);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                <ModIcon className="w-3 h-3 text-teal-700 shrink-0" />
                                <span>{mod.label}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatLoading && (
            <div className="flex gap-2.5 animate-in fade-in duration-150">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-white border border-teal-200 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />
                <span className="font-medium">{ui.thinking}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input & Voice Controls */}
        <div className="p-3.5 bg-white border-t border-slate-200 shrink-0 space-y-2">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isTranscribing || isChatLoading}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={
                isRecording
                  ? 'Stop voice recording'
                  : `Voice query (${getVoiceBcp47Locale(language)})`
              }
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isTranscribing
                  ? `Transcribing (${currentLangMeta.nativeLabel})...`
                  : ui.inputPlaceholder
              }
              disabled={isChatLoading || isTranscribing}
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={!input.trim() || isChatLoading || isTranscribing}
              className="px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ui.send}</span>
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
              <span className="truncate">{ui.safetyNotice}</span>
            </span>
            {!inchargeSession && (
              <button
                type="button"
                onClick={() => openAuthModal('officer', selectedPHC)}
                className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>{ui.unlockAccess}</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
