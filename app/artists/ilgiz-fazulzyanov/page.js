import Link from "next/link";
import fazulzyanov2Image from "../../../Fazulzyanov2.webp";

const bioText =
  "Ilgiz Fazulzyanov was born in 1968 in Zelenodolsk, Republic of Tatarstan. In 1990, after finishing art school and having graduated as a designer, he founded a workshop of stained glass and silk painting in Kazan. In 1992 he opened his first jewellery workshop, the main task of which focused on the revival of national traditions of the Volga Tatars. Since 2012, the company Ilgiz F. is present in Paris, Geneva, Tokyo and New York. In a typical Ilgiz fashion, collections vary between cities and countries, never repeating themselves. However, the artist’s style and M.O. remain unchanged.";

export default function IlgizFazulzyanovPage() {
  return (
    <section className="section page-section artist-detail-page">
      <h1 className="artist-detail-name">ILGIZ FAZULZYANOV</h1>

      <nav className="artist-detail-tabs">
        <a href="#biography" className="is-active">
          Biography
        </a>
        <a href="#works">Works</a>
        <Link href="/artists">Browse artists</Link>
      </nav>

      <div id="biography" className="artist-detail-two-col">
        <div className="artist-detail-copy">
          <p>{bioText}</p>
        </div>
        <img src="/images/Fazulzyanov.webp" alt="Ilgiz Fazulzyanov portrait" className="artist-detail-main-image" />
      </div>

      <div id="works" className="artist-detail-section">
        <h2>WORKS</h2>
        <Link href="/artists/ilgiz-fazulzyanov/works/pendant-arabian-horse">
          <img
            src={fazulzyanov2Image.src}
            alt="Pendant Arabian Horse from the Arabesques collection"
            className="artist-detail-work-image"
          />
        </Link>
        <p className="artist-detail-work-note">JEWELRY</p>
      </div>
    </section>
  );
}
