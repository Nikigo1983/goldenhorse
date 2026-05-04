import Link from "next/link";
import baboev9Image from "../../../baboev9.webp";

export default function ArturBaboevPage() {
  return (
    <section className="section page-section artist-detail-page">
      <h1 className="artist-detail-name">ARTUR BABOEV</h1>

      <nav className="artist-detail-tabs">
        <a href="#biography" className="is-active">
          Biography
        </a>
        <Link href="/artists/artur-baboev/works">Works</Link>
        <a href="#publications">Publications</a>
        <a href="#bibliography">Bibliography</a>
        <Link href="/artists">
          Browse Artists
        </Link>
      </nav>

      <div id="biography" className="artist-detail-two-col">
        <div className="artist-detail-copy">
          <p>
            Artur Baboev - art photographer and animal photographer, who glorifies the beauty and
            grace of prideful horses. True craftsman with 17 years of experience. Participant of
            Russian and international exhibitions, member of the Russian Union of Art
            Photographers, winner of Russian and international photo contests, author of a book
            published in three languages.
          </p>
          <p>
            Artur Baboev was born in 1985 in Leningrad. He started his artistic journey in
            photography in 2007, when he began to capture the beauty of the nature of his ancestral
            lands - Karachay-Cherkessia, and alongside - its local horses, whose images became the
            central theme of his creative work.
          </p>
          <p>
            Artur&apos;s works were honoured with awards at such prestigious contests as IPA -
            International Photography Awards (USA), Prix de la Photographie (France), Deutscher
            Fotobuchpreis (Germany), International Equine Art Competition (USA), NDawards (France),
            National Geographic Awards (Russia), Moscow International Foto Awards (Russia) and
            others.
          </p>
          <p>
            Artur Baboev is also the author of a photo book about Akhal-Teke horses &quot;Golden
            horse. The legendary Akhal-teke&quot;, published in 2014 in the United States by Abrams
            Books and republished in Germany and China.
          </p>
        </div>
        <img src="/images/baboev2.webp" alt="Artur Baboev portrait" className="artist-detail-main-image" />
      </div>

      <div id="works" className="artist-detail-section">
        <h2>WORKS</h2>
        <Link href="/artists/25-artur-baboev/works/2-photography/">
          <img src={baboev9Image.src} alt="Artur Baboev work" className="artist-detail-work-image" />
        </Link>
      </div>

      <div id="publications" className="artist-detail-section">
        <h2>PUBLICATIONS</h2>
        <div className="artist-detail-publications-grid">
          <Link
            href="/artists/artur-baboev/publications/golden-horse"
            className="artist-detail-publication-card artist-detail-publication-card-standard artist-detail-publication-link"
          >
            <img src="/images/baboev3.webp" alt="Golden Horse publication" />
            <h3>Golden Horse</h3>
            <p>Artur Baboev</p>
          </Link>
          <Link
            href="/artists/artur-baboev/publications/goldene-pferde"
            className="artist-detail-publication-card artist-detail-publication-card-standard artist-detail-publication-link"
          >
            <img src="/images/baboev4.webp" alt="Goldene Pferde publication" />
            <h3>Goldene Pferde</h3>
            <p>Die legendaren Achal-Tekkiner</p>
          </Link>
          <Link
            href="/artists/artur-baboev/publications/grace-in-the-desert"
            className="artist-detail-publication-card artist-detail-publication-card-large artist-detail-publication-link"
          >
            <img src="/images/baboev5.webp" alt="Grace in the Desert publication" />
            <h3>Grace in the Desert: The Beauty of Saudi Arabia&apos;s Camels</h3>
          </Link>
        </div>
      </div>

      <div id="bibliography" className="artist-detail-two-col">
        <div className="artist-detail-copy">
          <h2>BIBLIOGRAPHY</h2>
          <p className="artist-detail-list-title">PUBLICATIONS in print media:</p>
          <ul className="artist-detail-list">
            <li>Arabian Horse Times. USA</li>
            <li>Horse Illustrated magazine. USA</li>
            <li>FEI world</li>
            <li>中国马会 CHIA. China</li>
            <li>Equestrian Time magazine. Italy</li>
            <li>Gold Mustang. Russia</li>
            <li>Zeitenspiegel. Germany</li>
            <li>The international yearbook L’Année Hippique. France</li>
          </ul>
        </div>
        <img
          src="/images/baboev6.webp"
          alt="Bibliography cover"
          className="artist-detail-main-image artist-detail-main-image-contain"
        />
      </div>
    </section>
  );
}
