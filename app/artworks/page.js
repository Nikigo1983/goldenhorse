import Link from "next/link";
import { categories } from "../../data/siteData";

export default function ArtworksPage() {
  return (
    <section className="section page-section art-categories-page">
      <div className="categories-list categories-stack">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={
              cat === "Painting"
                ? "/artworks/painting"
                : cat === "Photography"
                  ? "/artworks/photography"
                  : cat === "Sculpture"
                    ? "/artworks/sculpture"
                    : cat === "Porcelain"
                      ? "/artworks/porcelain"
                  : cat === "Jewelry Art"
                      ? "/artworks/jewelry"
                    : cat === "Publishing"
                      ? "/artworks/publishing"
                    : "/artworks"
            }
          >
            <span className="about-category-label">{cat}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
