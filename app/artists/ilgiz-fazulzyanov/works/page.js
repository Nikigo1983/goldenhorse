import Link from "next/link";
import fazulzyanov2Image from "../../../../Fazulzyanov2.webp";

export default function IlgizFazulzyanovWorksPage() {
  return (
    <section className="section page-section artist-works-page">
      <h1 className="artist-detail-name">ILGIZ FAZULZYANOV</h1>

      <nav className="artist-detail-tabs">
        <Link href="/artists/ilgiz-fazulzyanov">Biography</Link>
        <a href="#works" className="is-active">
          Works
        </a>
        <Link href="/artists">Browse artists</Link>
      </nav>

      <div id="works" className="artist-works-header">
        <h2>WORKS</h2>
      </div>

      <div className="artist-works-grid">
        <article className="artist-works-card is-portrait">
          <Link href="/artists/ilgiz-fazulzyanov/works/pendant-arabian-horse">
            <img src={fazulzyanov2Image.src} alt="Pendant Arabian Horse from the Arabesques collection" />
          </Link>
          <h3>Pendant Arabian Horse from the Arabesques collection</h3>
          <button type="button" className="artist-work-enquire-btn">
            Enquire
          </button>
        </article>
      </div>
    </section>
  );
}
