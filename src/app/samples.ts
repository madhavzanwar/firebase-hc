import type { L10n } from '../lib/i18n-types';

export interface Sample {
  id: string;
  file: string;
  /** What kind of input the sample exercises. */
  format: 'photo' | 'pdf' | 'text';
  docLang: 'EN' | 'HI' | 'MR';
  title: L10n;
  urgent?: boolean;
}

const t = (en: string, hi: string, mr: string): L10n => ({ en, hi, mr });

/** Synthetic documents (fictional people) bundled for judges and the demo. */
export const SAMPLES: Sample[] = [
  { id: 'cbc', file: 'en-cbc-anaemia.png', format: 'photo', docLang: 'EN', title: t('Blood count (anaemia)', 'ब्लड काउंट (एनीमिया)', 'रक्त तपासणी (रक्तक्षय)') },
  { id: 'diabetes', file: 'en-diabetes-lipid-mar.pdf', format: 'pdf', docLang: 'EN', title: t('Diabetes and cholesterol', 'डायबिटीज़ और कोलेस्ट्रॉल', 'मधुमेह आणि कोलेस्टेरॉल') },
  { id: 'kidney', file: 'en-kidney-critical.pdf', format: 'pdf', docLang: 'EN', urgent: true, title: t('Kidney panel (urgent value)', 'किडनी जाँच (गंभीर मान)', 'मूत्रपिंड तपासणी (गंभीर मूल्य)') },
  { id: 'thyroid', file: 'hi-thyroid-vitamins.png', format: 'photo', docLang: 'HI', title: t('Thyroid and vitamins (Hindi)', 'थायरॉइड और विटामिन (हिन्दी)', 'थायरॉईड आणि जीवनसत्त्वे (हिन्दी)') },
  { id: 'dengue', file: 'mr-cbc-dengue.txt', format: 'text', docLang: 'MR', title: t('Low platelets (Marathi)', 'कम प्लेटलेट्स (मराठी)', 'कमी प्लेटलेट्स (मराठी)') },
  { id: 'mr-diabetes', file: 'mr-diabetes.txt', format: 'text', docLang: 'MR', title: t('Sugar report (Marathi)', 'शुगर रिपोर्ट (मराठी)', 'साखर अहवाल (मराठी)') },
  { id: 'liver', file: 'en-liver-urine.txt', format: 'text', docLang: 'EN', title: t('Liver and urine', 'लिवर और पेशाब', 'यकृत आणि लघवी') },
  { id: 'rx', file: 'en-prescription.pdf', format: 'pdf', docLang: 'EN', title: t('Prescription', 'पर्चा', 'प्रिस्क्रिप्शन') },
  { id: 'rx-hi', file: 'hi-prescription.txt', format: 'text', docLang: 'HI', title: t('Prescription (Hindi)', 'पर्चा (हिन्दी)', 'प्रिस्क्रिप्शन (हिन्दी)') },
];

/** Three reports of the same (fictional) person, for the trend chart. */
export const SERIES = ['en-diabetes-lipid-mar.txt', 'en-diabetes-followup-jun.txt', 'en-diabetes-followup-sep.txt'];

export async function fetchSampleFile(file: string): Promise<File> {
  const res = await fetch(`/samples/${file}`);
  if (!res.ok) throw new Error(`sample ${file} missing`);
  const blob = await res.blob();
  const type = file.endsWith('.pdf') ? 'application/pdf' : file.endsWith('.png') ? 'image/png' : 'text/plain';
  return new File([blob], file, { type });
}
