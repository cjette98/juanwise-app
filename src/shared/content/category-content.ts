import { images } from '@/shared/assets/images';

const categoryContent: Record<string, { image: any; context_en: string; context_tl: string }> = {
  history: {
    image: images.katipunan,
    context_en:
      'The Katipunan (KKK) was a secret Filipino society founded by Andres Bonifacio in 1892. Its goal was to free the Philippines from Spanish colonial rule through revolution.',
    context_tl:
      'Ang Katipunan (KKK) ay isang lihim na samahang Pilipino na itinatag ni Andres Bonifacio noong 1892. Layunin nito ang pagpapalaya ng Pilipinas mula sa kolonyalismong Espanyol sa pamamagitan ng rebolusyon.',
  },
  culture: {
    image: images.tinikling,
    context_en:
      'Tinikling is a traditional Filipino dance using bamboo poles. It showcases the joy and skill of Filipinos in dancing while avoiding the closing bamboo poles.',
    context_tl:
      'Ang Tinikling ay isang tradisyunal na sayaw na Pilipino na gumagamit ng magkatabing kawayan. Ipinapakita nito ang kasiyahan at kasanayan ng mga Pilipino sa pagsayaw habang iniiwasan ang pagbagsak sa pagitan ng mga kawayan.',
  },
  geography: {
    image: images.riceTerraces,
    context_en:
      'The rice terraces are found in the mountains of the Philippines, such as in Banaue. They are proof of the skill of ancient Filipinos in agriculture and engineering, built by hand without modern tools.',
    context_tl:
      'Ang mga hagdan-hagdang palayan ay matatagpuan sa mga kabundukan ng Pilipinas, gaya ng sa Banaue. Ito ay patunay ng galing ng mga sinaunang Pilipino sa agrikultura at engineering, gawa gamit ang kamay nang walang modernong kagamitan.',
  },
  festival: {
    image: images.tinikling,
    context_en:
      'Festivals in the Philippines showcase the joyful culture of Filipinos. Most of these are connected to religion, harvest, and giving thanks for a good harvest or protection.',
    context_tl:
      'Ang mga pista at pagdiriwang sa Pilipinas ay nagpapakita ng masayahing kultura ng mga Pilipino. Karamihan sa mga ito ay may kaugnayan sa relihiyon, ani, at pasasalamat sa mabuting ani o proteksyon.',
  },
  national: {
    image: images.flag,
    context_en:
      'The Philippine flag has three colors: blue (peace and justice), red (courage), and white (purity). The sun and three stars represent the three main island groups: Luzon, Visayas, and Mindanao.',
    context_tl:
      'Ang bandila ng Pilipinas ay may tatlong kulay: asul (kapayapaan at katarungan), pula (katapangan), at puti (kalinisang-puri). Ang araw at tatlong bituin ay kumakatawan sa tatlong pangunahing pulo: Luzon, Visayas, at Mindanao.',
  },
  heroes: {
    image: images.rizal,
    context_en:
      'Dr. Jose Rizal is the national hero of the Philippines, born in Calamba, Laguna. He is known for his novels Noli Me Tangere and El Filibusterismo, which inspired the Philippine revolution.',
    context_tl:
      'Si Dr. Jose Rizal ay ang pambansang bayani ng Pilipinas, isinilang sa Calamba, Laguna. Kilala siya sa kanyang mga akdang Noli Me Tangere at El Filibusterismo na nagbigay-inspirasyon sa rebolusyong Pilipino.',
  },
};

export default categoryContent;