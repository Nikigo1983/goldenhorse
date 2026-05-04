import Link from "next/link";
import luchanovWorkImage from "../../../LUCHANOV5.jpg";

export default function DmitryLuchanovPage() {
  return (
    <section className="section page-section artist-detail-page">
      <h1 className="artist-detail-name">DMITRY LUCHANOV</h1>

      <nav className="artist-detail-tabs">
        <a href="#biography" className="is-active">
          Biography
        </a>
        <Link href="/artists/dmitry-luchanov/works">Works</Link>
        <Link href="/artists">Browse artists</Link>
      </nav>

      <div id="biography" className="artist-detail-two-col">
        <div className="artist-detail-copy">
          <p>Born in 1979, Vilnius, Lithuania.</p>
          <p>Member of the Professional Union of Artists, RF.</p>
          <p>
            Participant of international and Russian exhibitions, contests, solo exhibitions, international horse shows.
          </p>
          <p>
            Since 2025, art created by Dmitriy Luchanov is recognized as a cultural value of the Russian Federation.
          </p>

          <h2>EDUCATION AND EXHIBITIONS</h2>
          <p>Educational institutions 1997 – 2011</p>
          <p>
            Russian Academy of Painting, Sculpture and Architecture (Ilya Glazunov Academy), Russian Federation
          </p>
          <p>Ryazan College of Art named after Wagner, the Russian Federation</p>
          <p>Got minor (2003) and major (2013) diploma paintings.</p>
          <p>
            Took 1st place in National Composition Contest in Yaroslavl, the Russian Federation (2000).
          </p>

          <h2>SOLO EXHIBITIONS</h2>
          <p>2013 — Gallery on Gruzinskaya, Moscow</p>
          <p>2012 — State Duma of the Russian Federation, Moscow</p>
          <p>2010 — Moscow International Oil &amp; Gas club, Gostiny Dvor</p>

          <h2>EXHIBITIONS</h2>
          <p>2025 — ADIHEX, Abu Dhabi, UAE</p>
          <p>2024 – 2018 — Permanent participant of art exhibitions dedicated to horses</p>
          <p>2010 — Russia 2010, Residence of the British Ambassador, Moscow</p>
          <p>2009 — Cultural Heritage of Russia, Russian Embassy, London</p>
          <p>2008 — The Image of Russia in Portrait, Landscape, Still Life, Moscow</p>
          <p>1999 — Painting Exhibitions at International Cultural Festival, Bressuire, France</p>

          <h2>ART</h2>
          <p>
            Being an extremely talented artist, Dmitriy creates stunning masterpieces; his manner of drawing —
            realistic but warm and peaceful at the same time — radiates so much positive energy and mesmerizing
            waves. Mr. Luchanov creates art in different styles — Impressionism, Modern, Realism. His technique is
            oil; his main subjects are landscape, portrait, and animalism.
          </p>
          <p>
            The grace and uniqueness of Arabian horses played a crucial role in Mr. Luchanov&apos;s art life. His
            paintings with Arabian horses express true love and admiration for these wonderful animals; the artworks
            are presented in private collections in many countries, including GCC countries — Kuwait, Bahrain, UAE
            (including private collection of Al Maktoum family), Saudi Arabia.
          </p>
        </div>
        <img
          src="/images/Luchanov.webp"
          alt="Dmitry Luchanov portrait"
          className="artist-detail-main-image artist-detail-main-image-contain"
        />
      </div>

      <div id="works" className="artist-detail-section">
        <h2>WORKS</h2>
        <Link href="/artists/dmitry-luchanov/works">
          <img src={luchanovWorkImage.src} alt="Dmitry Luchanov painting" className="artist-detail-work-image" />
        </Link>
        <p className="artist-detail-work-note">PAINTING</p>
      </div>
    </section>
  );
}
