import Link from "next/link";
import hemrayevImage from "../../../Hemrayev.webp";
import hemrayevWorkTwo from "../../../HEMRAYEV2.webp";
import hemrayevWorkThree from "../../../HEMRAYEV3.webp";

const bioParagraphs = [
  "Atajan Hemrayev is a talented Turkmen artist, painter, and graphic designer renowned for his vibrant and emotionally rich works that blend national traditions, symbolism, and a contemporary artistic language. Born in Turkmenistan, he showed an early passion for visual art, receiving his foundational art education locally and later refining his skills in an international context.",
  "Hemrayev’s art is deeply rooted in the culture and landscapes of Central Asia. He frequently explores themes of Turkmen life, nomadic heritage, mountainous scenery, and especially the image of the horse—as a symbol of freedom, pride, and spiritual strength of the nation. The famed Akhal-Teke horses, celebrated for their grace and endurance, have become a central motif in his body of work. His paintings are distinguished by bold color palettes, dynamic compositions, and deep lyricism, combining realistic details with elements of decorative stylization.",
  "Atajan Hemrayev’s works have been exhibited at numerous national and international exhibitions, including events in Turkmenistan, Russia, the UAE, and Germany. He collaborates with private galleries and collectors, and his pieces are held in private collections around the world. The artist continues to inspire audiences with his dedication to his cultural roots and his ability to convey the spirit of Turkmen heritage through the language of painting.",
];

const works = [
  {
    id: "arabian-stallion",
    slug: "arabian-stallion-111x111cm-2025",
    title: "Arabian stallion, 111x111cm, 2025",
    image: hemrayevWorkTwo.src,
  },
  {
    id: "stallion",
    slug: "stallion-111x111cm-2025",
    title: "Stallion, 111x111cm, 2025",
    image: hemrayevWorkThree.src,
  },
];

export default function AtajanHemrayevPage() {
  return (
    <section className="section page-section artist-detail-page">
      <h1 className="artist-detail-name">ATAJAN HEMRAYEV</h1>

      <nav className="artist-detail-tabs">
        <a href="#biography" className="is-active">
          Biography
        </a>
        <a href="#works">Works</a>
        <Link href="/artists">Browse artists</Link>
      </nav>

      <div id="biography" className="artist-detail-two-col">
        <div className="artist-detail-copy">
          {bioParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <img
          src={hemrayevImage.src}
          alt="Atajan Hemrayev portrait"
          className="artist-detail-main-image artist-detail-main-image-contain"
        />
      </div>

      <div id="works" className="artist-detail-section">
        <h2>WORKS</h2>
        <div className="hemrayev-works-grid">
          {works.map((work) => (
            <article key={work.id} className="artist-works-card is-portrait">
              <Link href={`/artists/atajan-hemrayev/works/${work.slug}`}>
                <img src={work.image} alt={work.title} className="hemrayev-work-image" />
              </Link>
              <h3>{work.title}</h3>
              <button type="button" className="artist-work-enquire-btn">
                Enquire
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
