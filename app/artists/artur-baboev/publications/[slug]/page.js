import Link from "next/link";

const publicationMap = {
  "golden-horse": {
    title: "Golden Horse",
    subtitle: "Artur Baboev",
    image: "/images/baboev3.webp",
    details: [
      "Artur Baboev, 2014",
      "Hardcover",
      "Publisher: Abrams Books",
      "Dimensions: 30 x 30 cm",
    ],
    description:
      "Golden Horse is a visual publication dedicated to the beauty, strength and character of horses through the lens of Artur Baboev.",
  },
  "goldene-pferde": {
    title: "Goldene Pferde",
    subtitle: "Die legendaren Achal-Tekkiner",
    image: "/images/baboev4.webp",
    details: [
      "Artur Baboev, Aleksandr Klimuk, 2014",
      "Hardcover",
      "Publisher: KOSMOS",
      "ISBN: 978-3-440-14479-4",
      "Dimensions: 30 x 30 cm",
      "Pages: 216",
    ],
    description:
      "Goldene Pferde is a poetic and visually rich publication dedicated to the world of horses—their beauty, strength, and spiritual significance in the cultures of nomadic peoples and contemporary art.",
  },
  "grace-in-the-desert": {
    title: "Grace in the Desert: The Beauty of Saudi Arabia's Camels",
    subtitle: "",
    image: "/images/baboev5.webp",
    details: ["Artur Baboev", "Hardcover"],
    description:
      "A visual story about the beauty and grace of camels in the landscapes of Saudi Arabia.",
  },
};

export default function PublicationDetailPage({ params }) {
  const publication = publicationMap[params.slug];

  if (!publication) {
    return (
      <section className="section page-section artist-book-detail-page">
        <p>Publication not found.</p>
      </section>
    );
  }

  return (
    <section className="section page-section artist-book-detail-page">
      <div className="artist-book-detail-two-col">
        <div className="artist-book-detail-copy">
          <h1>{publication.title}</h1>
          {publication.subtitle ? <p className="artist-book-subtitle">{publication.subtitle}</p> : null}
          <div className="artist-book-line" />
          {publication.details.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="artist-book-gap" />
          <p>{publication.description}</p>
        </div>
        <img className="artist-book-image" src={publication.image} alt={publication.title} />
      </div>

      <div className="artist-book-related">
        <h2>Related artist</h2>
        <Link href="/artists/artur-baboev" className="artist-book-related-link">
          <img src="/images/baboev1.webp" alt="Artur Baboev" />
          <span>Artur Baboev</span>
        </Link>
      </div>
    </section>
  );
}
