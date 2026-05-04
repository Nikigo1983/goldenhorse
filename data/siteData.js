export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/artworks", label: "Art" },
  { href: "/artists", label: "Artists" },
  { href: "/news", label: "Services" },
  { href: "/exhibitions", label: "Events" },
  { href: "/contact", label: "Contact" },
];

export const categories = [
  "Painting",
  "Photography",
  "Sculpture",
  "Porcelain",
  "Jewelry Art",
  "Publishing",
];

export const artists = [
  {
    name: "Artur Baboev",
    specialty: "Equine Art Photography",
    image: "/images/baboev1.webp",
    description: "Horse photographer focused on emotional and documentary fine art.",
  },
  {
    name: "Ilgiz Fazulzyanov",
    specialty: "Jewelry Art",
    image: "/images/Fazulzyanov.webp",
    description: "Collection Arabesques, contemporary jewelry with horse symbolism.",
  },
  {
    name: "Atajan Hemrayev",
    specialty: "Painting",
    image: "/images/Hemrayev.webp",
    description: "Stallion, 111x111 cm, 2025 and selected equine paintings.",
  },
  {
    name: "Dmitry Luchanov",
    specialty: "Painting",
    image: "/images/Luchanov.webp",
    description: "Remember the roots, 147x107 cm, 2025.",
  },
];

export const artworksByCategory = {
  Painting: [
    {
      title: "Dmitry Luchanov, Remember the Roots, 147x107cm, 2025",
      image: "/images/311282de5c34ab10a1968654da3a3e8aj.jpg",
    },
    {
      title: "Dmitry Luchanov, Pearl, 93x73cm, 2023",
      image: "/images/4cc599abcf685f921e13e2652ced5c5aj.jpg",
    },
    {
      title: "Dmitry Luchanov, A Pair, 113x132cm, 2019",
      image: "/images/c84b1a5c1bb9a7a8eb4f78fcb10e2097j.jpg",
    },
  ],
  Photography: [
    {
      title: "Artur Baboev, Horse Collection, 200x120cm",
      image: "/images/02a7abe4c35f8e69d5efe06d4df46a62j.jpg",
    },
    {
      title: "Artur Baboev, Apocalypse, 105x76cm, 2012",
      image: "/images/8fec04b7ba9e1d96ae611cfdbe2efdb1j.jpg",
    },
    {
      title: "Artur Baboev, A Second, 110x74cm, 2022",
      image: "/images/GH_Gal1000px.jpg",
    },
  ],
  Sculpture: [
    {
      title: "100% Hand Crafted Bronze Sculpture of a Foal, Patinated Bronze, 20 cm",
      image: "/images/5d4ead954576b5730b6b7ca7270f8f59p.png",
    },
    {
      title: "100% Hand Crafted Bronze Sculpture of a Lying Horse, Patinated Bronze, 20 cm",
      image: "/images/88e8b8044447fb937edcbbe1a54c3f11p.png",
    },
    {
      title: "Running Horse, 100% Hand Crafted Bronze Sculpture, Marble Base, 25 cm",
      image: "/images/106dc14d60b0fb268d75de71dc0383b1p.png",
    },
  ],
  Porcelain: [
    {
      title: "Imperial Porcelain, Arabian Grace",
      image: "/images/d64f7b0080f34581d4bf898c273065efp.png",
    },
  ],
  "Jewelry Art": [
    {
      title: "Ilgiz Fazulzyanov, Pendant Arabian Horse from the Arabesques Collection",
      image: "/images/e955ff5f93b23a3e6b75aaf9b1cc5406p.png",
    },
  ],
  Publishing: [
    {
      title: "Art Publishing, Limited Edition",
      image: "/images/86627193a6bfa8f9ffa1d64dbd726367p.png",
    },
  ],
};

export const exhibitions = {
  current: {
    title: "Golden Horse",
    artist: "Artur Baboev",
    started: "Since September 2, 2014",
    description:
      "Exhibition devoted to Akhal-Teke horses, their history, grace and links with kings and emperors.",
    image: "/images/5e917002f9b9ea77cd3459f8f2fdcd56j.jpg",
  },
  past: [
    {
      title: "Qatar International Art Festival",
      place: "Qatar",
      date: "7 - 12 Dec 2025",
      image: "/images/b96f359f195f74e0ed597c72c27d2ec1j.jpg",
    },
    {
      title: "Pink Polo",
      place: "Ghantoot Racing & Polo Club",
      date: "8 Nov 2025",
      image: "/images/de6208c05a8729c9898770a2b0de8581j.jpg",
    },
    {
      title: "ADIHEX 2025",
      place: "Concourse Hall, C5-12",
      date: "30 Aug - 7 Sep 2025",
      image: "/images/fcf21b510f6064f33e40b42bafba85aej.jpg",
    },
  ],
};
