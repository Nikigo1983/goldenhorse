import Link from "next/link";
import { artists } from "../../data/siteData";

const artistMenu = ["Painting", "Photography", "Porcelain", "Art Books", "Jewelry Art"];

export default function ArtistsPage() {
  return (
    <section className="section page-section artists-reference-page">
      <div className="artists-hero-copy">
        <h1 className="artists-main-title">THE GOLDEN HORSE</h1>
        <h2 className="artists-subtitle">DUBAI ART GALLERY</h2>
        <div className="divider artists-divider" />
        <p className="artists-tagline">presents fine art & crafts</p>
        <div className="artists-inline-menu">
          {artistMenu.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="artists-grid-showcase">
        {artists.slice(0, 4).map((artist) => {
          const isArtur = artist.name === "Artur Baboev";
          const isIlgiz = artist.name === "Ilgiz Fazulzyanov";
          const isAtajan = artist.name === "Atajan Hemrayev";
          const isDmitry = artist.name === "Dmitry Luchanov";
          const cardContent = (
            <>
              <img src={artist.image} alt={artist.name} />
              <h3>{artist.name}</h3>
            </>
          );

          return isArtur ? (
            <Link
              key={artist.name}
              href="/artists/artur-baboev"
              className="artists-showcase-card artists-link-card"
            >
              {cardContent}
            </Link>
          ) : isIlgiz ? (
            <Link
              key={artist.name}
              href="/artists/ilgiz-fazulzyanov"
              className="artists-showcase-card artists-link-card"
            >
              {cardContent}
            </Link>
          ) : isAtajan ? (
            <Link
              key={artist.name}
              href="/artists/atajan-hemrayev"
              className="artists-showcase-card artists-link-card"
            >
              {cardContent}
            </Link>
          ) : isDmitry ? (
            <Link
              key={artist.name}
              href="/artists/dmitry-luchanov"
              className="artists-showcase-card artists-link-card"
            >
              {cardContent}
            </Link>
          ) : (
            <article key={artist.name} className="artists-showcase-card">
              {cardContent}
            </article>
          );
        })}
      </div>
    </section>
  );
}
