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
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  getCanonicalMedicineInventoryMetrics,
  getCanonicalOrderMetrics,
  getCanonicalAlertMetrics
} from '../../utils/datasetMetrics.ts';
import { getVoiceBcp47Locale } from '../../utils/registerVoiceCommandParser.ts';
import { SUPPORTED_LANGUAGES } from '../../i18n/index.ts';

interface QuickActionItem {
  id: string;
  label: Record<'en' | 'hi' | 'ta' | 'te', string>;
  prompt: Record<'en' | 'hi' | 'ta' | 'te', string>;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'critical_stock',
    label: {
      en: 'Critical Stock',
      hi: 'गंभीर कम स्टॉक',
      ta: 'அவசர குறைந்த இருப்பு',
      te: 'అత్యవసర తక్కువ నిల్వ'
    },
    prompt: {
      en: 'Which medicines are currently critically low or below safety threshold at this PHC?',
      hi: 'इस PHC में कौन सी दवाइयां वर्तमान में गंभीर रूप से कम हैं या सुरक्षा सीमा से नीचे हैं?',
      ta: 'இந்த PHC-யில் தற்போது எந்த மருந்துகள் மிகவும் குறைவாக அல்லது பாதுகாப்பு வரம்பிற்கு கீழே உள்ளன?',
      te: 'ఈ PHCలో ప్రస్తుతం ఏ మందులు అత్యంత తక్కువగా లేదా భద్రతా పరిమితి కంటే తక్కువగా ఉన్నాయి?'
    },
    icon: AlertTriangle,
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
  },
  {
    id: 'expiring_soon',
    label: {
      en: 'Expiring Soon',
      hi: 'शीघ्र एक्सपायरी',
      ta: 'விரைவில் காலாவதி',
      te: 'త్వరలో గడువు ముగిసేవి'
    },
    prompt: {
      en: 'Show me medicines approaching expiry and FEFO priority batches within 90 days.',
      hi: '90 दिनों के भीतर एक्सपायर होने वाली दवाइयां और FEFO प्राथमिकता वाले बैच दिखाएं।',
      ta: '90 நாட்களுக்குள் காலாவதியாகும் மருந்துகள் மற்றும் FEFO முன்னுரிமை பேட்ச்களைக் காட்டு.',
      te: '90 రోజుల్లో గడువు ముగిసే మందులు మరియు FEFO ప్రాధాన్యత బ్యాచ్‌లను చూపించు.'
    },
    icon: Clock,
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
  },
  {
    id: 'pending_transfers',
    label: {
      en: 'Pending Transfers',
      hi: 'लंबित ट्रांसफर',
      ta: 'நிலுவை இடமாற்றங்கள்',
      te: 'పెండింగ్ బదిలీలు'
    },
    prompt: {
      en: 'What inter-PHC transfers and warehouse orders are currently pending approval or in transit?',
      hi: 'कौन से अंतर-PHC ट्रांसफर और वेयरहाउस ऑर्डर वर्तमान में स्वीकृति के लिए लंबित या ट्रांजिट में हैं?',
      ta: 'எந்த PHC இடமாற்றங்கள் மற்றும் கிடங்கு ஆர்டர்கள் தற்போது ஒப்புதலுக்காக நிலுவையில் உள்ளன?',
      te: 'ఏ PHC బదిలీలు మరియు గిడ్డంగి ఆర్డర్లు ప్రస్తుతం ఆమోదం కోసం పెండింగ్‌లో ఉన్నాయి?'
    },
    icon: Truck,
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'redistribution_help',
    label: {
      en: 'Redistribution Help',
      hi: 'पुनर्वितरण सहायता',
      ta: 'மறுபகிர்வு உதவி',
      te: 'పునఃపంపిణీ సహాయం'
    },
    prompt: {
      en: 'Which PHCs need urgent redistribution and which peer PHCs have excess stock to share?',
      hi: 'किन PHCs को तत्काल पुनर्वितरण की आवश्यकता है और किन साथी PHCs के पास साझा करने के लिए अतिरिक्त स्टॉक है?',
      ta: 'எந்த PHC-களுக்கு அவசர மறுபகிர்வு தேவை மற்றும் எந்த PHC-களிடம் கூடுதல் இருப்பு உள்ளது?',
      te: 'ఏ PHCలకు అత్యవసర పునఃపంపిణీ అవసరం మరియు ఏ PHCలలో అదనపు నిల్వ ఉంది?'
    },
    icon: ArrowLeftRight,
    badgeColor: 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
  },
  {
    id: 'daily_summary',
    label: {
      en: 'Daily Summary',
      hi: 'दैनिक सारांश',
      ta: 'தினசரி சுருக்கம்',
      te: 'రోజువారీ సారాంశం'
    },
    prompt: {
      en: "Summarize today's supply situation, service readiness score, critical alerts, and top recommended actions.",
      hi: 'आज की आपूर्ति स्थिति, सेवा तत्परता स्कोर, गंभीर अलर्ट और शीर्ष अनुशंसित कार्यों का सारांश दें।',
      ta: 'இன்றைய மருந்து விநியோக நிலை, தயார்நிலை மதிப்பெண், முக்கிய எச்சரிக்கைகள் மற்றும் பரிந்துரைகளைச் சுருக்கவும்.',
      te: 'నేటి మందుల సరఫరా పరిస్థితి, సంసిద్ధత స్కోరు, ముఖ్య హెచ్చరికలు మరియు సూచనలను వివరించండి.'
    },
    icon: FileText,
    badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
  },
  {
    id: 'explain_alerts',
    label: {
      en: 'Explain Alerts',
      hi: 'अलर्ट समझाएं',
      ta: 'எச்சரிக்கை விளக்கம்',
      te: 'హెచ్చరికల వివరణ'
    },
    prompt: {
      en: 'Why were the current active alerts generated and what immediate supply-chain action should be taken?',
      hi: 'वर्तमान सक्रिय अलर्ट क्यों जनरेट किए गए और तत्काल क्या आपूर्ति-श्रृंखला कार्रवाई की जानी चाहिए?',
      ta: 'தற்போதைய எச்சரிக்கைகள் ஏன் உருவாக்கப்பட்டன மற்றும் உடனடியாக என்ன நடவடிக்கை எடுக்க வேண்டும்?',
      te: 'ప్రస్తుత హెచ్చరికలు ఎందుకు వచ్చాయి మరియు వెంటనే ఏ చర్య తీసుకోవాలి?'
    },
    icon: Bell,
    badgeColor: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
  }
];

const MODULE_LABELS: Record<string, Record<'en' | 'hi' | 'ta' | 'te', string>> = {
  dashboard: {
    en: 'Command Center Dashboard',
    hi: 'कमांड सेंटर डैशबोर्ड',
    ta: 'கட்டுப்பாட்டு மைய டாஷ்போர்டு',
    te: 'కమాండ్ సెంటర్ డాష్‌బోర్డ్'
  },
  medicine: {
    en: 'Medicine Inventory & FEFO',
    hi: 'दवा इन्वेंटरी और FEFO',
    ta: 'மருந்து இருப்பு & FEFO',
    te: 'మందుల నిల్వ & FEFO'
  },
  orders: {
    en: 'Orders & Peer Redistribution',
    hi: 'ऑर्डर और पुनर्वितरण',
    ta: 'ஆர்டர்கள் & மறுபகிர்வு',
    te: 'ఆర్డర్లు & పునఃపంపిణీ'
  },
  records: {
    en: 'Physical Register (OCR & Voice)',
    hi: 'भौतिक रजिस्टर (OCR और वॉइस)',
    ta: 'இருப்புப் பதிவேடு (OCR & குரல்)',
    te: 'భౌతిక రిజిస్టర్ (OCR & వాయిస్)'
  },
  alerts: {
    en: 'Alerts & Thresholds',
    hi: 'अलर्ट और सीमाएं',
    ta: 'எச்சரிக்கைகள் & வரம்புகள்',
    te: 'హెచ్చరికలు & పరిమితులు'
  },
  preparedness: {
    en: 'Outbreak & Demand Forecast',
    hi: 'प्रकोप और मांग पूर्वानुमान',
    ta: 'நோய் பரவல் & தேவை கணிப்பு',
    te: 'వ్యాప్తి & డిమాండ్ అంచనా'
  },
  workforce: {
    en: 'Staff & Biometric Attendance',
    hi: 'स्टाफ और उपस्थिति',
    ta: 'பணியாளர்கள் & வருகை',
    te: 'సిబ్బంది & హాజరు'
  },
  map: {
    en: 'Network Stock Map',
    hi: 'नेटवर्क स्टॉक मैप',
    ta: 'நெட்வொர்க் இருப்பு வரைபடம்',
    te: 'నెట్‌వర్క్ నిల్వ మ్యాప్'
  },
  analytics: {
    en: 'Analytics & Audit Reports',
    hi: 'विश्लेषण और ऑडिट रिपोर्ट',
    ta: 'பகுப்பாய்வு & தணிக்கை அறிக்கைகள்',
    te: 'విశ్లేషణ & ఆడిట్ నివేదికలు'
  },
  chatbot: {
    en: 'Gemini AI Workspace',
    hi: 'Gemini AI कार्यक्षेत्र',
    ta: 'Gemini AI பணியிடம்',
    te: 'Gemini AI వర్క్‌స్పేస్'
  }
};

const MODULE_CONTEXT_PROMPTS: Record<string, Record<'en' | 'hi' | 'ta' | 'te', string>> = {
  dashboard: {
    en: 'Give me a short supply situation report for this PHC.',
    hi: 'इस PHC के लिए एक संक्षिप्त आपूर्ति स्थिति रिपोर्ट दें।',
    ta: 'இந்த PHC-க்கான சுருக்கமான விநியோக நிலை அறிக்கையைத் தரவும்.',
    te: 'ఈ PHC కోసం సంక్షిप्त సరఫరా పరిస్థితి నివేదికను ఇవ్వండి.'
  },
  medicine: {
    en: 'Explain the ROP, safety stock, and days of supply for critically low items.',
    hi: 'गंभीर रूप से कम वस्तुओं के लिए ROP, सुरक्षा स्टॉक और आपूर्ति के दिनों को समझाएं।',
    ta: 'குறைந்த இருப்பு மருந்துகளுக்கான ROP, பாதுகாப்பு இருப்பு மற்றும் விநியோக நாட்களை விளக்கவும்.',
    te: 'తక్కువగా ఉన్న మందుల ROP, భద్రతా నిల్వ మరియు సరఫరా రోజులను వివరించండి.'
  },
  orders: {
    en: 'Which pending transfers or orders should be prioritized first?',
    hi: 'किन लंबित ट्रांसफर या ऑर्डर को पहले प्राथमिकता दी जानी चाहिए?',
    ta: 'எந்த நிலுவையிலுள்ள இடமாற்றங்கள் அல்லது ஆர்டர்களுக்கு முன்னுரிமை அளிக்க வேண்டும்?',
    te: 'ఏ పెండింగ్ బదిలీలు లేదా ఆర్డర్లకు మొదట ప్రాధాన్యత ఇవ్వాలి?'
  },
  records: {
    en: 'How do I verify an OCR or voice register entry and what audit checks apply?',
    hi: 'मैं OCR या वॉइस रजिस्टर प्रविष्टि को कैसे सत्यापित करूं और कौन सी ऑडिट जांच लागू होती है?',
    ta: 'OCR அல்லது குரல் பதிவேடு பதிவை எவ்வாறு சரிபார்ப்பது?',
    te: 'OCR లేదా వాయిస్ రిజిస్టర్ ఎంట్రీని ఎలా ధృవీకరించాలి?'
  },
  alerts: {
    en: 'Explain why each active critical alert was triggered.',
    hi: 'समझाएं कि प्रत्येक सक्रिय गंभीर अलर्ट क्यों ट्रिगर हुआ।',
    ta: 'ஒவ்வொரு முக்கிய எச்சரிக்கையும் ஏன் உருவாக்கப்பட்டது என்பதை விளக்கவும்.',
    te: 'ప్రతి ముఖ్యమైన హెచ్చరిక ఎందుకు వచ్చిందో వివరించండి.'
  },
  preparedness: {
    en: 'Explain the current seasonal surge forecast and high-risk medicines.',
    hi: 'वर्तमान मौसमी उछाल पूर्वानुमान और उच्च जोखिम वाली दवाओं को समझाएं।',
    ta: 'தற்போதைய பருவகால தேவை கணிப்பு மற்றும் அதிக ஆபத்துள்ள மருந்துகளை விளக்கவும்.',
    te: 'ప్రస్తుత సీజనల్ డిమాండ్ అంచనా మరియు అధిక రిస్క్ మందులను వివరించండి.'
  },
  workforce: {
    en: 'Summarize today’s staff attendance and operational readiness.',
    hi: 'आज की स्टाफ उपस्थिति और परिचालन तत्परता का सारांश दें।',
    ta: 'இன்றைய பணியாளர் வருகை மற்றும் தயார்நிலையைச் சுருக்கவும்.',
    te: 'నేటి సిబ్బంది హాజరు మరియు సంసిద్ధతను వివరించండి.'
  }
};

const UI_TEXT = {
  en: {
    assistantTitle: 'Gemini AI Operational Assistant',
    assistantSubtitle: 'Grounded in live MEDRESQ supply-chain data',
    activeFacility: 'Facility',
    pageContext: 'Page Context',
    quickActionsTitle: 'Quick Operational Checks',
    inputPlaceholder: 'Ask about critical stock, FEFO expiry, transfers, alerts, or forecasts...',
    send: 'Send',
    clearChat: 'Clear chat',
    openFullView: 'Full Workspace',
    thinking: 'Gemini is analyzing verified MEDRESQ operational tools...',
    readOnlyBadge: 'Demo / Read-Only Mode',
    authorizedBadge: 'Authorized Officer',
    unlockAccess: 'Unlock Officer Access',
    safetyNotice: 'Advisory Only · Never fabricates inventory · No autonomous prescribing'
  },
  hi: {
    assistantTitle: 'Gemini AI परिचालन सहायक',
    assistantSubtitle: 'लाइव MEDRESQ आपूर्ति-श्रृंखला डेटा पर आधारित',
    activeFacility: 'केंद्र (PHC)',
    pageContext: 'पृष्ठ संदर्भ',
    quickActionsTitle: 'त्वरित परिचालन जांच',
    inputPlaceholder: 'कम स्टॉक, एक्सपायरी, ट्रांसफर, अलर्ट या पूर्वानुमान के बारे में पूछें...',
    send: 'भेजें',
    clearChat: 'चैट साफ़ करें',
    openFullView: 'पूर्ण कार्यक्षेत्र',
    thinking: 'Gemini सत्यापित MEDRESQ डेटा का विश्लेषण कर रहा है...',
    readOnlyBadge: 'डेमो / केवल-पढ़ने का मोड',
    authorizedBadge: 'अधिकृत अधिकारी',
    unlockAccess: 'अधिकारी एक्सेस अनलॉक करें',
    safetyNotice: 'केवल सलाहकार · कोई काल्पनिक डेटा नहीं · स्वायत्त दवा प्रेस्क्रिप्शन नहीं'
  },
  ta: {
    assistantTitle: 'Gemini AI செயல்பாட்டு உதவியாளர்',
    assistantSubtitle: 'நேரடி MEDRESQ விநியோகத் தரவு அடிப்படையிலானது',
    activeFacility: 'நிலையம் (PHC)',
    pageContext: 'பக்க சூழல்',
    quickActionsTitle: 'விரைவு செயல்பாட்டு சோதனைகள்',
    inputPlaceholder: 'குறைந்த இருப்பு, காலாவதி, இடமாற்றம், எச்சரிக்கை பற்றி கேட்கவும்...',
    send: 'அனுப்பு',
    clearChat: 'உரையாடலை அழி',
    openFullView: 'முழு பணியிடம்',
    thinking: 'Gemini சரிபார்க்கப்பட்ட MEDRESQ தரவை ஆய்வு செய்கிறது...',
    readOnlyBadge: 'டெமோ / படிக்க மட்டும்',
    authorizedBadge: 'அங்கீகரிக்கப்பட்ட அதிகாரி',
    unlockAccess: 'அதிகாரி அணுகலைத் திற',
    safetyNotice: 'ஆலோசனை மட்டுமே · கற்பனை தரவு இல்லை · தன்னிச்சையான மருந்து பரிந்துரை இல்லை'
  },
  te: {
    assistantTitle: 'Gemini AI ఆపరేషనల్ అసిస్టెంట్',
    assistantSubtitle: 'ప్రత్యక్ష MEDRESQ సరఫరా డేటా ఆధారంగా',
    activeFacility: 'కేంద్రం (PHC)',
    pageContext: 'పేజీ సందర్భం',
    quickActionsTitle: 'త్వరిత ఆపరేషనల్ తనిఖీలు',
    inputPlaceholder: 'తక్కువ నిల్వ, గడువు, బదిలీలు, హెచ్చరికలు లేదా అంచనాల గురించి అడగండి...',
    send: 'పంపు',
    clearChat: 'చాట్ క్లియర్ చేయి',
    openFullView: 'పూర్తి వర్క్‌స్పేస్',
    thinking: 'Gemini ధృవీకరించబడిన MEDRESQ డేటాను విశ్లేషిస్తోంది...',
    readOnlyBadge: 'డెమో / రీడ్-ఓన్లీ మోడ్',
    authorizedBadge: 'అధికారిక అధికారి',
    unlockAccess: 'ఆఫీసర్ యాక్సెస్ అన్‌లాక్',
    safetyNotice: 'సలహా మాత్రమే · కల్పిత డేటా లేదు · స్వతంత్ర మందుల సూచన లేదు'
  }
};

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

  const langKey: 'en' | 'hi' | 'ta' | 'te' =
    language === 'hi' || language === 'ta' || language === 'te' ? language : 'en';
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

  const buildPageContextSummary = () => {
    return [
      `Active Module: ${activeModule} (${moduleTitle})`,
      `Active PHC: ${selectedPHC.name} (${selectedPHC.id}, ${selectedPHC.district})`,
      `Readiness Score: ${facilityMetrics.serviceReadinessScore}%`,
      `Stockout Risk Count: ${facilityMetrics.stockoutRiskCount} (${facilityMetrics.criticalCount} critical, ${facilityMetrics.warningCount} warning)`,
      `Expiring <=90d: ${facilityMetrics.expiringWithin90dCount} (${facilityMetrics.expiringWithin30dCount} <=30d)`,
      `Pending Orders: ${facilityMetrics.pendingOrdersCount}`,
      `Pending Transfers: ${facilityMetrics.pendingTransfersCount}`,
      `Active Alerts: ${alertMetrics.activeAlertsCount}`
    ].join(' | ');
  };

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

        {/* Quick Action Buttons */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
              {ui.quickActionsTitle}
            </span>
            <button
              type="button"
              disabled={isChatLoading}
              onClick={() => handleQuickPrompt(contextualPrompt)}
              className="text-[10px] font-mono font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer disabled:opacity-50 truncate max-w-[230px]"
              title={contextualPrompt}
            >
              + {contextualPrompt}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {QUICK_ACTIONS.map((action) => {
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
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-teal-700 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase ${
                        isUser ? 'text-teal-100' : 'text-teal-700'
                      }`}
                    >
                      {isUser ? 'You' : '✨ Gemini AI'}
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
                </div>
              </div>
            );
          })}

          {isChatLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />
                <span>{ui.thinking}</span>
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
