import luchanov2Image from "../../../../LUCHANOV2.webp";
import luchanov3Image from "../../../../LUCHANOV3.webp";
import luchanov4Image from "../../../../LUCHANOV4.webp";
import luchanov5Image from "../../../../LUCHANOV5.jpg";
import luchanov6Image from "../../../../LUCHANOV6.webp";
import luchanov7Image from "../../../../LUCHANOV7.jpg";
import luchanov8Image from "../../../../LUCHANOV8.webp";

export const luchanovWorksData = [
  {
    id: "remember-the-roots",
    slug: "remember-the-roots-147x107cm-2025",
    title: "Remember the roots, 147x107cm, 2025",
    cardClass: "is-landscape",
    images: [luchanov2Image.src, luchanov3Image.src, luchanov4Image.src],
    details: ["Copyright The Artist", "$ 25,000.00"],
  },
  {
    id: "pearl",
    slug: "pearl-93x73cm-2023",
    title: "Pearl, 93x73cm, 2023",
    cardClass: "is-landscape",
    sold: true,
    images: [luchanov5Image.src, luchanov6Image.src],
    details: ["Copyright The Artist", "$ 13,000.00"],
  },
  {
    id: "a-pair",
    slug: "a-pair-113x132cm-2019",
    title: "A pair, 113x132cm, 2019",
    cardClass: "is-portrait",
    sold: true,
    images: [luchanov7Image.src, luchanov8Image.src],
    details: ["Copyright The Artist", "$ 20,000.00"],
  },
];
