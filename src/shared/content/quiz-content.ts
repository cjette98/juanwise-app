import categoryContent from '@/shared/content/category-content';

export type QuizType = 'multiple-choice' | 'identification' | 'enumeration';

/** Admin must supply at least this many pool answers for an Enumeration question. */
export const MIN_ENUMERATION_POOL = 10;

export interface QuizQuestion {
  /** Mini-lesson paragraph shown BEFORE the question — doubles as a hint. */
  hint: string;
  type: QuizType;
  question: string;
  /** Present for 'multiple-choice' only. Includes the correct answer. */
  choices?: string[];
  /**
   * Single correct answer for 'multiple-choice' / 'identification'.
   * For 'enumeration' this is unused for validation (kept only as a
   * human-readable summary) — validation instead uses `answerPool`.
   */
  correctAnswer: string;
  /**
   * 'enumeration' ONLY — Admin-managed pool of acceptable answers.
   * Minimum MIN_ENUMERATION_POOL (10) entries; Admin can add more or
   * remove down to that floor, and can edit any entry at any time.
   */
  answerPool?: string[];
  /**
   * 'enumeration' ONLY — how many of the pool answers the player must
   * correctly provide to pass. This is what decides how many input
   * "tabs" show up on the Quiz screen. Admin-set, must be between 1 and
   * answerPool.length.
   */
  requiredAnswers?: number;
  /**
   * Short 1-paragraph explanation shown AFTER a correct answer.
   * Connected to / expands on `hint`, and defines why the answer is correct.
   */
  explanation: string;
}

// content-driven map: category -> level -> activityNum -> question.
// Only Level 1 / Activity 1 per category is filled in by the developer
// (matches the same rule used for Jigsaw's default content). Everything
// else (Activity 2-6, and all of Level 2-5) is meant to be supplied by the
// Admin later (Firebase phase) — getQuizQuestion() below falls back to an
// auto-generated placeholder so the app never crashes on missing content,
// and swapping in real content later is just adding an entry to this map.
const quizContent: Record<string, Record<number, Record<number, QuizQuestion>>> = {
  history: {
    1: {
      1: {
        hint: 'Ang Katipunan (KKK) ay isang lihim na samahang Pilipino na itinatag ni Andres Bonifacio noong 1892. Layunin nito ang pagpapalaya ng Pilipinas mula sa kolonyalismong Espanyol sa pamamagitan ng rebolusyon.',
        type: 'multiple-choice',
        question: 'Sino ang nagtatag ng Katipunan (KKK) noong 1892?',
        choices: ['Andres Bonifacio', 'Jose Rizal', 'Emilio Aguinaldo', 'Apolinario Mabini'],
        correctAnswer: 'Andres Bonifacio',
        explanation: 'Tama! Si Andres Bonifacio ang nagtatag ng Katipunan noong 1892 bilang lihim na samahang naglalayong palayain ang Pilipinas sa pamamagitan ng rebolusyon laban sa Espanya.',
      },
      2: {
        hint: 'Noong Marso 1521, dumating sa Pilipinas ang ekspedisyon ni Ferdinand Magellan mula sa Espanya. Sa Labanan sa Mactan noong Abril 27, 1521, tinalo siya ng mga mandirigmang Pilipino sa pamumuno ni Lapulapu.',
        type: 'multiple-choice',
        question: 'Sino ang pinunong Pilipino na tumalo kay Ferdinand Magellan sa Labanan sa Mactan?',
        choices: ['Lapulapu', 'Rajah Humabon', 'Rajah Sulayman', 'Datu Puti'],
        correctAnswer: 'Lapulapu',
        explanation: 'Tama! Si Lapulapu, ang pinuno ng Mactan, ang unang Pilipinong lumaban sa mga dayuhang mananakop. Napatay si Magellan sa labanang ito noong Abril 27, 1521.',
      },
      3: {
        hint: 'Ang pangalang "Las Islas Filipinas" ay ibinigay ni Ruy Lopez de Villalobos noong 1543. Ito ay parangal kay Prinsipe Felipe ng Espanya, na kalaunan ay naging Haring Felipe II.',
        type: 'multiple-choice',
        question: 'Kanino ipinangalan ang bansang Pilipinas?',
        choices: [
          'Haring Felipe II ng Espanya',
          'Reyna Isabela ng Espanya',
          'Ferdinand Magellan',
          'Miguel Lopez de Legazpi',
        ],
        correctAnswer: 'Haring Felipe II ng Espanya',
        explanation: 'Tama! Ipinangalan ni Ruy Lopez de Villalobos ang kapuluan na "Las Islas Filipinas" noong 1543 bilang parangal kay Prinsipe Felipe, na naging Haring Felipe II ng Espanya.',
      },
      4: {
        hint: 'Ang sedula ay katibayan ng pagbabayad ng buwis sa pamahalaang Espanyol. Noong Agosto 1896, pinunit ito ng mga Katipunero sa pangyayaring tinatawag na Sigaw sa Pugad Lawin.',
        type: 'multiple-choice',
        question: 'Ano ang pinunit ng mga Katipunero bilang hudyat ng pagsisimula ng himagsikan noong 1896?',
        choices: ['Sedula', 'Bandila', 'Mapa ng Maynila', 'Kasulatan ng lupa'],
        correctAnswer: 'Sedula',
        explanation: 'Tama! Ang sedula ay patunay ng pagbabayad ng buwis sa Espanya. Ang pagpunit nito noong Agosto 1896 ang tanda na tinatanggihan na ng mga Katipunero ang pamamahala ng mga Espanyol.',
      },
      5: {
        hint: 'Ipinahayag ni Emilio Aguinaldo ang kalayaan ng Pilipinas noong Hunyo 12, 1898 sa Kawit, Cavite. Doon unang iwinagayway ang bandila ng Pilipinas at unang tinugtog ang pambansang awit.',
        type: 'multiple-choice',
        question: 'Kailan ipinahayag ang kalayaan ng Pilipinas mula sa Espanya?',
        choices: ['Hunyo 12, 1898', 'Hulyo 4, 1946', 'Agosto 21, 1983', 'Pebrero 25, 1986'],
        correctAnswer: 'Hunyo 12, 1898',
        explanation: 'Tama! Noong Hunyo 12, 1898 sa Kawit, Cavite, ipinahayag ni Emilio Aguinaldo ang kasarinlan ng Pilipinas. Ito ang ipinagdiriwang natin tuwing Araw ng Kalayaan.',
      },
      6: {
        hint: 'Noong Pebrero 1986, nagtipon ang milyon-milyong Pilipino sa EDSA. Mapayapa nilang ibinagsak ang diktadurya — kilala ito bilang EDSA People Power Revolution.',
        type: 'multiple-choice',
        question: 'Ano ang pangunahing katangian ng EDSA People Power Revolution noong 1986?',
        choices: [
          'Mapayapa at walang dahas',
          'Madugong labanan sa lansangan',
          'Digmaang pandagat',
          'Pag-aalsa ng mga sundalo lamang',
        ],
        correctAnswer: 'Mapayapa at walang dahas',
        explanation: 'Tama! Ang EDSA People Power Revolution noong Pebrero 1986 ay mapayapang pagkilos ng mamamayan. Naging halimbawa ito sa buong mundo ng pagbabagong nakamit nang walang karahasan.',
      },
    },
  },
  culture: {
    1: {
      1: {
        hint: 'Ang Tinikling ay isang tradisyunal na sayaw na Pilipino na gumagamit ng magkatabing kawayan. Ipinapakita nito ang kasiyahan at kasanayan ng mga Pilipino sa pagsayaw habang iniiwasan ang pagbagsak sa pagitan ng mga kawayan.',
        type: 'multiple-choice',
        question: 'Anong kagamitan ang ginagamit sa sayaw na Tinikling?',
        choices: ['Kawayan', 'Kalabaw', 'Kabayo', 'Kalan'],
        correctAnswer: 'Kawayan',
        explanation: 'Tama! Gumagamit ang Tinikling ng magkatabing kawayan na inaayos ng dalawang tao habang sumasayaw ang mananayaw sa pagitan nito nang mabilis.',
      },
    },
  },
  geography: {
    1: {
      1: {
        hint: 'Ang mga hagdan-hagdang palayan ay matatagpuan sa mga kabundukan ng Pilipinas, gaya ng sa Banaue. Ito ay patunay ng galing ng mga sinaunang Pilipino sa agrikultura at engineering, gawa gamit ang kamay nang walang modernong kagamitan.',
        type: 'multiple-choice',
        question: 'Saan matatagpuan ang tanyag na hagdan-hagdang palayan?',
        choices: ['Banaue', 'Batangas', 'Cebu', 'Palawan'],
        correctAnswer: 'Banaue',
        explanation: 'Tama! Ang hagdan-hagdang palayan ng Banaue ay itinuturing na "Ikawalong Kababalaghan ng Mundo" dahil sa galing ng sinaunang Pilipino sa engineering nang walang modernong kagamitan.',
      },
    },
  },
  festival: {
    1: {
      1: {
        hint: 'Ang mga pista at pagdiriwang sa Pilipinas ay nagpapakita ng masayahing kultura ng mga Pilipino. Karamihan sa mga ito ay may kaugnayan sa relihiyon, ani, at pasasalamat sa mabuting ani o proteksyon.',
        type: 'multiple-choice',
        question: 'Karamihan sa mga pista sa Pilipinas ay may kaugnayan sa alin sa mga sumusunod?',
        choices: ['Relihiyon at ani', 'Palakasan lamang', 'Pamimili', 'Paglalakbay sa ibang bansa'],
        correctAnswer: 'Relihiyon at ani',
        explanation: 'Tama! Karamihan sa mga pista sa Pilipinas ay ipinagdiriwang bilang pasasalamat sa relihiyon at magandang ani, sabay ng pagpapakita ng pagkakaisa ng komunidad.',
      },
    },
  },
  national: {
    1: {
      1: {
        hint: 'Ang bandila ng Pilipinas ay may tatlong kulay: asul (kapayapaan at katarungan), pula (katapangan), at puti (kalinisang-puri). Ang araw at tatlong bituin ay kumakatawan sa tatlong pangunahing pulo: Luzon, Visayas, at Mindanao.',
        type: 'multiple-choice',
        question: 'Ilang bituin ang nasa bandila ng Pilipinas?',
        choices: ['3', '5', '7', '1'],
        correctAnswer: '3',
        explanation: 'Tama! May tatlong bituin sa bandila ng Pilipinas na kumakatawan sa tatlong pangunahing pulo ng bansa: Luzon, Visayas, at Mindanao.',
      },
    },
  },
  heroes: {
    1: {
      1: {
        hint: 'Si Dr. Jose Rizal ay ang pambansang bayani ng Pilipinas, isinilang sa Calamba, Laguna. Kilala siya sa kanyang mga akdang Noli Me Tangere at El Filibusterismo na nagbigay-inspirasyon sa rebolusyong Pilipino.',
        type: 'multiple-choice',
        question: 'Saan isinilang si Dr. Jose Rizal?',
        choices: ['Calamba, Laguna', 'Maynila', 'Cebu', 'Ilocos'],
        correctAnswer: 'Calamba, Laguna',
        explanation: 'Tama! Isinilang si Dr. Jose Rizal sa Calamba, Laguna noong Hunyo 19, 1861, at siya ang itinuturing na pambansang bayani ng Pilipinas.',
      },
    },
  },
};

/**
 * Returns the quiz question for a given category/level/activity.
 * Falls back to an auto-generated placeholder (built from the shared
 * category context) when the Admin hasn't supplied real content yet,
 * so the Quiz screen always has something to render.
 */
export function getQuizQuestion(category: string, level: number, activityNum: number): QuizQuestion {
  const fromMap = quizContent[category]?.[level]?.[activityNum];
  if (fromMap) return fromMap;

  const fallbackContext = categoryContent[category] || categoryContent.history;
  // Per spec: Level 1 = Multiple Choice (Easy), Level 2-3 = Identification
  // (Normal), Level 4-5 = Enumeration (Hard).
  const type: QuizType = level === 1 ? 'multiple-choice' : level <= 3 ? 'identification' : 'enumeration';
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  if (type === 'enumeration') {
    // Auto-generated placeholder pool (>= MIN_ENUMERATION_POOL) so the
    // screen never crashes before the Admin fills in real content.
    const pool = Array.from({ length: MIN_ENUMERATION_POOL }, (_, i) => `${label} — Sagot ${i + 1}`);
    return {
      hint: fallbackContext.context_tl,
      type,
      question: `Ienumerate ang ${Math.min(3, pool.length)} bagay na may kaugnayan sa araling ito.`,
      correctAnswer: pool.join(', '),
      answerPool: pool,
      requiredAnswers: Math.min(3, pool.length),
      explanation: fallbackContext.context_tl,
    };
  }

  return {
    hint: fallbackContext.context_tl,
    type,
    question:
      type === 'multiple-choice'
        ? `Alin sa mga sumusunod ang pangunahing paksa ng araling ito?`
        : `Anong paksa ang tinatalakay sa araling ito?`,
    choices: type === 'multiple-choice' ? [label, 'Matematika', 'Agham', 'Wikang Banyaga'] : undefined,
    correctAnswer: label,
    explanation: fallbackContext.context_tl,
  };
}

export default quizContent;