// Committee-confirmed founder list for the public Team page.
export type Founder = {
  slug: string;
  name: string;
  image: string | null;
};

export const FOUNDERS: Founder[] = [
  {
    slug: "sonam-tobgay",
    name: "Dasho Sonam Tobgay",
    image: "/img/team/prez-sonam-tobgye-2010-2011.jpg",
  },
  {
    slug: "lhawang-ugyel",
    name: "Dr Lhawang Ugyel",
    image: "/img/team/founder/lhawang-ugyel.jpeg",
  },
  {
    slug: "patt-darlington",
    name: "Ms Patt Darlington",
    image: "/img/team/founder/patt-darlington.jpeg",
  },
  {
    slug: "drukdra-wangchuk",
    name: "Mr Drukdra Wangchuk",
    image: null,
  },
];
