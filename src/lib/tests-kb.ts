import type { L10n } from './i18n-types';

/**
 * Curated knowledge base of common lab tests in Indian reports.
 *
 * Ranges are typical adult reference intervals and are used ONLY when the
 * report itself does not print a range (the report's own range always wins).
 * Critical thresholds are commonly used "call the doctor now" limits.
 * They are deliberately conservative and are shown as "seek medical help
 * promptly", never as a diagnosis.
 */

export type Category =
  | 'blood'
  | 'diabetes'
  | 'lipids'
  | 'kidney'
  | 'liver'
  | 'thyroid'
  | 'vitamins'
  | 'electrolytes'
  | 'urine'
  | 'inflammation';

export interface SimpleRange {
  low?: number;
  high?: number;
  lowExclusive?: boolean;
  highExclusive?: boolean;
}

export interface Band {
  /** Inclusive lower bound of the band. */
  min?: number;
  /** Exclusive upper bound of the band. */
  max?: number;
  level: 'borderline' | 'high' | 'low';
  label: L10n;
}

export interface TestInfo {
  id: string;
  category: Category;
  /** Lower-case aliases. They are matched as token sets after normalisation. */
  aliases: string[];
  /** Canonical unit, which the default range and critical limits use. */
  unit: string;
  range?: { any?: SimpleRange; male?: SimpleRange; female?: SimpleRange };
  critical?: { low?: number; high?: number };
  /** Optional clinically meaningful bands (e.g. HbA1c prediabetes). */
  bands?: Band[];
  /** For qualitative tests (urine): result words that count as normal. */
  qualitativeNormal?: string[];
  name: L10n;
  what: L10n;
  low?: L10n;
  high?: L10n;
  /** "Talk to your doctor about …" completion when the value is low or high. */
  askLow?: L10n;
  askHigh?: L10n;
}

const t = (en: string, hi: string, mr: string): L10n => ({ en, hi, mr });

export const TESTS: TestInfo[] = [
  {
    id: 'haemoglobin',
    category: 'blood',
    aliases: ['haemoglobin', 'hemoglobin', 'hb', 'hgb', 'hb%', 'हीमोग्लोबिन', 'हिमोग्लोबिन', 'रक्तातील हिमोग्लोबिन'],
    unit: 'g/dL',
    range: { male: { low: 13, high: 17 }, female: { low: 12, high: 15.5 }, any: { low: 12, high: 17 } },
    critical: { low: 7, high: 20 },
    name: t('Haemoglobin', 'हीमोग्लोबिन', 'हिमोग्लोबिन'),
    what: t(
      'The protein in red blood cells that carries oxygen around your body.',
      'लाल रक्त कोशिकाओं का प्रोटीन, जो शरीर में ऑक्सीजन पहुँचाता है।',
      'तांबड्या रक्तपेशींमधील प्रथिन, जे शरीरभर ऑक्सिजन पोहोचवते.',
    ),
    low: t(
      'Low haemoglobin is called anaemia and can cause tiredness, breathlessness or pale skin.',
      'कम हीमोग्लोबिन को एनीमिया (खून की कमी) कहते हैं; इससे थकान, साँस फूलना या पीलापन हो सकता है।',
      'कमी हिमोग्लोबिनला ॲनिमिया (रक्तक्षय) म्हणतात; त्यामुळे थकवा, धाप लागणे किंवा फिकटपणा येऊ शकतो.',
    ),
    high: t(
      'High haemoglobin can happen with dehydration, smoking or living at altitude, and sometimes needs further tests.',
      'अधिक हीमोग्लोबिन पानी की कमी, धूम्रपान या ऊँचाई पर रहने से हो सकता है; कभी-कभी आगे जाँच ज़रूरी होती है।',
      'जास्त हिमोग्लोबिन शरीरात पाणी कमी असणे, धूम्रपान किंवा उंचावर राहणे यामुळे होऊ शकते; कधी पुढील तपासणी लागते.',
    ),
    askLow: t(
      'the cause of anaemia and whether you need iron, vitamin B12 or folate tests',
      'एनीमिया का कारण और क्या आयरन, विटामिन B12 या फोलेट की जाँच चाहिए',
      'रक्तक्षयाचे कारण आणि लोह, जीवनसत्त्व B12 किंवा फोलेट तपासणीची गरज आहे का',
    ),
    askHigh: t(
      'whether you need to repeat the test or check for dehydration',
      'क्या जाँच दोबारा करनी चाहिए या पानी की कमी देखनी चाहिए',
      'तपासणी पुन्हा करावी का किंवा पाण्याची कमतरता तपासावी का',
    ),
  },
  {
    id: 'wbc',
    category: 'blood',
    aliases: [
      'total leucocyte count', 'total leukocyte count', 'tlc', 'wbc', 'wbc count', 'total wbc count',
      'white blood cells', 'white blood cell count', 'total count', 'श्वेत रक्त कोशिका', 'श्वेत रक्त कण', 'पांढऱ्या पेशी', 'पांढऱ्या रक्तपेशी',
    ],
    unit: '/µL',
    range: { any: { low: 4000, high: 11000 } },
    critical: { low: 2000, high: 30000 },
    name: t('White blood cells (WBC)', 'श्वेत रक्त कोशिकाएँ (WBC)', 'पांढऱ्या रक्तपेशी (WBC)'),
    what: t(
      'Cells that fight infection.',
      'वे कोशिकाएँ जो संक्रमण से लड़ती हैं।',
      'संसर्गाशी लढणाऱ्या पेशी.',
    ),
    low: t(
      'A low count can make infections more likely and can be caused by viral illness or some medicines.',
      'कम संख्या से संक्रमण का खतरा बढ़ सकता है; यह वायरल बीमारी या कुछ दवाओं से हो सकता है।',
      'कमी संख्येमुळे संसर्गाचा धोका वाढू शकतो; विषाणूजन्य आजार किंवा काही औषधांमुळे असे होऊ शकते.',
    ),
    high: t(
      'A high count often means your body is fighting an infection or inflammation.',
      'अधिक संख्या अक्सर बताती है कि शरीर किसी संक्रमण या सूजन से लड़ रहा है।',
      'जास्त संख्या बहुधा शरीर संसर्ग किंवा सूजेशी लढत असल्याचे दर्शवते.',
    ),
    askLow: t('possible causes and whether to repeat the count', 'संभावित कारण और क्या गिनती दोबारा करनी है', 'संभाव्य कारणे आणि गणना पुन्हा करावी का'),
    askHigh: t('whether you have an infection that needs treatment', 'क्या कोई संक्रमण है जिसका इलाज ज़रूरी है', 'उपचाराची गरज असलेला संसर्ग आहे का'),
  },
  {
    id: 'platelets',
    category: 'blood',
    aliases: ['platelet count', 'platelets', 'plt', 'प्लेटलेट', 'प्लेटलेट्स', 'प्लेटलेट गणना', 'रक्तबिंबिका'],
    unit: '/µL',
    range: { any: { low: 150000, high: 410000 } },
    critical: { low: 20000, high: 1000000 },
    name: t('Platelets', 'प्लेटलेट्स', 'प्लेटलेट्स'),
    what: t('Tiny cells that help your blood clot.', 'छोटी कोशिकाएँ जो खून का थक्का बनाने में मदद करती हैं।', 'रक्त गोठण्यास मदत करणाऱ्या लहान पेशी.'),
    low: t(
      'Low platelets can cause easy bruising or bleeding; dengue and some viral fevers commonly lower them.',
      'कम प्लेटलेट्स से आसानी से नील पड़ना या खून बहना हो सकता है; डेंगू और कुछ वायरल बुखार में ये घटते हैं।',
      'कमी प्लेटलेट्समुळे सहज जखम किंवा रक्तस्राव होऊ शकतो; डेंग्यू व काही विषाणूजन्य तापात त्या कमी होतात.',
    ),
    high: t(
      'High platelets can follow infection, inflammation or iron deficiency.',
      'अधिक प्लेटलेट्स संक्रमण, सूजन या आयरन की कमी के बाद हो सकते हैं।',
      'जास्त प्लेटलेट्स संसर्ग, सूज किंवा लोहाच्या कमतरतेनंतर दिसू शकतात.',
    ),
    askLow: t('bleeding warning signs and how often to recheck', 'खून बहने के चेतावनी संकेत और कितनी बार दोबारा जाँच करें', 'रक्तस्रावाची धोक्याची लक्षणे आणि किती वेळा पुन्हा तपासावे'),
    askHigh: t('what may be causing it and whether follow-up is needed', 'इसका कारण और क्या आगे जाँच चाहिए', 'याचे कारण आणि पुढील तपासणी लागेल का'),
  },
  {
    id: 'rbc',
    category: 'blood',
    aliases: ['rbc count', 'rbc', 'total rbc count', 'red blood cell count', 'red blood cells', 'लाल रक्त कोशिका', 'लाल रक्त कण', 'तांबड्या रक्तपेशी', 'लाल रक्तपेशी'],
    unit: 'million/µL',
    range: { male: { low: 4.5, high: 5.5 }, female: { low: 3.8, high: 4.8 }, any: { low: 3.8, high: 5.5 } },
    name: t('Red blood cells (RBC)', 'लाल रक्त कोशिकाएँ (RBC)', 'तांबड्या रक्तपेशी (RBC)'),
    what: t('The number of oxygen-carrying red cells in your blood.', 'खून में ऑक्सीजन ले जाने वाली लाल कोशिकाओं की संख्या।', 'रक्तातील ऑक्सिजन वाहून नेणाऱ्या तांबड्या पेशींची संख्या.'),
    low: t('A low count usually goes with anaemia.', 'कम संख्या आमतौर पर एनीमिया के साथ होती है।', 'कमी संख्या सहसा रक्तक्षयासोबत दिसते.'),
    high: t('A high count can be due to dehydration or other causes.', 'अधिक संख्या पानी की कमी या अन्य कारणों से हो सकती है।', 'जास्त संख्या पाण्याची कमतरता किंवा इतर कारणांमुळे असू शकते.'),
    askLow: t('whether this fits with anaemia', 'क्या यह एनीमिया से मेल खाता है', 'हे रक्तक्षयाशी जुळते का'),
    askHigh: t('whether a repeat test is needed', 'क्या दोबारा जाँच चाहिए', 'पुन्हा तपासणी लागेल का'),
  },
  {
    id: 'pcv',
    category: 'blood',
    aliases: ['pcv', 'hct', 'haematocrit', 'hematocrit', 'packed cell volume', 'हीमेटोक्रिट'],
    unit: '%',
    range: { male: { low: 40, high: 50 }, female: { low: 36, high: 46 }, any: { low: 36, high: 50 } },
    name: t('Packed cell volume (PCV)', 'पैक्ड सेल वॉल्यूम (PCV)', 'पॅक्ड सेल व्हॉल्यूम (PCV)'),
    what: t('The share of your blood made up of red cells.', 'खून में लाल कोशिकाओं का हिस्सा।', 'रक्तातील तांबड्या पेशींचे प्रमाण.'),
    low: t('Low PCV usually goes with anaemia.', 'कम PCV आमतौर पर एनीमिया के साथ होता है।', 'कमी PCV सहसा रक्तक्षयासोबत असते.'),
    high: t('High PCV can be due to dehydration.', 'अधिक PCV पानी की कमी से हो सकता है।', 'जास्त PCV पाण्याच्या कमतरतेमुळे असू शकते.'),
    askLow: t('whether this fits with anaemia', 'क्या यह एनीमिया से मेल खाता है', 'हे रक्तक्षयाशी जुळते का'),
    askHigh: t('your fluid intake and whether to repeat the test', 'पानी पीने की मात्रा और क्या जाँच दोबारा करनी है', 'पाणी पिण्याचे प्रमाण आणि तपासणी पुन्हा करावी का'),
  },
  {
    id: 'mcv',
    category: 'blood',
    aliases: ['mcv', 'mean corpuscular volume', 'mean cell volume'],
    unit: 'fL',
    range: { any: { low: 83, high: 101 } },
    name: t('Red cell size (MCV)', 'लाल कोशिका का आकार (MCV)', 'तांबड्या पेशीचा आकार (MCV)'),
    what: t('The average size of your red blood cells.', 'लाल रक्त कोशिकाओं का औसत आकार।', 'तांबड्या रक्तपेशींचा सरासरी आकार.'),
    low: t('Small red cells are often seen with iron deficiency.', 'छोटी लाल कोशिकाएँ अक्सर आयरन की कमी में दिखती हैं।', 'लहान तांबड्या पेशी बहुधा लोहाच्या कमतरतेत दिसतात.'),
    high: t('Large red cells are often seen with low vitamin B12 or folate.', 'बड़ी लाल कोशिकाएँ अक्सर विटामिन B12 या फोलेट की कमी में दिखती हैं।', 'मोठ्या तांबड्या पेशी बहुधा जीवनसत्त्व B12 किंवा फोलेटच्या कमतरतेत दिसतात.'),
    askLow: t('checking your iron levels', 'आयरन स्तर की जाँच', 'लोहाची पातळी तपासणे'),
    askHigh: t('checking vitamin B12 and folate', 'विटामिन B12 और फोलेट की जाँच', 'जीवनसत्त्व B12 व फोलेट तपासणे'),
  },
  {
    id: 'esr',
    category: 'inflammation',
    aliases: ['esr', 'erythrocyte sedimentation rate', 'sed rate', 'ई एस आर'],
    unit: 'mm/hr',
    range: { any: { low: 0, high: 20 } },
    name: t('ESR', 'ESR', 'ESR'),
    what: t('A general marker of inflammation in the body.', 'शरीर में सूजन का एक सामान्य संकेतक।', 'शरीरातील सूजेचा एक सामान्य निर्देशक.'),
    high: t('A raised ESR is non-specific; infections, inflammation and anaemia can all raise it.', 'बढ़ा ESR विशिष्ट नहीं है; संक्रमण, सूजन और एनीमिया सभी इसे बढ़ा सकते हैं।', 'वाढलेला ESR विशिष्ट नसतो; संसर्ग, सूज व रक्तक्षय यांमुळे तो वाढू शकतो.'),
    askHigh: t('what might be causing inflammation', 'सूजन का कारण क्या हो सकता है', 'सूजेचे कारण काय असू शकते'),
  },
  {
    id: 'glucose_fasting',
    category: 'diabetes',
    aliases: [
      'fasting blood sugar', 'fbs', 'glucose fasting', 'fasting glucose', 'fasting plasma glucose', 'fpg', 'blood sugar fasting',
      'plasma glucose fasting', 'fasting blood glucose', 'उपवास रक्त शर्करा', 'खाली पेट शुगर', 'उपाशीपोटी साखर', 'उपाशीपोटी रक्तशर्करा', 'फास्टिंग शुगर',
    ],
    unit: 'mg/dL',
    range: { any: { low: 70, high: 100 } },
    critical: { low: 54, high: 400 },
    bands: [
      { min: 100, max: 126, level: 'borderline', label: t('prediabetes range', 'प्री-डायबिटीज़ सीमा', 'प्री-डायबेटीस श्रेणी') },
      { min: 126, level: 'high', label: t('diabetes range', 'डायबिटीज़ सीमा', 'मधुमेह श्रेणी') },
    ],
    name: t('Fasting blood sugar', 'खाली पेट ब्लड शुगर', 'उपाशीपोटी रक्तशर्करा'),
    what: t('Your blood sugar after at least 8 hours without food.', 'कम से कम 8 घंटे बिना खाए खून में शुगर।', 'किमान 8 तास काही न खाल्ल्यानंतरची रक्तातील साखर.'),
    low: t('Low sugar can cause shakiness, sweating or confusion.', 'कम शुगर से काँपना, पसीना या उलझन हो सकती है।', 'कमी साखरेमुळे थरथर, घाम किंवा गोंधळ होऊ शकतो.'),
    high: t('High fasting sugar can be a sign of prediabetes or diabetes.', 'अधिक फास्टिंग शुगर प्री-डायबिटीज़ या डायबिटीज़ का संकेत हो सकती है।', 'जास्त उपाशीपोटी साखर प्री-डायबेटीस किंवा मधुमेहाचे लक्षण असू शकते.'),
    askLow: t('why your sugar is low and what to do if it drops', 'शुगर कम क्यों है और गिरने पर क्या करें', 'साखर कमी का आहे आणि कमी झाल्यास काय करावे'),
    askHigh: t('whether you need an HbA1c test, diet changes or treatment', 'क्या HbA1c जाँच, खान-पान में बदलाव या इलाज चाहिए', 'HbA1c तपासणी, आहारात बदल किंवा उपचार लागतील का'),
  },
  {
    id: 'glucose_pp',
    category: 'diabetes',
    aliases: [
      'post prandial blood sugar', 'ppbs', 'pp blood sugar', 'glucose pp', 'post prandial glucose', 'postprandial glucose',
      'glucose post prandial', 'blood sugar pp', 'plasma glucose pp', 'खाने के बाद शुगर', 'जेवणानंतर साखर', 'जेवणानंतरची रक्तशर्करा', 'पीपी शुगर',
    ],
    unit: 'mg/dL',
    range: { any: { low: 70, high: 140 } },
    critical: { low: 54, high: 400 },
    bands: [
      { min: 140, max: 200, level: 'borderline', label: t('prediabetes range', 'प्री-डायबिटीज़ सीमा', 'प्री-डायबेटीस श्रेणी') },
      { min: 200, level: 'high', label: t('diabetes range', 'डायबिटीज़ सीमा', 'मधुमेह श्रेणी') },
    ],
    name: t('Blood sugar after meals (PP)', 'खाने के बाद ब्लड शुगर (PP)', 'जेवणानंतरची रक्तशर्करा (PP)'),
    what: t('Your blood sugar about 2 hours after eating.', 'खाने के लगभग 2 घंटे बाद खून में शुगर।', 'जेवणानंतर सुमारे 2 तासांनी रक्तातील साखर.'),
    low: t('Low sugar can cause shakiness, sweating or confusion.', 'कम शुगर से काँपना, पसीना या उलझन हो सकती है।', 'कमी साखरेमुळे थरथर, घाम किंवा गोंधळ होऊ शकतो.'),
    high: t('High after-meal sugar can be a sign of prediabetes or diabetes.', 'खाने के बाद अधिक शुगर प्री-डायबिटीज़ या डायबिटीज़ का संकेत हो सकती है।', 'जेवणानंतर जास्त साखर प्री-डायबेटीस किंवा मधुमेहाचे लक्षण असू शकते.'),
    askLow: t('why your sugar is low', 'शुगर कम क्यों है', 'साखर कमी का आहे'),
    askHigh: t('diet, exercise and whether you need treatment', 'खान-पान, व्यायाम और क्या इलाज चाहिए', 'आहार, व्यायाम आणि उपचारांची गरज आहे का'),
  },
  {
    id: 'glucose_random',
    category: 'diabetes',
    aliases: ['random blood sugar', 'rbs', 'glucose random', 'random glucose', 'random plasma glucose', 'रैंडम शुगर', 'यादृच्छिक रक्तशर्करा'],
    unit: 'mg/dL',
    range: { any: { low: 70, high: 140 } },
    critical: { low: 54, high: 400 },
    name: t('Random blood sugar', 'रैंडम ब्लड शुगर', 'रँडम रक्तशर्करा'),
    what: t('Your blood sugar at any time of day.', 'दिन में किसी भी समय खून में शुगर।', 'दिवसातील कोणत्याही वेळेची रक्तातील साखर.'),
    low: t('Low sugar can cause shakiness, sweating or confusion.', 'कम शुगर से काँपना, पसीना या उलझन हो सकती है।', 'कमी साखरेमुळे थरथर, घाम किंवा गोंधळ होऊ शकतो.'),
    high: t('High random sugar may need a fasting sugar or HbA1c test to understand it.', 'अधिक रैंडम शुगर को समझने के लिए फास्टिंग शुगर या HbA1c जाँच चाहिए हो सकती है।', 'जास्त रँडम साखर समजण्यासाठी उपाशीपोटी साखर किंवा HbA1c तपासणी लागू शकते.'),
    askLow: t('why your sugar is low', 'शुगर कम क्यों है', 'साखर कमी का आहे'),
    askHigh: t('whether you need a fasting sugar or HbA1c test', 'क्या फास्टिंग शुगर या HbA1c जाँच चाहिए', 'उपाशीपोटी साखर किंवा HbA1c तपासणी लागेल का'),
  },
  {
    id: 'hba1c',
    category: 'diabetes',
    aliases: ['hba1c', 'glycated haemoglobin', 'glycated hemoglobin', 'glycosylated haemoglobin', 'glycosylated hemoglobin', 'a1c', 'एचबीए1सी', 'ग्लाइकेटेड हीमोग्लोबिन', 'ग्लायकेटेड हिमोग्लोबिन'],
    unit: '%',
    range: { any: { low: 4, high: 5.6 } },
    bands: [
      { min: 5.7, max: 6.5, level: 'borderline', label: t('prediabetes range', 'प्री-डायबिटीज़ सीमा', 'प्री-डायबेटीस श्रेणी') },
      { min: 6.5, level: 'high', label: t('diabetes range', 'डायबिटीज़ सीमा', 'मधुमेह श्रेणी') },
    ],
    name: t('HbA1c (3-month average sugar)', 'HbA1c (3 महीने की औसत शुगर)', 'HbA1c (3 महिन्यांची सरासरी साखर)'),
    what: t('Your average blood sugar over the last 2–3 months.', 'पिछले 2–3 महीनों की औसत ब्लड शुगर।', 'मागील 2–3 महिन्यांतील सरासरी रक्तशर्करा.'),
    low: t('A low HbA1c is uncommon and can be affected by anaemia or blood loss.', 'कम HbA1c असामान्य है और एनीमिया या खून की कमी से प्रभावित हो सकता है।', 'कमी HbA1c क्वचित असते आणि रक्तक्षय किंवा रक्तस्रावामुळे प्रभावित होऊ शकते.'),
    high: t('A high HbA1c shows your sugar has been high for weeks to months.', 'अधिक HbA1c बताता है कि शुगर हफ़्तों-महीनों से अधिक रही है।', 'जास्त HbA1c दाखवते की साखर अनेक आठवडे-महिने जास्त राहिली आहे.'),
    askLow: t('whether anaemia could be affecting this result', 'क्या एनीमिया इस परिणाम को प्रभावित कर रहा है', 'रक्तक्षय या निकालावर परिणाम करत आहे का'),
    askHigh: t('your sugar targets and treatment plan', 'शुगर के लक्ष्य और इलाज की योजना', 'साखरेचे लक्ष्य आणि उपचार योजना'),
  },
  {
    id: 'cholesterol_total',
    category: 'lipids',
    aliases: ['total cholesterol', 'cholesterol', 'serum cholesterol', 'cholesterol total', 'कुल कोलेस्ट्रॉल', 'कोलेस्ट्रॉल', 'एकूण कोलेस्टेरॉल', 'कोलेस्टेरॉल'],
    unit: 'mg/dL',
    range: { any: { high: 200, highExclusive: true } },
    name: t('Total cholesterol', 'कुल कोलेस्ट्रॉल', 'एकूण कोलेस्टेरॉल'),
    what: t('All the cholesterol (a type of fat) in your blood.', 'खून में कुल कोलेस्ट्रॉल (एक प्रकार की चर्बी)।', 'रक्तातील एकूण कोलेस्टेरॉल (एक प्रकारची चरबी).'),
    high: t('High cholesterol raises the long-term risk of heart disease and stroke.', 'अधिक कोलेस्ट्रॉल से लंबे समय में दिल की बीमारी और स्ट्रोक का खतरा बढ़ता है।', 'जास्त कोलेस्टेरॉलमुळे दीर्घकाळात हृदयविकार व पक्षाघाताचा धोका वाढतो.'),
    askHigh: t('your heart risk, diet and whether you need medicine', 'दिल का खतरा, खान-पान और क्या दवा चाहिए', 'हृदयाचा धोका, आहार आणि औषधाची गरज आहे का'),
  },
  {
    id: 'ldl',
    category: 'lipids',
    aliases: ['ldl', 'ldl cholesterol', 'ldl c', 'ldl-c', 'ldl direct', 'low density lipoprotein', 'एलडीएल', 'एलडीएल कोलेस्ट्रॉल'],
    unit: 'mg/dL',
    range: { any: { high: 100, highExclusive: true } },
    name: t('LDL ("bad") cholesterol', 'LDL ("खराब") कोलेस्ट्रॉल', 'LDL ("वाईट") कोलेस्टेरॉल'),
    what: t('The cholesterol that can build up in artery walls.', 'वह कोलेस्ट्रॉल जो धमनियों की दीवारों में जम सकता है।', 'धमन्यांच्या भिंतींमध्ये साचू शकणारे कोलेस्टेरॉल.'),
    high: t('High LDL raises the risk of heart attack and stroke over time.', 'अधिक LDL से समय के साथ हार्ट अटैक और स्ट्रोक का खतरा बढ़ता है।', 'जास्त LDL मुळे कालांतराने हृदयविकाराचा झटका व पक्षाघाताचा धोका वाढतो.'),
    askHigh: t('your LDL target and whether you need a statin', 'आपका LDL लक्ष्य और क्या स्टैटिन दवा चाहिए', 'तुमचे LDL लक्ष्य आणि स्टॅटिन औषधाची गरज आहे का'),
  },
  {
    id: 'hdl',
    category: 'lipids',
    aliases: ['hdl', 'hdl cholesterol', 'hdl c', 'hdl-c', 'high density lipoprotein', 'एचडीएल', 'एचडीएल कोलेस्ट्रॉल'],
    unit: 'mg/dL',
    range: { male: { low: 40 }, female: { low: 50 }, any: { low: 40 } },
    name: t('HDL ("good") cholesterol', 'HDL ("अच्छा") कोलेस्ट्रॉल', 'HDL ("चांगले") कोलेस्टेरॉल'),
    what: t('The cholesterol that helps clear fat from your arteries; higher is better.', 'वह कोलेस्ट्रॉल जो धमनियों से चर्बी हटाने में मदद करता है; अधिक होना अच्छा है।', 'धमन्यांतील चरबी काढण्यास मदत करणारे कोलेस्टेरॉल; जास्त असणे चांगले.'),
    low: t('Low HDL raises heart risk; exercise and not smoking can raise it.', 'कम HDL से दिल का खतरा बढ़ता है; व्यायाम और धूम्रपान छोड़ने से यह बढ़ सकता है।', 'कमी HDL मुळे हृदयाचा धोका वाढतो; व्यायाम व धूम्रपान टाळल्याने तो वाढू शकतो.'),
    high: t('A high HDL is usually good news.', 'अधिक HDL आमतौर पर अच्छी बात है।', 'जास्त HDL सहसा चांगली गोष्ट आहे.'),
    askLow: t('ways to raise HDL and your overall heart risk', 'HDL बढ़ाने के तरीके और कुल दिल का खतरा', 'HDL वाढवण्याचे मार्ग आणि हृदयाचा एकूण धोका'),
    askHigh: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
  },
  {
    id: 'triglycerides',
    category: 'lipids',
    aliases: ['triglycerides', 'triglyceride', 'tg', 'serum triglycerides', 'ट्राइग्लिसराइड', 'ट्रायग्लिसराइड', 'ट्रायग्लिसराईड'],
    unit: 'mg/dL',
    range: { any: { high: 150, highExclusive: true } },
    critical: { high: 1000 },
    name: t('Triglycerides', 'ट्राइग्लिसराइड', 'ट्रायग्लिसराईड'),
    what: t('A type of fat in your blood that rises with sugar, refined carbs and alcohol.', 'खून में चर्बी का एक प्रकार, जो शक्कर, मैदा और शराब से बढ़ता है।', 'रक्तातील चरबीचा एक प्रकार, जो साखर, मैदा व मद्यामुळे वाढतो.'),
    high: t('High triglycerides add to heart risk; very high levels can inflame the pancreas.', 'अधिक ट्राइग्लिसराइड दिल का खतरा बढ़ाते हैं; बहुत अधिक स्तर अग्न्याशय में सूजन कर सकते हैं।', 'जास्त ट्रायग्लिसराईड हृदयाचा धोका वाढवतात; खूप जास्त पातळीमुळे स्वादुपिंडाला सूज येऊ शकते.'),
    askHigh: t('diet changes and whether you need treatment', 'खान-पान में बदलाव और क्या इलाज चाहिए', 'आहारातील बदल आणि उपचारांची गरज आहे का'),
  },
  {
    id: 'creatinine',
    category: 'kidney',
    aliases: ['creatinine', 'serum creatinine', 's creatinine', 'creatinine serum', 'क्रिएटिनिन', 'क्रिएटिनिन सीरम'],
    unit: 'mg/dL',
    range: { male: { low: 0.7, high: 1.3 }, female: { low: 0.6, high: 1.1 }, any: { low: 0.6, high: 1.3 } },
    critical: { high: 6 },
    name: t('Creatinine (kidney)', 'क्रिएटिनिन (किडनी)', 'क्रिएटिनिन (मूत्रपिंड)'),
    what: t('A waste product your kidneys filter; it shows how well they are working.', 'एक अपशिष्ट जिसे किडनी छानती है; यह बताता है कि किडनी कितनी अच्छी तरह काम कर रही है।', 'मूत्रपिंड गाळणारा एक टाकाऊ पदार्थ; मूत्रपिंड किती चांगले काम करत आहे हे यातून कळते.'),
    low: t('Low creatinine is usually not a concern and can reflect low muscle mass.', 'कम क्रिएटिनिन आमतौर पर चिंता की बात नहीं; यह कम मांसपेशियों से हो सकता है।', 'कमी क्रिएटिनिन सहसा चिंतेचे कारण नसते; कमी स्नायूंमुळे असे असू शकते.'),
    high: t('High creatinine can mean the kidneys are not filtering as well as they should.', 'अधिक क्रिएटिनिन का अर्थ हो सकता है कि किडनी ठीक से नहीं छान रही।', 'जास्त क्रिएटिनिन म्हणजे मूत्रपिंड नीट गाळत नसल्याचे लक्षण असू शकते.'),
    askLow: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
    askHigh: t('your kidney function (eGFR) and any medicines that affect the kidneys', 'किडनी की कार्यक्षमता (eGFR) और किडनी पर असर करने वाली दवाएँ', 'मूत्रपिंडाचे कार्य (eGFR) आणि मूत्रपिंडावर परिणाम करणारी औषधे'),
  },
  {
    id: 'urea',
    category: 'kidney',
    aliases: ['blood urea', 'urea', 'serum urea', 'यूरिया', 'युरिया', 'रक्त यूरिया'],
    unit: 'mg/dL',
    range: { any: { low: 15, high: 40 } },
    name: t('Blood urea', 'ब्लड यूरिया', 'रक्तातील युरिया'),
    what: t('A waste product from protein that your kidneys remove.', 'प्रोटीन से बना अपशिष्ट, जिसे किडनी बाहर निकालती है।', 'प्रथिनांपासून तयार होणारा टाकाऊ पदार्थ, जो मूत्रपिंड बाहेर टाकतात.'),
    low: t('Low urea is rarely a concern.', 'कम यूरिया शायद ही चिंता की बात हो।', 'कमी युरिया क्वचितच चिंतेचे कारण असते.'),
    high: t('High urea can come from dehydration, a high-protein diet or reduced kidney function.', 'अधिक यूरिया पानी की कमी, अधिक प्रोटीन या किडनी की कमज़ोरी से हो सकता है।', 'जास्त युरिया पाण्याची कमतरता, जास्त प्रथिने किंवा मूत्रपिंडाचे कमी कार्य यामुळे होऊ शकतो.'),
    askLow: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
    askHigh: t('your kidney function and fluid intake', 'किडनी की कार्यक्षमता और पानी पीने की मात्रा', 'मूत्रपिंडाचे कार्य आणि पाणी पिण्याचे प्रमाण'),
  },
  {
    id: 'uric_acid',
    category: 'kidney',
    aliases: ['uric acid', 'serum uric acid', 'यूरिक एसिड', 'युरिक ॲसिड', 'यूरिक अम्ल'],
    unit: 'mg/dL',
    range: { male: { low: 3.5, high: 7.2 }, female: { low: 2.6, high: 6 }, any: { low: 2.6, high: 7.2 } },
    name: t('Uric acid', 'यूरिक एसिड', 'युरिक ॲसिड'),
    what: t('A waste product that can form crystals in joints when high.', 'एक अपशिष्ट जो अधिक होने पर जोड़ों में क्रिस्टल बना सकता है।', 'एक टाकाऊ पदार्थ, जो जास्त झाल्यास सांध्यांमध्ये स्फटिक तयार करू शकतो.'),
    low: t('Low uric acid is rarely a concern.', 'कम यूरिक एसिड शायद ही चिंता की बात हो।', 'कमी युरिक ॲसिड क्वचितच चिंतेचे कारण असते.'),
    high: t('High uric acid can cause gout (painful joints) or kidney stones.', 'अधिक यूरिक एसिड से गठिया (गाउट) या पथरी हो सकती है।', 'जास्त युरिक ॲसिडमुळे संधिवात (गाउट) किंवा मुतखडा होऊ शकतो.'),
    askLow: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
    askHigh: t('diet, fluids and whether you need treatment for gout', 'खान-पान, पानी और क्या गाउट का इलाज चाहिए', 'आहार, पाणी आणि गाउटच्या उपचारांची गरज आहे का'),
  },
  {
    id: 'sodium',
    category: 'electrolytes',
    aliases: ['sodium', 'serum sodium', 'na', 'na+', 'सोडियम'],
    unit: 'mmol/L',
    range: { any: { low: 135, high: 145 } },
    critical: { low: 120, high: 160 },
    name: t('Sodium', 'सोडियम', 'सोडियम'),
    what: t('A salt that controls fluid balance, nerves and muscles.', 'एक लवण जो शरीर में पानी का संतुलन, नसें और मांसपेशियाँ नियंत्रित करता है।', 'शरीरातील पाण्याचा समतोल, नसा व स्नायू नियंत्रित करणारे क्षार.'),
    low: t('Low sodium can cause confusion, weakness or headache; some medicines lower it.', 'कम सोडियम से उलझन, कमज़ोरी या सिरदर्द हो सकता है; कुछ दवाएँ इसे घटाती हैं।', 'कमी सोडियममुळे गोंधळ, अशक्तपणा किंवा डोकेदुखी होऊ शकते; काही औषधे तो कमी करतात.'),
    high: t('High sodium usually means dehydration.', 'अधिक सोडियम आमतौर पर पानी की कमी दर्शाता है।', 'जास्त सोडियम सहसा पाण्याची कमतरता दर्शवते.'),
    askLow: t('your medicines and fluid intake', 'आपकी दवाएँ और पानी पीने की मात्रा', 'तुमची औषधे आणि पाणी पिण्याचे प्रमाण'),
    askHigh: t('your fluid intake', 'पानी पीने की मात्रा', 'पाणी पिण्याचे प्रमाण'),
  },
  {
    id: 'potassium',
    category: 'electrolytes',
    aliases: ['potassium', 'serum potassium', 'k', 'k+', 'पोटैशियम', 'पोटॅशियम'],
    unit: 'mmol/L',
    range: { any: { low: 3.5, high: 5.1 } },
    critical: { low: 2.8, high: 6.2 },
    name: t('Potassium', 'पोटैशियम', 'पोटॅशियम'),
    what: t('A salt that keeps your heart rhythm and muscles working normally.', 'एक लवण जो दिल की धड़कन और मांसपेशियों को सामान्य रखता है।', 'हृदयाची लय व स्नायू सामान्य ठेवणारे क्षार.'),
    low: t('Low potassium can cause cramps, weakness or an irregular heartbeat.', 'कम पोटैशियम से ऐंठन, कमज़ोरी या अनियमित धड़कन हो सकती है।', 'कमी पोटॅशियममुळे पेटके, अशक्तपणा किंवा अनियमित हृदयगती होऊ शकते.'),
    high: t('High potassium can affect the heart rhythm and needs prompt review.', 'अधिक पोटैशियम दिल की धड़कन पर असर कर सकता है; जल्दी जाँच ज़रूरी है।', 'जास्त पोटॅशियम हृदयाच्या लयीवर परिणाम करू शकतो; लवकर तपासणी आवश्यक.'),
    askLow: t('your medicines (for example water pills) and supplements', 'आपकी दवाएँ (जैसे पेशाब की गोलियाँ) और सप्लीमेंट', 'तुमची औषधे (उदा. लघवीच्या गोळ्या) आणि पूरक'),
    askHigh: t('your kidney function and medicines, as soon as possible', 'किडनी की कार्यक्षमता और दवाएँ, जितनी जल्दी हो सके', 'मूत्रपिंडाचे कार्य आणि औषधे, शक्य तितक्या लवकर'),
  },
  {
    id: 'calcium',
    category: 'electrolytes',
    aliases: ['calcium', 'serum calcium', 'total calcium', 'ca', 'कैल्शियम', 'कॅल्शियम'],
    unit: 'mg/dL',
    range: { any: { low: 8.6, high: 10.2 } },
    critical: { low: 6.5, high: 13 },
    name: t('Calcium', 'कैल्शियम', 'कॅल्शियम'),
    what: t('A mineral for bones, muscles and nerves.', 'हड्डियों, मांसपेशियों और नसों के लिए खनिज।', 'हाडे, स्नायू व नसांसाठी खनिज.'),
    low: t('Low calcium can cause tingling or cramps and is often linked to low vitamin D.', 'कम कैल्शियम से झनझनाहट या ऐंठन हो सकती है; यह अक्सर विटामिन D की कमी से जुड़ा होता है।', 'कमी कॅल्शियममुळे मुंग्या येणे किंवा पेटके येऊ शकतात; हे बहुधा जीवनसत्त्व D कमी असण्याशी संबंधित असते.'),
    high: t('High calcium can cause thirst, constipation or kidney stones and needs a check-up.', 'अधिक कैल्शियम से प्यास, कब्ज़ या पथरी हो सकती है; जाँच ज़रूरी है।', 'जास्त कॅल्शियममुळे तहान, बद्धकोष्ठता किंवा मुतखडा होऊ शकतो; तपासणी आवश्यक.'),
    askLow: t('checking vitamin D and your diet', 'विटामिन D और खान-पान की जाँच', 'जीवनसत्त्व D व आहार तपासणे'),
    askHigh: t('what may be causing it', 'इसका कारण क्या हो सकता है', 'याचे कारण काय असू शकते'),
  },
  {
    id: 'tsh',
    category: 'thyroid',
    aliases: ['tsh', 'thyroid stimulating hormone', 'tsh ultrasensitive', 'ultrasensitive tsh', 'tsh 3rd generation', 'टीएसएच', 'थायरॉइड उत्तेजक हार्मोन'],
    unit: 'µIU/mL',
    range: { any: { low: 0.4, high: 4.0 } },
    name: t('TSH (thyroid)', 'TSH (थायरॉइड)', 'TSH (थायरॉईड)'),
    what: t('A hormone from the brain that tells your thyroid how hard to work.', 'दिमाग़ का हार्मोन जो थायरॉइड को बताता है कि कितना काम करना है।', 'मेंदूतील संप्रेरक, जे थायरॉईडला किती काम करायचे हे सांगते.'),
    low: t('Low TSH can mean an overactive thyroid (hyperthyroidism).', 'कम TSH का अर्थ अधिक सक्रिय थायरॉइड (हाइपरथायरॉइडिज़्म) हो सकता है।', 'कमी TSH म्हणजे अतिसक्रिय थायरॉईड (हायपरथायरॉईडिझम) असू शकतो.'),
    high: t('High TSH can mean an underactive thyroid (hypothyroidism), which can cause tiredness and weight gain.', 'अधिक TSH का अर्थ कम सक्रिय थायरॉइड (हाइपोथायरॉइडिज़्म) हो सकता है; इससे थकान और वज़न बढ़ सकता है।', 'जास्त TSH म्हणजे मंद थायरॉईड (हायपोथायरॉईडिझम) असू शकतो; त्यामुळे थकवा व वजनवाढ होऊ शकते.'),
    askLow: t('checking T3/T4 and thyroid symptoms', 'T3/T4 की जाँच और थायरॉइड के लक्षण', 'T3/T4 तपासणी आणि थायरॉईडची लक्षणे'),
    askHigh: t('checking free T4 and whether you need thyroid medicine', 'फ्री T4 जाँच और क्या थायरॉइड की दवा चाहिए', 'फ्री T4 तपासणी आणि थायरॉईडच्या औषधाची गरज आहे का'),
  },
  {
    id: 'ft4',
    category: 'thyroid',
    aliases: ['free t4', 'ft4', 'free thyroxine', 't4 free', 'फ्री टी4'],
    unit: 'ng/dL',
    range: { any: { low: 0.9, high: 1.7 } },
    name: t('Free T4 (thyroid hormone)', 'फ्री T4 (थायरॉइड हार्मोन)', 'फ्री T4 (थायरॉईड संप्रेरक)'),
    what: t('The main hormone your thyroid makes.', 'थायरॉइड द्वारा बनाया जाने वाला मुख्य हार्मोन।', 'थायरॉईड तयार करणारे मुख्य संप्रेरक.'),
    low: t('Low free T4 with high TSH suggests an underactive thyroid.', 'कम फ्री T4 और अधिक TSH कम सक्रिय थायरॉइड की ओर इशारा करता है।', 'कमी फ्री T4 व जास्त TSH मंद थायरॉईड सूचित करतात.'),
    high: t('High free T4 suggests an overactive thyroid.', 'अधिक फ्री T4 अधिक सक्रिय थायरॉइड की ओर इशारा करता है।', 'जास्त फ्री T4 अतिसक्रिय थायरॉईड सूचित करते.'),
    askLow: t('thyroid treatment options', 'थायरॉइड इलाज के विकल्प', 'थायरॉईड उपचारांचे पर्याय'),
    askHigh: t('thyroid symptoms and treatment', 'थायरॉइड के लक्षण और इलाज', 'थायरॉईडची लक्षणे आणि उपचार'),
  },
  {
    id: 'bilirubin_total',
    category: 'liver',
    aliases: ['total bilirubin', 'bilirubin total', 'serum bilirubin', 'bilirubin', 's bilirubin total', 'बिलीरुबिन', 'कुल बिलीरुबिन', 'एकूण बिलिरुबिन'],
    unit: 'mg/dL',
    range: { any: { low: 0.3, high: 1.2 } },
    critical: { high: 15 },
    name: t('Bilirubin (total)', 'बिलीरुबिन (कुल)', 'बिलिरुबिन (एकूण)'),
    what: t('A yellow pigment processed by the liver.', 'एक पीला रंगद्रव्य जिसे लिवर संसाधित करता है।', 'यकृत प्रक्रिया करणारे पिवळे रंगद्रव्य.'),
    low: t('Low bilirubin is not a concern.', 'कम बिलीरुबिन चिंता की बात नहीं।', 'कमी बिलिरुबिन चिंतेचे कारण नाही.'),
    high: t('High bilirubin can cause jaundice (yellow eyes or skin) and can point to liver or gall-bladder problems.', 'अधिक बिलीरुबिन से पीलिया (आँखें/त्वचा पीली) हो सकता है; यह लिवर या पित्ताशय की समस्या दर्शा सकता है।', 'जास्त बिलिरुबिनमुळे कावीळ (डोळे/त्वचा पिवळी) होऊ शकते; हे यकृत किंवा पित्ताशयाच्या समस्येचे लक्षण असू शकते.'),
    askLow: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
    askHigh: t('liver tests and whether you need an ultrasound', 'लिवर जाँच और क्या अल्ट्रासाउंड चाहिए', 'यकृत तपासण्या आणि सोनोग्राफीची गरज आहे का'),
  },
  {
    id: 'alt',
    category: 'liver',
    aliases: ['sgpt', 'alt', 'alt sgpt', 'sgpt alt', 'alanine aminotransferase', 'alanine transaminase', 'एसजीपीटी'],
    unit: 'U/L',
    range: { any: { high: 45 } },
    name: t('ALT / SGPT (liver enzyme)', 'ALT / SGPT (लिवर एंजाइम)', 'ALT / SGPT (यकृत विकर)'),
    what: t('An enzyme that leaks into blood when liver cells are stressed.', 'एक एंजाइम जो लिवर कोशिकाओं पर दबाव होने पर खून में आता है।', 'यकृत पेशींवर ताण आल्यावर रक्तात येणारे विकर.'),
    high: t('A raised ALT can come from fatty liver, alcohol, infections like hepatitis or some medicines.', 'बढ़ा ALT फैटी लिवर, शराब, हेपेटाइटिस जैसे संक्रमण या कुछ दवाओं से हो सकता है।', 'वाढलेला ALT फॅटी लिव्हर, मद्य, हिपॅटायटीससारखे संसर्ग किंवा काही औषधांमुळे होऊ शकतो.'),
    askHigh: t('fatty liver, alcohol and your current medicines', 'फैटी लिवर, शराब और आपकी मौजूदा दवाएँ', 'फॅटी लिव्हर, मद्य आणि तुमची सध्याची औषधे'),
  },
  {
    id: 'ast',
    category: 'liver',
    aliases: ['sgot', 'ast', 'ast sgot', 'sgot ast', 'aspartate aminotransferase', 'aspartate transaminase', 'एसजीओटी'],
    unit: 'U/L',
    range: { any: { high: 40 } },
    name: t('AST / SGOT (liver enzyme)', 'AST / SGOT (लिवर एंजाइम)', 'AST / SGOT (यकृत विकर)'),
    what: t('An enzyme found in the liver and muscles.', 'लिवर और मांसपेशियों में पाया जाने वाला एंजाइम।', 'यकृत व स्नायूंमध्ये आढळणारे विकर.'),
    high: t('A raised AST can come from liver stress, heavy exercise or muscle injury.', 'बढ़ा AST लिवर पर दबाव, भारी व्यायाम या मांसपेशियों की चोट से हो सकता है।', 'वाढलेला AST यकृतावरील ताण, जड व्यायाम किंवा स्नायूंच्या दुखापतीमुळे होऊ शकतो.'),
    askHigh: t('whether this fits with your other liver tests', 'क्या यह आपकी अन्य लिवर जाँचों से मेल खाता है', 'हे तुमच्या इतर यकृत तपासण्यांशी जुळते का'),
  },
  {
    id: 'alp',
    category: 'liver',
    aliases: ['alkaline phosphatase', 'alp', 'alk phos', 'एल्कलाइन फॉस्फेटेज'],
    unit: 'U/L',
    range: { any: { low: 44, high: 147 } },
    name: t('Alkaline phosphatase (ALP)', 'एल्कलाइन फॉस्फेटेज़ (ALP)', 'अल्कलाइन फॉस्फेटेज (ALP)'),
    what: t('An enzyme from the liver, bile ducts and bones.', 'लिवर, पित्त नलिकाओं और हड्डियों से आने वाला एंजाइम।', 'यकृत, पित्तनलिका व हाडांमधून येणारे विकर.'),
    low: t('Low ALP is uncommon and rarely serious.', 'कम ALP असामान्य है और शायद ही गंभीर हो।', 'कमी ALP क्वचित असते आणि क्वचितच गंभीर असते.'),
    high: t('High ALP can come from bile-duct problems or bone conditions; it is normal to be higher in growing children.', 'अधिक ALP पित्त नलिका या हड्डियों की समस्या से हो सकता है; बढ़ते बच्चों में अधिक होना सामान्य है।', 'जास्त ALP पित्तनलिका किंवा हाडांच्या समस्येमुळे असू शकते; वाढत्या मुलांमध्ये ते जास्त असणे सामान्य आहे.'),
    askLow: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
    askHigh: t('whether the liver or bones are the source', 'क्या स्रोत लिवर है या हड्डियाँ', 'स्रोत यकृत आहे की हाडे'),
  },
  {
    id: 'albumin',
    category: 'liver',
    aliases: ['albumin', 'serum albumin', 'एल्ब्यूमिन', 'अल्ब्युमिन'],
    unit: 'g/dL',
    range: { any: { low: 3.5, high: 5.0 } },
    name: t('Albumin', 'एल्ब्यूमिन', 'अल्ब्युमिन'),
    what: t('The main protein made by your liver.', 'लिवर द्वारा बनाया जाने वाला मुख्य प्रोटीन।', 'यकृत तयार करणारे मुख्य प्रथिन.'),
    low: t('Low albumin can reflect poor nutrition, liver or kidney problems.', 'कम एल्ब्यूमिन खराब पोषण, लिवर या किडनी की समस्या दर्शा सकता है।', 'कमी अल्ब्युमिन कुपोषण, यकृत किंवा मूत्रपिंडाच्या समस्या दर्शवू शकते.'),
    high: t('High albumin usually reflects dehydration.', 'अधिक एल्ब्यूमिन आमतौर पर पानी की कमी दर्शाता है।', 'जास्त अल्ब्युमिन सहसा पाण्याची कमतरता दर्शवते.'),
    askLow: t('your diet and liver and kidney health', 'आपका खान-पान और लिवर-किडनी का स्वास्थ्य', 'तुमचा आहार आणि यकृत-मूत्रपिंडाचे आरोग्य'),
    askHigh: t('your fluid intake', 'पानी पीने की मात्रा', 'पाणी पिण्याचे प्रमाण'),
  },
  {
    id: 'vitamin_d',
    category: 'vitamins',
    aliases: ['vitamin d', 'vitamin d3', '25 oh vitamin d', '25 hydroxy vitamin d', 'vitamin d total', '25-oh vitamin d', 'vit d', 'विटामिन डी', 'जीवनसत्त्व ड', 'व्हिटॅमिन डी'],
    unit: 'ng/mL',
    range: { any: { low: 30, high: 100 } },
    bands: [
      { max: 20, level: 'low', label: t('deficient', 'कमी (डेफ़िशिएंट)', 'कमतरता') },
      { min: 20, max: 30, level: 'borderline', label: t('insufficient', 'अपर्याप्त', 'अपुरे') },
    ],
    name: t('Vitamin D', 'विटामिन D', 'जीवनसत्त्व D'),
    what: t('A vitamin your skin makes in sunlight; it keeps bones and muscles strong.', 'धूप में त्वचा द्वारा बनने वाला विटामिन; यह हड्डियाँ और मांसपेशियाँ मज़बूत रखता है।', 'सूर्यप्रकाशात त्वचा तयार करणारे जीवनसत्त्व; ते हाडे व स्नायू मजबूत ठेवते.'),
    low: t('Low vitamin D is very common in India and can cause bone pain and tiredness.', 'विटामिन D की कमी भारत में बहुत आम है; इससे हड्डियों में दर्द और थकान हो सकती है।', 'जीवनसत्त्व D ची कमतरता भारतात खूप सामान्य आहे; त्यामुळे हाडदुखी व थकवा येऊ शकतो.'),
    high: t('Very high vitamin D usually comes from taking too many supplements.', 'बहुत अधिक विटामिन D आमतौर पर ज़्यादा सप्लीमेंट लेने से होता है।', 'खूप जास्त जीवनसत्त्व D सहसा जास्त पूरक घेतल्याने होते.'),
    askLow: t('the right supplement dose for you', 'आपके लिए सही सप्लीमेंट की मात्रा', 'तुमच्यासाठी योग्य पूरक मात्रा'),
    askHigh: t('whether to reduce your supplements', 'क्या सप्लीमेंट कम करने चाहिए', 'पूरक कमी करावे का'),
  },
  {
    id: 'vitamin_b12',
    category: 'vitamins',
    aliases: ['vitamin b12', 'vit b12', 'b12', 'cyanocobalamin', 'cobalamin', 'विटामिन बी12', 'जीवनसत्त्व बी12', 'व्हिटॅमिन बी12'],
    unit: 'pg/mL',
    range: { any: { low: 200, high: 900 } },
    name: t('Vitamin B12', 'विटामिन B12', 'जीवनसत्त्व B12'),
    what: t('A vitamin needed for nerves and red blood cells; vegetarians are often low.', 'नसों और लाल रक्त कोशिकाओं के लिए ज़रूरी विटामिन; शाकाहारियों में अक्सर कम होता है।', 'नसा व तांबड्या रक्तपेशींसाठी आवश्यक जीवनसत्त्व; शाकाहारींमध्ये बहुधा कमी असते.'),
    low: t('Low B12 can cause tiredness, tingling in hands and feet, and anaemia.', 'कम B12 से थकान, हाथ-पैरों में झनझनाहट और एनीमिया हो सकता है।', 'कमी B12 मुळे थकवा, हातापायांना मुंग्या आणि रक्तक्षय होऊ शकतो.'),
    high: t('High B12 is usually from supplements and rarely a concern.', 'अधिक B12 आमतौर पर सप्लीमेंट से होता है और शायद ही चिंता की बात हो।', 'जास्त B12 सहसा पूरकांमुळे असते आणि क्वचितच चिंतेचे कारण असते.'),
    askLow: t('B12 tablets or injections', 'B12 की गोलियाँ या इंजेक्शन', 'B12 गोळ्या किंवा इंजेक्शन'),
    askHigh: t('nothing urgent: mention it at your next visit', 'कुछ ज़रूरी नहीं: अगली मुलाकात में बताएँ', 'काही तातडीचे नाही: पुढील भेटीत सांगा'),
  },
  {
    id: 'ferritin',
    category: 'vitamins',
    aliases: ['ferritin', 'serum ferritin', 'फेरिटिन'],
    unit: 'ng/mL',
    range: { male: { low: 30, high: 400 }, female: { low: 13, high: 150 }, any: { low: 13, high: 400 } },
    name: t('Ferritin (iron stores)', 'फेरिटिन (आयरन भंडार)', 'फेरिटिन (लोहाचा साठा)'),
    what: t('Shows how much iron your body has stored.', 'बताता है कि शरीर में कितना आयरन जमा है।', 'शरीरात किती लोह साठलेले आहे ते दाखवते.'),
    low: t('Low ferritin means low iron stores, a common cause of anaemia.', 'कम फेरिटिन का अर्थ आयरन का कम भंडार है, जो एनीमिया का आम कारण है।', 'कमी फेरिटिन म्हणजे लोहाचा कमी साठा, जो रक्तक्षयाचे सामान्य कारण आहे.'),
    high: t('High ferritin can come from inflammation, liver problems or iron overload.', 'अधिक फेरिटिन सूजन, लिवर समस्या या अधिक आयरन से हो सकता है।', 'जास्त फेरिटिन सूज, यकृताच्या समस्या किंवा अतिरिक्त लोहामुळे असू शकते.'),
    askLow: t('iron supplements and the cause of low iron', 'आयरन सप्लीमेंट और आयरन की कमी का कारण', 'लोह पूरक आणि लोहाच्या कमतरतेचे कारण'),
    askHigh: t('whether inflammation or liver tests explain it', 'क्या सूजन या लिवर जाँच इसे समझाती हैं', 'सूज किंवा यकृत तपासणीने याचे स्पष्टीकरण मिळते का'),
  },
  {
    id: 'crp',
    category: 'inflammation',
    aliases: ['crp', 'c reactive protein', 'c-reactive protein', 'crp quantitative', 'सी रिएक्टिव प्रोटीन'],
    unit: 'mg/L',
    range: { any: { high: 6 } },
    name: t('CRP (inflammation)', 'CRP (सूजन)', 'CRP (सूज)'),
    what: t('A protein that rises quickly with infection or inflammation.', 'एक प्रोटीन जो संक्रमण या सूजन में जल्दी बढ़ता है।', 'संसर्ग किंवा सूजेत लवकर वाढणारे प्रथिन.'),
    high: t('A raised CRP means there is inflammation somewhere, often from an infection.', 'बढ़ा CRP बताता है कि कहीं सूजन है, अक्सर संक्रमण से।', 'वाढलेला CRP कुठेतरी सूज असल्याचे दर्शवतो, बहुधा संसर्गामुळे.'),
    askHigh: t('the likely source of inflammation', 'सूजन का संभावित स्रोत', 'सूजेचा संभाव्य स्रोत'),
  },
  {
    id: 'urine_protein',
    category: 'urine',
    aliases: ['urine protein', 'urine albumin', 'protein urine', 'albumin urine', 'proteins', 'मूत्र प्रोटीन', 'पेशाब में प्रोटीन', 'लघवीतील प्रथिने'],
    unit: '',
    qualitativeNormal: ['nil', 'absent', 'negative', 'not detected', 'neg', 'अनुपस्थित', 'नहीं', 'नकारात्मक', 'आढळले नाही', 'नाही'],
    name: t('Protein in urine', 'पेशाब में प्रोटीन', 'लघवीतील प्रथिने'),
    what: t('Healthy kidneys keep protein out of urine.', 'स्वस्थ किडनी प्रोटीन को पेशाब में नहीं जाने देती।', 'निरोगी मूत्रपिंड लघवीत प्रथिने जाऊ देत नाहीत.'),
    high: t('Protein in urine can be a sign of kidney strain, often from diabetes or high blood pressure.', 'पेशाब में प्रोटीन किडनी पर दबाव का संकेत हो सकता है, अक्सर डायबिटीज़ या हाई BP से।', 'लघवीत प्रथिने मूत्रपिंडावरील ताणाचे लक्षण असू शकते, बहुधा मधुमेह किंवा उच्च रक्तदाबामुळे.'),
    askHigh: t('a urine albumin-creatinine ratio (ACR) test', 'पेशाब का एल्ब्यूमिन-क्रिएटिनिन अनुपात (ACR) जाँच', 'लघवीची अल्ब्युमिन-क्रिएटिनिन गुणोत्तर (ACR) तपासणी'),
  },
  {
    id: 'urine_glucose',
    category: 'urine',
    aliases: ['urine glucose', 'urine sugar', 'glucose urine', 'sugar urine', 'मूत्र शर्करा', 'पेशाब में शुगर', 'लघवीतील साखर'],
    unit: '',
    qualitativeNormal: ['nil', 'absent', 'negative', 'not detected', 'neg', 'अनुपस्थित', 'नहीं', 'नकारात्मक', 'आढळले नाही', 'नाही'],
    name: t('Sugar in urine', 'पेशाब में शुगर', 'लघवीतील साखर'),
    what: t('Sugar normally stays out of urine unless blood sugar is high.', 'जब तक ब्लड शुगर अधिक न हो, शुगर पेशाब में नहीं आती।', 'रक्तशर्करा जास्त नसल्यास साखर लघवीत येत नाही.'),
    high: t('Sugar in urine usually means blood sugar has been high.', 'पेशाब में शुगर आमतौर पर बताती है कि ब्लड शुगर अधिक रही है।', 'लघवीत साखर म्हणजे सहसा रक्तशर्करा जास्त राहिली आहे.'),
    askHigh: t('checking your blood sugar and HbA1c', 'ब्लड शुगर और HbA1c की जाँच', 'रक्तशर्करा व HbA1c तपासणे'),
  },
];

export const TESTS_BY_ID: ReadonlyMap<string, TestInfo> = new Map(TESTS.map((x) => [x.id, x]));
