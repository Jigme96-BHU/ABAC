// Committee-supplied team content for the public Team page.

export type Exec = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  image: string | null;
};

export type FormerPresident = {
  slug: string;
  name: string;
  tenure: string;
  founder: boolean;
  image: string | null;
};

export type AdvisoryBoardMember = {
  slug: string;
  name: string;
  role: string;
  image: string | null;
};

export const EXECUTIVE: Exec[] = [
  {
    "slug": "dorji-tashi",
    "name": "Dorji Tashi",
    "role": "President",
    "bio": "Mr Dorji Tashi is the President of ABAC, bringing diverse academic and professional experience from Bhutan, India, Japan, and Australia. He holds a Bachelor's degree in Nursing Studies and a Master's in Business from Australia. He is a social worker by heart and an entrepreneur by calling.",
    "image": "/img/team/executive-member/dorji-tashi.jpeg"
  },
  {
    "slug": "jigme-jamtsho",
    "name": "Jigme Jamtsho",
    "role": "Vice President & Public Relations Officer",
    "bio": "Mr Jigme Jamtsho serves as Vice President and Public Relations Officer of ABAC. For many years, he has been dedicated to serving communities through compassionate leadership, collaboration, and volunteerism. From leading schools in Bhutan to supporting the Bhutanese community in Canberra, he believes true leadership is about empowering others and creating opportunities for everyone to thrive.",
    "image": "/img/team/executive-member/jigme-jamtsho.jpeg"
  },
  {
    "slug": "kuenzang-dema",
    "name": "Kuenzang Dema",
    "role": "General Secretary",
    "bio": "Ms Kuenzang Dema serves as General Secretary of ABAC. She holds a BA in International Development from Thailand and a Master of Social Work from Australia. With a strong background in social work, child protection, and community service, she supports the Association's governance, administration, and member communication.",
    "image": "/img/team/executive-member/kuenzang-dema.jpeg"
  },
  {
    "slug": "tshering-phuntsho",
    "name": "Tshering Phuntsho",
    "role": "Treasurer",
    "bio": "Mr Tshering Phuntsho serves as Treasurer of ABAC. With experience in finance, accounting, and public service, he supports the Association's financial management, accountability, and responsible stewardship of community funds.",
    "image": "/img/team/executive-member/tshering-phuntsho.jpeg"
  },
  {
    "slug": "pema-yogini-yuphel",
    "name": "Pema Yogini Yuphel",
    "role": "Community Engagement Officer",
    "bio": "Ms Pema Yogini Yuphel serves as Community Engagement Officer of ABAC. She is recognised for her contribution to Bhutanese media and youth advocacy, and supports community connection, outreach, and participation.",
    "image": "/img/team/executive-member/pema-yogini-yuphel.jpeg"
  },
  {
    "slug": "phuntsho-kinrab-dema",
    "name": "Phuntsho Kinrab Dema",
    "role": "Community Engagement Officer",
    "bio": "Ms Phuntsho Kinrab Dema serves as Community Engagement Officer of ABAC. She brings experience in media, communication, and public engagement, and supports community outreach, participation, and connection.",
    "image": "/img/team/executive-member/phuntsho-kinrab-dema.jpeg"
  },
  {
    "slug": "tandin-sonam",
    "name": "Tandin Sonam",
    "role": "Sports Coordinator",
    "bio": "Mr Tandin Sonam serves as Sports Coordinator of ABAC. He is passionate about promoting sports, fitness, teamwork, and community wellbeing through inclusive sporting activities and events.",
    "image": "/img/team/executive-member/tandin-sonam.jpeg"
  },
  {
    "slug": "sangay-tshomo",
    "name": "Sangay Tshomo",
    "role": "Cultural Coordinator",
    "bio": "Ms Sangay Tshomo serves as Cultural Coordinator of ABAC. She is dedicated to preserving and promoting Bhutanese culture and heritage, including traditional songs, dances, and cultural programs within the Canberra community.",
    "image": "/img/team/executive-member/sangay-tshomo.jpeg"
  },
  {
    "slug": "leki-dorji",
    "name": "Leki Dorji",
    "role": "Youth and Technology Coordinator",
    "bio": "Mr Leki Dorji serves as ABAC's Youth and Technology Coordinator. He holds a Master of Data Science, specialising in Artificial Intelligence and Computational Modelling. He supports youth participation, digital innovation, leadership development, and community engagement within the Association.",
    "image": "/img/team/executive-member/leki-dorji.jpeg"
  }
];

export const FORMER_PRESIDENTS: FormerPresident[] = [
  {
    "name": "Jigme Jamtsho",
    "tenure": "2025-2026",
    "founder": false,
    "slug": "jigme-jamtsho",
    "image": "/img/team/executive-member/jigme-jamtsho.jpeg"
  },
  {
    "name": "Ugyen Penjor",
    "tenure": "2024-2025",
    "founder": false,
    "slug": "ugyen-penjor",
    "image": "/img/team/prez-ugyen-penjor-2024-2025.jpg"
  },
  {
    "name": "Alu Passa",
    "tenure": "2023-2024",
    "founder": false,
    "slug": "alu-passa",
    "image": "/img/team/prez-alu-passa-2023-2024-2014-2015.jpg"
  },
  {
    "name": "Dorji Tshering",
    "tenure": "2022-2023",
    "founder": false,
    "slug": "dorji-tshering",
    "image": "/img/team/prez-dorji-tshering-2022-2023.jpg"
  },
  {
    "name": "Tshering Penjor",
    "tenure": "2021-2022",
    "founder": false,
    "slug": "tshering-penjor",
    "image": "/img/team/prez-tshering-penjor-2021-2022.jpg"
  },
  {
    "name": "Karma Drupchu",
    "tenure": "2020-2021",
    "founder": false,
    "slug": "karma-drupchu",
    "image": "/img/team/prez-karma-drupchu-2020-2021.jpg"
  },
  {
    "name": "Dorji Tshering",
    "tenure": "2019-2020",
    "founder": false,
    "slug": "dorji-tshering",
    "image": "/img/team/prez-dorji-tshering-2019-2020.jpg"
  },
  {
    "name": "Chencho Tshering",
    "tenure": "2018-2019",
    "founder": false,
    "slug": "chencho-tshering",
    "image": "/img/team/prez-chencho-tshering-2018-2019.jpg"
  },
  {
    "name": "Tashi Pelden",
    "tenure": "2017-2018",
    "founder": false,
    "slug": "tashi-pelden",
    "image": null
  },
  {
    "name": "Tandin Dorji",
    "tenure": "2016-2017",
    "founder": false,
    "slug": "tandin-dorji",
    "image": "/img/team/prez-tandin-dorji-2016-2017.jpg"
  },
  {
    "name": "Namgyel Dorji",
    "tenure": "2015-2016",
    "founder": false,
    "slug": "namgyel-dorji",
    "image": "/img/team/prez-namgyel-dorji-2015-2016.jpg"
  },
  {
    "name": "Alu Passa",
    "tenure": "2014-2015",
    "founder": false,
    "slug": "alu-passa",
    "image": "/img/team/prez-alu-passa-2023-2024-2014-2015.jpg"
  },
  {
    "name": "Sonam Choden",
    "tenure": "2013-2014",
    "founder": false,
    "slug": "sonam-choden",
    "image": "/img/team/prez-sonam-choden-2013-2014-square.jpg"
  },
  {
    "name": "Ugyen Namgay",
    "tenure": "2012-2013",
    "founder": false,
    "slug": "ugyen-namgay",
    "image": "/img/team/prez-ugyen-namgay-2012-2013.jpg"
  },
  {
    "name": "Phub Dorji",
    "tenure": "2011-2012",
    "founder": false,
    "slug": "phub-dorji",
    "image": "/img/team/prez-phub-dorji-2011-2012.jpg"
  },
  {
    "name": "Sonam Tobgye",
    "tenure": "2010-2011",
    "founder": true,
    "slug": "sonam-tobgye",
    "image": "/img/team/prez-sonam-tobgye-2010-2011.jpg"
  }
];

export const ADVISORY_BOARD: AdvisoryBoardMember[] = [
  {
    "slug": "chencho-tshering",
    "name": "Chencho Tshering",
    "role": "Chairperson",
    "image": "/img/team/prez-chencho-tshering-2018-2019.jpg"
  },
  {
    "slug": "kuenzang-dema",
    "name": "Kuenzang Dema",
    "role": "Member Secretary",
    "image": "/img/team/executive-member/kuenzang-dema.jpeg"
  },
  {
    "slug": "kezang-choden",
    "name": "Kezang Choden",
    "role": "",
    "image": "/img/team/advisory-board/kezang-choden.jpeg"
  },
  {
    "slug": "chencho-dorji",
    "name": "Chencho Dorji",
    "role": "",
    "image": "/img/team/advisory-board/chencho-dorji.jpeg"
  },
  {
    "slug": "leko",
    "name": "Leko",
    "role": "",
    "image": "/img/team/advisory-board/leko-portrait.jpeg"
  },
  {
    "slug": "dorji-tashi",
    "name": "Dorji Tashi",
    "role": "ABAC President (ex officio member with voting right)",
    "image": "/img/team/advisory-board/dorji-tashi.jpeg"
  },
  {
    "slug": "robin-rimal",
    "name": "Robin Rimal",
    "role": "",
    "image": "/img/team/advisory-board/robin-rimal.jpeg"
  },
  {
    "slug": "tsheten-dorji",
    "name": "Tsheten Dorji",
    "role": "",
    "image": "/img/team/advisory-board/tsheten-dorji.jpeg"
  },
  {
    "slug": "wangda-dorji",
    "name": "Wangda Dorji",
    "role": "",
    "image": "/img/team/advisory-board/wangda-dorji.jpeg"
  },
  {
    "slug": "migmar-dorji",
    "name": "Migmar Dorji",
    "role": "",
    "image": "/img/team/advisory-board/migmar-dorji.jpeg"
  }
];
